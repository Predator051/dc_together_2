// The household: residents work in real time and eat from the home store. Each has a belly of hours of work
// (`fed`); they reach for food when it runs low, the hungriest first, and hunger slows them by steps.
// Counted in steps of ten minutes so the store can run out part way and a long absence plays out in order.
import type { ActionDef, PlayerId, Role, TradeDef } from '../../../shared/src/content.js';
import { FOLK, TRADE, folkHungerMult, folkState, tradeRank, type FolkState } from '../../../shared/src/rules.js';
import type { ResidentState } from '../../../shared/src/state.js';
import type { Game, Result } from './index.js';
import { tendGarden } from './garden.js';
import { areaDef, areaKnown } from './travel.js';
import { skyAt } from './weather.js';
import { gainXp, skillOf } from './hero.js';

const HOUR = 3_600_000;
/** Work is counted in steps; at most this much absence counts (the store fills up anyway). */
const MAX_WORK = 12 * HOUR;
const FOOD = 'food';

export function foodOf(g: Game): string {
  return g.ix.c.food ?? FOOD;
}

function fedOf(r: ResidentState): number {
  return r.fed ?? FOLK.startFed;
}

export function stateOf(r: ResidentState): FolkState {
  return folkState(fedOf(r), r.starve ?? 0);
}

/** The job a resident actually works at now (none while hurt, worn out by hunger, or without the tool). */
export function workingAt(g: Game, id: string): ActionDef | undefined {
  const r = g.s.residents[id];
  if (!r?.job || r.hurtUntil > g.now || stateOf(r) === 'weak') return undefined;
  const a = g.ix.actions.get(r.job);
  if (!a?.job) return undefined;
  if (a.tool && !g.ix.c.resources.some((x) => (g.s.res[x.id] ?? 0) > 0 && x.gear?.tools?.includes(a.tool!))) return undefined;
  return a;
}

/** The trade a job belongs to. */
export function tradeOf(g: Game, job: string): TradeDef | undefined {
  return (g.ix.c.trades ?? []).find((t) => t.jobs.includes(job));
}

/** A resident's step in a trade (0–3). */
export function rankIn(r: ResidentState, trade: string): number {
  return tradeRank(r.exp?.[trade] ?? 0, !!r.master?.includes(trade));
}

/** One part of how fast a resident works: a trait, the weather, a blessing on the house, hunger, a good meal. */
export interface WorkPart {
  key: 'trait' | 'skill' | 'tool' | 'heavy' | 'sky' | 'bonus' | 'hunger' | 'dish';
  x: number;
  name?: string;
}

/** How fast this resident works at this job now (1 = as written), with what makes it so. */
export function workMult(g: Game, id: string, a: ActionDef): { mult: number; parts: WorkPart[] } {
  const r = g.s.residents[id];
  const def = g.ix.c.residents.find((x) => x.id === id);
  const parts: WorkPart[] = [];
  for (const t of def?.traits ?? []) {
    let x = t.mult?.[a.id] ?? 1;
    if (a.skill) x *= t.mult?.[`skill:${a.skill}`] ?? 1;
    if (x !== 1) parts.push({ key: 'trait', x, name: t.name });
  }
  const trade = tradeOf(g, a.id);
  const rank = r && trade ? rankIn(r, trade.id) : 0;
  if (rank > 0) parts.push({ key: 'skill', x: TRADE.mult[rank]!, name: g.ix.ui(`folk_rank_${rank}`) });
  const tool = r?.gear?.tool ? g.ix.res.get(r.gear.tool) : undefined;
  if (tool && trade && tool.folkTool === trade.id) parts.push({ key: 'tool', x: TRADE.tool, name: tool.name });
  const wear = garmentOf(g, r);
  if (wear?.heavy) parts.push({ key: 'heavy', x: TRADE.heavy, name: wear.name });
  // warm clothes keep the bad weather off the work (a fair sky still helps)
  let sky = skyAt(g, g.ix.areaOf(a.group))?.jobs ?? 1;
  if (sky < 1 && wear?.warm) sky = 1;
  if (sky !== 1) parts.push({ key: 'sky', x: sky });
  let bonus = 1;
  for (const b of g.ix.c.workBonus ?? []) if (g.test(b.if)) bonus *= b.mult;
  if (bonus !== 1) parts.push({ key: 'bonus', x: bonus });
  if (r) {
    const hunger = folkHungerMult(stateOf(r));
    if (hunger !== 1) parts.push({ key: 'hunger', x: hunger });
    if ((r.good ?? 0) > 0 && stateOf(r) === 'fed') parts.push({ key: 'dish', x: FOLK.dishLift });
  }
  return { mult: parts.reduce((m, p) => m * p.x, 1), parts };
}

