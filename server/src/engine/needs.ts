// Needs of the heroes: dishes in their slots, warmth and wetness, rest and tiredness (as in Valheim).
// Time counts only while the player is in the game and no joint scene holds everyone.
import type { PlayerId } from '../../../shared/src/content.js';
import { NEED, bodyMods, coldLevel, mealFading, type BodyMods, type ColdLevel } from '../../../shared/src/rules.js';
import type { NeedsState } from '../../../shared/src/state.js';
import { addBag, heroOf, ownsCount, refreshHero } from './hero.js';
import type { Game, Result } from './index.js';

const MIN = 60_000;

export function needsOn(g: Game): boolean {
  const n = g.ix.c.needs;
  return !!n && g.test(n.from);
}

function freshNeeds(g: Game): NeedsState {
  const snack = g.ix.c.needs?.snack;
  const meal = snack ? g.ix.res.get(snack)?.meal : undefined;
  return {
    at: g.now,
    meals: snack && meal ? [{ id: snack, left: meal.minutes * MIN }] : [],
    chill: 0,
    wet: 0,
    drink: 0,
    rested: 0,
    awake: 0,
    bite: g.now,
  };
}

/** The dishes in the slots with what they give. */
function mealsOf(g: Game, n: NeedsState) {
  return n.meals.flatMap((m) => {
    const def = g.ix.res.get(m.id)?.meal;
    return def ? [{ ...m, ...def }] : [];
  });
}

/** What hunger, food and cold do to the hero's health and fighting (none before the needs begin). */
export function bodyOf(g: Game, pid: PlayerId): BodyMods | undefined {
  const n = g.p(pid).needs;
  return n ? bodyMods(mealsOf(g, n), n.chill) : undefined;
}

export function tired(n: NeedsState): boolean {
  return n.rested <= 0 && n.awake >= NEED.tiredAfter;
}

/** Work and walking: faster rested, slower tired. */
export function paceOf(g: Game, pid: PlayerId): number {
  const n = g.p(pid).needs;
  if (!n) return 1;
  if (n.rested > 0) return NEED.rested.pace;
  return tired(n) ? NEED.tired.pace : 1;
}

/** Skills grow faster rested, slower tired. */
export function learnOf(g: Game, pid: PlayerId): number {
  const n = g.p(pid).needs;
  if (!n) return 1;
  if (n.rested > 0) return NEED.rested.skill;
  return tired(n) ? NEED.tired.skill : 1;
}

/** How fast wounds close: slowly hungry or cold, not at all frozen stiff, faster warmed through. */
export function regenOf(g: Game, pid: PlayerId): number {
  const n = g.p(pid).needs;
  if (!n) return 1;
  const lvl = coldLevel(n.chill);
  if (lvl === 'frozen') return 0;
  let k = lvl === 'warm' ? NEED.warmRegen : lvl === 'cold' ? NEED.slowRegen : 1;
  if (!n.meals.length) k *= NEED.slowRegen;
  return k;
}

/** A fire warms the hero here: the home stove burning, or a campfire. */
export function byFire(g: Game, pid: PlayerId): 'home' | 'low' | 'camp' | null {
  const p = g.p(pid);
  if (p.travel) return null;
  if (g.atHome(pid)) {
    const st = g.stoveState();
    return st === 'warm' ? 'home' : st === 'low' ? 'low' : null;
  }
  return (g.s.fires?.[p.at] ?? 0) > g.now ? 'camp' : null;
}

/** Points of chill per minute right now (negative: warming up). */
export function chillRate(g: Game, pid: PlayerId): number {
  const p = g.p(pid);
  const n = p.needs;
  if (!n) return 0;
  const fire = byFire(g, pid);
  if (fire) return -(fire === 'low' ? NEED.chill.low : NEED.chill.fire);
  let rate = 0;
  if (g.isEvening()) rate += g.atHome(pid) ? NEED.chill.homeEvening : NEED.chill.evening;
  if (n.wet > 0) rate += NEED.chill.wet;
  if (heroOf(g, pid).resist.has('cold')) rate *= NEED.chill.resist;
  if (n.drink > 0) rate *= NEED.chill.drink;
  return rate;
}

