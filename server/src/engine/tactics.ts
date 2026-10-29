// The foes' minds on the field: each turn a foe weighs where it can get to and whom it can strike there,
// and picks the best (with a little chance in it). A pack comes at one hero from several sides, people go
// for the one shooting from behind, a boar marks its run before it charges, a caller shouts from afar,
// a thief goes for the full bag. The hunter's dog runs at whoever is nearest to its people.
import type { EnemyMoveKind, PlayerId, TraitId } from '../../../shared/src/content.js';
import { FOE } from '../../../shared/src/rules.js';
import { dist, key, reach, run, sees, stepCost, type Cell, type Walker } from '../../../shared/src/field.js';
import type { FightState, FoeState, Intent } from '../../../shared/src/state.js';
import {
  activeFoes,
  adjacent,
  aiOf,
  alive,
  damageFoe,
  enemyOf,
  ev,
  fid,
  fieldOf,
  foeStrikes,
  foeVars,
  heroAt,
  heroPos,
  hurtHero,
  kept,
  meetPoint,
  openUp,
  reveal,
  say,
  stopsCharge,
  swimmer,
  taken,
  up,
} from './fight.js';
import { addBag, heroOf } from './hero.js';
import type { Game } from './index.js';

/** A foe's attack costs this much of its turn; it strikes at most once a turn. */
const FOE_HIT = 2;

function apOf(g: Game, foe: FoeState): number {
  const def = enemyOf(g, foe.enemy);
  if (def.traits.includes('leech')) return 2;
  return def.traits.includes('fast') ? 4 : 3;
}

function walkerOf(g: Game, foe: FoeState): Walker {
  return swimmer(enemyOf(g, foe.enemy)) ? 'swim' : 'land';
}

/** How far its strike reaches: people with nets cast them two cells. */
function strikeRange(g: Game, foe: FoeState, kind: EnemyMoveKind): number {
  const def = enemyOf(g, foe.enemy);
  return kind === 'grab' && def.humane ? 2 : 1;
}

/** How much a foe wants this hero: the hurt one, the one shooting from behind, the one who struck it. */
function worth(g: Game, f: FightState, foe: FoeState, pid: PlayerId): number {
  const p = g.p(pid);
  const def = enemyOf(g, foe.enemy);
  let v = 10 + (1 - p.hp / Math.max(1, p.hpMax)) * 8;
  if (heroOf(g, pid).ranged) v += def.humane ? 6 : 2;
  if (foe.hitBy === pid) v += 4;
  // a held hero is easy prey for the rest
  if (activeFoes(f).some((x) => x !== foe && x.holds === pid)) v += 3;
  return v;
}

/** Pick one of its moves by weight among those it can use now. */
function pickMove(g: Game, f: FightState, foe: FoeState, allowed: EnemyMoveKind[]): EnemyMoveKind {
  const def = enemyOf(g, foe.enemy);
  const age = f.round - foe.joined + 1;
  const pool = aiOf(def, foe).filter((m) => allowed.includes(m.move) && !(m.once && foe.used.includes(m.move)) && !(m.from !== undefined && age < m.from));
  if (!pool.length) return 'attack';
  const total = pool.reduce((s, m) => s + (m.w ?? 1), 0);
  let r = g.rng.next() * total;
  for (const m of pool) {
    r -= m.w ?? 1;
    if (r <= 0) return m.move;
  }
  return pool[0]!.move;
}

function has(g: Game, foe: FoeState, move: EnemyMoveKind): boolean {
  return aiOf(enemyOf(g, foe.enemy), foe).some((m) => m.move === move && !(m.once && foe.used.includes(m.move)));
}

// ----- a foe's turn ------------------------------------------------------------------

