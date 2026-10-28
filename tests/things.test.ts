import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEM_ICONS } from '../shared/src/pictures.js';
import painted from '../client/src/art/things.json';

// Every mark of a thing is painted; a new mark needs its cell in an atlas (scripts/art.ts things).
describe('painted things', () => {
  const cells = painted as unknown as Record<string, [number, number]>;

  it('every mark has a cell, every cell is in an atlas that exists, no two share a cell', () => {
    expect(ITEM_ICONS.filter((k) => !cells[k])).toEqual([]);
    const taken = new Set<string>();
    for (const [k, [n, i]] of Object.entries(cells)) {
      expect(existsSync(new URL(`../client/src/art/things/t${n}.webp`, import.meta.url)), k).toBe(true);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(12);
      expect(taken.has(`${n}:${i}`), k).toBe(false);
      taken.add(`${n}:${i}`);
    }
  });
});
