// The hero: levels, skills, gear, the bag. Functions over a Game (they read and change its world).
import type { GearDef, PlayerId, SkillId, Slot, StatId } from '../../../shared/src/content.js';
import { SKILLS, SLOTS, STATS } from '../../../shared/src/content.js';
import { derive, levelFromXp, skillLevel, type Derived } from '../../../shared/src/rules.js';
import type { PlayerState } from '../../../shared/src/state.js';
import type { Game, Result } from './index.js';

export function gearOf(g: Game, id: string): GearDef | undefined {
  return g.ix.res.get(id)?.gear;
}

export function heroOf(g: Game, pid: PlayerId): Derived {
  const p = g.p(pid);
  return derive(p, (id) => gearOf(g, id));
}

/** Keep hpMax in step with level and gear (health is kept, clamped). */
export function refreshHero(g: Game, pid: PlayerId): void {
  const p = g.p(pid);
  const d = heroOf(g, pid);
  p.hpMax = d.hpMax;
  if (p.hp > p.hpMax) p.hp = p.hpMax;
}

export function skillOf(g: Game, pid: PlayerId, s: SkillId): number {
  return skillLevel(g.p(pid).skills[s] ?? 0);
}

export function gainSkill(g: Game, pid: PlayerId, s: SkillId, n = 1): void {
  const p = g.p(pid);
  const before = skillLevel(p.skills[s] ?? 0);
  p.skills[s] = (p.skills[s] ?? 0) + n;
  const after = skillLevel(p.skills[s]);
  if (after > before) {
    g.logRaw('find', { [pid]: `${g.ix.ui('skill_up')} ${g.ix.ui(`skill_${s}`)} — ${after}.` }, pid);
  }
}

export function gainXp(g: Game, pid: PlayerId, n: number): void {
  const p = g.p(pid);
  if (!p.joined || n <= 0) return;
  const before = p.level;
  p.xp += n;
  const after = levelFromXp(p.xp);
  if (after <= before) return;
  for (let lv = before + 1; lv <= after; lv++) {
    p.points += 1;
    if (g.ix.c.hero.perkLevels.includes(lv)) offerPerks(g, pid);
  }
  p.level = after;
  const oldMax = p.hpMax;
  refreshHero(g, pid);
  p.hp = Math.min(p.hpMax, p.hp + (p.hpMax - oldMax));
  g.logRaw('find', { [pid]: `${g.ix.ui('level_up')} ${after}.` }, pid);
  const other = g.other(pid);
  if (g.p(other).joined) g.logRaw('system', { [other]: g.render(g.ix.ui('level_up_other'), other, pid).replace('{n}', String(after)) }, pid);
}

/** Offer two or three perks the hero does not have yet. */
function offerPerks(g: Game, pid: PlayerId): void {
  const p = g.p(pid);
  if (p.perkChoice) return;
  const free = g.ix.c.perks.filter((x) => !p.perks.includes(x.id));
  if (!free.length) return;
  const pick: string[] = [];
  const pool = [...free];
  while (pick.length < 3 && pool.length) {
    const i = g.rng.int(0, pool.length - 1);
    pick.push(pool.splice(i, 1)[0]!.id);
  }
  p.perkChoice = pick;
}

export function spendPoint(g: Game, pid: PlayerId, stat: string): Result {
  const p = g.p(pid);
  if (!STATS.includes(stat as StatId) || p.points <= 0) return g.fail('err_not_now');
  p.stats[stat as StatId] += 1;
  p.points -= 1;
  const oldMax = p.hpMax;
  refreshHero(g, pid);
  if (p.hpMax > oldMax) p.hp += p.hpMax - oldMax;
  return { ok: true };
}

export function pickPerk(g: Game, pid: PlayerId, id: string): Result {
  const p = g.p(pid);
  if (!p.perkChoice?.includes(id)) return g.fail('err_not_now');
  p.perks.push(id);
  p.perkChoice = null;
  refreshHero(g, pid);
  return { ok: true };
}

// ----- the bag ---------------------------------------------------------------

export function weightOf(g: Game, id: string): number {
  return g.ix.res.get(id)?.weight ?? 1;
}

export function bagLoad(g: Game, pid: PlayerId): number {
  let w = 0;
  for (const [id, n] of Object.entries(g.p(pid).bag)) w += n * weightOf(g, id);
  return Math.round(w * 10) / 10;
}

export function bagCap(g: Game, pid: PlayerId): number {
  return heroOf(g, pid).carry;
}