export function foeTurn(g: Game, f: FightState, foe: FoeState): void {
  const def = enemyOf(g, foe.enemy);
  const vars = foeVars(g, foe, f);
  if (!foe.pos) return;
  // holding someone: the hold hurts, it does not let go
  if (foe.holds) {
    if (up(g, f, foe.holds)) {
      const n = def.traits.includes('drag') ? 2 : def.traits.includes('leech') ? 1 : g.rng.int(1, 2);
      say(g, f, 'fight_held_hurts', foe.holds, { ...vars, n });
      ev(f, { a: fid(foe), t: foe.holds, k: 'hit', n });
      hurtHero(g, f, foe.holds, n);
      if (def.traits.includes('leech')) foe.hp = Math.min(foe.hpMax, foe.hp + 1);
      return;
    }
    foe.holds = null;
  }
  if (foe.intent?.move === 'charge' && foe.intent.line) return charge(g, f, foe, foe.intent.line);
  const heroes = alive(g, f).filter((pid) => heroPos(f, pid));
  if (!heroes.length) return;
  const near = heroes.some((pid) => adjacent(heroPos(f, pid), foe.pos));
  // a caller shouts from afar while nobody is on it
  if (def.calls && has(g, foe, 'call') && !near && foe.calling <= 0 && g.rng.chance(0.6)) {
    foe.calling = 2;
    foe.used.push('call');
    reveal(g, f, foe.enemy, 'caller');
    say(g, f, 'fight_calls', null, vars);
    ev(f, { a: fid(foe), k: 'call' });
    return;
  }
  // a charger marks its run when one stands in line a little way off
  if (has(g, foe, 'charge') && !near) {
    const lane = chargeLane(g, f, foe, heroes);
    if (lane && g.rng.chance(0.7)) {
      foe.intent = { move: 'charge', target: lane.target, line: lane.line };
      reveal(g, f, foe.enemy, 'charge');
      say(g, f, 'fight_charge_mark', null, vars);
      ev(f, { a: fid(foe), k: 'aim' });
      return;
    }
  }
  const rich = heroes.filter((pid) => Object.keys(g.p(pid).bag).some((id) => !kept(g, id)));
  // a net cast is gathered up again before it flies a second time
  const netReady = !(def.humane && foe.netAt !== undefined && f.round - foe.netAt < 3);
  const kinds: EnemyMoveKind[] = ['attack', 'venom', 'drag', 'leech', ...(netReady ? (['grab'] as EnemyMoveKind[]) : []), ...(rich.length ? (['steal'] as EnemyMoveKind[]) : [])];
  const kind = pickMove(g, f, foe, kinds);
  const targets = kind === 'steal' ? rich : heroes;
  const plan = bestStrike(g, f, foe, targets, kind);
  if (plan) {
    foe.idle = 0;
    if (plan.path.length) {
      foe.pos = plan.cell;
      ev(f, { a: fid(foe), k: 'move', path: plan.path });
    }
    strike(g, f, foe, plan.target, kind);
    return;
  }
  // it cannot get at anyone, turn after turn (across water, behind a wall): it gives up and goes
  foe.idle = (foe.idle ?? 0) + 1;
  if (foe.idle >= 5) {
    foe.out = 'fled';
    foe.holds = null;
    say(g, f, 'fight_foe_fled', null, vars);
    ev(f, { a: fid(foe), k: 'flee' });
    return;
  }
  // nobody within reach this turn: behind a shield if it has one, else close in
  if (has(g, foe, 'guard') && def.traits.includes('shield') && g.rng.chance(0.4)) {
    foe.guarding = true;
    say(g, f, 'fight_foe_guard', null, vars);
    ev(f, { a: fid(foe), k: 'guard' });
  }
  approach(g, f, foe, targets.length ? targets : heroes);
}

interface Strike {
  cell: Cell;
  path: Cell[];
  target: PlayerId;
  score: number;
}

