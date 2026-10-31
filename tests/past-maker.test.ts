import { describe, expect, it } from 'vitest';
import { makerPast } from '../content/past/maker/index.js';
import { validateContent } from '../server/src/validate.js';
import { autoplay, describe as show } from './harness.js';

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
});
