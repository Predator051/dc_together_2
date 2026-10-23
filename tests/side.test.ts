import { describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import { questProgress } from '../server/src/engine/index.js';
import { autoplay, describe as show } from './harness.js';
import type { World } from './world.js';

const ACT1 = (w: World) => !!w.state.flags['p2_act1_done'] && !w.state.scene;
const ACT2 = (w: World) => !!w.state.flags['p2_act2_done'] && !w.state.scene;
const settled = (w: World, ids: string[]) => ids.every((id) => w.state.quests?.[id] === 'done' || w.state.quests?.[id] === 'closed');

describe('side errands', () => {
  it('every errand of acts one and two can be begun and finished', { timeout: 1_800_000 }, () => {
    const ids = (content.quests ?? []).filter((q) => q.act <= 2).map((q) => q.id);
    expect(ids.length).toBe(20);
    const a1 = autoplay({}, {}, { seed: 1, until: ACT1 });
    expect(a1.done).toBe(true);
    const a2 = autoplay({}, {}, { from: a1.world, until: ACT2, maxSteps: 150000, stallLimit: 15000 });
    expect(a2.done).toBe(true);
    const r = autoplay({ side: true }, { side: true }, { from: a2.world, until: (w) => settled(w, ids), maxSteps: 200000, stallLimit: 15000 });
    if (!r.done) {
      const g = r.world.g();
      for (const q of content.quests ?? []) {
        if (r.world.state.quests?.[q.id] === 'done') continue;
        console.log(q.id, r.world.state.quests?.[q.id] ?? '-', 'step', questProgress(g, q) + 1);
      }
      console.log(r.reason, show(r.world));
    }
    expect(r.done).toBe(true);
    // the journal shows them all, with what came of them
    const v = r.world.view('p1');
    expect(v.journal.quests.length).toBe(20);
    for (const q of v.journal.quests) expect(q.outcome, q.id).toBeTruthy();
  });
});
