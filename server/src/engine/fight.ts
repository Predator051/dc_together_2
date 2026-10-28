// Fights of part two: rounds with the foes' intents shown in advance, roles that see different
// things, holds that only the partner can break, fear that makes beasts run.
import type { EnemyDef, EnemyMove, PlayerId, TraitId } from '../../../shared/src/content.js';
import { hitChance } from '../../../shared/src/rules.js';
import type { FightState, FoeState, Intent } from '../../../shared/src/state.js';
import { addBag, gainSkill, gainXp, heroOf, refreshHero } from './hero.js';
import { skyAt } from './weather.js';
import type { Game, Result } from './index.js';

/** How long a beaten hero lies before getting up at home. */
export const DEFEAT_BUSY = 60_000;

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

function up(g: Game, f: FightState, pid: PlayerId): boolean {
  return f.party.includes(pid) && !f.down.includes(pid) && !f.fled.includes(pid) && g.p(pid).hp > 0;
}

function alive(g: Game, f: FightState): PlayerId[] {
  return f.party.filter((pid) => up(g, f, pid));
}

/** Who holds this hero (grab, drag, leech). */
export function holder(f: FightState, pid: PlayerId): FoeState | undefined {
  return f.foes.find((x) => !x.out && x.holds === pid);
}

/** Held so that you cannot fight back (a leech only drinks; a grab or a drag pins you). */
function pinned(g: Game, f: FightState, pid: PlayerId): FoeState | undefined {
  return f.foes.find((x) => !x.out && x.holds === pid && !enemyOf(g, x.enemy).traits.includes('leech'));
}

function armorOf(def: EnemyDef, foe: FoeState): number {
  const ph = foe.phase > 0 ? def.phases?.[foe.phase - 1] : undefined;
  return ph?.armor ?? def.armor ?? 0;
}

function aiOf(def: EnemyDef, foe: FoeState): EnemyMove[] {
  const ph = foe.phase > 0 ? def.phases?.[foe.phase - 1] : undefined;
  return ph?.ai ?? def.ai;
}

