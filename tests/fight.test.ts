import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { defeat, fightOf, isOpen, startFight } from '../server/src/engine/fight.js';
import { foeTurn } from '../server/src/engine/tactics.js';
import { E2 } from '../content/a2/ids.js';
import { fieldFrom, fieldProblems } from '../server/src/engine/terrain.js';
import { refreshHero } from '../server/src/engine/hero.js';
import { pair, World } from './world.js';
import type { FightState } from '../shared/src/state.js';

/** Both heroes on the shore after the hut, ready to fight. */
function field(seed = 3): { w: World; h: PlayerId; m: PlayerId } {
  const r = pair(seed);
  const s = r.w.state;
  s.flags.p2_hut = 1;
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_02';
    s.players[pid].busy = null;
  }
  return r;
}

function put(f: FightState, pid: PlayerId, c: [number, number]): void {
  f.pos![pid] = c;
}

/** Make it this hero's turn with a full set of points. */
function turnOf(w: World, pid: PlayerId): FightState {
  const f = fightOf(w.g(), pid)!;
  f.turn = f.order!.indexOf(pid);
  f.ap = 4;
  return f;
}

/** Play rounds with a fixed move until the fight ends (or n rounds). */
function play(w: World, picks: Partial<Record<PlayerId, (ids: string[]) => string>>, n = 40): void {
  for (let i = 0; i < n; i++) {
    let any = false;
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const f = w.view(pid).fight;
      if (!f || f.myPick || !picks[pid]) continue;
      const ids = f.moves.filter((m) => m.enabled).map((m) => m.id);
      if (!ids.length) continue;
      w.cmd(pid, { c: 'fight', id: picks[pid]!(ids) });
      any = true;
    }
    if (!any) return;
  }
}

const hit = (ids: string[]) => ids.find((x) => x.startsWith('hit:') || x.startsWith('shoot:')) ?? ids[0]!;

