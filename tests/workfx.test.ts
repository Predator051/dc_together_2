// Every work has its motion on screen, and every tool the motions show is painted.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import { pasts, sharedPast } from '../content/past/index.js';
import type { Content } from '../shared/src/content.js';
import { EXTRA_VERBS, type WorkVerb } from '../shared/src/work.js';
import { ContentIndex, Game, newWorld } from '../server/src/engine/index.js';
import { workLook } from '../server/src/engine/view.js';
import painted from '../client/src/art/things.json';

const cells = painted as unknown as Record<string, [number, number]>;
const source = readFileSync(new URL('../client/src/workfx.tsx', import.meta.url), 'utf8');
/** The verbs the client draws: the keys of its program table. */
const table = source.slice(source.indexOf('const P: Record<WorkVerb, Program> = {'), source.indexOf('};', source.indexOf('const P: Record<WorkVerb')));
const drawn = new Set([...table.matchAll(/^\s{2}(\w+): \{ motion:/gm)].map((m) => m[1]!));

const worlds: Array<[string, Content]> = [['main', content], ['maker', pasts.maker!], ['hunter', pasts.hunter!], ['shared', sharedPast]];

describe('work in motion', () => {
  it('every accent and extra motion is drawn', () => {
    const accents = new Set<string>();
    for (const [, c] of worlds) for (const fx of Object.values(c.ambient?.actions ?? {})) accents.add(fx);
    expect([...accents].filter((v) => !drawn.has(v))).toEqual([]);
    expect(EXTRA_VERBS.filter((v) => !drawn.has(v))).toEqual([]);
  });

  for (const [name, c] of worlds) {
    it(`every work of ${name} has a drawn motion, and its thing is painted when it has one`, () => {
      const ix = new ContentIndex(c);
      const g = new Game(ix, newWorld(c, 1, 1_700_000_000_000), 1_700_000_000_000);
      const missing: string[] = [];
      const unpainted: string[] = [];
      const seen = new Map<WorkVerb, number>();
      for (const a of c.actions) {
        const look = workLook(g, a);
        if (!drawn.has(look.verb)) missing.push(`${a.id}:${look.verb}`);
        if (look.icon && !look.icon.startsWith('spot:') && !look.icon.startsWith('@') && !cells[look.icon]) unpainted.push(`${a.id}:${look.icon}`);
        seen.set(look.verb, (seen.get(look.verb) ?? 0) + 1);
      }
      expect(missing).toEqual([]);
      expect(unpainted).toEqual([]);
      expect(seen.size).toBeGreaterThan(0);
    });
  }

  it('every painted tool the motions use exists', () => {
    const props = [...table.matchAll(/(?:prop|stand): '(\w+)'/g)].map((m) => m[1]!).filter((k) => k !== 'face');
    expect(props.length).toBeGreaterThan(10);
    expect(props.filter((p) => !cells[p])).toEqual([]);
    for (const k of ['g_ripe', 'g_sprout']) expect(cells[k], k).toBeTruthy();
  });
});
