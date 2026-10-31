import { describe, expect, it } from 'vitest';
import { pasts, sharedPast } from '../content/past/index.js';
import { byFire } from '../server/src/engine/needs.js';
import { World } from './world.js';

// Day to day in the memories: the household keeps the home fire while the home stands, the road has
// fires of others, the weather follows the season of the chapter, and the needs count from the start.

function solo(role: 'maker' | 'hunter') {
  const w = new World(1, pasts[role]!);
  w.state.solo = true;
  const pid = w.join('Оксана', 'f', role);
  return { w, pid };
}

describe('day to day in the memories', () => {
  it('the household keeps the fire while the home stands', () => {
    for (const [role, inside, gone] of [
      ['maker', 'pm_in', 'pm_ch3_done'],
      ['hunter', 'ph_in', 'ph_ch3_done'],
    ] as const) {
      const { w, pid } = solo(role);
      expect(w.g().stoveState()).toBe('never');
      w.state.flags[inside] = 1;
      w.advance(1000);
      expect(w.g().stoveState(), role).toBe('warm');
      expect(w.state.players[pid].needs, role).toBeTruthy();
      expect(byFire(w.g(), pid), role).toBe('home');
      w.state.flags[gone] = 1;
      expect(w.g().stoveState(), role).toBe('never');
    }
  });

  it('on the road north the camp has its own fire to rest by', () => {
    for (const [role, inside, road, camp] of [
      ['maker', 'pm_in', 'pm_ch4', 'pm_a6'],
      ['hunter', 'ph_in', 'ph_ch4', 'ph_a6'],
    ] as const) {
      const { w, pid } = solo(role);
      Object.assign(w.state.flags, { [inside]: 1, [`${role === 'maker' ? 'pm' : 'ph'}_ch3_done`]: 1, [road]: 1 });
      w.state.players[pid].at = camp;
      w.state.players[pid].busy = null;
      w.advance(1000);
      expect(byFire(w.g(), pid), role).toBe('camp');
      expect(w.view(pid).needs?.rest.can, role).toBe(true);
    }
  });

  it('the weather follows the season of the chapter', () => {
    for (const [c, spring] of [
      [pasts.maker!, { pm_in: 1, pm_ch1_done: 1, pm_ch2: 1 }],
      [pasts.hunter!, { ph_in: 1, ph_ch1_done: 1, ph_ch2: 1 }],
    ] as const) {
      const w = new World(1, c);
      const kinds = (flags: Record<string, number>) => {
        w.state.flags = { ...flags };
        return c.weather!.kinds.filter((k) => !k.when || w.g().test(k.when)).map((k) => k.sky ?? 'clear');
      };
      expect(kinds({ [Object.keys(spring)[0]!]: 1 })).toContain('frost');
      expect(kinds({ [Object.keys(spring)[0]!]: 1 })).not.toContain('heat');
      expect(kinds(spring)).toContain('heat');
      expect(kinds(spring)).not.toContain('frost');
    }
    // the meeting is late in autumn: no warm days
    expect(sharedPast.weather!.kinds.some((k) => k.sky === 'heat')).toBe(false);
  });
});
