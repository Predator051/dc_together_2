import { describe, expect, it } from 'vitest';
import { makerPast } from '../content/past/maker/index.js';
import { validateContent } from '../server/src/validate.js';
import { autoplay, describe as show } from './harness.js';
import { World } from './world.js';

describe("the maker's past", () => {
  it('is whole by the validator', () => {
    expect(validateContent(makerPast).errors).toEqual([]);
  });

  it.each([1, 2, 3])('chapter one can be played alone to its end, in about an hour (seed %i)', (seed) => {
    const r = autoplay({}, {}, { seed, solo: { content: makerPast, role: 'maker' }, until: (w) => !!w.state.flags.pm_ch1_done && !w.state.scene, maxSteps: 40000, stallLimit: 6000 });
    if (!r.done) console.log(r.reason, show(r.world));
    console.log('minutes', Math.round(r.gameTimeMs / 60000), 'fights', r.fights, 'defeats', r.defeats, 'level', r.world.state.players.p1.level, 'scenes', r.scenes.join(' '));
    expect(r.done).toBe(true);
    // the bots' busy time; a person takes about two and a half times longer, and reads the scenes
    expect(r.gameTimeMs / 60000).toBeGreaterThan(15);
    expect(r.gameTimeMs / 60000).toBeLessThan(45);
  });

  it.each([1, 2])('all three chapters, one after another, when the story is at act three (seed %i)', (seed) => {
    const w = new World(seed, makerPast);
    w.state.solo = true;
    w.join('Оксана', 'f', 'maker');
    w.state.flags.main_act = 3;
    const r = autoplay({}, {}, { from: w, solo: { content: makerPast, role: 'maker' }, until: (x) => !!x.state.flags.pm_ch3_done && !x.state.scene, maxSteps: 120000, stallLimit: 8000 });
    if (!r.done) console.log(r.reason, show(r.world), Object.keys(r.world.state.flags).filter((f) => f.startsWith('pm_')).join(' '));
    const at = (id: string) => Math.round((r.timeline.find((t) => t.scene === id)?.at ?? 0) / 60000);
    console.log('total', Math.round(r.gameTimeMs / 60000), 'ch1', at('pm_s05'), 'ch2', at('pm_s09'), 'ch3', at('pm_s12'), 'fights', r.fights, 'defeats', r.defeats, 'level', r.world.state.players.p1.level);
    expect(r.done).toBe(true);
    expect(r.gameTimeMs / 60000).toBeGreaterThan(35);
  });
  it('chapter four, after the first three, when the story is at act four: the road north', { timeout: 600_000 }, () => {
    const w = new World(1, makerPast);
    w.state.solo = true;
    w.join('Оксана', 'f', 'maker');
    w.state.flags.main_act = 4;
    const r = autoplay({}, {}, { from: w, solo: { content: makerPast, role: 'maker' }, until: (x) => !!x.state.flags.pm_ch4_done && !x.state.scene, maxSteps: 160000, stallLimit: 8000 });
    if (!r.done) console.log(r.reason, show(r.world));
    const at = (id: string) => (r.timeline.find((t) => t.scene === id)?.at ?? 0) / 60000;
    const ch4 = r.gameTimeMs / 60000 - at('pm_s12');
    console.log('chapter four', Math.round(ch4), 'defeats', r.defeats, 'level', r.world.state.players.p1.level);
    expect(r.done).toBe(true);
    // about an hour for a person: the bots' busy time is two and a half times shorter
    expect(ch4).toBeGreaterThan(12);
    expect(ch4).toBeLessThan(60);
    // the road leaves home behind: the hero ends far from it, on the third sheet of the map
    expect(r.world.state.players.p1.at).not.toBe('pm_a1');
  });
});
