import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ITEM_ICONS, PORTRAITS, SCENES } from '../shared/src/pictures.js';
import painted from '../client/src/art/things.json';
import foes from '../client/src/art/foes.json';
import grounds from '../client/src/art/grounds.json';

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

// Every plan of a place is painted; a new scene needs its painting (scripts/art.ts ground).
describe('painted grounds', () => {
  it('every scene has its painting, and nothing else is listed', () => {
    const list = grounds as string[];
    expect(SCENES.filter((s) => !list.includes(s))).toEqual([]);
    expect(list.filter((s) => !(SCENES as readonly string[]).includes(s))).toEqual([]);
    for (const s of list) {
      const i = (SCENES as readonly string[]).indexOf(s) + 1;
      expect(existsSync(new URL(`../client/src/art/grounds/g${i}.webp`, import.meta.url)), s).toBe(true);
    }
  });
});

// Every foe has a painted portrait (scripts/art.ts foes).
describe('painted foes', () => {
  it('every portrait has a cell in an atlas that exists', () => {
    const cells = foes as unknown as Record<string, [number, number]>;
    expect(PORTRAITS.filter((k) => !cells[k])).toEqual([]);
    for (const [k, [n, i]] of Object.entries(cells)) {
      expect(existsSync(new URL(`../client/src/art/foes/f${n}.webp`, import.meta.url)), k).toBe(true);
      expect(i).toBeLessThan(9);
    }
  });
});
