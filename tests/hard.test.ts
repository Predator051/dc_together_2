import { describe, expect, it } from 'vitest';
import { HARD } from '../shared/src/rules.js';
import { startFight } from '../server/src/engine/fight.js';
import { World, pair } from './world.js';

describe('the hard road', () => {
  it('one proposes, the other agrees; either turns it off alone', () => {
    const { w, h, m } = pair(5);
    expect(w.view(h).hard).toEqual({ on: false, asked: null });
    expect(w.cmd(h, { c: 'hard', on: true }).ok).toBe(true);
    expect(w.state.hard).toBeFalsy();
    expect(w.view(h).hard).toEqual({ on: false, asked: 'me' });
    expect(w.view(m).hard).toEqual({ on: false, asked: 'mate' });
    // asking again does not turn it on by itself
    expect(w.cmd(h, { c: 'hard', on: true }).ok).toBe(true);
    expect(w.state.hard).toBeFalsy();
    expect(w.cmd(m, { c: 'hard', on: true }).ok).toBe(true);
    expect(w.state.hard).toBe(true);
    expect(w.view(h).hard).toEqual({ on: true, asked: null });
    expect(w.cmd(m, { c: 'hard', on: false }).ok).toBe(true);
    expect(w.state.hard).toBe(false);
    // a proposal can be taken back
    w.cmd(m, { c: 'hard', on: true });
    expect(w.cmd(m, { c: 'hard', on: false }).ok).toBe(true);
    expect(w.view(h).hard).toEqual({ on: false, asked: null });
  });

  it('foes come in stronger on it', () => {
    const { w, h } = pair(5);
    const plain = startFight(w.g(), 'a_02', [{ enemy: 'e_01' }], { party: [h], scene: true });
    const hp = plain.foes[0]!.hpMax;
    w.state.fights = [];
    w.state.players[h].fight = null;
    w.state.hard = true;
    const hard = startFight(w.g(), 'a_02', [{ enemy: 'e_01' }], { party: [h], scene: true });
    expect(hard.hard).toBe(true);
    expect(hard.foes[0]!.hpMax).toBe(Math.round(hp * HARD.hp));
  });

  it('a lone hero has no hard road to propose', () => {
    const w = new World(5);
    const h = w.join('Марко', 'm', 'hunter');
    w.online(h);
    expect(w.view(h).hard).toBeNull();
    expect(w.cmd(h, { c: 'hard', on: true }).ok).toBe(false);
  });
});
