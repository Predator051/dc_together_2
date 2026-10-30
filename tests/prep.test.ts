import { describe, expect, it } from 'vitest';
import { pair } from './world.js';

/** Both on the road of act two, act three just begun (the camp in the quarry not yet scouted). */
function road() {
  const r = pair(3);
  const s = r.w.state;
  for (const f of ['p2_act2', 'p2_act2_done', 'p2_act3']) s.flags[f] = 1;
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_10';
    s.players[pid].busy = null;
  }
  return r;
}

const entries = (v: ReturnType<ReturnType<typeof pair>['w']['view']>) => v.groups.flatMap((g) => g.entries);

describe('readying a together scene alone', () => {
  it('is listed while the scene can come; its work shows only to its hero and only until done', () => {
    const { w, h, m } = road();
    w.g().commit();
    const pv = w.view(h).journal.preps.find((p) => p.scene === 's_101');
    expect(pv?.items.length).toBe(2);
    expect(pv?.items[0]!.mine).toBe(true);
    expect(pv?.items.every((x) => !x.done)).toBe(true);
    // the hunter's look from the steppe is on the road; the maker does not see it
    expect(entries(w.view(h)).some((e) => e.id === 'x_241' && e.prep)).toBe(true);
    expect(entries(w.view(m)).some((e) => e.id === 'x_241')).toBe(false);
    expect(w.view(h).log.some((l) => l.text.includes('можна підготуватися'))).toBe(true);

    expect(w.cmd(h, { c: 'act', id: 'x_241' }).ok).toBe(true);
    w.rest(h);
    expect(w.state.flags.prep_quarry_look).toBe(1);
    expect(entries(w.view(h)).some((e) => e.id === 'x_241')).toBe(false);
    const item = w.view(m).journal.preps.find((p) => p.scene === 's_101')!.items.find((x) => x.id === 'prep_quarry_look')!;
    expect(item).toMatchObject({ done: true, mine: false });
    expect(item.gives).toBeTruthy();
    expect(w.view(m).log.some((l) => l.text.includes('підготовлено'))).toBe(true);

    // once the scene is played, nothing of it is listed any more; the flag stays for the scene to read
    w.state.flags['done:s_101'] = 1;
    expect(w.view(h).journal.preps.some((p) => p.scene === 's_101')).toBe(false);
    expect(w.state.flags.prep_quarry_look).toBe(1);
  });

  it('nothing is listed before the scene can be seen', () => {
    const { w, h } = road();
    delete w.state.flags.p2_act3;
    expect(w.view(h).journal.preps).toEqual([]);
    expect(entries(w.view(h)).some((e) => e.id === 'x_241')).toBe(false);
  });

  it('a readied scene goes another way: the ford with one rider, not two', () => {
    const { w, h } = road();
    const g = w.g();
    const def = g.ix.scenes.get('s_104')!;
    const ford = def.nodes.ford as { goto?: Array<{ if: unknown; next: string }> };
    expect(ford.goto?.[0]?.next).toBe('fordKnown');
    w.state.flags.prep_ford = 1;
    expect(g.test(ford.goto![0]!.if as never, h)).toBe(true);
    const small = def.nodes.fordFightSmall as { foes: Array<{ n?: number }> };
    expect(small.foes[0]!.n).toBe(1);
  });
});
