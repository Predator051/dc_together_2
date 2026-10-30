import { describe, expect, it } from 'vitest';
import { xpForLevel, temperCost } from '../shared/src/rules.js';
import { gainXp, xpTotal } from '../server/src/engine/hero.js';
import { pair } from './world.js';

describe('the ceiling of an act', () => {
  it('a hero does not grow past the act\'s level: the rest tempers, a rank at a time', () => {
    const { w, h } = pair(2);
    w.state.meta.act = 1;
    const cap = w.g().ix.c.hero.caps![1]!;
    const g = w.g();
    gainXp(g, h, xpForLevel(cap + 3));
    const p = w.state.players[h];
    expect(p.level).toBe(cap);
    expect(p.xp).toBe(xpForLevel(cap + 1) - 1);
    expect(p.temper!.rank).toBeGreaterThan(0);
    expect(xpTotal(g, h)).toBe(xpForLevel(cap + 3));
    // each rank costs more than the last
    expect(temperCost(cap, 2)).toBeGreaterThan(temperCost(cap, 1));
    const v = w.view(h).hero;
    expect(v.cap).toEqual({ level: cap, reached: true });
    expect(v.temper!.points).toBe(p.temper!.rank);
  });

  it('a rank buys a little health (to its end) or the act\'s materials (without end)', () => {
    const { w, h } = pair(2);
    w.state.meta.act = 1;
    const cap = w.g().ix.c.hero.caps![1]!;
    gainXp(w.g(), h, xpForLevel(cap + 1) + 20 * temperCost(cap, 12));
    const p = w.state.players[h];
    const hp = p.hpMax;
    expect(w.cmd(h, { c: 'temper', id: 'hp' }).ok).toBe(true);
    expect(w.state.players[h].hpMax).toBe(hp + 1);
    for (let i = 0; i < 5; i++) w.cmd(h, { c: 'temper', id: 'hp' });
    expect(w.cmd(h, { c: 'temper', id: 'hp' }).ok).toBe(false);
    const wood = w.state.res.r_01 ?? 0;
    expect(w.cmd(h, { c: 'temper', id: 'gift' }).ok).toBe(true);
    expect(w.state.res.r_01).toBeGreaterThan(wood);
    expect(w.cmd(h, { c: 'temper', id: 'nothing' }).ok).toBe(false);
  });

  it('the next act raises the ceiling: the hero grows again', () => {
    const { w, h } = pair(2);
    w.state.meta.act = 1;
    const cap = w.g().ix.c.hero.caps![1]!;
    gainXp(w.g(), h, xpForLevel(cap + 2));
    w.state.meta.act = 2;
    gainXp(w.g(), h, xpForLevel(cap + 2) - xpForLevel(cap));
    expect(w.state.players[h].level).toBeGreaterThan(cap);
  });
});

describe('catching up', () => {
  it('the one behind, back after a long while, learns twice as fast until the gap closes', () => {
    const { w, h, m } = pair(2);
    w.state.meta.act = 3;
    gainXp(w.g(), h, 500);
    w.online(m, false);
    w.advance(5 * 3_600_000);
    w.online(m, true);
    const left = w.state.players[m].catchUp!;
    expect(left).toBe(150);
    expect(w.view(m).hero.catchUp).toBe(150);
    expect(w.view(m).log.some((l) => l.text.includes('вдвічі'))).toBe(true);
    gainXp(w.g(), m, 40);
    expect(w.state.players[m].xp).toBe(80);
    expect(w.state.players[m].catchUp).toBe(110);
  });

  it('the one ahead gets nothing for being away', () => {
    const { w, h } = pair(2);
    w.state.meta.act = 3;
    gainXp(w.g(), h, 500);
    w.online(h, false);
    w.advance(5 * 3_600_000);
    w.online(h, true);
    expect(w.state.players[h].catchUp ?? 0).toBe(0);
  });
});