/** What a job brings in an hour at this pace, by resource (the garden's watering brings none). */
export function jobYield(g: Game, a: ActionDef, mult: number): Record<string, number> {
  const out: Record<string, number> = {};
  if (!a.job || a.id === g.ix.c.garden?.tend) return out;
  for (const [res, y] of Object.entries(a.yield ?? {})) out[res] = a.job.rate * mult * (Array.isArray(y) ? (y[0] + y[1]) / 2 : y);
  return out;
}

/** Cooked dishes in the store residents may be fed (what has a meal of its own, plain food aside). */
export function dishesIn(g: Game): Array<{ id: string; n: number }> {
  const food = foodOf(g);
  return g.ix.c.resources.filter((r) => r.meal && r.id !== food && (g.s.res[r.id] ?? 0) > 0).map((r) => ({ id: r.id, n: g.s.res[r.id] ?? 0 }));
}

/** A resident eats if hungry enough and there is something: a dish when the house allows, else plain food. */
function eat(g: Game, r: ResidentState): boolean {
  if (fedOf(r) > FOLK.eatAt) return false;
  const food = foodOf(g);
  const dish = g.s.feedDishes ? dishesIn(g).sort((a, b) => b.n - a.n)[0] : undefined;
  if (dish) {
    g.s.res[dish.id] = dish.n - 1;
    r.fed = Math.min(FOLK.maxFed, fedOf(r) + FOLK.dishHours);
    r.good = FOLK.dishHours;
  } else if ((g.s.res[food] ?? 0) >= 1) {
    g.s.res[food] = (g.s.res[food] ?? 0) - 1;
    r.fed = Math.min(FOLK.maxFed, fedOf(r) + FOLK.rawHours);
  } else return false;
  r.starve = 0;
  return true;
}

/** Residents work and eat. Returns true when the store changed. */
export function settleWork(g: Game): boolean {
  const ids = Object.keys(g.s.residents);
  if (!ids.length) {
    g.s.workAt = g.now;
    return false;
  }
  const dt = Math.min(MAX_WORK, Math.max(0, g.now - g.s.workAt));
  if (dt < 60_000) return false; // count once a minute
  g.s.workAt = g.now;
  let changed = false;
  const step = FOLK.stepMin * 60_000;
  for (let left = dt; left > 0; left -= step) {
    const hours = Math.min(step, left) / HOUR;
    // the hungriest reach for food first
    for (const id of [...ids].sort((a, b) => fedOf(g.s.residents[a]!) - fedOf(g.s.residents[b]!))) {
      if (eat(g, g.s.residents[id]!)) changed = true;
    }
    for (const id of ids) {
      const r = g.s.residents[id]!;
      const a = workingAt(g, id);
      if (a && workStep(g, id, r, a, hours)) changed = true;
      // the belly empties: faster at work
      const burn = hours * (a ? 1 : FOLK.restBurn);
      const fed = fedOf(r);
      if (fed >= burn) r.fed = fed - burn;
      else {
        r.fed = 0;
        r.starve = (r.starve ?? 0) + (burn - fed) / (a ? 1 : FOLK.restBurn);
      }
      r.good = Math.max(0, (r.good ?? 0) - burn);
      r.hungry = stateOf(r) !== 'fed';
    }
  }
  warnings(g);
  return changed;
}

/** One step of work: things into the store, the garden watered, a wound in a dangerous place. */
function workStep(g: Game, id: string, r: ResidentState, a: ActionDef, hours: number): boolean {
  let changed = false;
  const { mult } = workMult(g, id, a);
  // the hands learn the work they do
  const trade = tradeOf(g, a.id);
  if (trade) {
    const before = rankIn(r, trade.id);
    (r.exp ??= {})[trade.id] = (r.exp[trade.id] ?? 0) + hours;
    const after = rankIn(r, trade.id);
    if (after > before) {
      g.log({ all: `${residentName(g, id)}: ${g.ix.ui(`folk_rank_${after}`)} — ${trade.name.toLowerCase()}.`, kind: 'find' });
      changed = true;
    }
  }
  const units = a.job!.rate * hours * mult;
  // at the garden: watering, not gathering
  if (a.id === g.ix.c.garden?.tend) return tendGarden(g, units);
  for (const [res, y] of Object.entries(a.yield ?? {})) {
    const per = Array.isArray(y) ? (y[0] + y[1]) / 2 : y;
    const total = (r.acc[res] ?? 0) + units * per;
    const whole = Math.floor(total);
    r.acc[res] = total - whole;
    if (whole > 0 && g.addRes(res, whole) > 0) changed = true;
  }
  // dangerous places hurt now and then (less, and less badly, in sound clothes)
  const danger = areaDef(g, g.ix.areaOf(a.group))?.danger ?? 0;
  const guard = garmentOf(g, r)?.guard ? TRADE.guard : 1;
  if (danger >= 3 && g.rng.chance(Math.min(0.5, 0.04 * hours * (danger - 2)) * guard)) {
    r.hurtUntil = g.now + 2 * HOUR * guard;
    g.log({ all: `${residentName(g, id)}: ${g.ix.ui('resident_hurt')}`, kind: 'warn' });
    changed = true;
  }
  return changed;
}

