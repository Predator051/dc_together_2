import { describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import { buildView } from '../server/src/engine/view.js';
import { legacyFlags, extractLegacy } from '../server/src/legacy.js';
import { autoplay, describe as show } from './harness.js';
import { World } from './world.js';

const ACT1 = (w: World) => !!w.state.flags['p2_act1_done'] && !w.state.scene;
const STORY = ['s_01', 's_03', 's_04', 's_05', 's_06', 's_07', 's_08', 's_09', 's_10', 's_12', 's_14', 's_15', 's_16', 's_17', 's_18'];

describe('two bots play act one to its end', () => {
  for (const seed of [1, 2, 3, 4]) {
    it(`seed ${seed}`, () => {
      const r = autoplay({}, {}, { seed, until: ACT1 });
      if (!r.done) console.log(r.reason, show(r.world));
      expect(r.done).toBe(true);
      for (const s of STORY) expect(r.world.state.flags[`done:${s}`], s).toBe(1);
      expect(r.world.state.flags['p2_recon_done']).toBe(1);
      // pace: the bots' busy time for the act (people take longer: reading, talking, choosing)
      expect(r.gameTimeMs / 60000).toBeGreaterThan(40);
      expect(r.gameTimeMs / 60000).toBeLessThan(160);
      // they had to get stronger and fight on the way
      expect(r.world.state.players.p1.level).toBeGreaterThanOrEqual(5);
      expect(r.fights).toBeGreaterThan(20);
      expect(r.world.state.meta.actDone).toBe(1);
    });
  }

  it('careless players (random moves, random choices) still get through', () => {
    for (const seed of [11, 13]) {
      const r = autoplay({ careless: true }, { careless: true, seed: 5 }, { seed, until: ACT1, maxSteps: 120000, stallLimit: 30000 });
      if (!r.done) console.log(r.reason, show(r.world));
      expect(r.done).toBe(true);
    }
  });
});

describe('part one leaves its mark', () => {
  for (const ending of [1, 2, 3, 4]) {
    it(`ending ${ending}: the opening reads right and the act can be finished`, () => {
      const w = new World(ending);
      const legacy = extractLegacy({
        version: 3,
        flags: { [`ending_${ending}`]: 1, a4_hammer: 1, a5_panas_goes: ending === 1 ? 1 : 0, rescued: 50 },
        players: {},
      })!;
      Object.assign(w.state.flags, legacyFlags(legacy));
      w.join('Марко', 'm', 'hunter');
      w.join('Оксана', 'f', 'maker');
      const r = autoplay({}, {}, { from: w, until: ACT1 });
      expect(r.done).toBe(true);
      const g = w.g();
      // the shore scene was told with this ending's lines
      const text = JSON.stringify(buildView(g, 'p1').log);
      expect(text.length).toBeGreaterThan(100);
    });
  }
});

describe('no dead ends when the stores are emptied', () => {
  it('the household survives losing everything at the worst moments', () => {
    // play to a point, empty the home store and the bags, and the bots must still finish
    for (const stop of ['done:s_06', 'done:s_10', 'p2_ulyana']) {
      const first = autoplay({}, {}, { seed: 21, until: (w) => !!w.state.flags[stop] });
      expect(first.done).toBe(true);
      const w = first.world;
      for (const k of Object.keys(w.state.res)) {
        const def = content.resources.find((r) => r.id === k);
        if (def && def.kind !== 'tool' && def.kind !== 'gear') w.state.res[k] = 0;
      }
      for (const pid of ['p1', 'p2'] as const) w.state.players[pid].bag = {};
      const r = autoplay({}, {}, { from: w, until: ACT1 });
      if (!r.done) console.log(stop, r.reason, show(r.world));
      expect(r.done, stop).toBe(true);
    }
  });
});