/** Put into the bag as much as fits. Returns how many went in. */
export function addBag(g: Game, pid: PlayerId, id: string, n: number): number {
  const p = g.p(pid);
  if (n <= 0) {
    const have = p.bag[id] ?? 0;
    const take = Math.min(have, -n);
    if (take) {
      p.bag[id] = have - take;
      if (!p.bag[id]) delete p.bag[id];
    }
    return -take;
  }
  const w = weightOf(g, id);
  const room = bagCap(g, pid) - bagLoad(g, pid);
  const fit = w <= 0 ? n : Math.max(0, Math.min(n, Math.floor((room + 1e-9) / w)));
  if (fit > 0) {
    p.bag[id] = (p.bag[id] ?? 0) + fit;
    g.s.seenRes[id] = 1;
  }
  // the bag overflowed once: a bigger one becomes worth making
  if (fit < n) g.s.flags.bag_full = 1;
  return fit;
}

/** Home: the bag goes into the store (consumables stay packed). */
export function unloadBag(g: Game, pid: PlayerId): Record<string, number> {
  const p = g.p(pid);
  const moved: Record<string, number> = {};
  for (const [id, n] of Object.entries(p.bag)) {
    const def = g.ix.res.get(id);
    if (def?.kind === 'use') continue;
    const got = g.addRes(id, n);
    if (got > 0) moved[id] = got;
    // what does not fit stays in the bag
    const left = n - Math.max(0, got);
    if (left > 0) p.bag[id] = left;
    else delete p.bag[id];
  }
  return moved;
}

export function pack(g: Game, pid: PlayerId, id: string, n: number): Result {
  const p = g.p(pid);
  if (!g.atHome(pid)) return g.fail('err_not_home');
  const def = g.ix.res.get(id);
  if (!def || def.hidden || !Number.isInteger(n) || n === 0) return g.fail('err_not_now');
  if (n > 0) {
    const have = g.s.res[id] ?? 0;
    const want = Math.min(n, have);
    if (want <= 0) return g.fail('err_cost');
    const got = addBag(g, pid, id, want);
    if (got <= 0) return g.fail('err_bag_full');
    g.s.res[id] = have - got;
  } else {
    const have = p.bag[id] ?? 0;
    const back = Math.min(-n, have);
    if (back <= 0) return g.fail('err_not_now');
    const got = g.addRes(id, back);
    if (got <= 0) return g.fail('err_full');
    addBag(g, pid, id, -got);
  }
  return { ok: true };
}

export function drop(g: Game, pid: PlayerId, id: string, n: number): Result {
  const p = g.p(pid);
  const have = p.bag[id] ?? 0;
  const k = Math.min(have, Math.max(1, Math.floor(n)));
  if (k <= 0) return g.fail('err_not_now');
  if (g.atHome(pid)) g.addRes(id, k);
  addBag(g, pid, id, -k);
  return { ok: true };
}

// ----- gear ------------------------------------------------------------------

/** How many of an item exist: stored, worn and carried by both. */
export function ownsCount(g: Game, id: string): number {
  let n = g.s.res[id] ?? 0;
  for (const pid of g.joinedIds()) {
    const p = g.p(pid);
    n += p.bag[id] ?? 0;
    for (const slot of SLOTS) if (p.equip[slot] === id) n += 1;
  }
  return n;
}

export function equip(g: Game, pid: PlayerId, slot: string, id: string | null): Result {
  const p = g.p(pid);
  if (!SLOTS.includes(slot as Slot)) return g.fail('err_not_now');
  if (!g.atHome(pid)) return g.fail('err_not_home');
  if (p.fight !== null) return g.fail('err_in_fight');
  const s = slot as Slot;
  const cur = p.equip[s];
  if (id === null) {
    if (!cur) return g.fail('err_not_now');
    g.addRes(cur, 1);
    delete p.equip[s];
    refreshHero(g, pid);
    return { ok: true };
  }
  const gear = gearOf(g, id);
  if (!gear || gear.slot !== s) return g.fail('err_not_now');
  if ((g.s.res[id] ?? 0) < 1) return g.fail('err_cost');
  g.s.res[id] = (g.s.res[id] ?? 0) - 1;
  if (cur) g.addRes(cur, 1);
  p.equip[s] = id;
  refreshHero(g, pid);
  return { ok: true };
}

export const OUTFITS = ['fight', 'work'];

