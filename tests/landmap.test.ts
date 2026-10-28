import { describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import sheet from '../client/src/art/map1.json';

// The painted map shows a place only if the painting has a spot for it; otherwise the whole map
// falls back to the drawn scheme. A new place or road needs its spot and its line on a sheet.
describe('the painted map', () => {
  const at = sheet.at as unknown as Record<string, [number, number]>;
  const ways = { ...sheet.roads, ...sheet.water } as unknown as Record<string, Array<[number, number]>>;

  it('has a spot for every place on the map, inside the painting', () => {
    for (const a of content.areas.filter((x) => x.pos)) {
      const p = at[a.id];
      expect(p, a.id).toBeDefined();
      expect(p![0]).toBeGreaterThan(0);
      expect(p![0]).toBeLessThan(sheet.w);
      expect(p![1]).toBeGreaterThan(0);
      expect(p![1]).toBeLessThan(sheet.h);
    }
  });

  it('draws every way between places, once', () => {
    const want = new Set<string>();
    for (const a of content.areas) for (const l of a.links ?? []) want.add([a.id, l.to].sort().join('|'));
    const have = Object.keys(ways).map((k) => k.split('|').sort().join('|'));
    expect(new Set(have).size).toBe(have.length);
    expect([...want].filter((k) => !have.includes(k))).toEqual([]);
    expect(have.filter((k) => !want.has(k))).toEqual([]);
  });

  it('cuts into whole tiles', () => {
    expect(sheet.w % sheet.cols).toBe(0);
    expect(sheet.h % sheet.rows).toBe(0);
  });
});