function newFoe(g: Game, f: FightState, enemy: string): FoeState {
  const def = enemyOf(g, enemy);
  return {
    uid: f.nextUid++,
    enemy,
    hp: def.hp,
    hpMax: def.hp,
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

function meet(g: Game, enemy: string, pid?: PlayerId): void {
  const def = enemyOf(g, enemy);
  const b = (g.s.bestiary[enemy] ??= { seen: 0, beaten: 0, known: [] });
  b.seen += 1;
  for (const t of def.traits) if (!b.known.includes(t)) b.known.push(t);
  // a sharp eye sees everything at once
  if (pid && g.p(pid).perks.includes('eye')) for (const t of def.hidden ?? []) if (!b.known.includes(t)) b.known.push(t);
}

function reveal(g: Game, f: FightState, enemy: string, trait: TraitId): void {
  const b = (g.s.bestiary[enemy] ??= { seen: 0, beaten: 0, known: [] });
  if (b.known.includes(trait)) return;
  b.known.push(trait);
  const def = enemyOf(g, enemy);
  const tn = g.ix.c.traits[trait]?.name ?? trait;
  for (const pid of f.party) f.lines[pid]?.push(`${g.ix.ui('fight_trait')} ${def.name}: ${tn}.`);
}

/** Pick a move for a foe in round `round` (current or the next one). */
function rollIntent(g: Game, f: FightState, foe: FoeState, round: number): Intent | null {
  const def = enemyOf(g, foe.enemy);
  const targets = alive(g, f);
  if (!targets.length) return null;
  if (foe.holds && targets.includes(foe.holds)) return { move: 'hold', target: foe.holds };
  const age = round - foe.joined; // rounds since it joined, 1 = its first
  const moves = aiOf(def, foe).filter((m) => {
    if (m.once && foe.used.includes(m.move)) return false;
    if (m.from !== undefined && age < m.from) return false;
    return true;
  });
  const forced = moves.filter((m) => m.every && (age - (m.from ?? 1)) % m.every === 0);
  const pool = forced.length ? forced : moves.filter((m) => !m.every);
  if (!pool.length) return { move: 'attack', target: g.rng.pick(targets) };
  const total = pool.reduce((s, m) => s + (m.w ?? 1), 0);
  let r = g.rng.next() * total;
  let pick = pool[0]!;
  for (const m of pool) {
    r -= m.w ?? 1;
    if (r <= 0) {
      pick = m;
      break;
    }
  }
  if (pick.move === 'call' || pick.move === 'guard') return { move: pick.move };
  if (pick.move === 'steal') {
    const rich = targets.filter((pid) => Object.keys(g.p(pid).bag).length > 0);
    if (!rich.length) return { move: 'attack', target: g.rng.pick(targets) };
    return { move: 'steal', target: g.rng.pick(rich) };
  }
  return { move: pick.move, target: g.rng.pick(targets) };
}

function rollIntents(g: Game, f: FightState, fresh: boolean): void {
  for (const foe of activeFoes(f)) {
    if (fresh || !foe.next) {
      foe.intent = rollIntent(g, f, foe, f.round);
    } else {
      foe.intent = foe.next;
      // the target may have gone down or fled since it was foreseen
      if (foe.intent?.target && !up(g, f, foe.intent.target)) foe.intent = rollIntent(g, f, foe, f.round);
    }
    if (foe.holds && foe.intent?.move !== 'hold' && up(g, f, foe.holds)) foe.intent = { move: 'hold', target: foe.holds };
    foe.next = rollIntent(g, f, foe, f.round + 1);
  }
}

// ----- starting and joining --------------------------------------------------

export function startFight(
  g: Game,
  area: string,
  foes: Array<{ enemy: string; n?: number }>,
  opts: { scene?: boolean; party?: PlayerId[] } = {},
): FightState {
  const party = (opts.party ?? g.joinedIds().filter((pid) => canJoin(g, pid, area))).slice();
  // a new fight puts the last one out of sight
  for (const pid of party) delete g.s.afterFight?.[pid];
  const f: FightState = {
    id: g.s.nextFightId++,
    area,
    scene: !!opts.scene,
    party,
    dog: false,
    foes: [],
    round: 1,
    picks: {},
    lines: { p1: [], p2: [] },
    nextUid: 1,
    down: [],
    fled: [],
    startedAt: g.now,
  };
  for (const e of foes) for (let i = 0; i < (e.n ?? 1); i++) f.foes.push(newFoe(g, f, e.enemy));
  f.dog = dogWith(g, party);
  for (const pid of party) {
    const p = g.p(pid);
    p.fight = f.id;
    p.busy = null;
    p.poison = 0;
  }
  for (const e of new Set(f.foes.map((x) => x.enemy))) meet(g, e, party.find((pid) => g.p(pid).perks.includes('eye')));
  g.s.fights.push(f);
  rollIntents(g, f, true);
  const names = summarize(g, f);
  for (const pid of party) f.lines[pid] = [g.ix.ui('fight_start').replace('{foes}', names)];
  for (const pid of g.joinedIds()) {
    if (!party.includes(pid)) continue;
    g.logRaw('warn', { [pid]: g.ix.ui('fight_start').replace('{foes}', names) }, pid);
  }
  return f;
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

/** Join the partner's fight here. */
export function help(g: Game, pid: PlayerId): Result {
  const o = g.p(g.other(pid));
  const f = o.fight !== null ? g.s.fights.find((x) => x.id === o.fight) : undefined;
  if (!f || f.scene || !canJoin(g, pid, f.area)) return g.fail('err_not_now');
  f.party.push(pid);
  g.p(pid).fight = f.id;
  g.p(pid).busy = null;
  f.dog = f.dog || dogWith(g, [pid]);
  f.lines[pid] = [g.render(g.ix.ui('fight_join_self'), pid)];
  f.lines[g.other(pid)]?.push(g.render(g.ix.ui('fight_join_other'), g.other(pid), pid));
  for (const e of new Set(activeFoes(f).map((x) => x.enemy))) meet(g, e, pid);
  return { ok: true };
}

// ----- what a hero can do ------------------------------------------------------

export interface FightMove {
  id: string;
  label: string;
  enabled: boolean;
  reason?: string;
  group: 'hit' | 'self' | 'help' | 'item' | 'out';
}

function ammoLeft(g: Game, pid: PlayerId, ammo: string): number {
  return g.p(pid).bag[ammo] ?? 0;
}

export function fightMoves(g: Game, f: FightState, pid: PlayerId): FightMove[] {
  const out: FightMove[] = [];
  if (!up(g, f, pid)) return out;
  const ui = (k: string) => g.ix.ui(k);
  const h = heroOf(g, pid);
  const p = g.p(pid);
  const other = f.party.find((x) => x !== pid);
  if (pinned(g, f, pid)) {
    out.push({ id: 'struggle', label: ui('fm_struggle'), enabled: true, group: 'self' });
  } else {
    for (const foe of activeFoes(f)) {
      const def = enemyOf(g, foe.enemy);
      const label = `${h.ranged ? ui('fm_shoot') : ui('fm_hit')}: ${def.name}${dup(f, foe)}`;
      if (h.ranged && h.ammo) {
        const left = ammoLeft(g, pid, h.ammo);
        out.push({
          id: `shoot:${foe.uid}`,
          label,
          enabled: left > 0,
          ...(left > 0 ? {} : { reason: `${ui('fm_no_ammo')} ${g.ix.res.get(h.ammo)?.name ?? ''}`.trim() }),
          group: 'hit',
        });
      } else {
        out.push({ id: `hit:${foe.uid}`, label, enabled: true, group: 'hit' });
      }
    }
    out.push({ id: 'guard', label: ui('fm_guard'), enabled: true, group: 'self' });
    if (other && up(g, f, other)) {
      out.push({ id: 'cover', label: g.render(ui('fm_cover'), pid), enabled: true, group: 'help' });
    }
  }
  if (other && up(g, f, other) && holder(f, other) && !pinned(g, f, pid)) {
    out.push({ id: 'free', label: g.render(ui('fm_free'), pid), enabled: true, group: 'help' });
  }
  if (other && f.party.includes(other) && f.down.includes(other) && !(f.lifted ?? []).includes(other) && !pinned(g, f, pid)) {
    out.push({ id: 'lift', label: g.render(ui('fm_lift'), pid), enabled: true, group: 'help' });
  }
  for (const [id, n] of Object.entries(p.bag)) {
    const def = g.ix.res.get(id);
    if (!def?.use || n <= 0) continue;
    out.push({ id: `use:${id}`, label: `${g.render(def.use.label, pid)} (${n})`, enabled: true, group: 'item' });
  }
  if (!f.scene && !pinned(g, f, pid)) out.push({ id: 'flee', label: ui('fm_flee'), enabled: true, group: 'out' });
  return out;
}

/** «Пацюк ·2» when there are several of the same kind. */
function dup(f: FightState, foe: FoeState): string {
  const same = f.foes.filter((x) => x.enemy === foe.enemy);
  if (same.length < 2) return '';
  return ` ·${same.indexOf(foe) + 1}`;
}

export function fightChoose(g: Game, pid: PlayerId, id: string): Result {
  const f = fightOf(g, pid);
  if (!f) return g.fail('err_not_now');
  if (f.scene && g.s.scene?.paused) return g.fail('err_scene_paused');
  const m = fightMoves(g, f, pid).find((x) => x.id === id);
  if (!m || !m.enabled) return g.fail('err_not_now');
  if (f.picks[pid]) return g.fail('err_already_chosen');
  f.picks[pid] = id;
  maybeResolve(g, f);
  return { ok: true };
}

/** Resolve once every hero who is up and here has picked (absent ones guard). */
export function maybeResolve(g: Game, f: FightState): void {
  const live = alive(g, f);
  if (!live.length) return;
  const online = live.filter((pid) => g.p(pid).online);
  if (!online.length) return; // everyone is away: the fight waits
  if (!online.every((pid) => f.picks[pid])) return;
  for (const pid of live) if (!f.picks[pid]) f.picks[pid] = 'guard';
  resolveRound(g, f);
}

// ----- one round ---------------------------------------------------------------

interface RoundCtx {
  guard: Set<PlayerId>;
  cover: Map<PlayerId, PlayerId>; // covered -> coverer
  foeGuard: Set<number>;
  hitFoes: Set<number>;
  noise: boolean;
  firstPerkUsed: Set<PlayerId>;
}

function say(g: Game, f: FightState, key: string, actor: PlayerId | null, vars: Record<string, string | number>): void {
  const fillVars = (s: string) => s.replace(/\{(foe|foeAcc|foeGen|n|item|verb)\}/g, (_, k: string) => String(vars[k] ?? ''));
  const selfT = g.ix.c.ui[`${key}_self`];
  const otherT = g.ix.c.ui[`${key}_other`];
  const allT = g.ix.c.ui[key];
  for (const pid of f.party) {
    let line = '';
    if (actor && pid === actor && selfT) line = g.render(fillVars(selfT), pid, pid);
    else if (actor && pid !== actor && otherT) line = g.render(fillVars(otherT), pid, actor);
    else if (allT) line = g.render(fillVars(allT), pid, pid);
    if (line) f.lines[pid]!.push(line);
  }
}

function foeVars(g: Game, foe: FoeState, f: FightState): Record<string, string> {
  const def = enemyOf(g, foe.enemy);
  const d = dup(f, foe);
  return { foe: `${def.name}${d}`, foeAcc: `${def.acc}${d}`, foeGen: `${def.gen}${d}`, verb: def.verb };
}

function damageFoe(g: Game, f: FightState, foe: FoeState, n: number, ctx: RoundCtx): void {
  const def = enemyOf(g, foe.enemy);
  if (ctx.foeGuard.has(foe.uid)) n = Math.max(1, Math.floor(n / 2));
  foe.hp -= n;
  ctx.hitFoes.add(foe.uid);
  if (def.morale !== undefined) foe.fear += Math.ceil(n / 2);
  if (foe.hp <= 0) {
    foe.hp = 0;
    foe.out = def.humane ? 'down' : 'dead';
    foe.holds = null;
    say(g, f, def.humane ? 'fight_foe_down' : 'fight_foe_dead', null, foeVars(g, foe, f));
  }
}

function heroHits(g: Game, f: FightState, pid: PlayerId, foe: FoeState, ctx: RoundCtx, ranged: boolean): void {
  const def = enemyOf(g, foe.enemy);
  const h = heroOf(g, pid);
  const p = g.p(pid);
  if (ranged && h.ammo) addBag(g, pid, h.ammo, -1);
  gainSkill(g, pid, ranged ? 'ranged' : 'melee');
  const chance = hitChance(h.hit, def.evade ?? 0, ranged && f.round === 1);
  if (!g.rng.chance(chance)) {
    say(g, f, 'fight_miss', pid, foeVars(g, foe, f));
    return;
  }
  let n = g.rng.int(h.dmg[0], h.dmg[1]);
  if (p.perks.includes('first') && f.round === 1) n += 2;
  let armor = armorOf(def, foe);
  if (h.tags.has('pierce')) armor = Math.max(0, armor - 2);
  if (h.tags.has('cleave')) armor = Math.max(0, armor - 1);
  if (p.role === 'maker') armor = Math.floor(armor / 2);
  const dealt = Math.max(1, n - armor);
  if (armor > 0 && def.traits.includes('armored')) reveal(g, f, foe.enemy, 'armored');
  say(g, f, ranged ? 'fight_shoot' : 'fight_hit', pid, { ...foeVars(g, foe, f), n: dealt });
  damageFoe(g, f, foe, dealt, ctx);
}

function hurtHero(g: Game, f: FightState, pid: PlayerId, n: number): void {
  const p = g.p(pid);
  p.hp = Math.max(0, p.hp - n);
  if (p.hp <= 0) {
    if (p.perks.includes('flint') && !p.flags['flint_used_' + f.id]) {
      p.flags['flint_used_' + f.id] = 1;
      p.hp = 1;
      say(g, f, 'fight_flint', pid, {});
      return;
    }
    if (!f.down.includes(pid)) f.down.push(pid);
    for (const foe of f.foes) if (foe.holds === pid) foe.holds = null;
    say(g, f, 'fight_hero_down', pid, {});
  }
}

/** A foe strikes: dodge, cover, guard, armour. Returns damage dealt (0 = missed/blocked). */
function foeStrikes(g: Game, f: FightState, foe: FoeState, target: PlayerId, mult: number, ctx: RoundCtx, kind: string): number {
  const def = enemyOf(g, foe.enemy);
  let t = target;
  const coverer = ctx.cover.get(t);
  if (coverer && up(g, f, coverer) && !pinned(g, f, coverer)) t = coverer;
  if (!up(g, f, t)) return 0;
  const h = heroOf(g, t);
  const vars = foeVars(g, foe, f);
  if (kind !== 'grab' && g.rng.chance(h.dodge)) {
    say(g, f, 'fight_dodge', t, vars);
    return 0;
  }
  let n = g.rng.int(def.dmg[0], def.dmg[1]);
  if (def.traits.includes('night') && g.isEvening()) {
    n = Math.round(n * 1.3);
    reveal(g, f, foe.enemy, 'night');
  }
  n = Math.round(n * mult);
  // shoulder to shoulder: while the other one stands too, each takes a blow better
  const mate = f.party.find((x) => x !== t);
  const shoulder = g.p(t).perks.includes('shoulder') && !!mate && up(g, f, mate) ? 1 : 0;
  n = Math.max(1, n - h.armor - shoulder);
  if (ctx.guard.has(t)) n = Math.max(0, Math.round(n * 0.4));
  if (coverer === t && g.p(t).perks.includes('shield')) n = Math.round(n * 0.7);
  if (n <= 0) {
    say(g, f, 'fight_blocked', t, vars);
    return 0;
  }
  say(g, f, coverer === t ? 'fight_covered' : 'fight_struck', t, { ...vars, n });
  hurtHero(g, f, t, n);
  return n;
}

function foeActs(g: Game, f: FightState, foe: FoeState, ctx: RoundCtx): void {
  if (foe.out) return;
  const def = enemyOf(g, foe.enemy);
  const it = foe.intent;
  foe.acted += 1;
  if (!it) return;
  const vars = foeVars(g, foe, f);
  const target = it.target && up(g, f, it.target) ? it.target : undefined;
  switch (it.move) {
    case 'hold':
      return; // the hold hurts at the end of the round
    case 'guard':
      say(g, f, 'fight_foe_guard', null, vars);
      return;
    case 'call': {
      if (ctx.hitFoes.has(foe.uid) || ctx.noise) {
        say(g, f, 'fight_call_broken', null, vars);
      } else if (def.calls) {
        foe.calling = 2;
        reveal(g, f, foe.enemy, 'caller');
        say(g, f, 'fight_calls', null, vars);
      }
      foe.used.push('call');
      return;
    }
    case 'steal': {
      if (!target) return;
      const p = g.p(target);
      const items = Object.keys(p.bag).filter((id) => g.ix.res.get(id)?.kind !== 'use');
      if (!items.length) {
        foeStrikes(g, f, foe, target, 1, ctx, 'attack');
        return;
      }
      const id = g.rng.pick(items);
      const took = -addBag(g, target, id, -g.rng.int(1, 2));
      reveal(g, f, foe.enemy, 'thief');
      say(g, f, 'fight_steal', target, { ...vars, item: g.ix.res.get(id)?.name ?? id, n: took });
      foe.out = 'fled';
      say(g, f, 'fight_foe_fled', null, vars);
      return;
    }
    case 'charge': {
      if (!target) return;
      reveal(g, f, foe.enemy, 'charge');
      if (ctx.guard.has(target)) {
        say(g, f, 'fight_charge_blocked', target, vars);
        if (heroOf(g, target).tags.has('reach')) {
          const n = g.rng.int(heroOf(g, target).dmg[0], heroOf(g, target).dmg[1]);
          say(g, f, 'fight_counter', target, { ...vars, n });
          damageFoe(g, f, foe, n, ctx);
        }
        return;
      }
      foeStrikes(g, f, foe, target, 2, ctx, 'charge');
      return;
    }
    case 'grab':
    case 'drag':
    case 'leech': {
      if (!target) return;
      const n = foeStrikes(g, f, foe, target, it.move === 'leech' ? 0.5 : 0.5, ctx, 'grab');
      if (n > 0 && up(g, f, target) && !holder(f, target)) {
        foe.holds = target;
        const trait: TraitId = it.move === 'grab' ? 'grab' : it.move === 'drag' ? 'drag' : 'leech';
        reveal(g, f, foe.enemy, trait);
        say(g, f, `fight_${it.move}`, target, vars);
      }
      return;
    }
    case 'venom': {
      if (!target) return;
      const n = foeStrikes(g, f, foe, target, 1, ctx, 'attack');
      if (n > 0) {
        reveal(g, f, foe.enemy, 'venom');
        if (heroOf(g, target).resist.has('venom')) say(g, f, 'fight_venom_resisted', target, vars);
        else {
          g.p(target).poison = 3;
          say(g, f, 'fight_poisoned', target, vars);
        }
      }
      return;
    }
    default:
      if (target) foeStrikes(g, f, foe, target, 1, ctx, 'attack');
  }
}

function heroActs(g: Game, f: FightState, pid: PlayerId, ctx: RoundCtx): void {
  if (!up(g, f, pid)) return;
  const pick = f.picks[pid] ?? 'guard';
  const p = g.p(pid);
  const other = f.party.find((x) => x !== pid);
  const target = (uid: string): FoeState | undefined => {
    const foe = f.foes.find((x) => x.uid === Number(uid));
    if (foe && !foe.out) return foe;
    return activeFoes(f)[0];
  };
  if (pick.startsWith('hit:') || pick.startsWith('shoot:')) {
    const foe = target(pick.split(':')[1]!);
    if (foe) heroHits(g, f, pid, foe, ctx, pick.startsWith('shoot:'));
    return;
  }
  switch (pick) {
    case 'guard':
      say(g, f, 'fight_guard', pid, {});
      return;
    case 'cover':
      if (other) ctx.cover.set(other, pid);
      say(g, f, 'fight_cover', pid, {});
      return;
    case 'struggle': {
      const foe = holder(f, pid);
      if (!foe) return;
      if (g.rng.chance(0.15 * p.stats.wil)) {
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
      const n = Math.max(1, g.rng.int(h.dmg[0], h.dmg[1]) - armorOf(enemyOf(g, foe.enemy), foe));
      say(g, f, 'fight_free', pid, { ...foeVars(g, foe, f), n });
      damageFoe(g, f, foe, n, ctx);
      return;
    }
    case 'lift': {
      if (!other || !f.down.includes(other) || (f.lifted ?? []).includes(other)) return;
      f.down = f.down.filter((x) => x !== other);
      (f.lifted ??= []).push(other);
      const o = g.p(other);
      o.hp = Math.max(1, Math.ceil(o.hpMax / 4));
      say(g, f, 'fight_lift', pid, {});
      return;
    }
    case 'flee': {
      const fast = activeFoes(f).filter((x) => enemyOf(g, x.enemy).traits.includes('fast')).length;
      const chance = Math.max(0.15, Math.min(0.9, 0.5 + 0.05 * p.stats.agi - 0.15 * fast));
      if (g.rng.chance(chance)) {
        // run, and lose part of what you carry
        for (const [id, n] of Object.entries(p.bag)) {
          const lost = Math.floor(n * 0.3);
          if (lost > 0) addBag(g, pid, id, -lost);
        }
        f.fled.push(pid);
        for (const foe of f.foes) if (foe.holds === pid) foe.holds = null;
        say(g, f, 'fight_fled', pid, {});
      } else say(g, f, 'fight_flee_failed', pid, {});
      return;
    }
  }
  if (pick.startsWith('use:')) {
    const id = pick.slice(4);
    const def = g.ix.res.get(id);
    const u = def?.use;
    if (!u || (p.bag[id] ?? 0) <= 0) return;
    if (!u.reusable) addBag(g, pid, id, -1);
    say(g, f, 'fight_use', pid, { item: def!.name });
    if (u.heal) {
      p.hp = Math.min(p.hpMax, p.hp + u.heal);
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
          }
        }
      }
    }
    if (u.scare) {
      if (u.scare.trait === 'fearNoise') ctx.noise = true;
      for (const foe of activeFoes(f)) {
        const d = enemyOf(g, foe.enemy);
        if (!d.traits.includes(u.scare.trait) && !(d.hidden ?? []).includes(u.scare.trait)) continue;
        reveal(g, f, foe.enemy, u.scare.trait);
        if (d.morale !== undefined) foe.fear += u.scare.fear;
        else if (foe.calling > 0 || foe.intent?.move === 'call') foe.calling = 0;
        ctx.hitFoes.add(foe.uid);
      }
      say(g, f, 'fight_scare', pid, { item: def!.name });
    }
    if (u.dmg) {
      const foe = activeFoes(f)[0];
      if (foe) {
        const n = g.rng.int(u.dmg[0], u.dmg[1]);
        damageFoe(g, f, foe, n, ctx);
      }
    }
  }
}

function dogActs(g: Game, f: FightState, ctx: RoundCtx): void {
  if (!f.dog) return;
  const dog = g.ix.c.dog!;
  const danger = activeFoes(f).find((x) => x.intent && ['charge', 'grab', 'drag'].includes(x.intent.move));
  if (danger && g.rng.chance(dog.trained && g.test(dog.trained) ? 0.55 : 0.3)) {
    danger.intent = { move: 'none' };
    say(g, f, 'fight_dog_stops', null, { ...foeVars(g, danger, f), item: dog.name });
    return;
  }
  const foes = activeFoes(f);
  if (!foes.length) return;
  const foe = g.rng.pick(foes);
  const n = g.rng.int(1, 2) + (dog.collar && g.test(dog.collar) ? 1 : 0);
  say(g, f, 'fight_dog_bites', null, { ...foeVars(g, foe, f), n, item: dog.name });
  damageFoe(g, f, foe, n, ctx);
  if (enemyOf(g, foe.enemy).morale !== undefined) foe.fear += 1;
}

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

function endOfRound(g: Game, f: FightState): void {
  hunterNotices(g, f);
  // poison and holds
  for (const pid of f.party) {
    if (!up(g, f, pid)) continue;
    const p = g.p(pid);
    if (p.poison > 0) {
      p.poison -= 1;
      say(g, f, 'fight_poison_tick', pid, { n: 2 });
      hurtHero(g, f, pid, 2);
    }
  }
  for (const foe of activeFoes(f)) {
    if (!foe.holds || !up(g, f, foe.holds)) {
      foe.holds = null;
      continue;
    }
    const def = enemyOf(g, foe.enemy);
    const n = def.traits.includes('drag') ? 2 : def.traits.includes('leech') ? 1 : g.rng.int(1, 2);
    say(g, f, 'fight_held_hurts', foe.holds, { ...foeVars(g, foe, f), n });
    hurtHero(g, f, foe.holds, n);
    if (def.traits.includes('leech')) foe.hp = Math.min(foe.hpMax, foe.hp + 1);
  }
  // calls bring help
  for (const foe of activeFoes(f)) {
    if (foe.calling <= 0) continue;
    foe.calling -= 1;
    if (foe.calling === 0) {
      const def = enemyOf(g, foe.enemy);
      if (def.calls) {
        const add = newFoe(g, f, def.calls);
        f.foes.push(add);
        meet(g, def.calls);
        say(g, f, 'fight_help_came', null, foeVars(g, add, f));
      }
    }
  }
  // phases
  for (const foe of activeFoes(f)) {
    const def = enemyOf(g, foe.enemy);
    const ph = def.phases?.[foe.phase];
    if (!ph || foe.hp / foe.hpMax >= ph.below) continue;
    foe.phase += 1;
    for (const pid of f.party) f.lines[pid]!.push(g.render(ph.text, pid));
    for (const a of ph.add ?? []) {
      for (let i = 0; i < (a.n ?? 1); i++) f.foes.push(newFoe(g, f, a.enemy));
      meet(g, a.enemy);
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
    if (foe.fear >= def.morale) {
      foe.out = 'fled';
      foe.holds = null;
      say(g, f, 'fight_foe_fled', null, foeVars(g, foe, f));
    }
  }
}

function resolveRound(g: Game, f: FightState): void {
  for (const pid of f.party) f.lines[pid] = [];
  const ctx: RoundCtx = { guard: new Set(), cover: new Map(), foeGuard: new Set(), hitFoes: new Set(), noise: false, firstPerkUsed: new Set() };
  for (const pid of f.party) if (f.picks[pid] === 'guard' && up(g, f, pid)) ctx.guard.add(pid);
  for (const foe of activeFoes(f)) if (foe.intent?.move === 'guard') ctx.foeGuard.add(foe.uid);
  // covering is decided before anyone strikes
  for (const pid of f.party) {
    const other = f.party.find((x) => x !== pid);
    if (f.picks[pid] === 'cover' && other && up(g, f, pid)) ctx.cover.set(other, pid);
  }
  const fast = activeFoes(f).filter((x) => enemyOf(g, x.enemy).traits.includes('fast'));
  for (const foe of fast) foeActs(g, f, foe, ctx);
  for (const pid of f.party) heroActs(g, f, pid, ctx);
  dogActs(g, f, ctx);
  for (const foe of activeFoes(f)) if (!fast.includes(foe)) foeActs(g, f, foe, ctx);
  endOfRound(g, f);
  f.picks = {};
  if (!activeFoes(f).length) return finishFight(g, f, 'win');
  const standing = alive(g, f);
  if (!standing.length) {
    const anyDown = f.down.length > 0;
    return finishFight(g, f, anyDown ? 'lose' : 'fled');
  }
  f.round += 1;
  rollIntents(g, f, false);
}

// ----- the end ---------------------------------------------------------------------

/** A beaten hero comes to at home: the bag is lost, a while to recover. */
export function defeat(g: Game, pid: PlayerId): void {
  const p = g.p(pid);
  p.bag = Object.fromEntries(Object.entries(p.bag).filter(([id]) => g.ix.res.get(id)?.kind === 'use'));
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
    let xp = 0;
    const loot: Record<string, number> = {};
    for (const foe of f.foes) {
      const def = enemyOf(g, foe.enemy);
      if (foe.out === 'dead' || foe.out === 'down') {
        xp += def.level * 2;
        const b = (g.s.bestiary[foe.enemy] ??= { seen: 1, beaten: 0, known: [] });
        b.beaten += 1;
        // after a few fights everybody knows what the beast is like
        if (b.beaten >= 3) for (const t of def.hidden ?? []) if (!b.known.includes(t)) b.known.push(t);
        for (const [id, [a, z]] of Object.entries(def.loot ?? {})) loot[id] = (loot[id] ?? 0) + g.rng.int(a, z);
        if (def.rare && g.rng.chance(def.rare.p)) for (const [id, n] of Object.entries(def.rare.loot)) loot[id] = (loot[id] ?? 0) + n;
      } else if (foe.out === 'fled') {
        xp += def.level;
      }
    }
    xp = Math.round(xp * (skyAt(g, f.area)?.xp ?? 1));
    const standing = party.filter((pid) => !f.down.includes(pid) && !f.fled.includes(pid));
    const takers = standing.length ? standing : party;
    // share the loot: one by one into whoever has room
    const got: Record<PlayerId, Record<string, number>> = { p1: {}, p2: {} };
    let i = 0;
    for (const [id, n] of Object.entries(loot)) {
      for (let k = 0; k < n; k++) {
        const pid = takers[i++ % takers.length]!;
        const into = g.atHome(pid) ? g.addRes(id, 1) : addBag(g, pid, id, 1);
        if (into > 0) got[pid][id] = (got[pid][id] ?? 0) + 1;
      }
    }
    for (const pid of party) {
      const p = g.p(pid);
      if (f.down.includes(pid)) p.hp = Math.max(1, Math.ceil(p.hpMax / 4));
      if (!f.fled.includes(pid)) gainXp(g, pid, xp);
      const parts = Object.entries(got[pid]).map(([id, n]) => `${g.ix.res.get(id)?.name ?? id} +${n}`);
      const text = `${g.ix.ui('fight_won')}${parts.length ? ` (${parts.join(', ')})` : ''} ${g.ix.ui('xp_short')} +${xp}.`;
      g.logRaw('find', { [pid]: text }, pid);
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

/** Stop a fight that lost its people (left the game, scene over) without a result. */
export function dropFight(g: Game, f: FightState): void {
  g.s.fights = g.s.fights.filter((x) => x.id !== f.id);
  for (const pid of f.party) g.p(pid).fight = null;
}
