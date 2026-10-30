// Fights of part two on a field of cells (`.design/combat3.md`): everyone takes turns in order of
// initiative, a turn is a handful of action points to walk and strike; reach, sight and cover matter.
// Strong moves come from what the hero holds; a dazed or open foe is the other one's chance. The foes'
// minds are in tactics.ts.
import type { EnemyDef, EnemyMove, PlayerId, TraitId } from '../../../shared/src/content.js';
import { FOE, PERK, TECH, foeRamp, foeXpFactor, hitChance } from '../../../shared/src/rules.js';
import { coverFrom, dist, feature, key, neighbours, reach, run, sees, type Cell, type Field } from '../../../shared/src/field.js';
import type { FightEvent, FightState, FoeState } from '../../../shared/src/state.js';
import { addBag, gainSkill, gainXp, heroOf, refreshHero } from './hero.js';
import { skyAt } from './weather.js';
import { makeField, standable } from './terrain.js';
import { dogTurn, foeTurn, planIntent } from './tactics.js';
import type { Game, Result } from './index.js';

/** How long a beaten hero lies before getting up at home. */
export const DEFEAT_BUSY = 60_000;

/** Action points of a hero's turn; walking a cell costs 1 (2 through shallows, reeds, bushes). */
export const HERO_AP = 4;
/** Reach of a shot and of a thrown thing. */
export const SHOT_RANGE = 6;
export const THROW_RANGE = 3;
/** Each point left unspent at the end of a turn cuts the blows taken until the next one. */
export const GUARD_PER_AP = 0.15;
export const GUARD_MAX = 0.6;

export function enemyOf(g: Game, id: string): EnemyDef {
  const e = g.ix.enemies.get(id);
  if (!e) throw new Error(`Unknown enemy ${id}`);
  return e;
}

export function fightOf(g: Game, pid: PlayerId): FightState | null {
  const id = g.p(pid).fight;
  if (id === null) return null;
  return g.s.fights.find((f) => f.id === id) ?? null;
}

export function activeFoes(f: FightState): FoeState[] {
  return f.foes.filter((x) => !x.out);
}

export function up(g: Game, f: FightState, pid: PlayerId): boolean {
  return f.party.includes(pid) && !f.down.includes(pid) && !f.fled.includes(pid) && g.p(pid).hp > 0;
}

export function alive(g: Game, f: FightState): PlayerId[] {
  return f.party.filter((pid) => up(g, f, pid));
}

/** Who holds this hero (grab, drag, leech). */
export function holder(f: FightState, pid: PlayerId): FoeState | undefined {
  return f.foes.find((x) => !x.out && x.holds === pid);
}

/** Held so that you cannot walk or strike anyone else (a leech only drinks; a grab or a drag pins you). */
export function pinned(g: Game, f: FightState, pid: PlayerId): FoeState | undefined {
  return f.foes.find((x) => !x.out && x.holds === pid && !enemyOf(g, x.enemy).traits.includes('leech'));
}

export function armorOf(def: EnemyDef, foe: FoeState): number {
  const ph = foe.phase > 0 ? def.phases?.[foe.phase - 1] : undefined;
  return ph?.armor ?? def.armor ?? 0;
}

export function aiOf(def: EnemyDef, foe: FoeState): EnemyMove[] {
  const ph = foe.phase > 0 ? def.phases?.[foe.phase - 1] : undefined;
  return ph?.ai ?? def.ai;
}

export function isOpen(f: FightState, foe: FoeState): boolean {
  return (foe.open ?? 0) >= f.round;
}

export const fid = (foe: FoeState) => `f${foe.uid}`;

function perk(g: Game, pid: PlayerId, id: string): boolean {
  return g.p(pid).perks.includes(id);
}

/** A once-a-fight (or once-a-turn, with the round in the key) perk: true the first time only. */
function once(f: FightState, k: string): boolean {
  if ((f.used ??= []).includes(k)) return false;
  f.used.push(k);
  return true;
}

/** Action points of a hero's turn (one more in the first round for a watchful one). */
function heroAp(g: Game, f: FightState, pid: PlayerId): number {
  return HERO_AP + (f.round === 1 && perk(g, pid, 'watch') ? 1 : 0);
}

/** Keep the last beats; each gets its running number. */
export function ev(f: FightState, e: FightEvent): void {
  f.seq = (f.seq ?? 0) + 1;
  const list = (f.events ??= []);
  list.push({ ...e, s: f.seq });
  if (list.length > 60) list.splice(0, list.length - 60);
}

// ----- the field: who stands where ---------------------------------------------------

export function fieldOf(f: FightState): Field {
  return f.field!;
}

export function heroPos(f: FightState, pid: PlayerId): Cell | undefined {
  return f.pos?.[pid];
}

/** Where a unit (player id, `f<uid>`, `dog`) stands. */
export function posOf(f: FightState, id: string): Cell | undefined {
  if (id === 'dog') return f.dogPos ?? undefined;
  if (id.startsWith('f')) return f.foes.find((x) => fid(x) === id && !x.out)?.pos;
  return f.pos?.[id as PlayerId];
}

/** Cells where someone stands (heroes who are down still lie there). */
export function taken(g: Game, f: FightState, except?: string): Set<string> {
  const out = new Set<string>();
  for (const pid of f.party) {
    if (pid === except || f.fled.includes(pid)) continue;
    const c = heroPos(f, pid);
    if (c) out.add(key(c));
  }
  for (const foe of activeFoes(f)) if (foe.pos && fid(foe) !== except) out.add(key(foe.pos));
  if (f.dog && f.dogPos && except !== 'dog') out.add(key(f.dogPos));
  return out;
}

export function heroAt(g: Game, f: FightState, c: Cell): PlayerId | undefined {
  return f.party.find((pid) => up(g, f, pid) && heroPos(f, pid) && key(heroPos(f, pid)!) === key(c));
}

export function foeAt(f: FightState, c: Cell): FoeState | undefined {
  return activeFoes(f).find((x) => x.pos && key(x.pos) === key(c));
}

/** A free cell to stand on, taken at random from `pool`. */
function freeCell(g: Game, f: FightState, pool: Cell[], swim = false): Cell | undefined {
  const fld = fieldOf(f);
  const busy = taken(g, f);
  const ok = pool.filter((c) => !busy.has(key(c)) && (swim ? !!feature(fld, c).deep || !!feature(fld, c).wet : standable(fld, c)));
  return ok.length ? g.rng.pick(ok) : undefined;
}

function rows(f: Field, ys: number[]): Cell[] {
  const out: Cell[] = [];
  for (const y of ys) for (let x = 0; x < f.w; x++) out.push([x, y]);
  return out;
}

export function swimmer(def: EnemyDef): boolean {
  return def.traits.includes('drag') || (def.hidden ?? []).includes('drag');
}

function placeFoe(g: Game, f: FightState, foe: FoeState): void {
  const fld = fieldOf(f);
  const def = enemyOf(g, foe.enemy);
  if (swimmer(def)) {
    const wet = rows(fld, [0, 1, 2, 3, 4, 5]).filter((c) => feature(fld, c).deep || feature(fld, c).wet);
    const c = freeCell(g, f, wet, true);
    if (c) {
      foe.pos = c;
      return;
    }
  }
  foe.pos = freeCell(g, f, rows(fld, [0, 1])) ?? freeCell(g, f, rows(fld, [0, 1, 2, 3])) ?? freeCell(g, f, rows(fld, [0, 1, 2, 3, 4, 5, 6, 7]));
}

function placeHero(g: Game, f: FightState, pid: PlayerId): void {
  const fld = fieldOf(f);
  const mid = Math.floor(fld.w / 2);
  const bottom = rows(fld, [fld.h - 1]).sort((a, b) => Math.abs(a[0] - mid) - Math.abs(b[0] - mid));
  const busy = taken(g, f);
  const c = bottom.find((x) => !busy.has(key(x)) && standable(fld, x)) ?? freeCell(g, f, rows(fld, [fld.h - 2, fld.h - 1]));
  (f.pos ??= {})[pid] = c ?? [mid, fld.h - 1];
}

function placeDog(g: Game, f: FightState): void {
  const hunter = f.party.find((pid) => g.p(pid).role === 'hunter') ?? f.party[0]!;
  const at = heroPos(f, hunter);
  const busy = taken(g, f);
  const near = at ? neighbours(fieldOf(f), at).filter((c) => !busy.has(key(c)) && standable(fieldOf(f), c)) : [];
  f.dogPos = near.length ? g.rng.pick(near) : (freeCell(g, f, rows(fieldOf(f), [fieldOf(f).h - 1, fieldOf(f).h - 2])) ?? null);
}

// ----- toughness ---------------------------------------------------------------------

/** Health of a foe as it comes into this fight: tougher than written, more so against two. */
function foeHp(def: EnemyDef, duo: boolean): number {
  return Math.round(def.hp * hpMult(def, duo));
}

function hpMult(def: EnemyDef, duo: boolean): number {
  if (def.phases) return FOE.bossHp * (duo ? FOE.bossDuoHp : 1);
  return foeRamp(FOE.hp, def.level) * (duo ? foeRamp(FOE.duoHp, def.level) : 1);
}

function dmgMult(def: EnemyDef, duo: boolean): number {
  if (def.phases) return FOE.bossDmg;
  return foeRamp(FOE.dmg, def.level) * (duo ? foeRamp(FOE.duoDmg, def.level) : 1);
}

/** Fear it takes before fleeing: as much more as its health is. */
export function moraleOf(f: FightState, def: EnemyDef): number | undefined {
  return def.morale === undefined ? undefined : Math.round(def.morale * hpMult(def, !!f.duo));
}

/** Is a boss in this fight (its people are not toughened for two: the boss is the fight). */
function bossFight(g: Game, f: FightState): boolean {
  return f.foes.some((x) => !!enemyOf(g, x.enemy).phases);
}