/** The household's food at a glance: what is eaten and brought in an hour, and how long it lasts. */
export interface Larder {
  /** Plain food eaten an hour (dishes, when fed, count as what they stand in for). */
  eat: number;
  /** Plain food brought in an hour by residents at work. */
  gain: number;
  stock: number;
  cap: number;
  /** Hours until the bellies and the store run out (null: it does not run out at this pace). */
  lasts: number | null;
  dishes: number;
}

/** The larder as it would be with one resident set to another job (`as`; null: resting). */
export function larder(g: Game, as?: { id: string; job: string | null }): Larder {
  const food = foodOf(g);
  let burn = 0;
  let belly = 0;
  let gain = 0;
  for (const id of Object.keys(g.s.residents)) {
    const r = g.s.residents[id]!;
    let a = workingAt(g, id);
    if (as && as.id === id) {
      const job = as.job ? g.ix.actions.get(as.job) : undefined;
      a = job?.job && r.hurtUntil <= g.now ? job : undefined;
    }
    burn += a ? 1 : FOLK.restBurn;
    belly += fedOf(r);
    if (a) gain += jobYield(g, a, workMult(g, id, a).mult)[food] ?? 0;
  }
  const dishes = dishesIn(g).reduce((s, d) => s + d.n, 0);
  const stock = g.s.res[food] ?? 0;
  const supply = belly + stock * FOLK.rawHours + (g.s.feedDishes ? dishes * FOLK.dishHours : 0);
  const net = burn - gain * FOLK.rawHours;
  return { eat: burn / FOLK.rawHours, gain, stock, cap: g.cap(food), lasts: net > 1e-9 ? supply / net : null, dishes };
}

/** The journal hears once when the food is about to run out, and once when people go hungry. */
function warnings(g: Game): void {
  const l = larder(g);
  const short = l.lasts !== null && l.lasts < FOLK.warnHours;
  if (short && !g.s.larderLow) g.log({ all: g.ix.ui('larder_low').replace('{n}', String(Math.max(1, Math.round(l.lasts!)))), kind: 'warn' });
  g.s.larderLow = short || (!!g.s.larderLow && l.lasts !== null && l.lasts < FOLK.warnHours * 2);
  const hungry = Object.values(g.s.residents).some((r) => r.hungry);
  if (hungry && !g.s.folkHungry) g.log({ all: g.ix.ui('residents_hungry'), kind: 'warn' });
  g.s.folkHungry = hungry;
}

export function residentJobs(g: Game, id: string): Array<{ id: string; area: string; missing?: string }> {
  const def = g.ix.c.residents.find((x) => x.id === id);
  const avoid = new Set((def?.traits ?? []).flatMap((t) => t.avoid ?? []));
  const out: Array<{ id: string; area: string; missing?: string }> = [];
  // a resident works with what lies in the store (an axe, a crowbar), not with what the heroes wear
  const stored = new Set<string>();
  for (const r of g.ix.c.resources) if ((g.s.res[r.id] ?? 0) > 0) for (const t of r.gear?.tools ?? []) stored.add(t);
  for (const a of g.ix.c.actions) {
    if (!a.job || avoid.has(a.id)) continue;
    const area = g.ix.areaOf(a.group);
    if (!areaKnown(g, area)) continue;
    if (a.visible && !g.test(a.visible)) continue;
    out.push({ id: a.id, area, ...(a.tool && !stored.has(a.tool) ? { missing: a.tool } : {}) });
  }
  return out;
}

export function setJob(g: Game, who: string, id: string | null, by?: import('../../../shared/src/content.js').PlayerId): Result {
  const r = g.s.residents[who];
  if (!r) return g.fail('err_not_now');
  if (id !== null && !residentJobs(g, who).some((j) => j.id === id && !j.missing)) return g.fail('err_not_now');
  settleWork(g);
  r.job = id;
  // the other one hears who was set to what
  if (by) {
    const def = g.ix.c.residents.find((x) => x.id === who);
    const name = def ? g.render(def.name, by) : who;
    const what = id ? g.render(g.ix.actions.get(id)!.label, by) : g.ix.ui('resident_rest');
    g.log({ self: `${name}: ${what}.`, other: `{name} ${g.ix.ui('resident_set')} ${name}: ${what}.`, kind: 'system' }, by);
  }
  return { ok: true };
}

