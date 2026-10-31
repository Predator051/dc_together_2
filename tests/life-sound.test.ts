import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { airOf, lifeNow, VOICES, type Voice } from '../client/src/life.js';

// What is heard outside follows the weather: birds on a clear day, frogs in the rain, nothing in a storm,
// crows in fog and frost, crickets on summer evenings; the place's own wind is calm unless it blows.

const at = (kind: string, weather: string | null, season: string | null, under = false) =>
  ({ kind, weather, season, under }) as Parameters<typeof lifeNow>[0];
const who = (l: ReturnType<typeof lifeNow>) => l.voices.map(([v]) => v);

describe('the living things outside', () => {
  it('a clear spring day in the woods has birds, the evening has the nightingale', () => {
    const day = lifeNow(at('grove', 'clear', 'spring'), 0);
    expect(who(day)).toEqual(expect.arrayContaining(['chaffinch', 'blackbird', 'cuckoo']));
    expect(day.chorus).toBe(false);
    expect(who(lifeNow(at('grove', 'clear', 'spring'), 0.8))).toContain('nightingale');
  });

  it('rain leaves the frogs, a storm leaves nothing, fog and frost keep the crows', () => {
    expect(new Set(who(lifeNow(at('marsh', 'rain', 'spring'), 0)))).toEqual(new Set(['duck', 'frogs']));
    expect(who(lifeNow(at('marsh', 'storm', 'spring'), 0))).toEqual([]);
    const fog = lifeNow(at('hill', 'fog', 'autumn'), 0);
    expect(who(fog)).toContain('crow');
    expect(who(fog)).not.toContain('skylark');
    expect(fog.muffled).toBe(true);
    expect(who(lifeNow(at('river', 'frost', 'autumn'), 0))).toContain('ice');
  });

  it('autumn has crows and geese, not larks; summer evenings in the open have crickets', () => {
    const autumn = who(lifeNow(at('hill', 'clear', 'autumn'), 0));
    expect(autumn).toContain('crow');
    expect(autumn).not.toContain('skylark');
    expect(who(lifeNow(at('hill', 'clear', 'spring'), 0))).toContain('skylark');
    expect(lifeNow(at('hill', 'clear', 'summer'), 0.8).chorus).toBe(true);
    expect(lifeNow(at('hill', 'rain', 'summer'), 0.8).chorus).toBe(false);
  });

  it('the wind of a place is calm on a clear day and full in a gale; under a roof all is muffled', () => {
    expect(airOf(at('hill', 'clear', 'spring'))).toBeLessThan(0.3);
    expect(airOf(at('hill', 'wind', 'spring'))).toBe(1);
    expect(airOf(at('hill', null, null))).toBe(1);
    const roof = lifeNow(at('hill', 'clear', 'spring', true), 0);
    expect(roof.muffled).toBe(true);
    expect(roof.air).toBeLessThan(airOf(at('hill', 'clear', 'spring')));
    expect(who(lifeNow(at('cave', 'clear', 'spring'), 0))).toEqual([]);
    expect(who(lifeNow(at('grove', null, null), 0))).toEqual([]);
  });

  it('every voice has its recordings', () => {
    for (const [v, def] of Object.entries(VOICES) as Array<[Voice, { takes: number }]>)
      for (let k = 1; k <= def.takes; k++) expect(existsSync(`client/src/sounds/life/${v}${k}.mp3`), `${v}${k}`).toBe(true);
  });
});