/** Two heroes against them: the foes stand longer (once per fight, kept for those who come later). */
function toughen(g: Game, f: FightState): void {
  if (f.duo || f.party.length < 2) return;
  f.duo = true;
  const boss = bossFight(g, f);
  for (const foe of activeFoes(f)) {
    const def = enemyOf(g, foe.enemy);
    if (boss && !def.phases) continue;
    const k = hpMult(def, true) / hpMult(def, false);
    foe.hp = Math.round(foe.hp * k);
    foe.hpMax = Math.round(foe.hpMax * k);
  }
}

export function newFoe(g: Game, f: FightState, enemy: string): FoeState {
  const def = enemyOf(g, enemy);
  const hp = foeHp(def, !!f.duo && (!!def.phases || !bossFight(g, f)));
  return {
    uid: f.nextUid++,
    enemy,
    hp,
    hpMax: hp,
    fear: 0,
    out: null,
    intent: null,
    next: null,
    holds: null,
    calling: 0,
    phase: 0,
    joined: f.round,
    acted: 0,
    used: [],
  };
}

/** A foe comes onto the field (when called, in a boss's new phase). */
export function bringFoe(g: Game, f: FightState, enemy: string): FoeState {
  const foe = newFoe(g, f, enemy);
  f.foes.push(foe);
  placeFoe(g, f, foe);
  if (!foe.pos) {
    foe.out = 'fled';
    return foe;
  }
  (f.order ??= []).push(fid(foe));
  meet(g, enemy);
  return foe;
}

function meet(g: Game, enemy: string, pid?: PlayerId): void {
  const def = enemyOf(g, enemy);
  const b = (g.s.bestiary[enemy] ??= { seen: 0, beaten: 0, known: [] });
  b.seen += 1;
  for (const t of def.traits) if (!b.known.includes(t)) b.known.push(t);
  // a sharp eye sees everything at once
  if (pid && g.p(pid).perks.includes('eye')) for (const t of def.hidden ?? []) if (!b.known.includes(t)) b.known.push(t);
}

export function reveal(g: Game, f: FightState, enemy: string, trait: TraitId): void {
  const b = (g.s.bestiary[enemy] ??= { seen: 0, beaten: 0, known: [] });
  if (b.known.includes(trait)) return;
  b.known.push(trait);
  const def = enemyOf(g, enemy);
  const tn = g.ix.c.traits[trait]?.name ?? trait;
  for (const pid of f.party) pushLine(f, pid, `${g.ix.ui('fight_trait')} ${def.name}: ${tn}.`);
}

function pushLine(f: FightState, pid: PlayerId, line: string): void {
  const l = (f.lines[pid] ??= []);
  l.push(line);
  if (l.length > 12) l.splice(0, l.length - 12);
}

// ----- starting and joining --------------------------------------------------

export function startFight(
  g: Game,
  area: string,
  foes: Array<{ enemy: string; n?: number }>,
  opts: { scene?: boolean; party?: PlayerId[]; field?: Field; starts?: { heroes: Cell[]; foes: Cell[] } } = {},
): FightState {
  const party = (opts.party ?? g.joinedIds().filter((pid) => canJoin(g, pid, area))).slice();
  // a new fight puts the last one out of sight (and what was left to take from it goes into the bag)
  for (const pid of party) {
    if (g.s.afterFight?.[pid]?.loot) takeLoot(g, pid);
    delete g.s.afterFight?.[pid];
  }
  const f: FightState = {
    id: g.s.nextFightId++,
    area,
    scene: !!opts.scene,
    party,
    dog: false,
    foes: [],
    round: 1,
    lines: { p1: [], p2: [] },
    nextUid: 1,
    down: [],
    fled: [],
    startedAt: g.now,
    duo: party.length > 1,
    field: opts.field ?? makeField(g.rng, g.ix.c.areas.find((a) => a.id === area)?.scene),
    pos: {},
    order: [],
    turn: -1,
    ap: 0,
    guard: {},
    stance: {},
  };
  // a ground drawn by hand says where each side comes in; the rest find a place as usual
  const heroStarts = [...(opts.starts?.heroes ?? [])];
  const foeStarts = [...(opts.starts?.foes ?? [])];
  for (const pid of party) {
    const c = heroStarts.shift();
    if (c) (f.pos ??= {})[pid] = c;
    else placeHero(g, f, pid);
  }
  f.dog = dogWith(g, party);
  if (f.dog) placeDog(g, f);
  for (const e of foes)
    for (let i = 0; i < (e.n ?? 1); i++) {
      const foe = newFoe(g, f, e.enemy);
      f.foes.push(foe);
      const c = foeStarts.shift();
      if (c && !taken(g, f).has(key(c))) foe.pos = c;
      else placeFoe(g, f, foe);
      if (!foe.pos) foe.out = 'fled';
    }
  for (const pid of party) {
    const p = g.p(pid);
    p.fight = f.id;
    p.busy = null;
    p.poison = 0;
  }
  for (const e of new Set(f.foes.map((x) => x.enemy))) meet(g, e, party.find((pid) => g.p(pid).perks.includes('eye')));
  g.s.fights.push(f);
  f.order = initiative(g, f);
  for (const foe of activeFoes(f)) planIntent(g, f, foe);
  const names = summarize(g, f);
  for (const pid of party) f.lines[pid] = [g.ix.ui('fight_start').replace('{foes}', names)];
  for (const pid of party) g.logRaw('warn', { [pid]: g.ix.ui('fight_start').replace('{foes}', names) }, pid);
  nextTurn(g, f);
  return f;
}

/** Who moves first: the quick, the sharp-eyed, then the rest. */
function initiative(g: Game, f: FightState): string[] {
  const all: Array<{ id: string; v: number }> = [];
  for (const pid of f.party) all.push({ id: pid, v: 10 + g.p(pid).stats.agi + (perk(g, pid, 'watch') ? PERK.watchInit : 0) + g.rng.int(0, 3) + 0.1 });
  for (const foe of activeFoes(f)) {
    const def = enemyOf(g, foe.enemy);
    all.push({ id: fid(foe), v: 8 + def.level / 2 + (def.traits.includes('fast') ? 6 : 0) + g.rng.int(0, 3) });
  }
  if (f.dog) all.push({ id: 'dog', v: 11 + g.rng.int(0, 3) });
  return all.sort((a, b) => b.v - a.v).map((x) => x.id);
}

function summarize(g: Game, f: FightState): string {
  const count = new Map<string, number>();
  for (const x of f.foes) count.set(x.enemy, (count.get(x.enemy) ?? 0) + 1);
  return [...count.entries()].map(([id, n]) => `${enemyOf(g, id).name}${n > 1 ? ` ×${n}` : ''}`).join(', ');
}

function dogWith(g: Game, party: PlayerId[]): boolean {
  const dog = g.ix.c.dog;
  if (!dog || !g.flag(dog.flag)) return false;
  return party.some((pid) => g.p(pid).role === 'hunter');
}

export function canJoin(g: Game, pid: PlayerId, area: string): boolean {
  const p = g.p(pid);
  return p.joined && p.online && p.at === area && !p.travel && p.fight === null && p.hp > 0;
}

/** Join the partner's fight here: come in from below, move from the next round. */
export function help(g: Game, pid: PlayerId): Result {
  const o = g.p(g.other(pid));
  const f = o.fight !== null ? g.s.fights.find((x) => x.id === o.fight) : undefined;
  if (!f || f.scene || !canJoin(g, pid, f.area)) return g.fail('err_not_now');
  f.party.push(pid);
  g.p(pid).fight = f.id;
  g.p(pid).busy = null;
  placeHero(g, f, pid);
  (f.order ??= []).push(pid);
  if (!f.dog && dogWith(g, [pid])) {
    f.dog = true;
    placeDog(g, f);
    f.order.push('dog');
  }
  toughen(g, f);
  f.lines[pid] = [g.render(g.ix.ui('fight_join_self'), pid)];
  pushLine(f, g.other(pid), g.render(g.ix.ui('fight_join_other'), g.other(pid), pid));
  ev(f, { a: pid, k: 'come' });
  for (const e of new Set(activeFoes(f).map((x) => x.enemy))) meet(g, e, pid);
  return { ok: true };
}

// ----- whose turn ------------------------------------------------------------------

/** The one whose turn it is. */
export function activeId(f: FightState): string | undefined {
  return f.order?.[f.turn ?? -1];
}

function ended(g: Game, f: FightState): boolean {
  return !g.s.fights.includes(f);
}

/** Has the fight been decided? Ends it if so. */
function checkEnd(g: Game, f: FightState): boolean {
  if (ended(g, f)) return true;
  if (!activeFoes(f).length) {
    finishFight(g, f, 'win');
    return true;
  }
  if (!alive(g, f).length) {
    finishFight(g, f, f.down.length > 0 ? 'lose' : 'fled');
    return true;
  }
  return false;
}

