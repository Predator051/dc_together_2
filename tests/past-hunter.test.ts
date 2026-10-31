import { describe, expect, it } from 'vitest';
import { hunterPast } from '../content/past/hunter/index.js';
import { validateContent } from '../server/src/validate.js';
import { autoplay, describe as show } from './harness.js';
import { World } from './world.js';

describe("the hunter's past", () => {
  it('is whole by the validator', () => {
    expect(validateContent(hunterPast).errors).toEqual([]);
  });

  it.each([1, 2, 3])('chapter one can be played alone to its end, in about an hour (seed %i)', (seed) => {
    const r = autoplay({}, {}, { seed, solo: { content: hunterPast, role: 'hunter' }, until: (w) => !!w.state.flags.ph_ch1_done && !w.state.scene, maxSteps: 40000, stallLimit: 6000 });
    if (!r.done) console.log(r.reason, show(r.world));
    console.log('minutes', Math.round(r.gameTimeMs / 60000), 'fights', r.fights, 'defeats', r.defeats, 'level', r.world.state.players.p1.level, 'scenes', r.scenes.join(' '));
    expect(r.done).toBe(true);
    // the bots' busy time; a person takes about two and a half times longer, and reads the scenes
    // with the needs a rested hero works a tenth faster and a fed one loses fewer fights: the bots' busy
    // time is shorter, while a person spends more (eating, cooking, resting, the events' cards)
    expect(r.gameTimeMs / 60000).toBeGreaterThan(10);
    expect(r.gameTimeMs / 60000).toBeLessThan(45);
  });

  it.each([1, 2])('all three chapters, one after another, when the story is at act three (seed %i)', (seed) => {
    const w = new World(seed, hunterPast);
    w.state.solo = true;
    w.join('Оксана', 'f', 'hunter');
    w.state.flags.main_act = 3;
    const r = autoplay({}, {}, { from: w, solo: { content: hunterPast, role: 'hunter' }, until: (x) => !!x.state.flags.ph_ch3_done && !x.state.scene, maxSteps: 120000, stallLimit: 8000 });
    if (!r.done) console.log(r.reason, show(r.world), Object.keys(r.world.state.flags).filter((f) => f.startsWith('ph_')).join(' '));
    const at = (id: string) => Math.round((r.timeline.find((t) => t.scene === id)?.at ?? 0) / 60000);
    console.log('total', Math.round(r.gameTimeMs / 60000), 'ch1', at('ph_s07'), 'ch2', at('ph_s12'), 'ch3', at('ph_s15'), 'fights', r.fights, 'defeats', r.defeats, 'level', r.world.state.players.p1.level);
    expect(r.done).toBe(true);
    // with the needs a rested hero works a tenth faster and a fed one loses fewer fights: the bots' busy
    // time is shorter, while a person spends more (eating, cooking, resting, the events' cards)
    expect(r.gameTimeMs / 60000).toBeGreaterThan(25);
  });
  it('chapter four, after the first three, when the story is at act four: the road north', { timeout: 600_000 }, () => {
    const w = new World(1, hunterPast);
    w.state.solo = true;
    w.join('Оксана', 'f', 'hunter');
    w.state.flags.main_act = 4;
    const r = autoplay({}, {}, { from: w, solo: { content: hunterPast, role: 'hunter' }, until: (x) => !!x.state.flags.ph_ch4_done && !x.state.scene, maxSteps: 160000, stallLimit: 8000 });
    if (!r.done) console.log(r.reason, show(r.world));
    const at = (id: string) => (r.timeline.find((t) => t.scene === id)?.at ?? 0) / 60000;
    const ch4 = r.gameTimeMs / 60000 - at('ph_s15');
    console.log('chapter four', Math.round(ch4), 'defeats', r.defeats, 'level', r.world.state.players.p1.level);
    expect(r.done).toBe(true);
    // about an hour for a person: the bots' busy time is two and a half times shorter
    expect(ch4).toBeGreaterThan(12);
    expect(ch4).toBeLessThan(60);
    // the road leaves home behind: the hero ends far from it, on the third sheet of the map
    expect(r.world.state.players.p1.at).not.toBe('ph_a1');
  });
});