/** The best place to strike from this turn and whom to strike there. */
function bestStrike(g: Game, f: FightState, foe: FoeState, targets: PlayerId[], kind: EnemyMoveKind): Strike | null {
  const fld = fieldOf(f);
  const def = enemyOf(g, foe.enemy);
  const budget = apOf(g, foe) - FOE_HIT;
  const ways = reach(fld, foe.pos!, Math.max(0, budget), taken(g, f, fid(foe)), walkerOf(g, foe));
  const range = strikeRange(g, foe, kind);
  const pack = def.traits.includes('pack');
  let best: Strike | null = null;
  for (const [, way] of ways) {
    const cell = way.path.length ? way.path[way.path.length - 1]! : foe.pos!;
    for (const pid of targets) {
      const at = heroPos(f, pid)!;
      const d = dist(cell, at);
      if (d < 1 || d > range || (d > 1 && !sees(fld, cell, at))) continue;
      let score = worth(g, f, foe, pid) - 0.6 * way.cost + g.rng.next() * 2;
      // others of its kind already at this hero: come at them from another side
      const mates = activeFoes(f).filter((x) => x !== foe && adjacent(x.pos, at)).length;
      score += mates * (pack ? 4 : 1.5);
      // a long point held out is to be feared
      if (f.stance?.[pid] === 'keep') score -= 4;
      if (f.stance?.[pid] === 'block') score -= 2;
      // people keep out of the other hero's reach when they can
      if (def.humane) {
        for (const other of alive(g, f)) {
          if (other === pid) continue;
          const oc = heroPos(f, other);
          if (oc && adjacent(oc, cell)) score -= 1.5;
        }
      }
      if (!best || score > best.score) best = { cell, path: way.path, target: pid, score };
    }
  }
  return best;
}

/** Walk as far as the turn allows towards the most wanted hero (swimmers keep to the water). */
function approach(g: Game, f: FightState, foe: FoeState, targets: PlayerId[]): void {
  const fld = fieldOf(f);
  const walker = walkerOf(g, foe);
  const busy = taken(g, f, fid(foe));
  const ways = reach(fld, foe.pos!, apOf(g, foe), busy, walker);
  let best: { path: Cell[]; score: number } | null = null;
  for (const pid of targets) {
    const at = heroPos(f, pid)!;
    // how far from each cell to a cell next to this hero (measured from the hero outwards, as the foe walks)
    const from = reach(fld, at, 40, new Set([...busy].filter((k) => k !== key(at))), walker);
    const w = worth(g, f, foe, pid);
    for (const [k, way] of ways) {
      const there = from.get(k);
      const left = there ? there.cost : dist(way.path.length ? way.path[way.path.length - 1]! : foe.pos!, at) * 3;
      const score = w - 2.2 * left - 0.2 * way.cost + g.rng.next();
      if (!best || score > best.score) best = { path: way.path, score };
    }
  }
  if (best && best.path.length) {
    foe.pos = best.path[best.path.length - 1]!;
    ev(f, { a: fid(foe), k: 'move', path: best.path });
  }
}