/** How cosy the home is: the things that hold, by name. */
export function comfortOf(g: Game, pid: PlayerId): Array<{ name: string; on: boolean }> {
  return (g.ix.c.needs?.comfort ?? []).map((c) => ({ name: g.render(c.name, pid), on: g.test(c.if, pid) }));
}

function restMinutes(comfort: number): number {
  return NEED.restBase + NEED.restPer * comfort;
}

/** Count the needs forward. True when something the players should see has changed. */
export function settleNeeds(g: Game): boolean {
  if (!needsOn(g)) return false;
  let changed = false;
  const scene = g.sceneBlocksRoutine();
  for (const [area, until] of Object.entries(g.s.fires ?? {})) {
    if (until > g.now) continue;
    delete g.s.fires![area];
    changed = true;
  }
  for (const pid of g.joinedIds()) {
    const p = g.p(pid);
    if (!p.needs) {
      p.needs = freshNeeds(g);
      refreshHero(g, pid);
      g.logRaw('find', { [pid]: g.ix.ui('need_begin') }, pid);
      changed = true;
      continue;
    }
    const n = p.needs;
    const dt = Math.max(0, g.now - n.at);
    n.at = g.now;
    if (!p.online || scene || dt <= 0) {
      n.bite = g.now;
      continue;
    }
    if (step(g, pid, n, dt)) changed = true;
  }
  return changed;
}

function step(g: Game, pid: PlayerId, n: NeedsState, dt: number): boolean {
  const p = g.p(pid);
  let changed = false;
  const hpBefore = p.hpMax;
  // dishes
  const fadingBefore = mealsOf(g, n).filter((m) => mealFading(m.left, m.minutes)).length;
  const had = n.meals.length;
  for (const m of n.meals) m.left -= dt;
  n.meals = n.meals.filter((m) => m.left > 0);
  if (n.meals.length !== had) {
    changed = true;
    if (!n.meals.length) g.log({ self: g.ix.ui('need_hungry'), kind: 'warn' }, pid);
  }
  if (mealsOf(g, n).filter((m) => mealFading(m.left, m.minutes)).length !== fadingBefore) changed = true;
  // wet and warm
  const fire = byFire(g, pid);
  const wasWet = n.wet > 0;
  n.wet = Math.max(0, n.wet - dt * (fire ? NEED.dryByFire : 1));
  if (wasWet && n.wet <= 0) changed = true;
  n.drink = Math.max(0, n.drink - dt);
  const before: ColdLevel = coldLevel(n.chill);
  const old = n.chill;
  // under the home roof a cold hearth chills, but nobody freezes stiff (out of the wind at once)
  const top = g.atHome(pid) ? NEED.homeMaxChill : NEED.freezeAt;
  n.chill = Math.max(0, Math.min(top, n.chill + (chillRate(g, pid) * dt) / MIN));
  const after = coldLevel(n.chill);
  if (after !== before) {
    changed = true;
    if (after === 'cold' && before !== 'frozen') g.log({ self: g.ix.ui('need_cold'), kind: 'warn' }, pid);
    if (after === 'frozen') g.log({ self: g.ix.ui('need_frozen'), kind: 'warn' }, pid);
    if (after === 'warm' && (before === 'cold' || before === 'frozen')) g.log({ self: g.ix.ui('need_warm') }, pid);
  }
  // the client draws the bar from the rate; resend now and then so it never drifts far
  if (Math.floor(old / 10) !== Math.floor(n.chill / 10)) changed = true;
  // frozen stiff: health goes, but never the last of it
  if (after === 'frozen') {
    const bites = Math.floor((g.now - n.bite) / NEED.biteEvery);
    if (bites > 0) {
      n.bite += bites * NEED.biteEvery;
      if (p.hp > 1) {
        p.hp = Math.max(1, p.hp - bites);
        changed = true;
      }
    }
  } else n.bite = g.now;
  // rest
  const wasTired = tired(n);
  if (n.rested > 0) {
    n.rested = Math.max(0, n.rested - dt);
    if (n.rested <= 0) changed = true;
  } else n.awake += dt;
  if (!wasTired && tired(n)) {
    changed = true;
    g.log({ self: g.ix.ui('need_tired'), kind: 'warn' }, pid);
  }
  refreshHero(g, pid);
  if (p.hpMax !== hpBefore) changed = true;
  return changed;
}