/** Move on to the next one in order; foes and the dog take their turns at once, a hero's turn waits. */
export function nextTurn(g: Game, f: FightState): void {
  for (let guard = 0; guard < 400; guard++) {
    if (checkEnd(g, f)) return;
    f.turn = (f.turn ?? -1) + 1;
    if (f.turn >= (f.order ?? []).length) {
      endOfRound(g, f);
      if (checkEnd(g, f)) return;
      f.round += 1;
      f.turn = 0;
      f.order = (f.order ?? []).filter((id) =>
        id === 'dog' ? f.dog : id.startsWith('f') ? f.foes.some((x) => fid(x) === id && !x.out) : f.party.includes(id as PlayerId) && !f.fled.includes(id as PlayerId),
      );
      if (!f.order.length) return;
    }
    const id = f.order![f.turn]!;
    // what was held up until this one's turn lets go now
    delete f.guard?.[id];
    delete f.stance?.[id];
    if (id === 'dog') {
      if (f.dog) dogTurn(g, f);
      continue;
    }
    if (id.startsWith('f')) {
      const foe = f.foes.find((x) => fid(x) === id);
      if (!foe || foe.out) continue;
      foe.guarding = false;
      foe.acted += 1;
      if (foe.stun) {
        foe.stun = false;
        say(g, f, 'fight_stunned', null, foeVars(g, foe, f));
        planIntent(g, f, foe);
        continue;
      }
      foeTurn(g, f, foe);
      if (!foe.out) planIntent(g, f, foe);
      continue;
    }
    const pid = id as PlayerId;
    if (!up(g, f, pid)) continue;
    const p = g.p(pid);
    if (p.poison > 0) {
      p.poison -= 1;
      say(g, f, 'fight_poison_tick', pid, { n: 2 });
      ev(f, { a: pid, k: 'tick', n: 2 });
      hurtHero(g, f, pid, 2);
      if (!up(g, f, pid)) continue;
    }
    if (perk(g, pid, 'second') && p.hp < p.hpMax * PERK.secondBelow && once(f, `${pid}:second`)) {
      const n = Math.max(1, Math.round(p.hpMax * PERK.secondHeal));
      p.hp = Math.min(p.hpMax, p.hp + n);
      say(g, f, 'fight_second', pid, {});
      ev(f, { a: pid, t: pid, k: 'heal', n });
    }
    if (!p.online) {
      // everyone is away (or it is a story fight, which is fought together): it waits on this turn
      if (f.scene || !f.party.some((x) => x !== pid && up(g, f, x) && g.p(x).online)) {
        f.ap = 0;
        return;
      }
      // away while the other plays: stands guard with all of a turn
      (f.guard ??= {})[pid] = GUARD_MAX;
      continue;
    }
    f.ap = heroAp(g, f, pid);
    return;
  }
}

/** A hero ends the turn: what is left unspent becomes guard. */
function endTurn(g: Game, f: FightState, pid: PlayerId): void {
  const left = f.ap ?? 0;
  if (left > 0) {
    (f.guard ??= {})[pid] = Math.min(GUARD_MAX, left * (perk(g, pid, 'stance') ? PERK.stanceGuard : GUARD_PER_AP));
    say(g, f, 'fight_guard', pid, {});
    ev(f, { a: pid, k: 'guard' });
  }
  f.ap = 0;
  nextTurn(g, f);
}

/**
 * The game calls this when someone comes or goes: the turn of one who is away passes by itself while the
 * other plays; one who comes back to their own waiting turn gets to play it.
 */
export function maybeResolve(g: Game, f: FightState): void {
  const id = activeId(f);
  if (!id || id.startsWith('f') || id === 'dog') return;
  const pid = id as PlayerId;
  if (g.p(pid).online) {
    if ((f.ap ?? 0) === 0 && up(g, f, pid)) f.ap = heroAp(g, f, pid);
    return;
  }
  if (f.scene || !f.party.some((x) => x !== pid && up(g, f, x) && g.p(x).online)) return;
  (f.guard ??= {})[pid] = GUARD_MAX;
  f.ap = 0;
  nextTurn(g, f);
}

// ----- what a hero can do ------------------------------------------------------

export interface FightMove {
  id: string;
  label: string;
  enabled: boolean;
  reason?: string;
  group: 'hit' | 'self' | 'help' | 'item' | 'out';
  /** A move of the hand: which hand, its name alone, its price in action points, the damage it does. */
  tech?: string;
  hand?: 'main' | 'off';
  cost?: number;
  dmg?: [number, number];
  /** Aimed at this foe. */
  target?: number;
  /** How far it reaches. */
  range?: number;
  /** A move a perk gives. */
  perk?: boolean;
}

/** What the things in a hero's hands let them do. */
export interface Tech {
  id: string;
  hand: 'main' | 'off';
  cost: number;
  /** Aimed at a foe (else a stance). */
  aimed: boolean;
  /** How far it reaches (1: the next cell). */
  range: number;
  dmg?: [number, number];
}

function scaled(d: [number, number], m: number): [number, number] {
  return [Math.max(1, Math.round(d[0] * m)), Math.max(1, Math.round(d[1] * m))];
}

export function techsOf(g: Game, pid: PlayerId): Tech[] {
  const h = heroOf(g, pid);
  const armed = !!g.p(pid).equip.weapon;
  const long = h.tags.has('reach') ? 2 : 1;
  const out: Tech[] = [];
  if (h.ranged) {
    out.push({ id: 'shoot', hand: 'main', cost: 2, aimed: true, range: SHOT_RANGE + (perk(g, pid, 'farshot') ? PERK.farRange : 0), dmg: h.dmg });
    out.push({ id: 'aim', hand: 'main', cost: 1, aimed: false, range: 0 });
  } else {
    out.push({ id: 'hit', hand: 'main', cost: 2, aimed: true, range: long, dmg: h.dmg });
    if (h.tags.has('blunt')) out.push({ id: 'stun', hand: 'main', cost: 3, aimed: true, range: 1, dmg: scaled(h.dmg, TECH.stunDmg) });
    if (h.tags.has('cleave')) out.push({ id: 'chop', hand: 'main', cost: 3, aimed: true, range: 1, dmg: scaled(h.dmg, TECH.chop) });
    if (h.tags.has('pierce')) out.push({ id: 'thrust', hand: 'main', cost: 2, aimed: true, range: long, dmg: h.dmg });
    if (h.tags.has('reach')) out.push({ id: 'keep', hand: 'main', cost: 1, aimed: false, range: 0 });
    const plain = !['blunt', 'cleave', 'pierce'].some((t) => h.tags.has(t as 'blunt'));
    if (armed && (plain || perk(g, pid, 'tempest'))) out.push({ id: 'flurry', hand: 'main', cost: perk(g, pid, 'tempest') ? 2 : 3, aimed: true, range: 1, dmg: h.dmg });
  }
  if (perk(g, pid, 'swift')) for (const t of out) if (t.id === 'stun' || t.id === 'chop' || t.id === 'flurry') t.cost -= 1;
  if (h.shield) {
    out.push({ id: 'block', hand: 'off', cost: 2, aimed: false, range: 0 });
    out.push({ id: 'bash', hand: 'off', cost: 2, aimed: true, range: 1, dmg: [1, 3] });
  }
  return out;
}

/** What a blow at this foe costs now: perks take a point off a blow at an open foe, a first-round shot. */
function techCost(g: Game, f: FightState, pid: PlayerId, t: Tech, foe: FoeState): number {
  let c = t.cost;
  if (perk(g, pid, 'opening') && !heroOf(g, pid).ranged && isOpen(f, foe)) c -= 1;
  if (t.id === 'shoot' && perk(g, pid, 'volley') && !(f.used ?? []).includes(`${pid}:walked:${f.round}`)) c -= 1;
  return Math.max(1, c);
}

function ammoLeft(g: Game, pid: PlayerId, ammo: string): number {
  return g.p(pid).bag[ammo] ?? 0;
}

/** All the foes are far beneath the heroes: they can be driven off without a fight. */
function canRout(g: Game, f: FightState): boolean {
  if (f.scene) return false;
  const live = alive(g, f);
  if (!live.length) return false;
  const low = Math.min(...live.map((pid) => g.p(pid).level));
  return activeFoes(f).every((x) => enemyOf(g, x.enemy).level <= low - FOE.rout);
}

/** Can a blow of this reach go from one cell to the other (next to it, or seen in a straight shot)? */
export function inReach(f: FightState, from: Cell, to: Cell, range: number): boolean {
  const d = dist(from, to);
  if (d < 1 || d > range) return false;
  if (d === 1) return true;
  return sees(fieldOf(f), from, to);
}

export function adjacent(a: Cell | undefined, b: Cell | undefined): boolean {
  return !!a && !!b && dist(a, b) === 1;
}

/** Cells this hero can walk to now, with their price. */
export function walkable(g: Game, f: FightState, pid: PlayerId): Map<string, { cost: number; path: Cell[] }> {
  const at = heroPos(f, pid);
  if (!at || activeId(f) !== pid || pinned(g, f, pid)) return new Map();
  const all = reach(fieldOf(f), at, f.ap ?? 0, taken(g, f, pid));
  all.delete(key(at));
  return all;
}

