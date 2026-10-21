// The map: walking between places, ambushes, the household working while the heroes are away.
import type { AreaDef, PlayerId } from '../../../shared/src/content.js';
import { travelMult } from '../../../shared/src/rules.js';
import { bagCap, bagLoad, gainSkill, heroOf, skillOf, unloadBag } from './hero.js';
import { startFight } from './fight.js';
import type { Game, Result } from './index.js';

export function areaDef(g: Game, id: string): AreaDef | undefined {
  return g.ix.c.areas.find((a) => a.id === id);
}

/** The place is explored: anyone may walk in alone. */
export function areaKnown(g: Game, id: string): boolean {
  const a = areaDef(g, id);
  if (!a) return false;
  if (a.home) return true;
  if (!a.scout) return a.visible ? g.test(a.visible) : true;
  return !!g.flag(`seen:${id}`) || !!g.flag(`done:${a.scout}`);
}

/** The place shows on the map (perhaps as '?'). */
export function areaOnMap(g: Game, id: string): boolean {
  const a = areaDef(g, id);
  if (!a) return false;
  if (a.visible && !g.test(a.visible)) return false;
  if (areaKnown(g, id)) return true;
  // an unexplored place is seen only from an explored neighbour
  return g.ix.c.areas.some((b) => areaKnown(g, b.id) && (b.links ?? []).some((l) => l.to === id));
}

export function linkTime(g: Game, from: string, to: string): number | null {
  const a = areaDef(g, from);
  const l = a?.links?.find((x) => x.to === to);
  if (l) return l.time;
  const b = areaDef(g, to);
  const back = b?.links?.find((x) => x.to === from);
  return back ? back.time : null;
}

export function travelTime(g: Game, pid: PlayerId, from: string, to: string): number {
  const base = linkTime(g, from, to) ?? 0;
  const h = heroOf(g, pid);
  const load = bagLoad(g, pid) / Math.max(1, bagCap(g, pid));
  return Math.round(base * travelMult({ trail: skillOf(g, pid, 'trail'), load, heavy: h.heavy }));
}

export function goBlock(g: Game, pid: PlayerId, to: string): string | null {
  const p = g.p(pid);
  if (p.travel) return g.ix.ui('err_busy');
  if (p.fight !== null) return g.ix.ui('err_in_fight');
  if (g.sceneBlocksRoutine()) return g.ix.ui('err_in_scene');
  if (p.busy && p.busy.until > g.now) return g.ix.ui('err_busy');
  if (to === p.at) return g.ix.ui('err_not_now');
  if (!areaOnMap(g, to)) return g.ix.ui('err_not_now');
  if (linkTime(g, p.at, to) === null) return g.ix.ui('err_far');
  if (!areaKnown(g, to)) return g.ix.ui('err_unexplored');
  return null;
}

export function go(g: Game, pid: PlayerId, to: string): Result {
  const block = goBlock(g, pid, to);
  if (block) return { ok: false, err: block };
  const p = g.p(pid);
  const t = travelTime(g, pid, p.at, to);
  p.travel = { from: p.at, to, since: g.now, until: g.now + t };
  p.busy = { action: `go:${to}`, until: g.now + t };
  gainSkill(g, pid, 'trail');
  g.s.stats.trips += 1;
  if (g.s.proposal) g.s.proposal = null;
  return { ok: true };
}

function arrive(g: Game, pid: PlayerId): void {
  const p = g.p(pid);
  const tr = p.travel!;
  p.travel = null;
  p.at = tr.to;
  const a = areaDef(g, tr.to);
  if (a?.home) {
    const moved = unloadBag(g, pid);
    const parts = Object.entries(moved).map(([id, n]) => `${g.ix.res.get(id)?.name ?? id} +${n}`);
    if (parts.length) g.logRaw('system', { [pid]: `${g.ix.ui('unloaded')} ${parts.join(', ')}.` }, pid);
  }
  g.log({ self: `${g.ix.ui('arrived_self')} ${a ? a.where : tr.to}.`, other: `{name} ${g.ix.ui('arrived_other')} ${a ? a.where : tr.to}.` }, pid);
  ambush(g, pid, tr.to, a?.ambush ?? 0);
}

/** Maybe something jumps at the hero here. */
export function ambush(g: Game, pid: PlayerId, area: string, base: number): boolean {
  const a = areaDef(g, area);
  if (!a?.foes?.length || base <= 0) return false;
  const p = g.p(pid);
  if (p.fight !== null || !p.online) return false;
  let chance = base * (1 - 0.05 * skillOf(g, pid, 'trail'));
  if (g.isEvening()) chance *= 1.5;
  const dog = g.ix.c.dog;
  if (dog && g.flag(dog.flag) && p.role === 'hunter') chance *= 0.8;
  if (!g.rng.chance(Math.min(0.6, chance))) return false;
  const pool = a.foes.filter((e) => (!e.night || g.isEvening()) && (!e.if || g.test(e.if, pid)));
  if (!pool.length) return false;
  const total = pool.reduce((s, e) => s + e.w, 0);
  let r = g.rng.next() * total;
  let pick = pool[0]!;
  for (const e of pool) {
    r -= e.w;
    if (r <= 0) {
      pick = e;
      break;
    }
  }
  const n = pick.n ? g.rng.int(pick.n[0], pick.n[1]) : 1;
  startFight(g, area, [{ enemy: pick.enemy, n }]);
  return true;
}

