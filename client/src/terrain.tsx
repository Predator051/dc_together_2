// Things on the ground of a fight, drawn in ink from above: water, reeds, trees, stones, walls, carts.
import type { JSX } from 'preact';
import type { FeatureId } from '../../shared/src/field.js';
import feats from './art/feats.json';
import tex from './art/tex.json';

// Painted things on the ground (scripts/art.ts feats): 4×3 atlases; a thing not painted keeps its ink.
const PAINTED = feats as unknown as Record<string, [number, number]>;
// Painted grounds (scripts/art.ts tex): one square texture per key.
const TEX = tex as unknown as Record<string, number>;

function featAtlas(n: number): string {
  return new URL(`./art/feats/e${n}.webp`, import.meta.url).href;
}

/** A painted ground for this key (grass, water, planks…), or null while it is not painted. */
export function texUrl(key: string): string | null {
  const n = TEX[key];
  return n ? new URL(`./art/tex/x${n}.webp`, import.meta.url).href : null;
}

function Ink({ children, cls = '' }: { children: JSX.Element | JSX.Element[]; cls?: string }) {
  return (
    <svg class={`feat ${cls}`} viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const DRAW: Record<Exclude<FeatureId, ''>, () => JSX.Element> = {
  water: () => (
    <Ink cls="water">
      <path class="thin" d="M6 16c4-3 8-3 12 0s8 3 12 0 8-3 12 0" />
      <path class="thin" d="M4 28c4-3 8-3 12 0s8 3 12 0 8-3 12 0" />
      <path class="thin" d="M8 40c4-3 8-3 12 0s8 3 12 0" />
    </Ink>
  ),
  shallow: () => (
    <Ink cls="shallow">
      <path class="thin" d="M8 18c3-2 6-2 9 0s6 2 9 0" />
      <path class="thin" d="M22 32c3-2 6-2 9 0s6 2 9 0" />
      <circle cx="12" cy="34" r="1" />
      <circle cx="36" cy="14" r="1" />
    </Ink>
  ),
  reeds: () => (
    <Ink cls="reeds">
      <path d="M10 42c1-10 2-20 6-30M18 42c0-9 1-17-1-27M26 42c1-8 3-16 8-24M34 42c0-7-1-14-4-20M40 42c-1-6 0-12 2-16" />
      <path class="thick" d="M16 12l1-4M34 18l2-4M17 15l-1-4" />
    </Ink>
  ),
  bush: () => (
    <Ink cls="bush">
      <path d="M12 32c-5-1-6-8-1-10 0-6 7-8 10-4 3-5 11-3 11 2 6 0 7 8 2 10 1 5-6 7-9 4-3 3-10 3-13-2z" />
      <path class="thin" d="M18 26c2 1 4 1 6 0M26 22c1 2 3 3 5 3" />
    </Ink>
  ),
  tree: () => (
    <Ink cls="tree">
      <ellipse class="shade" cx="27" cy="29" rx="16" ry="14" />
      <path d="M24 6c8 0 12 5 13 9 5 2 6 9 2 13 1 6-5 11-11 9-4 4-12 3-14-2-6-1-9-8-5-12-2-6 3-13 9-13 2-3 4-4 6-4z" />
      <path class="thin" d="M18 18c3 2 7 2 10 0M16 28c4 1 8 0 11-2M26 32c3 1 6 0 8-2" />
    </Ink>
  ),
  rock: () => (
    <Ink cls="rock">
      <path d="M10 32l4-14 10-6 12 4 4 12-6 8-16 2z" />
      <path class="thin" d="M14 18l8 6 14-8M22 24l-2 14M22 24l12 6" />
    </Ink>
  ),
  log: () => (
    <Ink cls="log">
      <path d="M8 20h28a5 5 0 0 1 0 10H8a5 5 0 0 1 0-10z" />
      <ellipse cx="36" cy="25" rx="3" ry="5" />
      <path class="thin" d="M12 23h14M14 27h16" />
    </Ink>
  ),
  wall: () => (
    <Ink cls="wall">
      <rect class="solid" x="2" y="12" width="44" height="24" rx="2" />
      <path class="thin" d="M2 24h44M14 12v12M30 12v12M22 24v12M38 24v12M6 24v12" />
    </Ink>
  ),
  fence: () => (
    <Ink cls="fence">
      <path d="M4 18h40M4 30h40" />
      <path class="thin" d="M8 14v20M16 14v20M24 14v20M32 14v20M40 14v20" />
      <path class="thin" d="M4 22c6-3 10 3 16 0s10 3 16 0 6 0 8 0M4 26c6 3 10-3 16 0s10-3 16 0" />
    </Ink>
  ),
  cart: () => (
    <Ink cls="cart">
      <rect x="10" y="10" width="28" height="28" rx="2" />
      <path class="thin" d="M10 19h28M10 29h28M24 10v28" />
      <path class="thick" d="M6 14v8M42 14v8M6 28v8M42 28v8" />
    </Ink>
  ),
  crate: () => (
    <Ink cls="crate">
      <rect x="11" y="11" width="26" height="26" rx="1" />
      <path class="thin" d="M11 11l26 26M37 11L11 37M11 24h26" />
    </Ink>
  ),
  barrel: () => (
    <Ink cls="barrel">
      <circle cx="24" cy="24" r="13" />
      <circle class="thin" cx="24" cy="24" r="9" />
      <circle class="thin" cx="24" cy="24" r="3" />
    </Ink>
  ),
  salt: () => (
    <Ink cls="salt">
      <path d="M8 34c3-10 8-18 16-20 8 2 13 10 16 20-10 3-22 3-32 0z" />
      <path class="thin" d="M18 24c2-2 4-3 6-3M28 22c2 1 3 3 4 5" />
    </Ink>
  ),
  stump: () => (
    <Ink cls="stump">
      <circle cx="24" cy="25" r="10" />
      <circle class="thin" cx="24" cy="25" r="6" />
      <circle class="thin" cx="24" cy="25" r="2" />
      <path class="thin" d="M14 25l-6 3M33 20l6-3M30 33l4 6" />
    </Ink>
  ),
  planks: () => (
    <Ink cls="planks">
      <path class="thin" d="M2 10h44M2 20h44M2 30h44M2 40h44" />
      <path class="thin" d="M12 10v10M30 20v10M18 30v10M38 10v10" />
    </Ink>
  ),
};

/** Grounds that are painted over the whole cell rather than set on it as a thing. */
export const FLAT: ReadonlySet<FeatureId> = new Set(['water', 'shallow', 'planks']);

export function Feature({ id }: { id: FeatureId }) {
  if (!id) return null;
  const p = PAINTED[id];
  if (p && !FLAT.has(id)) {
    const [n, i] = p;
    return <span class="feat painted" style={{ backgroundImage: `url(${featAtlas(n)})`, backgroundPosition: `${((i % 4) / 3) * 100}% ${(Math.floor(i / 4) / 2) * 100}%` }} aria-hidden="true" />;
  }
  if (FLAT.has(id) && texUrl(id)) return null;
  return DRAW[id]();
}