export function fightMoves(g: Game, f: FightState, pid: PlayerId): FightMove[] {
  const out: FightMove[] = [];
  if (!up(g, f, pid) || activeId(f) !== pid) return out;
  const ui = (k: string) => g.ix.ui(k);
  const h = heroOf(g, pid);
  const p = g.p(pid);
  const at = heroPos(f, pid)!;
  const fld = fieldOf(f);
  const other = f.party.find((x) => x !== pid);
  const ap = f.ap ?? 0;
  const noAp = ui('fm_no_ap');
  const held = pinned(g, f, pid);
  if (held) out.push({ id: 'struggle', label: ui('fm_struggle'), enabled: ap >= 2, ...(ap >= 2 ? {} : { reason: noAp }), group: 'self', cost: 2 });
  for (const t of techsOf(g, pid)) {
    const name = ui(`tech_${t.id}`);
    const base = t.id === 'hit' || t.id === 'shoot';
    const noAmmo = t.id === 'shoot' && h.ammo && ammoLeft(g, pid, h.ammo) <= 0;
    const common = { tech: t.id, hand: t.hand, cost: t.cost, range: t.range, ...(t.dmg ? { dmg: t.dmg } : {}) };
    if (!t.aimed) {
      const ok = t.cost <= ap && !held;
      out.push({ id: `t:${t.id}`, label: name, enabled: ok, ...(ok ? {} : { reason: noAp }), group: 'self', ...common });
      continue;
    }
    for (const foe of activeFoes(f)) {
      if (!foe.pos) continue;
      const def = enemyOf(g, foe.enemy);
      const id = base ? `${t.id}:${foe.uid}` : `t:${t.id}:${foe.uid}`;
      const near = inReach(f, at, foe.pos, t.range);
      // held fast: only the one who holds you can be struck
      const heldOff = !!held && held !== foe;
      const cost = techCost(g, f, pid, t, foe);
      const ok = cost <= ap && !noAmmo && near && !heldOff;
      const reason = noAmmo
        ? `${ui('fm_no_ammo')} ${g.ix.res.get(h.ammo!)?.name ?? ''}`.trim()
        : heldOff
          ? ui('fm_held')
          : !near
            ? dist(at, foe.pos) > t.range
              ? ui('fm_too_far')
              : ui('fm_no_sight')
            : cost > ap
              ? noAp
              : undefined;
      out.push({ id, label: `${name}: ${def.name}${dup(f, foe)}`, enabled: ok, ...(reason ? { reason } : {}), group: 'hit', target: foe.uid, ...common, cost });
    }
  }
  if (!held) out.push(...perkMoves(g, f, pid));
  if (other && up(g, f, other) && !held) {
    out.push({ id: 'cover', label: g.render(ui('fm_cover'), pid), enabled: ap >= 1, ...(ap >= 1 ? {} : { reason: noAp }), group: 'help', cost: 1 });
  }
  if (other && up(g, f, other) && holder(f, other) && !held) {
    const near = adjacent(at, heroPos(f, other));
    const ok = near && ap >= 2;
    out.push({ id: 'free', label: g.render(ui('fm_free'), pid), enabled: ok, ...(ok ? {} : { reason: near ? noAp : ui('fm_come_close') }), group: 'help', cost: 2 });
  }
  if (other && f.party.includes(other) && f.down.includes(other) && !(f.lifted ?? []).includes(other) && !held) {
    const near = adjacent(at, heroPos(f, other));
    const cost = perk(g, pid, 'lift') ? 1 : 2;
    const ok = near && ap >= cost;
    out.push({ id: 'lift', label: g.render(ui('fm_lift'), pid), enabled: ok, ...(ok ? {} : { reason: near ? noAp : ui('fm_come_close') }), group: 'help', cost });
  }
  for (const [id, n] of Object.entries(p.bag)) {
    const def = g.ix.res.get(id);
    if (!def?.use || n <= 0) continue;
    out.push({ id: `use:${id}`, label: `${g.render(def.use.label, pid)} (${n})`, enabled: ap >= 1, ...(ap >= 1 ? {} : { reason: noAp }), group: 'item', cost: 1 });
  }
  if (canRout(g, f)) out.push({ id: 'rout', label: ui('fm_rout'), enabled: true, group: 'out' });
  if (!f.scene && !held) {
    const edge = at[1] === fld.h - 1;
    const ok = edge && ap >= 2;
    out.push({ id: 'flee', label: ui('fm_flee'), enabled: ok, ...(ok ? {} : { reason: edge ? noAp : ui('fm_flee_edge') }), group: 'out', cost: 2 });
  }
  out.push({ id: 'end', label: ui('fm_end'), enabled: true, group: 'self' });
  return out;
}

// ----- moves of perks (see `.design/progression.md`) ------------------------------------

/** A free cell one can step onto with a single point. */
function plainFree(g: Game, f: FightState, c: Cell, busy: Set<string>): boolean {
  const fld = fieldOf(f);
  return c[0] >= 0 && c[1] >= 0 && c[0] < fld.w && c[1] < fld.h && feature(fld, c).step === 1 && !busy.has(key(c));
}

/** Where a perk's move takes the hero before the blow (none: the move cannot be made at this foe). */
export function perkStep(g: Game, f: FightState, pid: PlayerId, tech: string, foe: FoeState): Cell | null | undefined {
  const at = heroPos(f, pid)!;
  const to = foe.pos!;
  const busy = taken(g, f, pid);
  const d = dist(at, to);
  if (tech === 'lunge') {
    if (d !== 2) return undefined;
    return neighbours(fieldOf(f), at).find((c) => dist(c, to) === 1 && plainFree(g, f, c, busy)) ?? undefined;
  }
  if (tech === 'roll') {
    if (d < 2 || d > 3) return undefined;
    const ways = reach(fieldOf(f), at, 3, busy);
    let best: Cell | undefined;
    let cost = 99;
    for (const c of neighbours(fieldOf(f), to)) {
      const w = ways.get(key(c));
      if (w && w.cost < cost) [best, cost] = [c, w.cost];
    }
    return best;
  }
  if (tech === 'ram') {
    if (d < 2 || d > 4) return undefined;
    const ln = run(at, to, d - 1);
    if (!ln || !ln.every((c) => plainFree(g, f, c, busy))) return undefined;
    return ln[ln.length - 1];
  }
  return null;
}

const PERK_TECHS: Record<string, { cost: number; hand: 'main' | 'off'; aimed: boolean }> = {
  lunge: { cost: 2, hand: 'main', aimed: true },
  roll: { cost: 3, hand: 'main', aimed: true },
  desperate: { cost: 2, hand: 'main', aimed: true },
  ram: { cost: 3, hand: 'main', aimed: true },
  pinshot: { cost: 3, hand: 'main', aimed: true },
  rain: { cost: 4, hand: 'main', aimed: false },
  shove: { cost: 2, hand: 'off', aimed: true },
};

/** Foes a volley reaches now. */
function rainTargets(g: Game, f: FightState, pid: PlayerId): FoeState[] {
  const at = heroPos(f, pid)!;
  const range = techsOf(g, pid).find((t) => t.id === 'shoot')?.range ?? SHOT_RANGE;
  return activeFoes(f).filter((x) => x.pos && inReach(f, at, x.pos, range));
}

/** The moves the hero's perks give, each with why it cannot be made now. */
function perkMoves(g: Game, f: FightState, pid: PlayerId): FightMove[] {
  const out: FightMove[] = [];
  const ui = (k: string) => g.ix.ui(k);
  const h = heroOf(g, pid);
  const p = g.p(pid);
  const at = heroPos(f, pid)!;
  const ap = f.ap ?? 0;
  const melee = !h.ranged && !!p.equip.weapon;
  const ammo = h.ammo ? (p.bag[h.ammo] ?? 0) : Infinity;
  for (const [tech, d] of Object.entries(PERK_TECHS)) {
    if (!p.perks.includes(tech)) continue;
    const common = { tech, hand: d.hand, cost: d.cost, perk: true, ...(tech !== 'shove' ? { dmg: h.dmg } : {}) };
    if (!d.aimed) {
      // a volley: at all the foes in reach
      const n = rainTargets(g, f, pid).length;
      const reason = !h.ranged ? ui('fm_need_ranged') : n < 2 ? ui('fm_need_two') : ammo < n ? ui('fm_need_ammo') : d.cost > ap ? ui('fm_no_ap') : undefined;
      out.push({ id: `t:${tech}`, label: ui(`tech_${tech}`), enabled: !reason, ...(reason ? { reason } : {}), group: 'self', ...common });
      continue;
    }
    for (const foe of activeFoes(f)) {
      if (!foe.pos) continue;
      const dd = dist(at, foe.pos);
      let reason: string | undefined;
      if (tech === 'pinshot') {
        const range = techsOf(g, pid).find((t) => t.id === 'shoot')?.range ?? SHOT_RANGE;
        reason = !h.ranged ? ui('fm_need_ranged') : ammo < 1 ? ui('fm_need_ammo') : dd < 3 ? ui('fm_need_far') : !inReach(f, at, foe.pos, range) ? (dd > range ? ui('fm_too_far') : ui('fm_no_sight')) : undefined;
      } else if (tech === 'shove') {
        reason = !h.shield && !h.tags.has('blunt') ? ui('fm_need_shield') : dd !== 1 ? ui('fm_come_close') : undefined;
      } else if (tech === 'desperate') {
        reason = !melee ? ui('fm_need_melee') : p.hp >= p.hpMax * PERK.desperateBelow ? ui('fm_need_low') : dd !== 1 ? ui('fm_come_close') : undefined;
      } else {
        // a move that carries the hero to the foe first
        const step = perkStep(g, f, pid, tech, foe);
        reason = !melee
          ? ui('fm_need_melee')
          : tech === 'roll' && h.heavy
            ? ui('fm_need_light')
            : step
              ? undefined
              : tech === 'lunge'
                ? ui('fm_need_gap')
                : tech === 'ram'
                  ? ui('fm_need_line')
                  : dd > 3
                    ? ui('fm_too_far')
                    : ui('fm_come_close');
      }
      if (!reason && d.cost > ap) reason = ui('fm_no_ap');
      const def = enemyOf(g, foe.enemy);
      out.push({ id: `t:${tech}:${foe.uid}`, label: `${ui(`tech_${tech}`)}: ${def.name}${dup(f, foe)}`, enabled: !reason, ...(reason ? { reason } : {}), group: 'hit', target: foe.uid, range: dd, ...common });
    }
  }
  // a dash to the partner's side
  const other = f.party.find((x) => x !== pid);
  if (other && p.perks.includes('dash') && !f.fled.includes(other)) {
    const there = heroPos(f, other);
    const ways = reach(fieldOf(f), at, PERK.dashReach, taken(g, f, pid));
    const near = there && adjacent(at, there);
    const spot = there && !near ? neighbours(fieldOf(f), there).find((c) => ways.has(key(c))) : undefined;
    const reason = near ? ui('fm_dash_near') : !spot ? ui('fm_too_far') : ap < 1 ? ui('fm_no_ap') : undefined;
    out.push({ id: 'dash', label: g.render(ui('fm_dash'), pid), enabled: !reason, ...(reason ? { reason } : {}), group: 'help', cost: 1, perk: true });
  }
  return out;
}