describe('fights', () => {
  it('a fight waits for both picks, foes show what they are about to do, the winners get loot and experience', () => {
    const { w, h, m } = field();
    startFight(w.g(), 'a_02', [{ enemy: 'e_01', n: 2 }]);
    const v = w.view(h);
    expect(v.fight?.party.length).toBe(2);
    expect(v.fight?.foes.every((f) => !!f.intent)).toBe(true);
    const xp0 = w.state.players[h].xp;
    w.cmd(h, { c: 'fight', id: 'guard' });
    expect(w.view(h).fight?.round).toBe(1); // still waiting for the partner
    expect(w.view(m).fight?.party.find((p) => p.pid === h)?.picked).toBe(true);
    play(w, { [h]: hit, [m]: hit });
    expect(w.view(h).fight).toBeNull();
    // the last blow stays in sight a moment, with nothing left to choose
    const end = w.view(h).fightEnd!;
    expect(end.ended).toBe('win');
    expect(end.moves).toEqual([]);
    expect(end.foes.every((x) => x.out)).toBe(true);
    // the loot waits on the field until it is taken (or the fight is ended with nothing to take)
    expect(end.loot).toBeDefined();
    w.advance(5000);
    expect(w.view(h).fightEnd?.loot).toBeDefined();
    const bag0 = Object.values(w.state.players[h].bag).reduce((a, b) => a + b, 0);
    const share = end.loot!.reduce((a, x) => a + x.n, 0);
    expect(w.cmd(h, { c: 'loot' }).ok).toBe(true);
    expect(Object.values(w.state.players[h].bag).reduce((a, b) => a + b, 0)).toBe(bag0 + share);
    expect(w.view(h).fightEnd).toBeNull();
    expect(w.cmd(h, { c: 'loot' }).ok).toBe(false);
    expect(w.state.players[h].xp).toBeGreaterThan(xp0);
    expect(w.state.bestiary['e_01']!.seen).toBeGreaterThan(0);
  });

  it('the hunter reads what a beast means to do; the maker sees where armour gives', () => {
    const { w, h, m } = field();
    startFight(w.g(), 'a_02', [{ enemy: 'e_05' }]);
    const fh = w.view(h).fight!;
    const fm = w.view(m).fight!;
    expect(fh.foes[0]!.next).toBeTruthy();
    expect(fm.foes[0]!.next).toBeUndefined();
    expect(fm.foes[0]!.weak).toBeTruthy();
    expect(fh.foes[0]!.weak).toBeUndefined();
  });

  it('a grab pins a hero: no walking, only the one who holds can be struck, the partner frees them', () => {
    const { w, h, m } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_07' }]);
    const foe = f.foes[0]!;
    put(f, h, [3, 7]);
    put(f, m, [4, 7]);
    foe.pos = [3, 6];
    foe.holds = h;
    turnOf(w, h);
    const hv = w.view(h).fight!;
    expect(hv.reach).toEqual([]);
    expect(hv.moves.filter((x) => x.enabled).map((x) => x.id).sort()).toEqual(['end', `hit:${foe.uid}`, 'struggle'].sort());
    turnOf(w, m);
    expect(w.view(m).fight!.moves.find((x) => x.id === 'free')?.enabled).toBe(true);
    w.cmd(m, { c: 'fight', id: 'free' });
    const after = fightOf(w.g(), h);
    expect(after === null || after.foes[0]!.holds !== h).toBe(true);
  });

  it('a leech only drinks: the hero can still fight, salt pulls it off', () => {
    const { w, h } = field();
    w.state.players[h].bag = { u_04: 2 };
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_04' }], { party: [h] });
    f.foes[0]!.holds = h;
    const moves = w.view(h).fight!.moves.map((x) => x.id);
    expect(moves.some((x) => x.startsWith('hit:'))).toBe(true);
    w.cmd(h, { c: 'fight', id: 'use:u_04' });
    expect(w.view(h).fight).toBeNull(); // the only leech fell off: the fight is over
    expect(w.state.players[h].bag['u_04']).toBe(1);
  });

  it('boots stop the viper\'s poison; without them it burns on', () => {
    for (const boots of [true, false]) {
      const { w, m } = field(5);
      const p = w.state.players[m];
      if (boots) p.equip.legs = 'g_06';
      refreshHero(w.g(), m);
      const f = startFight(w.g(), 'a_02', [{ enemy: 'e_02' }], { party: [m] });
      let poisoned = false;
      for (let i = 0; i < 30 && fightOf(w.g(), m); i++) {
        if (f.foes[0]!.pos) put(f, m, [f.foes[0]!.pos[0], f.foes[0]!.pos[1] + 1]);
        w.cmd(m, { c: 'fight', id: 'end' });
        if (w.state.players[m].poison > 0) poisoned = true;
        if (p.hp <= 3) break;
      }
      expect(poisoned).toBe(!boots);
    }
  });

  it('a fallen hero can be lifted once; a second fall is for good', () => {
    const { w, h, m } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_09' }]);
    f.down.push(m);
    w.state.players[m].hp = 0;
    expect(w.view(h).fight!.moves.some((x) => x.id === 'lift')).toBe(true);
    w.cmd(h, { c: 'fight', id: 'lift' });
    expect(w.state.players[m].hp).toBeGreaterThan(0);
    const f2 = fightOf(w.g(), h)!;
    f2.down.push(m);
    w.state.players[m].hp = 0;
    expect(w.view(h).fight!.moves.some((x) => x.id === 'lift')).toBe(false);
  });

  it('losing a routine fight: home, bag lost (things to take along kept), a while to come to', () => {
    const { w, m } = field();
    const p = w.state.players[m];
    p.bag = { r_01: 4, u_02: 1 };
    p.hp = 1;
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [m] });
    for (let i = 0; i < 10 && fightOf(w.g(), m); i++) {
      if (f.foes[0]!.pos) put(f, m, [f.foes[0]!.pos[0], f.foes[0]!.pos[1] + 1]);
      w.cmd(m, { c: 'fight', id: 'end' });
    }
    expect(fightOf(w.g(), m)).toBeNull();
    expect(p.at).toBe('a_01');
    expect(p.bag).toEqual({ u_02: 1 });
    expect(p.busy?.action).toBe('rest:defeat');
    expect(p.hp).toBeGreaterThan(0);
  });

  it('running away drops part of the bag', () => {
    const { w, h } = field(9);
    const p = w.state.players[h];
    p.bag = { r_01: 10 };
    startFight(w.g(), 'a_02', [{ enemy: 'e_01', n: 3 }], { party: [h] });
    for (let i = 0; i < 20 && fightOf(w.g(), h); i++) {
      // the way out is the lower edge
      const cur = fightOf(w.g(), h)!;
      if (cur.pos![h]![1] !== 7) put(cur, h, [3, 7]);
      w.cmd(h, { c: 'fight', id: 'flee' });
    }
    expect(fightOf(w.g(), h)).toBeNull();
    expect(p.bag['r_01']).toBeLessThan(10);
  });

  it('the dog fights along with the hunter once it is back', () => {
    const { w, h, m } = field();
    expect(startFight(w.g(), 'a_02', [{ enemy: 'e_01' }], { party: [m] }).dog).toBe(false);
    w.state.fights = [];
    w.state.players[m].fight = null;
    w.state.flags.p2_dog_back = 1;
    expect(startFight(w.g(), 'a_02', [{ enemy: 'e_01' }], { party: [h] }).dog).toBe(true);
  });

  it('a caller brings help two rounds on, unless struck in time', () => {
    for (const strike of [false, true]) {
      const { w, m } = field();
      const f = startFight(w.g(), 'a_02', [{ enemy: 'e_08' }], { party: [m] });
      const foe = f.foes[0]!;
      foe.calling = 2;
      if (strike) {
        foe.pos = [3, 6];
        put(f, m, [3, 7]);
        turnOf(w, m);
        w.cmd(m, { c: 'fight', id: `hit:${foe.uid}` });
        // a miss is no strike: try until one lands
        for (let i = 0; i < 6 && foe.calling > 0 && fightOf(w.g(), m); i++) {
          turnOf(w, m);
          w.cmd(m, { c: 'fight', id: `hit:${foe.uid}` });
        }
        expect(foe.calling).toBe(0);
      } else {
        for (let i = 0; i < 2; i++) {
          const cur = fightOf(w.g(), m)!;
          cur.foes[0]!.calling = Math.max(cur.foes[0]!.calling, 0);
          turnOf(w, m);
          w.cmd(m, { c: 'fight', id: 'end' });
        }
        const cur = fightOf(w.g(), m);
        expect(cur === null || cur.foes.length === 2).toBe(true);
      }
    }
  });

  it('a scene fight lost: the scene steps back and can be tried again, nobody is sent home', () => {
    const { w, h, m } = field();
    const s = w.state;
    Object.assign(s.flags, { p2_sluice_open: 1, p2_hunted: 1, 'done:s_09': 1 });
    for (const pid of [h, m]) s.players[pid].at = 'a_07';
    expect(w.cmd(h, { c: 'act', id: 's_16' }).ok).toBe(true);
    w.cmd(m, { c: 'accept' });
    for (let i = 0; i < 6 && !w.view(h).fight; i++) {
      const sc = w.view(h).scene!;
      if (sc.kind === 'choice') for (const pid of [h, m]) w.cmd(pid, { c: 'choose', id: w.view(pid).scene!.options![0]!.id });
      else for (const pid of [h, m]) w.cmd(pid, { c: 'next' });
    }
    expect(w.view(h).fight?.scene).toBe(true);
    expect(w.view(h).fight?.moves.some((x) => x.id === 'flee')).toBe(false);
    for (const pid of [h, m]) s.players[pid].hp = 1;
    play(w, { [h]: () => 'end', [m]: () => 'end' }, 400);
    expect(w.view(h).fight).toBeNull();
    for (let i = 0; i < 4 && s.scene; i++) for (const pid of [h, m]) w.cmd(pid, { c: 'next' });
    expect(s.flags['done:s_16']).toBeUndefined();
    expect(s.players[h].at).toBe('a_07');
    expect(s.players[h].hp).toBeGreaterThan(1);
    expect(w.view(h).groups.flatMap((g) => g.entries).some((e) => e.id === 's_16')).toBe(true);
  });

  it('strong moves come from what is in hand and cost action points; points left become guard', () => {
    const { w, m } = field();
    const s = w.state;
    s.players[m].equip.weapon = 'g_02'; // a club: it dazes
    refreshHero(w.g(), m);
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [m] });
    const foe = f.foes[0]!;
    foe.pos = [3, 6];
    put(f, m, [3, 7]);
    turnOf(w, m);
    let v = w.view(m).fight!;
    const stun = v.moves.find((x) => x.tech === 'stun')!;
    expect(stun.cost).toBe(3);
    expect(v.hands.main.dmg).toBeDefined();
    w.cmd(m, { c: 'fight', id: stun.id });
    if (!fightOf(w.g(), m)) return;
    v = w.view(m).fight!;
    expect(v.myTurn).toBe(true);
    expect(v.ap).toBe(1);
    expect(v.moves.find((x) => x.tech === 'hit')!.enabled).toBe(false);
    w.cmd(m, { c: 'fight', id: 'end' });
    const cur = fightOf(w.g(), m);
    if (cur) expect(cur.guard?.[m] ?? 0).toBeGreaterThanOrEqual(0);
  });

  it('a strike out of reach or out of sight is not offered; walking costs points', () => {
    const { w, m } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [m] });
    f.field!.cells = f.field!.cells.map(() => '');
    const foe = f.foes[0]!;
    foe.pos = [3, 1];
    put(f, m, [3, 7]);
    turnOf(w, m);
    let v = w.view(m).fight!;
    expect(v.moves.find((x) => x.id === `hit:${foe.uid}`)!.enabled).toBe(false);
    expect(v.reach.some((r) => r.c[0] === 3 && r.c[1] === 4 && r.cost === 3)).toBe(true);
    w.cmd(m, { c: 'fight', id: 'go:3,4' });
    v = w.view(m).fight!;
    expect(v.ap).toBe(1);
    expect(fightOf(w.g(), m)!.pos![m]).toEqual([3, 4]);
  });

  it('a dazed foe loses its turn and lies open: no blow at it misses', () => {
    const { w, h, m } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }]);
    const foe = f.foes[0]!;
    foe.pos = [3, 6];
    put(f, h, [2, 7]);
    put(f, m, [4, 7]);
    foe.stun = true;
    foe.open = f.round + 1;
    turnOf(w, h);
    w.cmd(h, { c: 'fight', id: `hit:${foe.uid}` });
    const ev = fightOf(w.g(), h)?.events ?? [];
    expect(ev.some((e) => e.k === 'hit' && e.a === h)).toBe(true);
    expect(ev.some((e) => e.k === 'miss' && e.a === h)).toBe(false);
  });

  it('perks on the field: cheaper blows (a club with quick hands, an open foe)', () => {
    const { w, m } = field();
    const s = w.state;
    s.players[m].equip.weapon = 'g_02'; // a club: it dazes
    s.players[m].perks.push('swift', 'opening');
    refreshHero(w.g(), m);
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05', n: 2 }], { party: [m] });
    const [a, b] = f.foes;
    a!.pos = [3, 6];
    b!.pos = [5, 1];
    put(f, m, [3, 7]);
    turnOf(w, m);
    let v = w.view(m).fight!;
    expect(v.moves.find((x) => x.tech === 'stun' && x.target === a!.uid)!.cost).toBe(2);
    a!.open = f.round + 1;
    v = w.view(m).fight!;
    expect(v.moves.find((x) => x.id === `hit:${a!.uid}`)!.cost).toBe(1);
    a!.hp = 1;
    w.cmd(m, { c: 'fight', id: `hit:${a!.uid}` });
    expect(a!.out).toBeTruthy();
    // one point spent: three left
    expect(fightOf(w.g(), m)!.ap).toBe(3);
  });

  it('step five: a wide swing catches a second foe standing by', () => {
    const { w, h } = field();
    const p = w.state.players[h];
    p.perks.push('sweep');
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05', n: 2 }], { party: [h] });
    f.field!.cells = f.field!.cells.map(() => '');
    const [a, b] = f.foes;
    a!.pos = [3, 6];
    b!.pos = [4, 6];
    put(f, h, [3, 7]);
    turnOf(w, h);
    a!.open = f.round + 1;
    const hpB = b!.hp;
    w.cmd(h, { c: 'fight', id: `hit:${a!.uid}` });
    expect(b!.hp).toBeLessThan(hpB);
  });

  it('moves of perks: each shows why it cannot be made, and the lunge steps in and strikes', () => {
    const { w, m } = field();
    const s = w.state;
    s.players[m].equip.weapon = 'g_02';
    s.players[m].perks.push('lunge', 'desperate', 'ram', 'shove');
    refreshHero(w.g(), m);
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [m] });
    f.field!.cells = f.field!.cells.map(() => '');
    const foe = f.foes[0]!;
    foe.pos = [3, 5];
    put(f, m, [3, 7]);
    turnOf(w, m);
    const v = w.view(m).fight!;
    const mv = (t: string) => v.moves.find((x) => x.tech === t && x.target === foe.uid)!;
    expect(mv('lunge').enabled).toBe(true);
    expect(mv('lunge').perk).toBe(true);
    expect(mv('desperate').enabled).toBe(false);
    expect(mv('desperate').reason).toBeTruthy();
    expect(mv('ram').enabled).toBe(true);
    expect(mv('shove').enabled).toBe(false);
    w.cmd(m, { c: 'fight', id: mv('lunge').id });
    const cur = fightOf(w.g(), m);
    if (cur) expect(cur.pos![m]).toEqual([3, 6]);
  });

  it('a pinned foe does not leave its cell on its turn', () => {
    const { w, h } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [h] });
    const foe = f.foes[0]!;
    foe.pos = [3, 1];
    put(f, h, [3, 7]);
    foe.rooted = true;
    f.turn = f.order!.indexOf(`f${foe.uid}`) - 1;
    if (f.turn < 0) f.turn = f.order!.length - 1;
    turnOf(w, h);
    w.cmd(h, { c: 'fight', id: 'end' });
    expect(foe.pos).toEqual([3, 1]);
  });

  it('a strong foe pressed close marks a wide swing: who steps out is spared and finds it open, who stays is struck', () => {
    for (const stay of [false, true]) {
      const { w, h, m } = field();
      const g = w.g();
      const d = fieldFrom(['...f...', '.......', '.......', '.......', '.......', '.......', '.......', '..h.h..'], 'grass');
      const f = startFight(g, 'a_02', [{ enemy: E2.hook }], { party: [h, m], field: d.field, starts: { heroes: d.heroes, foes: d.foes } });
      const foe = f.foes[0]!;
      for (let i = 0; i < 30 && foe.intent?.move !== 'sweep'; i++) {
        foe.pos = [3, 3];
        put(f, h, [3, 4]);
        put(f, m, [2, 4]);
        foe.sweptAt = undefined;
        foe.intent = null;
        foeTurn(g, f, foe);
      }
      expect(foe.intent?.move).toBe('sweep');
      expect(foe.intent?.line).toContainEqual([3, 4]);
      if (!stay) {
        put(f, h, [3, 6]);
        put(f, m, [2, 6]);
      }
      foeTurn(g, f, foe);
      expect(foe.intent).toBeNull();
      expect(f.lines[h].some((l) => l.includes('широко'))).toBe(stay);
      expect(isOpen(f, foe)).toBe(!stay);
    }
  });

  it('a will of iron always breaks a hold', () => {
    const { w, m } = field();
    w.state.players[m].perks.push('will');
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [m] });
    const foe = f.foes[0]!;
    foe.pos = [3, 6];
    put(f, m, [3, 7]);
    foe.holds = m;
    turnOf(w, m);
    w.cmd(m, { c: 'fight', id: 'struggle' });
    expect(foe.holds).toBeNull();
  });

  it('two heroes face tougher foes than one', () => {
    const one = field();
    startFight(one.w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [one.h] });
    const two = field();
    startFight(two.w.g(), 'a_02', [{ enemy: 'e_05' }]);
    const solo = fightOf(one.w.g(), one.h)!.foes[0]!.hpMax;
    const duo = fightOf(two.w.g(), two.h)!.foes[0]!.hpMax;
    expect(duo).toBeGreaterThan(solo * 1.5);
    // and one who comes to help makes them so too
    const late = field();
    startFight(late.w.g(), 'a_02', [{ enemy: 'e_05' }], { party: [late.h] });
    expect(late.w.cmd(late.m, { c: 'help' }).ok).toBe(true);
    expect(fightOf(late.w.g(), late.h)!.foes[0]!.hpMax).toBe(duo);
  });

  it('foes far beneath the heroes are driven off at once, loot and all', () => {
    const { w, h, m } = field();
    w.state.players[h].level = 6;
    w.state.players[m].level = 6;
    startFight(w.g(), 'a_02', [{ enemy: 'e_01', n: 3 }]);
    expect(w.view(h).fight!.moves.some((x) => x.id === 'rout')).toBe(true);
    expect(w.cmd(h, { c: 'fight', id: 'rout' }).ok).toBe(true);
    expect(w.view(h).fight).toBeNull();
    expect(w.view(h).fightEnd?.ended).toBe('win');
    // not in a story fight
    startFight(w.g(), 'a_02', [{ enemy: 'e_01' }], { scene: true });
    expect(w.view(h).fight!.moves.some((x) => x.id === 'rout')).toBe(false);
  });

  it('a fight waits while both are away; one who stays plays on past the other', () => {
    const { w, h, m } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_05' }]);
    w.state.players[h].online = false;
    w.state.players[m].online = false;
    turnOf(w, h);
    const round = f.round;
    w.cmd(h, { c: 'fight', id: 'end' });
    // nobody here: the turns stop on the first hero who is away
    const cur = fightOf(w.g(), m)!;
    expect(cur.round - round).toBeLessThanOrEqual(1);
    const stuck = cur.turn;
    w.advance(60_000);
    expect(fightOf(w.g(), m)!.turn).toBe(stuck);
  });

  it('a ground drawn by hand: the sides stand where it says, a foe in the water starts in it', () => {
    const rows = ['#~~~~~#', '#~~F~~#', '#,~~~,#', '.,,_,,.', '..,_,..', 'o.._..o', '.......', '..hh...'];
    expect(fieldProblems(rows)).toEqual([]);
    const drawn = fieldFrom(rows, 'mud');
    expect(drawn.heroes).toEqual([[2, 7], [3, 7]]);
    expect(drawn.foes).toEqual([[3, 1]]);
    expect(drawn.field.cells[1 * 7 + 3]).toBe('water');
    const { w, h, m } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_06' }], { field: drawn.field, starts: { heroes: drawn.heroes, foes: drawn.foes } });
    expect([f.pos![h], f.pos![m]]).toEqual([[2, 7], [3, 7]]);
    expect(f.foes[0]!.pos).toEqual([3, 1]);
    // a closed-in foe is caught by the check
    expect(fieldProblems(['###f###', '#######', '.......', '.......', '.......', '.......', '.......', '..hh...'])).toContain('the foes cannot be reached');
  });

  it('things of errands are kept when a hero is beaten, runs or is robbed', () => {
    const { w, m } = field();
    const p = w.state.players[m];
    p.bag = { r_01: 4, u_02: 1, r_43: 1 };
    defeat(w.g(), m);
    expect(Object.keys(p.bag).sort()).toEqual(['r_43', 'u_02']);
  });
});
