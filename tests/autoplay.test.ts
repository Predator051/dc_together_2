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

const ACT2 = (w: World) => !!w.state.flags['p2_act2_done'] && !w.state.scene;
const STORY2 = ['s_30', 's_31', 's_32', 's_33', 's_34', 's_35', 's_37', 's_38', 's_39', 's_40', 's_41', 's_42', 's_43', 's_47'];

describe('two bots play act two to its end', () => {
  for (const seed of [1, 2, 3]) {
    it(`seed ${seed}`, () => {
      const a1 = autoplay({}, {}, { seed, until: ACT1 });
      expect(a1.done).toBe(true);
      const start = a1.world.now;
      const r = autoplay({}, {}, { from: a1.world, until: ACT2, maxSteps: 150000, stallLimit: 15000 });
      if (!r.done) console.log(r.reason, show(r.world));
      expect(r.done).toBe(true);
      for (const s of STORY2) expect(r.world.state.flags[`done:${s}`], s).toBe(1);
      const minutes = (r.world.now - start) / 60000;
      expect(minutes).toBeGreaterThan(30);
      expect(minutes).toBeLessThan(200);
      expect(r.world.state.players.p1.level).toBeGreaterThanOrEqual(9);
      expect(Object.keys(r.world.state.residents).length).toBe(6);
      expect(r.world.state.meta.actDone).toBe(2);
    });
  }

  it('a careless partner (random moves, choices and chores) does not stop the act', { timeout: 900_000 }, () => {
    for (const [seed, careless] of [[17, 'p1'], [19, 'p2']] as const) {
      const a1 = autoplay({}, {}, { seed, until: ACT1 });
      const r = autoplay(careless === 'p1' ? { careless: true } : {}, careless === 'p2' ? { careless: true, seed: 5 } : {}, {
        from: a1.world,
        until: ACT2,
        maxSteps: 300000,
        stallLimit: 60000,
      });
      if (!r.done) console.log(careless, r.reason, show(r.world));
      expect(r.done, careless).toBe(true);
    }
  });
});

describe('act two has no dead ends when the stores are emptied', () => {
  it('the household survives losing everything, money included', { timeout: 900_000 }, () => {
    for (const stop of ['done:s_34', 'p2_plan_out', 'p2_bounty']) {
      const first = autoplay({}, {}, { seed: 23, maxSteps: 150000, until: (w) => !!w.state.flags[stop] && !w.state.scene });
      expect(first.done, stop).toBe(true);
      const w = first.world;
      for (const k of Object.keys(w.state.res)) {
        const def = content.resources.find((r) => r.id === k);
        if (def && def.kind !== 'tool' && def.kind !== 'gear') w.state.res[k] = 0;
      }
      for (const pid of ['p1', 'p2'] as const) w.state.players[pid].bag = {};
      const r = autoplay({}, {}, { from: w, until: ACT2, maxSteps: 200000, stallLimit: 20000 });
      if (!r.done) console.log(stop, r.reason, show(r.world));
      expect(r.done, stop).toBe(true);
    }
  });
});

const ACT3 = (w: World) => !!w.state.flags['p2_act3_done'] && !w.state.scene;
const ACT41 = (w: World) => !!w.state.flags['p2_kryvets'] && !!w.state.flags['p2_island'] && !w.state.scene;
const STORY41 = ['s_120', 's_121', 's_122', 's_123'];
const STORY3 = ['s_100', 's_101', 's_102', 's_103', 's_104', 's_105', 's_106', 's_107', 's_108', 's_109'];

describe('two bots play act three to its end', () => {
  it('seed 1: the camp, the cart, the road south, the silent hundred', { timeout: 1_200_000 }, () => {
    const a1 = autoplay({}, {}, { seed: 1, until: ACT1 });
    const a2 = autoplay({}, {}, { from: a1.world, until: ACT2, maxSteps: 150000, stallLimit: 15000 });
    expect(a2.done).toBe(true);
    const start = a2.world.now;
    // the same evening, played by bots who never ready a scene alone: the act goes without it
    const bare = new World(1);
    bare.state = structuredClone(a2.world.state);
    bare.now = a2.world.now;
    const r = autoplay({}, {}, { from: a2.world, until: ACT3, maxSteps: 200000, stallLimit: 20000 });
    if (!r.done) console.log(r.reason, show(r.world));
    expect(r.done).toBe(true);
    for (const s of STORY3) expect(r.world.state.flags[`done:${s}`], s).toBe(1);
    const minutes = (r.world.now - start) / 60000;
    expect(minutes).toBeGreaterThan(30);
    expect(r.world.state.meta.actDone).toBe(3);
    expect(r.world.state.residents['h_15']).toBeDefined();
    // readying alone: some of it was done along the way
    expect(Object.keys(r.world.state.flags).filter((f) => f.startsWith('prep_')).length).toBeGreaterThanOrEqual(2);

    // and on into act four, part one: the long road south, the hiding place, the ashes of two homes
    const r4 = autoplay({}, {}, { from: r.world, until: ACT41, maxSteps: 120000, stallLimit: 15000 });
    if (!r4.done) console.log(r4.reason, show(r4.world));
    expect(r4.done).toBe(true);
    for (const s of STORY41) expect(r4.world.state.flags[`done:${s}`], s).toBe(1);
    expect(r4.world.state.meta.act).toBe(4);

    const nr = autoplay({ noPrep: true }, { noPrep: true }, { from: bare, until: ACT3, maxSteps: 200000, stallLimit: 20000 });
    if (!nr.done) console.log(nr.reason, show(nr.world));
    expect(nr.done).toBe(true);
    expect(Object.keys(nr.world.state.flags).filter((f) => f.startsWith('prep_'))).toEqual([]);
  });
});