/** The hero moves to a cell as part of a move (no points: the move's price covers it). */
function carry(g: Game, f: FightState, pid: PlayerId, to: Cell): void {
  const from = heroPos(f, pid)!;
  const way = reach(fieldOf(f), from, 99, taken(g, f, pid)).get(key(to));
  (f.pos ??= {})[pid] = to;
  ev(f, { a: pid, k: 'move', path: way?.path ?? [to] });
  once(f, `${pid}:walked:${f.round}`);
}

/** «Пацюк ·2» when there are several of the same kind. */
export function dup(f: FightState, foe: FoeState): string {
  const same = f.foes.filter((x) => x.enemy === foe.enemy);
  if (same.length < 2) return '';
  return ` ·${same.indexOf(foe) + 1}`;
}

export function fightChoose(g: Game, pid: PlayerId, id: string): Result {
  const f = fightOf(g, pid);
  if (!f) return g.fail('err_not_now');
  if (f.scene && g.s.scene?.paused) return g.fail('err_scene_paused');
  if (activeId(f) !== pid || !up(g, f, pid)) return g.fail('err_not_your_turn');
  if (id.startsWith('go:')) return walk(g, f, pid, id.slice(3));
  const m = fightMoves(g, f, pid).find((x) => x.id === id);
  if (!m || !m.enabled) return g.fail('err_not_now');
  if (id === 'end') {
    endTurn(g, f, pid);
    return { ok: true };
  }
  if (id === 'rout') {
    rout(g, f, pid);
    return { ok: true };
  }
  f.ap = Math.max(0, (f.ap ?? 0) - (m.cost ?? 0));
  heroActs(g, f, pid, id);
  if (checkEnd(g, f)) return { ok: true };
  if (f.fled.includes(pid) || !up(g, f, pid) || (f.ap ?? 0) <= 0) {
    f.ap = 0;
    nextTurn(g, f);
  }
  return { ok: true };
}

function walk(g: Game, f: FightState, pid: PlayerId, to: string): Result {
  const m = /^(\d+),(\d+)$/.exec(to);
  if (!m) return g.fail('err_not_now');
  const cell: Cell = [Number(m[1]), Number(m[2])];
  const way = walkable(g, f, pid).get(key(cell));
  if (!way) return g.fail('err_not_now');
  f.ap = Math.max(0, (f.ap ?? 0) - way.cost);
  (f.pos ??= {})[pid] = cell;
  once(f, `${pid}:walked:${f.round}`);
  ev(f, { a: pid, k: 'move', path: way.path });
  // a leech hangs on and comes along
  for (const foe of activeFoes(f)) {
    if (foe.holds !== pid || !enemyOf(g, foe.enemy).traits.includes('leech')) continue;
    const spot = neighbours(fieldOf(f), cell).find((c) => !taken(g, f, fid(foe)).has(key(c)) && standable(fieldOf(f), c));
    if (spot) foe.pos = spot;
    else foe.holds = null;
  }
  if ((f.ap ?? 0) <= 0) nextTurn(g, f);
  return { ok: true };
}

function rout(g: Game, f: FightState, pid: PlayerId): void {
  say(g, f, 'fight_rout', pid, {});
  for (const foe of activeFoes(f)) {
    foe.out = 'fled';
    foe.holds = null;
    ev(f, { a: fid(foe), k: 'flee' });
  }
  f.routed = true;
  finishFight(g, f, 'win');
}

// ----- blows -----------------------------------------------------------------------

export function say(g: Game, f: FightState, key: string, actor: PlayerId | null, vars: Record<string, string | number>): void {
  const fillVars = (s: string) => s.replace(/\{(foe|foeAcc|foeGen|n|item|verb)\}/g, (_, k: string) => String(vars[k] ?? ''));
  const selfT = g.ix.c.ui[`${key}_self`];
  const otherT = g.ix.c.ui[`${key}_other`];
  const allT = g.ix.c.ui[key];
  for (const pid of f.party) {
    let line = '';
    if (actor && pid === actor && selfT) line = g.render(fillVars(selfT), pid, pid);
    else if (actor && pid !== actor && otherT) line = g.render(fillVars(otherT), pid, actor);
    else if (allT) line = g.render(fillVars(allT), pid, pid);
    if (line) pushLine(f, pid, line);
  }
}

export function foeVars(g: Game, foe: FoeState, f: FightState): Record<string, string> {
  const def = enemyOf(g, foe.enemy);
  const d = dup(f, foe);
  return { foe: `${def.name}${d}`, foeAcc: `${def.acc}${d}`, foeGen: `${def.gen}${d}`, verb: def.verb };
}

export function damageFoe(g: Game, f: FightState, foe: FoeState, n: number, by?: PlayerId, throughGuard = false): void {
  const def = enemyOf(g, foe.enemy);
  if (foe.guarding && !throughGuard) n = Math.max(1, Math.floor(n / 2));
  foe.hp -= n;
  if (by) foe.hitBy = by;
  if (def.morale !== undefined) foe.fear += Math.ceil(n / 2);
  // a blow breaks a call
  if (foe.calling > 0) {
    foe.calling = 0;
    say(g, f, 'fight_call_broken', null, foeVars(g, foe, f));
  }
  if (foe.hp <= 0) {
    foe.hp = 0;
    foe.out = def.humane ? 'down' : 'dead';
    foe.holds = null;
    say(g, f, def.humane ? 'fight_foe_down' : 'fight_foe_dead', null, foeVars(g, foe, f));
    ev(f, { a: fid(foe), k: 'down' });
  }
}

/** Left open to blows: this round and the next. */
export function openUp(g: Game, f: FightState, foe: FoeState): void {
  if (foe.out || isOpen(f, foe)) {
    foe.open = Math.max(foe.open ?? 0, f.round + 1);
    return;
  }
  foe.open = f.round + 1;
  say(g, f, 'fight_open', null, foeVars(g, foe, f));
  ev(f, { a: fid(foe), k: 'open' });
}

/** Dazed: it loses its turn (a boss shrugs off one in two; never twice running). */
function daze(g: Game, f: FightState, foe: FoeState): boolean {
  const def = enemyOf(g, foe.enemy);
  if (foe.out) return false;
  if ((foe.stunAt !== undefined && foe.stunAt >= f.round - 1) || (def.phases && !g.rng.chance(0.5))) {
    say(g, f, 'fight_stun_resisted', null, foeVars(g, foe, f));
    return false;
  }
  foe.stun = true;
  foe.stunAt = f.round;
  foe.holds = null;
  // a dazed foe forgets the charge or the swing it was gathering
  if (foe.intent?.move === 'charge' || foe.intent?.move === 'sweep') foe.intent = { move: 'none' };
  say(g, f, 'fight_stun', null, foeVars(g, foe, f));
  ev(f, { a: fid(foe), k: 'stun' });
  openUp(g, f, foe);
  return true;
}

interface Blow {
  ranged?: boolean;
  mult?: number;
  acc?: number;
  /** Goes through all armour. */
  through?: boolean;
  /** A thrust: twice as hard at an open foe. */
  thrust?: boolean;
  dmg?: [number, number];
}

/** Is someone else on the attacker's side next to the target (a flank)? */
export function flanked(g: Game, f: FightState, target: Cell, attacker: string, heroSide: boolean): boolean {
  if (heroSide) {
    if (f.party.some((pid) => pid !== attacker && up(g, f, pid) && adjacent(heroPos(f, pid), target))) return true;
    return !!f.dog && adjacent(f.dogPos ?? undefined, target);
  }
  return activeFoes(f).some((x) => fid(x) !== attacker && adjacent(x.pos, target));
}