/** Soaked: in water, or a wet place underfoot. */
export function soak(g: Game, pid: PlayerId): void {
  const n = g.p(pid).needs;
  if (!n) return;
  if (n.wet <= 0) g.log({ self: g.ix.ui('need_wet') }, pid);
  n.wet = NEED.wetFor;
}

/** Arriving somewhere wet underfoot. */
export function soakByPlace(g: Game, pid: PlayerId, area: string): void {
  const a = g.ix.c.areas.find((x) => x.id === area);
  if (!a?.wet || !g.p(pid).needs) return;
  // the first soaking shows that dry boots would be worth making
  g.s.flags.wet_feet = 1;
  if (heroOf(g, pid).tools.has('dry')) return;
  soak(g, pid);
}

/** Where a dish comes from: the bag first, at home the store too. */
function dishFrom(g: Game, pid: PlayerId, id: string): 'bag' | 'store' | null {
  if ((g.p(pid).bag[id] ?? 0) > 0) return 'bag';
  if (g.atHome(pid) && (g.s.res[id] ?? 0) > 0) return 'store';
  return null;
}

/** Why this dish cannot go into a slot now (null = it can). */
export function eatBlock(g: Game, pid: PlayerId, id: string): string | null {
  const n = g.p(pid).needs;
  const meal = g.ix.res.get(id)?.meal;
  if (!n || !meal) return g.ix.ui('err_not_now');
  const same = mealsOf(g, n).find((m) => m.id === id);
  if (same) return mealFading(same.left, same.minutes) ? null : g.ix.ui('err_ate_that');
  if (n.meals.length < NEED.slots) return null;
  return mealsOf(g, n).some((m) => mealFading(m.left, m.minutes)) ? null : g.ix.ui('err_belly_full');
}

/** A dish served (by an action or a scene): into a slot if there is room for it. */
export function feed(g: Game, pid: PlayerId, id: string): void {
  if (!g.p(pid).needs || eatBlock(g, pid, id)) return;
  takeMeal(g, pid, id);
}

/** Put a dish into a slot (it was paid for already). */
function takeMeal(g: Game, pid: PlayerId, id: string): void {
  const p = g.p(pid);
  const n = p.needs!;
  const meal = g.ix.res.get(id)!.meal!;
  const left = meal.minutes * MIN;
  const same = n.meals.find((m) => m.id === id);
  if (same) same.left = left;
  else if (n.meals.length < NEED.slots) n.meals.push({ id, left });
  else {
    // a full belly takes a new dish in place of the most faded one
    const all = mealsOf(g, n);
    const worst = all.filter((m) => mealFading(m.left, m.minutes)).sort((a, b) => a.left - b.left)[0]!;
    const slot = n.meals.find((m) => m.id === worst.id)!;
    slot.id = id;
    slot.left = left;
  }
  if (meal.warm) n.chill = Math.max(0, n.chill - meal.warm);
  const old = p.hpMax;
  refreshHero(g, pid);
  // more strength at once, as after a level
  if (p.hpMax > old) p.hp = Math.min(p.hpMax, p.hp + (p.hpMax - old));
}

export function eat(g: Game, pid: PlayerId, id: string): Result {
  const p = g.p(pid);
  const def = g.ix.res.get(id);
  if (!def?.meal || !p.needs) return g.fail('err_not_now');
  if (p.fight !== null) return g.fail('err_in_fight');
  const from = dishFrom(g, pid, id);
  if (!from) return g.fail('err_cost');
  const block = eatBlock(g, pid, id);
  if (block) return { ok: false, err: block };
  if (from === 'bag') addBag(g, pid, id, -1);
  else g.s.res[id] = (g.s.res[id] ?? 0) - 1;
  takeMeal(g, pid, id);
  if (def.use?.heal) p.hp = Math.min(p.hpMax, p.hp + def.use.heal);
  if (def.use?.log) g.log(def.use.log, pid);
  else g.log({ self: `${g.ix.ui('ate_self')} ${def.name.toLowerCase()}.`, other: `{name} ${g.ix.ui('ate_other')}` }, pid);
  return { ok: true };
}

