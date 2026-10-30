import { describe, expect, it } from 'vitest';
import { credit } from '../server/src/engine/asks.js';
import { pair } from './world.js';

/** Both at home, with some things the household knows of. */
function home() {
  const r = pair(4);
  const s = r.w.state;
  s.flags.p2_hut = 1;
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_01';
    s.players[pid].busy = null;
  }
  s.res.r_02 = 3;
  s.res.r_03 = 0;
  return r;
}

describe('the asks board', () => {
  it('one asks, the other sees it; three at most; an ask can be taken back', () => {
    const { w, h, m } = home();
    expect(w.cmd(h, { c: 'ask', res: 'r_02', n: 10 }).ok).toBe(true);
    expect(w.view(m).asks).toMatchObject([{ mine: false, res: 'r_02', n: 10, got: 0 }]);
    expect(w.view(h).asks[0]!.mine).toBe(true);
    // not something unknown, not nothing, not too much
    expect(w.cmd(h, { c: 'ask', res: 'r_999', n: 1 }).ok).toBe(false);
    expect(w.cmd(h, { c: 'ask', res: 'r_03', n: 0 }).ok).toBe(false);
    expect(w.cmd(h, { c: 'ask', res: 'r_03', n: 41 }).ok).toBe(false);
    expect(w.cmd(h, { c: 'ask', res: 'r_03', n: 2 }).ok).toBe(true);
    const ids = Object.keys(w.state.res).filter((id) => /^r_/.test(id) && id !== 'r_02' && id !== 'r_03');
    expect(w.cmd(h, { c: 'ask', res: ids[0]!, n: 2 }).ok).toBe(true);
    expect(w.cmd(h, { c: 'ask', res: ids[1]!, n: 2 }).ok).toBe(false);
    // only the one who asked takes it back
    const id = w.view(h).asks[0]!.id;
    expect(w.cmd(m, { c: 'unask', id }).ok).toBe(false);
    expect(w.cmd(h, { c: 'unask', id }).ok).toBe(true);
    expect(w.view(m).asks.length).toBe(2);
  });

  it('what the other brings home counts; filled, it is gone and thanked with experience; one\'s own does not count', () => {
    const { w, h, m } = home();
    w.cmd(h, { c: 'ask', res: 'r_02', n: 5 });
    const g = w.g();
    credit(g, h, { r_02: 9 });
    expect(w.state.asks![0]!.got).toBe(0);
    credit(g, m, { r_02: 3 });
    expect(w.state.asks![0]!.got).toBe(3);
    const xp = w.state.players[m].xp;
    credit(g, m, { r_02: 4 });
    expect(w.state.asks).toEqual([]);
    expect(w.state.players[m].xp).toBeGreaterThan(xp);
    expect(w.view(h).log.some((l) => l.text.includes('Прохання виконано'))).toBe(true);
  });
});
