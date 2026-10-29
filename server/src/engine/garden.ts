// The home garden: a few beds of salted ground made fit to grow. A crop grows in real time, also while
// nobody plays; water and good weather speed it up, frost slows it, nothing ever withers: a ripe bed waits.
import type { CropDef, PlayerId } from '../../../shared/src/content.js';
import type { GardenView } from '../../../shared/src/protocol.js';
import type { Game, Result } from './index.js';
import { weatherNow } from './weather.js';

type GardenState = NonNullable<Game['s']['garden']>;

/** How many beds the home has now. */
export function bedCount(g: Game): number {
  const def = g.ix.c.garden;
  if (!def) return 0;
  let n = 0;
  for (const b of def.beds) if (b.n > n && g.test(b.if)) n = b.n;
  return n;
}

function cropOf(g: Game, id: string | null): CropDef | undefined {
  return id ? g.ix.c.garden?.crops.find((c) => c.id === id) : undefined;
}

/** The garden's state, with as many beds as there are now. */
function stateOf(g: Game): GardenState {
  const s = (g.s.garden ??= { beds: [], wetUntil: 0, at: g.now });
  const n = bedCount(g);
  while (s.beds.length < n) s.beds.push({ crop: null, grown: 0 });
  return s;
}

/** Rain does the watering. */
function raining(g: Game): boolean {
  return !!weatherNow(g)?.waters;
}

/** How many times as fast the beds grow now. */
function rateNow(g: Game, s: GardenState): number {
  const def = g.ix.c.garden!;
  const wet = raining(g) || s.wetUntil > g.now;
  return (wet ? def.wet : 1) * (weatherNow(g)?.grow ?? 1);
}

/** Count growth forward. True when a bed has just ripened. */
export function settleGarden(g: Game): boolean {
  const def = g.ix.c.garden;
  if (!def || !g.s.garden) return false;
  const s = stateOf(g);
  const dt = Math.max(0, g.now - s.at);
  if (dt <= 0) return false;
  // the part of the time the beds were moist (watered until wetUntil, or all of it in the rain)
  const weather = weatherNow(g)?.grow ?? 1;
  const wetPart = raining(g) ? dt : Math.max(0, Math.min(dt, s.wetUntil - s.at));
  const grow = (wetPart * def.wet + (dt - wetPart)) * weather;
  s.at = g.now;
  let ripe = false;
  for (const b of s.beds) {
    const c = cropOf(g, b.crop);
    if (!c || b.grown >= c.grows) continue;
    b.grown = Math.min(c.grows, b.grown + grow);
    if (b.grown >= c.grows) ripe = true;
  }
  if (ripe) g.log({ all: g.ix.ui('garden_ripe'), kind: 'find' });
  return ripe;
}

/** Water the beds (the effect of the watering action). */
export function waterGarden(g: Game): void {
  const def = g.ix.c.garden;
  if (!def) return;
  settleGarden(g);
  const s = stateOf(g);
  s.wetUntil = Math.max(s.wetUntil, g.now + def.wetFor);
}

/** A resident at the garden keeps it watered, as long as there is water in the store. */
export function tendGarden(g: Game, units: number): boolean {
  const def = g.ix.c.garden;
  if (!def || !g.s.garden || units <= 0) return false;
  const water = def.water;
  const need = Math.max(1, Math.round(units));
  const have = g.s.res[water] ?? 0;
  if (have <= 0) return false;
  g.s.res[water] = have - Math.min(have, need);
  settleGarden(g);
  const s = stateOf(g);
  s.wetUntil = Math.max(s.wetUntil, g.now + def.wetFor);
  return true;
}

function bedBlock(g: Game, pid: PlayerId, bed: number): string | null {
  if (!g.ix.c.garden || bed < 0 || bed >= bedCount(g) || !Number.isInteger(bed)) return g.ix.ui('err_not_now');
  if (!g.atHome(pid)) return g.ix.ui('err_not_now');
  if (g.p(pid).fight !== null) return g.ix.ui('err_in_fight');
  if (g.sceneBlocksRoutine()) return g.ix.ui('err_in_scene');
  return null;
}

export function plant(g: Game, pid: PlayerId, bed: number, crop: string): Result {
  const block = bedBlock(g, pid, bed);
  if (block) return { ok: false, err: block };
  const c = cropOf(g, crop);
  if (!c) return g.fail('err_not_now');
  settleGarden(g);
  const s = stateOf(g);
  if (s.beds[bed]!.crop) return g.fail('err_bed_taken');
  if ((g.s.res[c.seed] ?? 0) < 1) return g.fail('err_cost');
  g.s.res[c.seed] = (g.s.res[c.seed] ?? 0) - 1;
  s.beds[bed] = { crop: c.id, grown: 0 };
  const name = g.ix.res.get(c.seed)?.name.toLowerCase() ?? c.seed;
  g.log({ self: `${g.ix.ui('garden_sow_self')} ${name}.`, other: `{name} ${g.ix.ui('garden_sow_other')} ${name}.` }, pid);
  return { ok: true };
}

