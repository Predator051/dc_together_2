import { describe, expect, it } from 'vitest';
import type { Content } from '../shared/src/content.js';
import { content } from '../content/index.js';
import { pasts, sharedPast } from '../content/past/index.js';
import map1 from '../client/src/art/map1.json';
import map2 from '../client/src/art/map2.json';
import map3 from '../client/src/art/map3.json';

// The painted map shows the sheet where the hero stands: its own places and, at its edge, the places of
// another sheet that a road leads to. A place without a spot on the painting sends the whole map back to the
// drawn scheme, so a new place or road needs its spot and its line.
// The story begins on the northern sheet and goes south onto the second; both memories begin on the second
// and go north onto the third (the road).
type Pt = [number, number];
interface Sheet {
  w: number;
  h: number;
  cols: number;
  rows: number;
  at: Record<string, Pt>;
  edge?: Record<string, Pt>;
  roads: Record<string, Pt[]>;
  water: Record<string, Pt[]>;
}
const SHEETS: Record<string, Sheet> = { map1: map1 as unknown as Sheet, map2: map2 as unknown as Sheet, map3: map3 as unknown as Sheet };
const USES: Array<[string, Content, string[]]> = [
  ['the story', content, ['map1', 'map2']],
  ...Object.entries(pasts).map(([role, c]) => [`the ${role}'s memories`, c!, ['map2', 'map3']] as [string, Content, string[]]),
  ['the shared memories', sharedPast, ['map3']],
];
const key = (a: string, b: string) => [a, b].sort().join('|');

describe.each(USES)('the painted map of %s', (_name, c, sheets) => {
  it('has a spot for every place, on exactly one of its sheets, inside the painting', () => {
    for (const a of c.areas.filter((x) => x.pos)) {
      const on = sheets.filter((s) => SHEETS[s]!.at[a.id]);
      expect(on, a.id).toHaveLength(1);
      const sh = SHEETS[on[0]!]!;
      const p = sh.at[a.id]!;
      expect(p[0]).toBeGreaterThan(0);
      expect(p[0]).toBeLessThan(sh.w);
      expect(p[1]).toBeGreaterThan(0);
      expect(p[1]).toBeLessThan(sh.h);
    }
  });

  it('draws every way between places on each sheet that shows both ends', () => {
    for (const a of c.areas) {
      for (const l of a.links ?? []) {
        const k = key(a.id, l.to);
        const showing = sheets.filter((s) => {
          const sh = SHEETS[s]!;
          return (sh.at[a.id] || sh.edge?.[a.id]) && (sh.at[l.to] || sh.edge?.[l.to]);
        });
        expect(showing.length, k).toBeGreaterThan(0);
        for (const s of showing) {
          const sh = SHEETS[s]!;
          const has = Object.keys({ ...sh.roads, ...sh.water }).some((x) => key(...(x.split('|') as [string, string])) === k);
          expect(has, `${s}: ${k}`).toBe(true);
        }
      }
    }
  });
});

describe.each(Object.entries(SHEETS))('the sheet %s', (name, sh) => {
  const users = USES.filter(([, , s]) => s.includes(name)).map(([, c]) => c);

  it('draws only ways that some story walks, each once', () => {
    const want = new Set<string>();
    for (const c of users) for (const a of c.areas) for (const l of a.links ?? []) want.add(key(a.id, l.to));
    const have = Object.keys({ ...sh.roads, ...sh.water }).map((x) => key(...(x.split('|') as [string, string])));
    expect(new Set(have).size).toBe(Object.keys(sh.roads).length + Object.keys(sh.water).length);
    expect(have.filter((k) => !want.has(k))).toEqual([]);
  });

  it('cuts into whole tiles', () => {
    expect(sh.w % sh.cols).toBe(0);
    expect(sh.h % sh.rows).toBe(0);
  });
});