/** A hot drink: warms at once and keeps the cold off for a while. */
export function drink(g: Game, pid: PlayerId, warm: number, warmFor: number): void {
  const n = g.p(pid).needs;
  if (!n) return;
  n.chill = Math.max(0, n.chill - warm);
  n.drink = Math.max(n.drink, warmFor);
}

/** Why a campfire cannot be lit here now (null = it can). */
export function campBlock(g: Game, pid: PlayerId): string | null {
  const p = g.p(pid);
  const c = g.ix.c.needs;
  if (!c || !p.needs) return g.ix.ui('err_not_now');
  if (p.travel || p.busy?.action.startsWith('go:')) return g.ix.ui('err_busy');
  if (p.fight !== null) return g.ix.ui('err_in_fight');
  if (g.sceneBlocksRoutine()) return g.ix.ui('err_in_scene');
  if (g.atHome(pid)) return g.ix.ui('err_not_now');
  if (c.campLight && ownsCount(g, c.campLight) <= 0) return g.ix.ui('err_no_light');
  if ((p.bag[c.campWood] ?? 0) < NEED.campWood) return g.ix.ui('err_no_wood');
  return null;
}

export function camp(g: Game, pid: PlayerId): Result {
  const block = campBlock(g, pid);
  if (block) return { ok: false, err: block };
  const p = g.p(pid);
  if (p.busy && p.busy.until > g.now) return g.fail('err_busy');
  addBag(g, pid, g.ix.c.needs!.campWood, -NEED.campWood);
  const fires = (g.s.fires ??= {});
  fires[p.at] = Math.max(fires[p.at] ?? 0, g.now) + NEED.campFor;
  p.busy = { action: 'camp', until: g.now + NEED.campBusy };
  g.log({ self: g.ix.ui('camp_self'), other: g.ix.ui('camp_other') }, pid);
  return { ok: true };
}

/** Why the hero cannot rest now (null = can). */
export function restBlock(g: Game, pid: PlayerId): string | null {
  const p = g.p(pid);
  if (!p.needs) return g.ix.ui('err_not_now');
  if (p.travel) return g.ix.ui('err_busy');
  if (p.fight !== null) return g.ix.ui('err_in_fight');
  if (g.sceneBlocksRoutine()) return g.ix.ui('err_in_scene');
  if (!byFire(g, pid)) return g.ix.ui(g.atHome(pid) ? 'err_cold_hearth' : 'err_no_fire');
  return null;
}

/** How many minutes a rest here would last. */
export function restLength(g: Game, pid: PlayerId): number {
  const comfort = g.atHome(pid) ? comfortOf(g, pid).filter((c) => c.on).length : 1;
  return restMinutes(comfort);
}

export function rest(g: Game, pid: PlayerId): Result {
  const block = restBlock(g, pid);
  if (block) return { ok: false, err: block };
  const p = g.p(pid);
  if (p.busy && p.busy.until > g.now) return g.fail('err_busy');
  const n = p.needs!;
  n.rested = restLength(g, pid) * MIN;
  n.awake = 0;
  p.busy = { action: 'rest:fire', until: g.now + NEED.restBusy };
  g.log({ self: g.ix.ui('rest_self'), other: g.ix.ui('rest_other') }, pid);
  return { ok: true };
}

/** A night's sleep after supper: rested by the home's comfort, warm and dry. */
export function nightRest(g: Game): void {
  for (const pid of g.joinedIds()) {
    const n = g.p(pid).needs;
    if (!n) continue;
    const comfort = comfortOf(g, pid).filter((c) => c.on).length;
    n.rested = Math.max(n.rested, restMinutes(comfort) * MIN);
    n.awake = 0;
    n.chill = 0;
    n.wet = 0;
  }
}