export function harvest(g: Game, pid: PlayerId, bed: number): Result {
  if (bed === -1) return harvestAll(g, pid);
  const block = bedBlock(g, pid, bed);
  if (block) return { ok: false, err: block };
  settleGarden(g);
  const s = stateOf(g);
  const b = s.beds[bed]!;
  const c = cropOf(g, b.crop);
  if (!c || b.grown < c.grows) return g.fail('err_not_ripe');
  const got = gather(g, c);
  s.beds[bed] = { crop: null, grown: 0 };
  g.log({ self: `${g.ix.ui('garden_gather_self')}${got.length ? ` (${got.join(', ')})` : ''}.`, other: `{name} ${g.ix.ui('garden_gather_other')}`, kind: 'find' }, pid);
  return { ok: true };
}

/** Takes in what a ripe crop gives; what came, for the log. */
function gather(g: Game, c: CropDef, into: Map<string, number> = new Map()): string[] {
  const parts: string[] = [];
  for (const [r, y] of Object.entries(c.yield)) {
    const n = Array.isArray(y) ? g.rng.int(y[0], y[1]) : y;
    const got = n > 0 ? g.addRes(r, n) : 0;
    if (got > 0) {
      parts.push(`${g.ix.res.get(r)?.name ?? r} +${got}`);
      into.set(r, (into.get(r) ?? 0) + got);
    }
  }
  return parts;
}

/** Every ripe bed at once. */
function harvestAll(g: Game, pid: PlayerId): Result {
  const block = bedBlock(g, pid, 0);
  if (block) return { ok: false, err: block };
  settleGarden(g);
  const s = stateOf(g);
  const got = new Map<string, number>();
  let n = 0;
  s.beds.slice(0, bedCount(g)).forEach((b, i) => {
    const c = cropOf(g, b.crop);
    if (!c || b.grown < c.grows) return;
    gather(g, c, got);
    s.beds[i] = { crop: null, grown: 0 };
    n++;
  });
  if (n === 0) return g.fail('err_not_ripe');
  const parts = [...got].map(([r, k]) => `${g.ix.res.get(r)?.name ?? r} +${k}`);
  g.log({ self: `${g.ix.ui('garden_gather_self')}${parts.length ? ` (${parts.join(', ')})` : ''}.`, other: `{name} ${g.ix.ui('garden_gather_other')}`, kind: 'find' }, pid);
  return { ok: true };
}

/** "Буряк 3–4, Насіння буряка 1–2". */
function yieldText(g: Game, c: CropDef): string {
  return Object.entries(c.yield)
    .map(([r, y]) => `${g.ix.res.get(r)?.name ?? r} ${Array.isArray(y) ? (y[0] === y[1] ? y[0] : `${y[0]}–${y[1]}`) : y}`)
    .join(', ');
}

/** What speeds the beds up or holds them back now. */
function reasons(g: Game, s: GardenState): Array<{ text: string; x: number }> {
  const def = g.ix.c.garden!;
  const out: Array<{ text: string; x: number }> = [];
  if (raining(g)) out.push({ text: g.ix.ui('garden_why_rain'), x: def.wet });
  else if (s.wetUntil > g.now) out.push({ text: g.ix.ui('garden_why_wet'), x: def.wet });
  const w = weatherNow(g);
  if (w?.grow && w.grow !== 1) out.push({ text: w.name, x: w.grow });
  return out;
}

export function gardenView(g: Game, pid: PlayerId): GardenView | null {
  const def = g.ix.c.garden;
  if (!def || !g.atHome(pid) || bedCount(g) === 0) return null;
  const s = stateOf(g);
  const icon = (id: string) => {
    const r = g.ix.res.get(id);
    return r?.icon ? { icon: r.icon } : {};
  };
  const gives = (c: CropDef) => Object.keys(c.yield).filter((r) => r !== c.seed).map((r) => g.ix.res.get(r)?.name ?? r).join(', ') || (g.ix.res.get(c.seed)?.name ?? c.seed);
  return {
    group: def.group,
    beds: s.beds.slice(0, bedCount(g)).map((b) => {
      const c = cropOf(g, b.crop);
      if (!c) return { crop: null, grown: 0, grows: 0, ready: false };
      const main = Object.keys(c.yield).find((r) => r !== c.seed) ?? c.seed;
      const crop = { id: c.id, name: g.ix.res.get(main)?.name ?? c.id, ...icon(main), look: c.look, stages: c.stages, gives: yieldText(g, c) };
      return { crop, grown: b.grown, grows: c.grows, ready: b.grown >= c.grows };
    }),
    rate: rateNow(g, s),
    why: reasons(g, s),
    wetUntil: s.wetUntil > g.now ? s.wetUntil : 0,
    rain: raining(g),
    seeds: def.crops.flatMap((c) => {
      const have = g.s.res[c.seed] ?? 0;
      if (have <= 0 && !g.s.seenRes[c.seed]) return [];
      return [{ crop: c.id, name: g.ix.res.get(c.seed)?.name ?? c.seed, ...icon(c.seed), look: c.look, have, grows: c.grows, gives: gives(c) }];
    }),
  };
}