/** Finish walks that are over. Returns true if something changed. */
export function settleTravel(g: Game): boolean {
  let changed = false;
  for (const pid of g.joinedIds()) {
    const p = g.p(pid);
    if (p.travel && p.travel.until <= g.now) {
      arrive(g, pid);
      changed = true;
    }
  }
  return changed;
}

// ----- the household -------------------------------------------------------------

const HOUR = 3_600_000;
/** Work is counted in steps; at most this much absence counts (the store fills up anyway). */
const MAX_WORK = 12 * HOUR;
const FOOD = 'food';

/** Residents work and eat. Returns true when stock changed. */
export function settleWork(g: Game): boolean {
  const ids = Object.keys(g.s.residents);
  if (!ids.length) {
    g.s.workAt = g.now;
    return false;
  }
  const dt = Math.min(MAX_WORK, Math.max(0, g.now - g.s.workAt));
  if (dt < 60_000) return false; // count once a minute
  g.s.workAt = g.now;
  const hours = dt / HOUR;
  const food = g.ix.c.food ?? FOOD;
  let changed = false;
  // eating: one meal an hour each
  const need = Math.ceil(ids.length * hours * 0.999);
  const have = g.s.res[food] ?? 0;
  const eaten = Math.min(have, need);
  if (eaten > 0) {
    g.s.res[food] = have - eaten;
    changed = true;
  }
  const fed = need === 0 ? 1 : eaten / need;
  for (const id of ids) {
    const r = g.s.residents[id]!;
    const wasHungry = r.hungry;
    r.hungry = fed < 0.999;
    if (r.hungry && !wasHungry) g.log({ all: g.ix.ui('residents_hungry'), kind: 'warn' });
    if (!r.job || r.hurtUntil > g.now) continue;
    const a = g.ix.actions.get(r.job);
    if (!a?.job) continue;
    const def = g.ix.c.residents.find((x) => x.id === id);
    let mult = 1;
    for (const t of def?.traits ?? []) {
      mult *= t.mult?.[a.id] ?? 1;
      if (a.skill) mult *= t.mult?.[`skill:${a.skill}`] ?? 1;
    }
    if (r.hungry) mult *= 0.5;
    const units = a.job.rate * hours * mult;
    for (const [res, y] of Object.entries(a.yield ?? {})) {
      const per = Array.isArray(y) ? (y[0] + y[1]) / 2 : y;
      const total = (r.acc[res] ?? 0) + units * per;
      const whole = Math.floor(total);
      r.acc[res] = total - whole;
      if (whole > 0) {
        const got = g.addRes(res, whole);
        if (got > 0) changed = true;
      }
    }
    // dangerous places hurt now and then
    const area = g.ix.areaOf(a.group);
    const danger = areaDef(g, area)?.danger ?? 0;
    if (danger >= 3 && g.rng.chance(Math.min(0.5, 0.04 * hours * (danger - 2)))) {
      r.hurtUntil = g.now + 2 * HOUR;
      g.log({ all: `${def ? g.render(def.name, g.joinedIds()[0] ?? 'p1') : id}: ${g.ix.ui('resident_hurt')}`, kind: 'warn' });
      changed = true;
    }
  }
  return changed;
}

export function residentJobs(g: Game, id: string): Array<{ id: string; area: string }> {
  const def = g.ix.c.residents.find((x) => x.id === id);
  const avoid = new Set((def?.traits ?? []).flatMap((t) => t.avoid ?? []));
  const out: Array<{ id: string; area: string }> = [];
  // a resident works with what lies in the store (an axe, a crowbar), not with what the heroes wear
  const stored = new Set<string>();
  for (const r of g.ix.c.resources) if ((g.s.res[r.id] ?? 0) > 0) for (const t of r.gear?.tools ?? []) stored.add(t);
  for (const a of g.ix.c.actions) {
    if (!a.job || avoid.has(a.id)) continue;
    if (a.tool && !stored.has(a.tool)) continue;
    const area = g.ix.areaOf(a.group);
    if (!areaKnown(g, area)) continue;
    if (a.visible && !g.test(a.visible)) continue;
    out.push({ id: a.id, area });
  }
  return out;
}

export function setJob(g: Game, who: string, id: string | null): Result {
  const r = g.s.residents[who];
  if (!r) return g.fail('err_not_now');
  if (id !== null && !residentJobs(g, who).some((j) => j.id === id)) return g.fail('err_not_now');
  settleWork(g);
  r.job = id;
  return { ok: true };
}