function strike(g: Game, f: FightState, foe: FoeState, target: PlayerId, kind: EnemyMoveKind): void {
  const vars = foeVars(g, foe, f);
  switch (kind) {
    case 'steal': {
      const p = g.p(target);
      const items = Object.keys(p.bag).filter((id) => !kept(g, id));
      if (!items.length || !adjacent(foe.pos, heroPos(f, target))) {
        foeStrikes(g, f, foe, target, 1, 'attack');
        return;
      }
      const id = g.rng.pick(items);
      const took = -addBag(g, target, id, -g.rng.int(1, 2));
      reveal(g, f, foe.enemy, 'thief');
      say(g, f, 'fight_steal', target, { ...vars, item: g.ix.res.get(id)?.name ?? id, n: took });
      foe.out = 'fled';
      say(g, f, 'fight_foe_fled', null, vars);
      ev(f, { a: fid(foe), k: 'flee' });
      return;
    }
    case 'grab':
    case 'drag':
    case 'leech': {
      const n = foeStrikes(g, f, foe, target, 0.5, 'grab');
      if (enemyOf(g, foe.enemy).humane) foe.netAt = f.round;
      if (n > 0 && up(g, f, target) && !activeFoes(f).some((x) => x.holds === target)) {
        foe.holds = target;
        const trait: TraitId = kind === 'grab' ? 'grab' : kind === 'drag' ? 'drag' : 'leech';
        reveal(g, f, foe.enemy, trait);
        say(g, f, `fight_${kind}`, target, vars);
        ev(f, { a: fid(foe), t: target, k: 'hold' });
      }
      return;
    }
    case 'venom': {
      const n = foeStrikes(g, f, foe, target, 1, 'attack');
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
      foeStrikes(g, f, foe, target, 1, 'attack');
  }
}

// ----- a charge ------------------------------------------------------------------------

/** A straight run to a hero 2–5 cells off with nothing solid in the way. */
function chargeLane(g: Game, f: FightState, foe: FoeState, heroes: PlayerId[]): { target: PlayerId; line: Cell[] } | null {
  const fld = fieldOf(f);
  const options: Array<{ target: PlayerId; line: Cell[] }> = [];
  for (const pid of heroes) {
    const at = heroPos(f, pid)!;
    const d = dist(foe.pos!, at);
    if (d < 2 || d > 5) continue;
    const ln = run(foe.pos!, at, d + 1);
    if (!ln) continue;
    const upTo = ln.slice(0, d - 1);
    if (upTo.some((c) => stepCost(fld, c) === null || taken(g, f, fid(foe)).has(key(c)))) continue;
    // the run goes on a step past the hero, to the edge or the first solid thing
    const line = [...upTo, at];
    const past = ln[d];
    if (past && past[0] >= 0 && past[1] >= 0 && past[0] < fld.w && past[1] < fld.h && stepCost(fld, past) !== null) line.push(past);
    options.push({ target: pid, line });
  }
  return options.length ? g.rng.pick(options) : null;
}

function charge(g: Game, f: FightState, foe: FoeState, line: Cell[]): void {
  const fld = fieldOf(f);
  const vars = foeVars(g, foe, f);
  foe.intent = null;
  const path: Cell[] = [];
  let hit: PlayerId | undefined;
  for (const c of line) {
    if (c[0] < 0 || c[1] < 0 || c[0] >= fld.w || c[1] >= fld.h || stepCost(fld, c) === null) break;
    const pid = heroAt(g, f, c);
    if (pid) {
      hit = pid;
      break;
    }
    if (taken(g, f, fid(foe)).has(key(c))) break;
    path.push(c);
  }
  if (path.length) {
    foe.pos = path[path.length - 1]!;
    ev(f, { a: fid(foe), k: 'move', path });
  }
  if (!hit) {
    // it thunders past where the hero no longer stands, and stands there open
    say(g, f, 'fight_charge_missed', null, vars);
    openUp(g, f, foe);
    return;
  }
  if (stopsCharge(f, hit)) {
    say(g, f, 'fight_charge_blocked', hit, vars);
    ev(f, { a: fid(foe), t: hit, k: 'block' });
    if (heroOf(g, hit).tags.has('reach')) meetPoint(g, f, foe, hit);
    if (!foe.out) openUp(g, f, foe);
    return;
  }
  foeStrikes(g, f, foe, hit, FOE.charge, 'charge');
}

// ----- what it means to do next --------------------------------------------------------

/** What a foe shows it will do on its next turn: whom it is after and how (a marked charge stays). */
export function planIntent(g: Game, f: FightState, foe: FoeState): void {
  if (foe.out || !foe.pos) return;
  if (foe.intent?.move === 'charge' && foe.intent.line) return;
  if (foe.holds) {
    foe.intent = { move: 'hold', target: foe.holds };
    return;
  }
  if (foe.calling > 0) {
    foe.intent = { move: 'call' };
    return;
  }
  const heroes = alive(g, f).filter((pid) => heroPos(f, pid));
  if (!heroes.length) {
    foe.intent = null;
    return;
  }
  // nearest by the way it walks, wanted most
  const fld = fieldOf(f);
  const walker = walkerOf(g, foe);
  const from = reach(fld, foe.pos, 40, new Set(), walker);
  let target = heroes[0]!;
  let best = -Infinity;
  for (const pid of heroes) {
    const at = heroPos(f, pid)!;
    const d = Math.min(...[at, ...neighboursOf(at)].map((c) => from.get(key(c))?.cost ?? 99));
    const score = worth(g, f, foe, pid) - 2 * d;
    if (score > best) {
      best = score;
      target = pid;
    }
  }
  const def = enemyOf(g, foe.enemy);
  const special = aiOf(def, foe).filter((m) => ['venom', 'grab', 'drag', 'leech'].includes(m.move)).sort((a, b) => (b.w ?? 1) - (a.w ?? 1))[0];
  const intent: Intent = { move: special && (special.w ?? 1) >= 2 ? special.move : 'attack', target };
  foe.intent = intent;
}

function neighboursOf([x, y]: Cell): Cell[] {
  const out: Cell[] = [];
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) out.push([x + dx, y + dy]);
  return out;
}

