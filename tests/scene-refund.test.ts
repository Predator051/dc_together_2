import { describe, expect, it } from 'vitest';
import { pair } from './world.js';

// A scene that takes things of an errand to begin and can end unfinished (a fight lost) must give them back,
// else it can never be tried again.
describe('a paid scene left unfinished', () => {
  it('gives back the things of the errand it took', () => {
    const { w, h, m } = pair(2);
    const s = w.state;
    s.flags.p2_hut = 1;
    s.flags['done:s_91'] = 1;
    for (const pid of [h, m]) {
      s.players[pid].at = 'a_12';
      s.players[pid].busy = null;
    }
    s.res.t_39 = 2;
    expect(w.cmd(h, { c: 'act', id: 's_92' }).ok).toBe(true);
    expect(w.cmd(m, { c: 'accept' }).ok).toBe(true);
    expect(s.scene?.id).toBe('s_92');
    expect(s.res.t_39 ?? 0).toBe(0);
    // the fight is lost: the scene steps back unfinished
    s.fights = [];
    for (const pid of [h, m]) s.players[pid].fight = null;
    s.scene!.node = 'n2l';
    w.cmd(h, { c: 'next' });
    w.cmd(m, { c: 'next' });
    expect(s.scene).toBeNull();
    expect(s.flags['done:s_92']).toBeUndefined();
    expect(s.res.t_39).toBe(2);
  });
});