/** A hero's blow at a foe. Returns the damage dealt (0 = a miss). */
function heroHits(g: Game, f: FightState, pid: PlayerId, foe: FoeState, b: Blow = {}): number {
  const def = enemyOf(g, foe.enemy);
  const h = heroOf(g, pid);
  const p = g.p(pid);
  const ranged = !!b.ranged;
  const at = heroPos(f, pid)!;
  const to = foe.pos!;
  if (ranged && h.ammo) {
    addBag(g, pid, h.ammo, -1);
    (f.shots ??= {})[pid] = (f.shots[pid] ?? 0) + 1;
  }
  gainSkill(g, pid, ranged ? 'ranged' : 'melee');
  const open = isOpen(f, foe);
  const aimed = ranged && !!f.aim?.includes(pid);
  if (aimed) f.aim = f.aim!.filter((x) => x !== pid);
  // the first shot from cover: sure and twice as hard
  const ambush = ranged && perk(g, pid, 'ambusher') && once(f, `${pid}:ambush`);
  let acc = b.acc ?? 0;
  const d = dist(at, to);
  if (d >= 2) {
    const c = coverFrom(fieldOf(f), at, to);
    acc -= (0.2 * c.cover + c.inside) * (ranged && perk(g, pid, 'farshot') ? 0.5 : 1);
  }
  if (ranged && perk(g, pid, 'cold')) acc += PERK.coldAcc;
  else if (ranged && activeFoes(f).some((x) => adjacent(x.pos, at))) acc -= 0.2;
  if (!ranged && perk(g, pid, 'master')) acc += PERK.masterAcc;
  const known = perk(g, pid, 'lore') && (g.s.bestiary[foe.enemy]?.beaten ?? 0) >= PERK.loreBeaten;
  if (known) acc += PERK.loreAcc;
  if (feature(fieldOf(f), at).wet) acc -= 0.1;
  const flank = !ranged && d === 1 && flanked(g, f, to, pid, true);
  const wideFlank = flank && perk(g, pid, 'flank');
  if (flank) acc += wideFlank ? PERK.flankAcc : 0.1;
  const chance = hitChance(h.hit + acc, def.evade ?? 0, ranged && f.round === 1);
  if (!open && !aimed && !ambush && !g.rng.chance(chance)) {
    say(g, f, 'fight_miss', pid, foeVars(g, foe, f));
    ev(f, { a: pid, t: fid(foe), k: 'miss' });
    return 0;
  }
  const dd = b.dmg ?? h.dmg;
  let n = g.rng.int(dd[0], dd[1]) + (flank ? (wideFlank ? PERK.flankDmg : 1) : 0);
  if (p.perks.includes('first') && once(f, `${pid}:first`)) n += PERK.firstDmg;
  if (!ranged && p.perks.includes('master')) n += PERK.masterDmg;
  if (!ranged && p.perks.includes('duel') && activeFoes(f).filter((x) => adjacent(x.pos, at)).length === 1) n += PERK.duelDmg;
  if (known) n += PERK.loreDmg;
  let mult = b.mult ?? 1;
  if (open) mult *= b.thrust ? TECH.thrustOpen : TECH.open;
  if (aimed) mult *= p.perks.includes('deadly') ? PERK.deadlyAim : 2;
  if (ambush) mult *= 2;
  n = Math.round(n * mult);
  let armor = armorOf(def, foe);
  if (h.tags.has('pierce')) armor = Math.max(0, armor - 2);
  if (h.tags.has('cleave')) armor = Math.max(0, armor - 1);
  if (ranged && p.perks.includes('pierce')) armor = Math.floor(armor / 2);
  if (p.role === 'maker') armor = Math.floor(armor / 2);
  if (open) armor = Math.floor(armor / 2);
  if (b.through) armor = 0;
  let dealt = Math.max(1, n - armor);
  // a foe nearly done is finished at a blow (a leader holds: twice the blow)
  if (p.perks.includes('execute') && foe.hp <= foe.hpMax * PERK.executeBelow) dealt = def.phases ? dealt * 2 : Math.max(dealt, foe.hp);
  if (armor > 0 && def.traits.includes('armored')) reveal(g, f, foe.enemy, 'armored');
  say(g, f, open ? 'fight_hit_open' : ranged ? 'fight_shoot' : 'fight_hit', pid, { ...foeVars(g, foe, f), n: dealt });
  ev(f, { a: pid, t: fid(foe), k: 'hit', n: dealt });
  damageFoe(g, f, foe, dealt, pid, !ranged && p.perks.includes('shieldbreak'));
  if (!foe.out) {
    if (!ranged && p.perks.includes('taunt')) foe.taunt = pid;
  }
  return dealt;
}

export function hurtHero(g: Game, f: FightState, pid: PlayerId, n: number): void {
  const p = g.p(pid);
  p.hp = Math.max(0, p.hp - n);
  if (p.hp <= 0) {
    if (p.perks.includes('flint') && !p.flags['flint_used_' + f.id]) {
      p.flags['flint_used_' + f.id] = 1;
      p.hp = 1;
      say(g, f, 'fight_flint', pid, {});
      return;
    }
    if (p.perks.includes('unbroken') && once(f, `${pid}:unbroken`)) {
      p.hp = Math.max(1, Math.round(p.hpMax * PERK.unbrokenHp));
      say(g, f, 'fight_unbroken', pid, {});
      ev(f, { a: pid, t: pid, k: 'heal', n: p.hp });
      return;
    }
    if (!f.down.includes(pid)) f.down.push(pid);
    for (const foe of f.foes) if (foe.holds === pid) foe.holds = null;
    say(g, f, 'fight_hero_down', pid, {});
    ev(f, { a: pid, k: 'down' });
  }
}

/** The long point meets a foe that comes at this hero. Returns true if the foe fell. */
export function meetPoint(g: Game, f: FightState, foe: FoeState, t: PlayerId): boolean {
  const h = heroOf(g, t);
  const n = Math.max(1, g.rng.int(h.dmg[0], h.dmg[1]) - Math.floor(armorOf(enemyOf(g, foe.enemy), foe) / 2));
  say(g, f, 'fight_counter', t, { ...foeVars(g, foe, f), n });
  ev(f, { a: t, t: fid(foe), k: 'hit', n });
  damageFoe(g, f, foe, n, t);
  return !!foe.out;
}

/** Who takes a blow aimed at this hero: a partner standing by to cover takes it instead. */
function coveredBy(g: Game, f: FightState, target: PlayerId): PlayerId {
  const mate = f.party.find((x) => x !== target);
  if (!mate || f.stance?.[mate] !== 'cover' || !up(g, f, mate) || pinned(g, f, mate)) return target;
  const a = heroPos(f, mate);
  const b = heroPos(f, target);
  if (a && b && dist(a, b) <= (perk(g, mate, 'bulwark') ? PERK.bulwarkReach : 1)) return mate;
  return target;
}

/** A foe strikes a hero: cover, the point, dodge, armour, guard. Returns damage dealt (0 = missed/blocked). */
export function foeStrikes(g: Game, f: FightState, foe: FoeState, target: PlayerId, mult: number, kind: 'attack' | 'grab' | 'charge'): number {
  const def = enemyOf(g, foe.enemy);
  const t = coveredBy(g, f, target);
  const covered = t !== target;
  if (!up(g, f, t)) return 0;
  if (kind === 'charge' && perk(g, t, 'steadfast')) mult = Math.min(mult, 1);
  if (f.stance?.[t] === 'keep' && kind !== 'charge' && meetPoint(g, f, foe, t)) return 0;
  const h = heroOf(g, t);
  const vars = foeVars(g, foe, f);
  if (kind !== 'grab' && g.rng.chance(h.dodge)) {
    say(g, f, 'fight_dodge', t, vars);
    ev(f, { a: fid(foe), t, k: 'dodge' });
    if (kind === 'attack' && perk(g, t, 'riposte') && adjacent(foe.pos, heroPos(f, t))) openUp(g, f, foe);
    return 0;
  }
  const duo = !!f.duo && (!!def.phases || !bossFight(g, f));
  let n = g.rng.int(def.dmg[0], def.dmg[1]) * dmgMult(def, duo);
  if (def.traits.includes('night') && g.isEvening()) {
    n = n * 1.3;
    reveal(g, f, foe.enemy, 'night');
  }
  const tc = heroPos(f, t);
  if (kind === 'attack' && foe.pos && tc && dist(foe.pos, tc) === 1 && flanked(g, f, tc, fid(foe), false)) n += def.traits.includes('pack') ? 2 : 1;
  n = Math.round(n * mult);
  // shoulder to shoulder: while the other one stands too, each takes a blow better
  const mate = f.party.find((x) => x !== t);
  const shoulder = g.p(t).perks.includes('shoulder') && !!mate && up(g, f, mate) ? 1 : 0;
  n = Math.max(1, n - h.armor - shoulder);
  if (f.stance?.[t] === 'block') {
    n = Math.round(n * TECH.block);
    openUp(g, f, foe);
  } else if (f.guard?.[t]) n = Math.max(0, Math.round(n * (1 - f.guard[t]!)));
  if (covered && g.p(t).perks.includes('shield')) n = Math.round(n * PERK.shieldCut);
  if (n <= 0) {
    say(g, f, 'fight_blocked', t, vars);
    ev(f, { a: fid(foe), t, k: 'block' });
    return 0;
  }
  say(g, f, covered ? 'fight_covered' : 'fight_struck', t, { ...vars, n });
  ev(f, { a: fid(foe), t, k: 'hit', n });
  hurtHero(g, f, t, n);
  return n;
}

/** Does a charge break on this hero (guard, a shield up, a point held out)? */
export function stopsCharge(f: FightState, pid: PlayerId): boolean {
  return (f.guard?.[pid] ?? 0) >= 0.3 || f.stance?.[pid] === 'block' || f.stance?.[pid] === 'keep';
}

// ----- a hero's move ------------------------------------------------------------------

function pickedFoe(f: FightState, uid: string | undefined): FoeState | undefined {
  const foe = f.foes.find((x) => x.uid === Number(uid));
  return foe && !foe.out ? foe : undefined;
}