/** Whether residents may be fed cooked dishes from the store (else only plain food). */
export function setFeed(g: Game, dishes: boolean): Result {
  settleWork(g);
  g.s.feedDishes = dishes;
  return { ok: true };
}

function residentName(g: Game, id: string): string {
  const def = g.ix.c.residents.find((x) => x.id === id);
  return def ? g.render(def.name, g.joinedIds()[0] ?? 'p1') : id;
}

/**
 * Why this hero cannot teach this resident the trade of the job they are at (null: can). The last step
 * of a trade is only taught: by one of the roles that know it, skilled at gathering, at home and free.
 */
export function teachBlock(g: Game, pid: PlayerId, who: string): string | null {
  const r = g.s.residents[who];
  const p = g.p(pid);
  const trade = r?.job ? tradeOf(g, r.job) : undefined;
  if (!r || !trade) return g.ix.ui('teach_no_job');
  const rank = rankIn(r, trade.id);
  if (rank >= 3) return g.ix.ui('teach_done');
  if (rank < 2) return g.ix.ui('teach_not_yet');
  if (!p.role || !trade.teach.includes(p.role)) {
    // named as the one who holds that role is called
    const title = (role: Role) => g.ix.c.roleTitles[role][g.joinedIds().map((x) => g.p(x)).find((x) => x.role === role)?.gender === 'f' ? 'f' : 'm'];
    return g.ix.ui('teach_role').replace('{who}', trade.teach.map(title).join(' / '));
  }
  if (skillOf(g, pid, 'gather') < TRADE.teachSkill) return g.ix.ui('teach_skill').replace('{n}', String(TRADE.teachSkill));
  if (!g.atHome(pid)) return g.ix.ui('teach_home');
  if (g.sceneBlocksRoutine()) return g.ix.ui('err_in_scene');
  if (p.fight !== null) return g.ix.ui('err_in_fight');
  if ((p.busy && p.busy.until > g.now) || p.travel) return g.ix.ui('err_busy');
  return null;
}

/** A hero spends a while showing a resident the last of a trade: a master's hand from now on. */
export function teach(g: Game, pid: PlayerId, who: string): Result {
  const block = teachBlock(g, pid, who);
  if (block) return { ok: false, err: block };
  settleWork(g);
  const r = g.s.residents[who]!;
  const trade = tradeOf(g, r.job!)!;
  (r.master ??= []).push(trade.id);
  g.p(pid).busy = { action: `teach:${who}`, until: g.now + TRADE.teachMs };
  const name = residentName(g, who);
  const what = `${name} ${g.ix.ui('teach_log')} ${trade.name.toLowerCase()}.`;
  g.log({ self: `${g.ix.ui('teach_self')} ${what}`, other: `{name} ${g.ix.ui('teach_other')} ${what}`, kind: 'find' }, pid);
  gainXp(g, pid, TRADE.teachXp);
  return { ok: true };
}

/** What a garment does on a resident: guards against wounds (armour or a resist), warms, weighs them down. */
export function garmentOf(g: Game, r: ResidentState | undefined): { id: string; name: string; guard: boolean; warm: boolean; heavy: boolean } | undefined {
  const id = r?.gear?.wear;
  const def = id ? g.ix.res.get(id) : undefined;
  if (!def?.gear) return undefined;
  const resist = def.gear.resist ?? [];
  return {
    id: def.id,
    name: def.name,
    guard: (def.gear.armor ?? 0) >= 1 || resist.includes('salt') || resist.includes('venom'),
    warm: resist.includes('cold'),
    heavy: !!def.gear.tags?.includes('heavy'),
  };
}

/** Things in the store a resident could take into a slot: tools of trades, garments for the body. */
export function folkGearFits(g: Game, slot: 'tool' | 'wear', id: string): boolean {
  const def = g.ix.res.get(id);
  return slot === 'tool' ? !!def?.folkTool : def?.gear?.slot === 'body';
}

/** A hero at home gives a resident a thing from the store (the one they had goes back), or takes it off. */
export function folkGear(g: Game, pid: PlayerId, who: string, slot: 'tool' | 'wear', id: string | null): Result {
  const r = g.s.residents[who];
  if (!r) return g.fail('err_not_now');
  if (!g.atHome(pid)) return g.fail('err_not_home');
  if (id !== null && (!folkGearFits(g, slot, id) || (g.s.res[id] ?? 0) <= 0)) return g.fail('err_not_now');
  settleWork(g);
  const gear = (r.gear ??= {});
  const old = gear[slot];
  if (old) g.s.res[old] = (g.s.res[old] ?? 0) + 1;
  if (id) {
    g.s.res[id] = (g.s.res[id] ?? 0) - 1;
    gear[slot] = id;
  } else delete gear[slot];
  return { ok: true };
}