export function outfit(g: Game, pid: PlayerId, name: string, save: boolean): Result {
  const p = g.p(pid);
  if (!OUTFITS.includes(name)) return g.fail('err_not_now');
  if (save) {
    p.sets[name] = { ...p.equip };
    return { ok: true };
  }
  if (!g.atHome(pid)) return g.fail('err_not_home');
  const want = p.sets[name];
  if (!want) return g.fail('err_not_now');
  // take everything off that differs, then put on what is there
  for (const slot of SLOTS) {
    const cur = p.equip[slot];
    if (cur && cur !== want[slot]) {
      g.addRes(cur, 1);
      delete p.equip[slot];
    }
  }
  for (const slot of SLOTS) {
    const id = want[slot];
    if (!id || p.equip[slot] === id) continue;
    if ((g.s.res[id] ?? 0) < 1) continue; // the partner wears it, or it is gone
    g.s.res[id] = (g.s.res[id] ?? 0) - 1;
    p.equip[slot] = id;
  }
  refreshHero(g, pid);
  return { ok: true };
}

/** One line about a piece of gear: «Броня 2 · Урон 2–4 · від отрути». */
export function gearNote(g: Game, id: string): string {
  const def = g.ix.res.get(id);
  const gear = def?.gear;
  if (!gear) return def?.use ? useNote(g, id) : '';
  const parts: string[] = [];
  if (gear.dmg) parts.push(`${g.ix.ui('st_dmg')} ${gear.dmg[0]}–${gear.dmg[1]}`);
  if (gear.armor) parts.push(`${g.ix.ui('st_armor')} ${gear.armor}`);
  if (gear.hp) parts.push(`${g.ix.ui('st_hp')} +${gear.hp}`);
  if (gear.acc) parts.push(`${g.ix.ui('st_acc')} ${gear.acc > 0 ? '+' : '−'}${Math.round(Math.abs(gear.acc) * 100)}%`);
  if (gear.dodge) parts.push(`${g.ix.ui('st_dodge')} +${Math.round(gear.dodge * 100)}%`);
  if (gear.carry) parts.push(`${g.ix.ui('st_carry')} +${gear.carry}`);
  for (const t of gear.tags ?? []) parts.push(g.ix.ui(`tag_${t}`));
  for (const r of gear.resist ?? []) parts.push(g.ix.ui(`resist_${r}`));
  if (gear.speed) parts.push(`${g.ix.ui('st_speed')} +${Math.round(gear.speed * 100)}%`);
  return parts.join(' · ');
}

export function useNote(g: Game, id: string): string {
  const u = g.ix.res.get(id)?.use;
  if (!u) return '';
  const parts: string[] = [];
  if (u.heal) parts.push(`${g.ix.ui('st_heal')} +${u.heal}`);
  if (u.dmg) parts.push(`${g.ix.ui('st_dmg')} ${u.dmg[0]}–${u.dmg[1]}`);
  for (const c of u.cure ?? []) parts.push(g.ix.ui(`cure_${c}`));
  if (u.scare) parts.push(`${g.ix.ui('scare')} ${g.ix.c.traits[u.scare.trait]?.name ?? ''}`.trim());
  return parts.join(' · ');
}

export function blankHero(): Pick<
  PlayerState,
  'level' | 'xp' | 'points' | 'stats' | 'perks' | 'perkChoice' | 'skills' | 'equip' | 'sets' | 'bag' | 'travel' | 'fight' | 'poison' | 'regenAt'
> {
  const skills = {} as Record<SkillId, number>;
  for (const s of SKILLS) skills[s] = 0;
  const stats = {} as Record<StatId, number>;
  for (const s of STATS) stats[s] = 2;
  return { level: 1, xp: 0, points: 0, stats, perks: [], perkChoice: null, skills, equip: {}, sets: {}, bag: {}, travel: null, fight: null, poison: 0, regenAt: 0 };
}

/** Rest heals: one point every 15 s by the fire at home, every 45 s elsewhere (never in a fight). */
export const REGEN_HOME = 15_000;
export const REGEN_AWAY = 45_000;

export function settleHealth(g: Game): boolean {
  let changed = false;
  for (const pid of g.joinedIds()) {
    const p = g.p(pid);
    if (!p.regenAt) p.regenAt = g.now;
    if (p.fight !== null || p.hp >= p.hpMax) {
      p.regenAt = g.now;
      continue;
    }
    const every = g.atHome(pid) ? REGEN_HOME : REGEN_AWAY;
    const n = Math.floor((g.now - p.regenAt) / every);
    if (n <= 0) continue;
    p.hp = Math.min(p.hpMax, p.hp + n);
    p.regenAt += n * every;
    changed = true;
  }
  return changed;
}