function heroActs(g: Game, f: FightState, pid: PlayerId, pick: string): void {
  const p = g.p(pid);
  const other = f.party.find((x) => x !== pid);
  if (pick.startsWith('hit:') || pick.startsWith('shoot:')) {
    const foe = pickedFoe(f, pick.split(':')[1]);
    if (!foe) return;
    const shot = pick.startsWith('shoot:');
    const dealt = heroHits(g, f, pid, foe, { ranged: shot });
    // a second arrow off the string
    if (shot && perk(g, pid, 'twin') && !foe.out) {
      const ammo = heroOf(g, pid).ammo;
      if (!ammo || (p.bag[ammo] ?? 0) > 0) heroHits(g, f, pid, foe, { ranged: true, acc: PERK.twinAcc });
    }
    // a wide swing catches one more who stands by
    if (dealt > 0 && pick.startsWith('hit:') && perk(g, pid, 'sweep')) {
      const by = activeFoes(f).find((x) => x !== foe && adjacent(x.pos, heroPos(f, pid)));
      if (by) {
        const n = Math.max(1, Math.floor(dealt * PERK.sweepPart));
        say(g, f, 'fight_hit', pid, { ...foeVars(g, by, f), n });
        ev(f, { a: pid, t: fid(by), k: 'hit', n });
        damageFoe(g, f, by, n, pid);
      }
    }
    return;
  }
  if (pick.startsWith('t:')) {
    const [, tech, uid] = pick.split(':');
    const st = (f.stance ??= {});
    switch (tech) {
      case 'aim':
        if (!(f.aim ?? []).includes(pid)) (f.aim ??= []).push(pid);
        say(g, f, 'fight_aim', pid, {});
        ev(f, { a: pid, k: 'aim' });
        return;
      case 'keep':
        st[pid] = 'keep';
        say(g, f, 'fight_keep', pid, {});
        ev(f, { a: pid, k: 'guard' });
        return;
      case 'block':
        st[pid] = 'block';
        say(g, f, 'fight_block', pid, {});
        ev(f, { a: pid, k: 'guard' });
        return;
      case 'rain':
        for (const x of rainTargets(g, f, pid)) if (!x.out) heroHits(g, f, pid, x, { ranged: true, acc: PERK.rainAcc });
        return;
    }
    const foe = pickedFoe(f, uid);
    if (!foe) return;
    const t = techsOf(g, pid).find((x) => x.id === tech);
    if (tech === 'lunge' || tech === 'roll' || tech === 'ram') {
      const to = perkStep(g, f, pid, tech, foe);
      if (!to) return;
      carry(g, f, pid, to);
      if (tech === 'lunge') heroHits(g, f, pid, foe, { acc: PERK.lungeAcc });
      else if (tech === 'roll') {
        heroHits(g, f, pid, foe);
        (f.guard ??= {})[pid] = Math.max(f.guard[pid] ?? 0, PERK.rollGuard);
      } else if (heroHits(g, f, pid, foe, { mult: PERK.ramMult }) > 0 && !foe.out) {
        if (foe.intent?.move === 'charge' || foe.intent?.move === 'sweep') foe.intent = { move: 'none' };
        if (g.rng.chance(PERK.ramOpen)) openUp(g, f, foe);
      }
      return;
    }
    if (tech === 'desperate') {
      heroHits(g, f, pid, foe, { mult: PERK.desperateMult, acc: PERK.desperateAcc });
      return;
    }
    if (tech === 'pinshot') {
      if (heroHits(g, f, pid, foe, { ranged: true }) > 0 && !foe.out) foe.rooted = true;
      return;
    }
    if (tech === 'shove') {
      const at = heroPos(f, pid)!;
      const back: Cell = [foe.pos![0] + Math.sign(foe.pos![0] - at[0]), foe.pos![1] + Math.sign(foe.pos![1] - at[1])];
      const fld = fieldOf(f);
      const inside = back[0] >= 0 && back[1] >= 0 && back[0] < fld.w && back[1] < fld.h;
      const free = inside && !taken(g, f, fid(foe)).has(key(back)) && (swimmer(enemyOf(g, foe.enemy)) || standable(fld, back));
      if (foe.intent?.move === 'charge' || foe.intent?.move === 'sweep') foe.intent = { move: 'none' };
      if (free) {
        ev(f, { a: fid(foe), k: 'move', path: [back] });
        foe.pos = back;
        say(g, f, 'fight_shoved', pid, foeVars(g, foe, f));
        openUp(g, f, foe);
      } else {
        const n = g.rng.int(1, 3);
        ev(f, { a: pid, t: fid(foe), k: 'hit', n });
        damageFoe(g, f, foe, n, pid);
        daze(g, f, foe);
      }
      return;
    }
    if (tech === 'stun') {
      if (heroHits(g, f, pid, foe, { dmg: t?.dmg }) > 0) daze(g, f, foe);
    } else if (tech === 'bash') {
      if (heroHits(g, f, pid, foe, { dmg: [1, 3] }) > 0 && g.rng.chance(TECH.bashStun)) daze(g, f, foe);
    } else if (tech === 'chop') heroHits(g, f, pid, foe, { mult: TECH.chop, through: true });
    else if (tech === 'thrust') heroHits(g, f, pid, foe, { acc: TECH.thrustAcc, thrust: true });
    else if (tech === 'flurry') {
      heroHits(g, f, pid, foe, { acc: TECH.flurryAcc });
      if (!foe.out) heroHits(g, f, pid, foe, { acc: TECH.flurryAcc });
    }
    return;
  }
  switch (pick) {
    case 'dash': {
      const there = other ? heroPos(f, other) : undefined;
      if (!there) return;
      const ways = reach(fieldOf(f), heroPos(f, pid)!, PERK.dashReach, taken(g, f, pid));
      const spot = neighbours(fieldOf(f), there).find((c) => ways.has(key(c)));
      if (!spot) return;
      carry(g, f, pid, spot);
      if (up(g, f, other!)) {
        (f.stance ??= {})[pid] = 'cover';
        say(g, f, 'fight_cover', pid, {});
      }
      return;
    }
    case 'cover':
      (f.stance ??= {})[pid] = 'cover';
      say(g, f, 'fight_cover', pid, {});
      ev(f, { a: pid, k: 'guard' });
      return;
    case 'struggle': {
      const foe = holder(f, pid);
      if (!foe) return;
      if (perk(g, pid, 'will') || g.rng.chance(0.15 * p.stats.wil)) {
        foe.holds = null;
        say(g, f, 'fight_broke_free', pid, foeVars(g, foe, f));
      } else say(g, f, 'fight_struggle', pid, foeVars(g, foe, f));
      return;
    }
    case 'free': {
      const foe = other ? holder(f, other) : undefined;
      if (!foe) return;
      foe.holds = null;
      const h = heroOf(g, pid);
      const n = adjacent(heroPos(f, pid), foe.pos) ? Math.max(1, g.rng.int(h.dmg[0], h.dmg[1]) - armorOf(enemyOf(g, foe.enemy), foe)) : 0;
      say(g, f, 'fight_free', pid, { ...foeVars(g, foe, f), n });
      if (n > 0) {
        ev(f, { a: pid, t: fid(foe), k: 'hit', n });
        damageFoe(g, f, foe, n, pid);
      }
      return;
    }
    case 'lift': {
      if (!other || !f.down.includes(other) || (f.lifted ?? []).includes(other)) return;
      f.down = f.down.filter((x) => x !== other);
      (f.lifted ??= []).push(other);
      const o = g.p(other);
      o.hp = perk(g, pid, 'rally') ? o.hpMax : Math.max(1, Math.ceil(o.hpMax / (perk(g, pid, 'lift') ? 2 : 4)));
      if (perk(g, pid, 'rally')) f.ap = (f.ap ?? 0) + 1;
      say(g, f, 'fight_lift', pid, {});
      ev(f, { a: pid, t: other, k: 'heal', n: o.hp });
      return;
    }
    case 'flee': {
      const near = activeFoes(f).some((x) => adjacent(x.pos, heroPos(f, pid)));
      const fast = activeFoes(f).filter((x) => enemyOf(g, x.enemy).traits.includes('fast')).length;
      const chance = near ? Math.max(0.15, Math.min(0.9, 0.5 + 0.05 * p.stats.agi - 0.15 * fast)) : 1;
      if (g.rng.chance(chance)) {
        // run, and lose part of what you carry
        for (const [id, n] of Object.entries(p.bag)) {
          if (kept(g, id)) continue;
          const lost = Math.floor(n * 0.3);
          if (lost > 0) addBag(g, pid, id, -lost);
        }
        f.fled.push(pid);
        for (const foe of f.foes) if (foe.holds === pid) foe.holds = null;
        say(g, f, 'fight_fled', pid, {});
        ev(f, { a: pid, k: 'flee' });
      } else say(g, f, 'fight_flee_failed', pid, {});
      return;
    }
  }
  if (pick.startsWith('use:')) {
    const [, id, uid] = pick.split(':');
    const def = g.ix.res.get(id!);
    const u = def?.use;
    if (!u || (p.bag[id!] ?? 0) <= 0) return;
    if (!u.reusable) addBag(g, pid, id!, -1);
    say(g, f, 'fight_use', pid, { item: def!.name });
    const at = heroPos(f, pid)!;
    if (u.heal) {
      const before = p.hp;
      p.hp = Math.min(p.hpMax, p.hp + u.heal);
      ev(f, { a: pid, t: pid, k: 'heal', n: p.hp - before });
    }
    for (const c of u.cure ?? []) {
      if (c === 'poison') p.poison = 0;
      if (c === 'leech' || c === 'grab') {
        for (const foe of f.foes) {
          if (foe.holds !== pid && !(other && foe.holds === other)) continue;
          const def2 = enemyOf(g, foe.enemy);
          if (c === 'leech' && !def2.traits.includes('leech')) continue;
          if (c === 'grab' && def2.traits.includes('leech')) continue;
          foe.holds = null;
          if (c === 'leech') {
            foe.out = 'fled';
            say(g, f, 'fight_leech_off', null, foeVars(g, foe, f));
            ev(f, { a: fid(foe), k: 'flee' });
          }
        }
      }
    }
    if (u.scare) {
      // a torch or a rattle reaches those near enough to see or hear it
      for (const foe of activeFoes(f)) {
        if (!foe.pos || dist(foe.pos, at) > 3) continue;
        const d = enemyOf(g, foe.enemy);
        if (!d.traits.includes(u.scare.trait) && !(d.hidden ?? []).includes(u.scare.trait)) continue;
        reveal(g, f, foe.enemy, u.scare.trait);
        if (d.morale !== undefined) foe.fear += u.scare.fear;
        if (foe.calling > 0) {
          foe.calling = 0;
          say(g, f, 'fight_call_broken', null, foeVars(g, foe, f));
        }
      }
      say(g, f, 'fight_scare', pid, { item: def!.name });
    }
    if (u.dmg) {
      const near = activeFoes(f).filter((x) => x.pos && inReach(f, at, x.pos, THROW_RANGE));
      const foe = pickedFoe(f, uid) ?? near.sort((a, b) => dist(a.pos!, at) - dist(b.pos!, at))[0];
      if (foe) {
        const n = g.rng.int(u.dmg[0], u.dmg[1]);
        ev(f, { a: pid, t: fid(foe), k: 'hit', n });
        damageFoe(g, f, foe, n, pid);
      }
    }
  }
}

// ----- the end of a round ----------------------------------------------------------------