// ----- the dog -------------------------------------------------------------------------

export function dogTurn(g: Game, f: FightState): void {
  const dog = g.ix.c.dog!;
  const fld = fieldOf(f);
  if (!f.dogPos) return;
  const foes = activeFoes(f).filter((x) => x.pos);
  if (!foes.length) return;
  const busy = taken(g, f, 'dog');
  const ways = reach(fld, f.dogPos, 4, busy);
  // a charge being gathered: the dog goes for its legs
  const charger = foes.find((x) => x.intent?.move === 'charge');
  if (charger && g.rng.chance(dog.trained && g.test(dog.trained) ? 0.55 : 0.3)) {
    const spot = [...ways.values()].find((w) => w.path.length && adjacent(w.path[w.path.length - 1], charger.pos));
    if (spot || adjacent(f.dogPos, charger.pos)) {
      if (spot) {
        f.dogPos = spot.path[spot.path.length - 1]!;
        ev(f, { a: 'dog', k: 'move', path: spot.path });
      }
      charger.intent = { move: 'none' };
      say(g, f, 'fight_dog_stops', null, { ...foeVars(g, charger, f), item: dog.name });
      ev(f, { a: 'dog', t: fid(charger), k: 'stun' });
      return;
    }
  }
  // the foe nearest to its people
  const people = alive(g, f).map((pid) => heroPos(f, pid)!).filter(Boolean);
  const target = foes.sort((a, b) => Math.min(...people.map((c) => dist(c, a.pos!))) - Math.min(...people.map((c) => dist(c, b.pos!))))[0]!;
  if (!adjacent(f.dogPos, target.pos)) {
    let best: Cell[] | null = null;
    let bestD = Infinity;
    for (const [, w] of ways) {
      if (!w.path.length) continue;
      const end = w.path[w.path.length - 1]!;
      const d = dist(end, target.pos!) + w.cost * 0.1;
      if (d < bestD) {
        bestD = d;
        best = w.path;
      }
    }
    if (best) {
      f.dogPos = best[best.length - 1]!;
      ev(f, { a: 'dog', k: 'move', path: best });
    }
  }
  if (!adjacent(f.dogPos, target.pos)) return;
  const n = g.rng.int(1, 2) + (dog.collar && g.test(dog.collar) ? 1 : 0);
  say(g, f, 'fight_dog_bites', null, { ...foeVars(g, target, f), n, item: dog.name });
  ev(f, { a: 'dog', t: fid(target), k: 'hit', n });
  damageFoe(g, f, target, n);
  if (enemyOf(g, target.enemy).morale !== undefined) target.fear += 1;
}

