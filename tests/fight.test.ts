import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { fightOf, startFight } from '../server/src/engine/fight.js';
import { refreshHero } from '../server/src/engine/hero.js';
import { pair, World } from './world.js';

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
    w.advance(5000);
    expect(w.view(h).fightEnd).toBeNull();
    expect(w.state.players[h].xp).toBeGreaterThan(xp0);
    expect(w.state.bestiary['e_01']!.seen).toBeGreaterThan(0);
  });

  it('the hunter reads the beast ahead; the maker sees where armour gives', () => {
    const { w, h, m } = field();
    startFight(w.g(), 'a_02', [{ enemy: 'e_05' }]);
    const fh = w.view(h).fight!;
    const fm = w.view(m).fight!;
    expect(fh.foes[0]!.next).toBeTruthy();
    expect(fm.foes[0]!.next).toBeUndefined();
    expect(fm.foes[0]!.weak).toBeTruthy();
    expect(fh.foes[0]!.weak).toBeUndefined();
  });

  it('a grab pins a hero: only struggling, until the partner frees them', () => {
    const { w, h, m } = field();
    const g = w.g();
    const f = startFight(g, 'a_02', [{ enemy: 'e_07' }]);
    f.foes[0]!.holds = h;
    const hv = w.view(h).fight!;
    expect(hv.moves.map((x) => x.id)).toEqual(['struggle']);
    const mv = w.view(m).fight!;
    expect(mv.moves.some((x) => x.id === 'free')).toBe(true);
    w.cmd(h, { c: 'fight', id: 'struggle' });
    w.cmd(m, { c: 'fight', id: 'free' });
    const after = fightOf(w.g(), h);
    expect(after === null || after.foes[0]!.holds !== h || after.foes[0]!.out !== null).toBe(true);
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
        f.foes[0]!.intent = { move: 'venom', target: m };
        w.cmd(m, { c: 'fight', id: 'guard' });
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
    f.foes[0]!.intent = { move: 'attack', target: m };
    for (let i = 0; i < 10 && fightOf(w.g(), m); i++) w.cmd(m, { c: 'fight', id: 'guard' });
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
    for (let i = 0; i < 20 && fightOf(w.g(), h); i++) w.cmd(h, { c: 'fight', id: 'flee' });
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

  it('a caller brings help unless struck or deafened in time', () => {
    const { w, m } = field();
    const f = startFight(w.g(), 'a_02', [{ enemy: 'e_08' }], { party: [m] });
    f.foes[0]!.intent = { move: 'call' };
    w.cmd(m, { c: 'fight', id: 'guard' });
    for (let i = 0; i < 3 && fightOf(w.g(), m); i++) {
      const cur = fightOf(w.g(), m)!;
      for (const x of cur.foes) if (!x.out) x.intent = { move: 'guard' };
      w.cmd(m, { c: 'fight', id: 'guard' });
    }
    expect(fightOf(w.g(), m)!.foes.length).toBe(2);
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
    play(w, { [h]: () => 'guard', [m]: () => 'guard' });
    expect(w.view(h).fight).toBeNull();
    for (let i = 0; i < 4 && s.scene; i++) for (const pid of [h, m]) w.cmd(pid, { c: 'next' });
    expect(s.flags['done:s_16']).toBeUndefined();
    expect(s.players[h].at).toBe('a_07');
    expect(s.players[h].hp).toBeGreaterThan(1);
    expect(w.view(h).groups.flatMap((g) => g.entries).some((e) => e.id === 's_16')).toBe(true);
  });
});