/** The hunter watches the beasts and notices what they hide (one thing a round, now and then). */
function hunterNotices(g: Game, f: FightState): void {
  const hunter = f.party.find((pid) => g.p(pid).role === 'hunter' && up(g, f, pid));
  if (!hunter || !g.rng.chance(0.5)) return;
  const hidden: Array<{ enemy: string; trait: TraitId }> = [];
  for (const foe of activeFoes(f)) {
    const def = enemyOf(g, foe.enemy);
    const known = g.s.bestiary[foe.enemy]?.known ?? [];
    for (const t of def.hidden ?? []) if (!known.includes(t) && !hidden.some((x) => x.enemy === foe.enemy && x.trait === t)) hidden.push({ enemy: foe.enemy, trait: t });
  }
  if (!hidden.length) return;
  const pick = g.rng.pick(hidden);
  reveal(g, f, pick.enemy, pick.trait);
}

/** A fight that will not end (nobody can get at anybody): the foes give it up. */
const MAX_ROUNDS = 40;

function endOfRound(g: Game, f: FightState): void {
  hunterNotices(g, f);
  if (f.round >= MAX_ROUNDS) {
    for (const foe of activeFoes(f)) {
      foe.out = 'fled';
      foe.holds = null;
      say(g, f, 'fight_foe_fled', null, foeVars(g, foe, f));
      ev(f, { a: fid(foe), k: 'flee' });
    }
    return;
  }
  // calls bring help
  for (const foe of activeFoes(f)) {
    if (foe.calling <= 0) continue;
    foe.calling -= 1;
    if (foe.calling === 0) {
      const def = enemyOf(g, foe.enemy);
      if (def.calls) {
        const add = bringFoe(g, f, def.calls);
        if (!add.out) {
          say(g, f, 'fight_help_came', null, foeVars(g, add, f));
          ev(f, { a: fid(add), k: 'come' });
          planIntent(g, f, add);
        }
      }
    }
  }
  // phases
  for (const foe of activeFoes(f)) {
    const def = enemyOf(g, foe.enemy);
    const ph = def.phases?.[foe.phase];
    if (!ph || foe.hp / foe.hpMax >= ph.below) continue;
    foe.phase += 1;
    for (const pid of f.party) pushLine(f, pid, g.render(ph.text, pid));
    for (const a of ph.add ?? []) {
      for (let i = 0; i < (a.n ?? 1); i++) {
        const add = bringFoe(g, f, a.enemy);
        if (!add.out) {
          ev(f, { a: fid(add), k: 'come' });
          planIntent(g, f, add);
        }
      }
    }
  }
  // fear
  const packs = new Map<string, { all: number; out: number }>();
  for (const foe of f.foes) {
    const k = packs.get(foe.enemy) ?? { all: 0, out: 0 };
    k.all += 1;
    if (foe.out) k.out += 1;
    packs.set(foe.enemy, k);
  }
  for (const foe of activeFoes(f)) {
    const def = enemyOf(g, foe.enemy);
    if (def.morale === undefined) continue;
    const k = packs.get(foe.enemy)!;
    if (def.traits.includes('pack') && k.all > 1 && k.out * 2 >= k.all) foe.fear += 3;
    if (foe.fear >= moraleOf(f, def)!) {
      foe.out = 'fled';
      foe.holds = null;
      say(g, f, 'fight_foe_fled', null, foeVars(g, foe, f));
      ev(f, { a: fid(foe), k: 'flee' });
    }
  }
}

// ----- the end ---------------------------------------------------------------------

/** What a beaten or robbed hero keeps: things to use, and the one-of-a-kind finds of errands. */
export function kept(g: Game, id: string): boolean {
  const k = g.ix.res.get(id)?.kind;
  return k === 'use' || k === 'tool';
}

/** A beaten hero comes to at home: the bag is lost (but for what is kept), a while to recover. */
export function defeat(g: Game, pid: PlayerId): void {
  const p = g.p(pid);
  p.bag = Object.fromEntries(Object.entries(p.bag).filter(([id]) => kept(g, id)));
  p.hp = Math.max(1, Math.ceil(p.hpMax * 0.3));
  p.poison = 0;
  p.at = g.ix.homeArea;
  p.travel = null;
  // brought home and laid by the fire: warm and dry, if weak
  if (p.needs) {
    p.needs.chill = 0;
    p.needs.wet = 0;
  }
  p.fight = null;
  p.busy = { action: 'rest:defeat', until: g.now + DEFEAT_BUSY };
  g.log({ self: g.ix.ui('defeat_self'), other: g.ix.ui('defeat_other'), kind: 'warn' }, pid);
}

function finishFight(g: Game, f: FightState, how: 'win' | 'lose' | 'fled'): void {
  g.s.fights = g.s.fights.filter((x) => x.id !== f.id);
  const party = f.party;
  const after = (g.s.afterFight ??= {});
  for (const pid of party) after[pid] = { at: g.now, how, fight: structuredClone(f) };
  for (const pid of party) {
    const p = g.p(pid);
    p.fight = null;
    p.poison = 0;
  }
  if (how === 'win') {
    // experience is reckoned for each hero: foes far beneath them teach little
    const xpOf: Record<PlayerId, number> = { p1: 0, p2: 0 };
    const learn = (level: number, n: number) => {
      for (const pid of party) xpOf[pid] += n * foeXpFactor(g.p(pid).level, level);
    };
    const loot: Record<string, number> = {};
    for (const foe of f.foes) {
      const def = enemyOf(g, foe.enemy);
      if (foe.out === 'dead' || foe.out === 'down') {
        learn(def.level, def.level * 2);
        const b = (g.s.bestiary[foe.enemy] ??= { seen: 1, beaten: 0, known: [] });
        b.beaten += 1;
        // after a few fights everybody knows what the beast is like
        if (b.beaten >= 3) for (const t of def.hidden ?? []) if (!b.known.includes(t)) b.known.push(t);
        for (const [id, [a, z]] of Object.entries(def.loot ?? {})) loot[id] = (loot[id] ?? 0) + g.rng.int(a, z);
        if (def.rare && g.rng.chance(def.rare.p)) for (const [id, n] of Object.entries(def.rare.loot)) loot[id] = (loot[id] ?? 0) + n;
      } else if (foe.out === 'fled') {
        learn(def.level, def.level);
        // driven off: what they had is left behind
        if (f.routed) for (const [id, [a, z]] of Object.entries(def.loot ?? {})) loot[id] = (loot[id] ?? 0) + g.rng.int(a, z);
      }
    }
    for (const pid of party) xpOf[pid] = Math.round(xpOf[pid] * (skyAt(g, f.area)?.xp ?? 1));
    const standing = party.filter((pid) => !f.down.includes(pid) && !f.fled.includes(pid));
    const takers = standing.length ? standing : party;
    // the loot is shared out now (one thing each in turn); each takes their share from the field (takeLoot)
    const share: Record<PlayerId, Record<string, number>> = { p1: {}, p2: {} };
    let i = 0;
    for (const [id, n] of Object.entries(loot)) {
      for (let k = 0; k < n; k++) {
        const pid = takers[i++ % takers.length]!;
        share[pid][id] = (share[pid][id] ?? 0) + 1;
      }
    }
    for (const pid of party) {
      const p = g.p(pid);
      if (f.down.includes(pid)) p.hp = Math.max(1, Math.ceil(p.hpMax / 4));
      if (!f.fled.includes(pid)) {
        const back = perk(g, pid, 'arrows') ? Math.floor((f.shots?.[pid] ?? 0) / 2) : 0;
        const ammo = heroOf(g, pid).ammo;
        if (back > 0 && ammo) addBag(g, pid, ammo, back);
        gainXp(g, pid, xpOf[pid]);
        const a = after[pid];
        if (a) a.loot = share[pid];
      }
      g.logRaw('find', { [pid]: `${g.ix.ui('fight_won')} ${g.ix.ui('xp_short')} +${xpOf[pid]}.` }, pid);
    }
    g.s.stats.fights = (g.s.stats.fights ?? 0) + 1;
  } else if (how === 'lose') {
    if (!f.scene) {
      for (const pid of party) if (f.down.includes(pid)) defeat(g, pid);
    } else {
      for (const pid of party) {
        const p = g.p(pid);
        p.hp = Math.max(1, Math.ceil(p.hpMax / 2));
      }
    }
  } else {
    for (const pid of party) g.logRaw('warn', { [pid]: g.ix.ui('fight_all_fled') }, pid);
  }
  for (const pid of party) refreshHero(g, pid);
  if (f.scene) g.fightOver(how === 'win');
}

/**
 * Take one's share of a won fight's loot: into the bag (into the store at home); what does not fit is
 * left on the field. With nothing to take it only closes the fight.
 */
export function takeLoot(g: Game, pid: PlayerId, quiet = false): Result {
  const a = g.s.afterFight?.[pid];
  if (!a?.loot) return g.fail('err_not_now');
  const got: string[] = [];
  const left: string[] = [];
  for (const [id, n] of Object.entries(a.loot)) {
    const into = Math.max(0, g.atHome(pid) ? g.addRes(id, n) : addBag(g, pid, id, n));
    const name = g.ix.res.get(id)?.name ?? id;
    if (into > 0) got.push(`${name} +${into}`);
    if (into < n) left.push(`${name} ${n - into}`);
  }
  delete a.loot;
  // the fight is put away now
  a.at = g.now - 60_000;
  if (!quiet && got.length) g.logRaw('find', { [pid]: `${g.ix.ui('loot_took')} ${got.join(', ')}.` }, pid);
  if (!quiet && left.length) g.logRaw('warn', { [pid]: `${g.ix.ui('loot_left')} ${left.join(', ')}.` }, pid);
  return { ok: true };
}

/** Stop a fight that lost its people (left the game, scene over) without a result. */
export function dropFight(g: Game, f: FightState): void {
  g.s.fights = g.s.fights.filter((x) => x.id !== f.id);
  for (const pid of f.party) g.p(pid).fight = null;
}
