// Pictures of the plans: small seals for spots and the grounds they stand on, drawn in ink.

import type { ComponentChildren, JSX } from 'preact';
import { SCENES, VIEWS, type SceneId, type SpotIcon } from '../../shared/src/pictures.js';
import grounds from './art/grounds.json';
import views from './art/views.json';
import marks from './art/marks.json';

// ---------------------------------------------------------------------------- spot seals

function Pic({ children }: { children: ComponentChildren }) {
  return (
    <svg
      class="spot-pic"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const PICS: Record<SpotIcon, () => JSX.Element> = {
  home: () => (
    <Pic>
      <path d="M4 15L16 5l12 10M7.5 12.5V26h17V12.5M13.5 26v-6h5v6" />
    </Pic>
  ),
  gate: () => (
    <Pic>
      <path d="M14 28V5" />
      <path d="M14 7h10l3 3-3 3H14zM14 15H6l-3 3 3 3h8" />
    </Pic>
  ),
  store: () => (
    <Pic>
      <path d="M4 14h24v12H4zM4 14l3-6h18l3 6M4 19h24" />
      <path d="M14 19v3h4v-3" />
    </Pic>
  ),
  bag: () => (
    <Pic>
      <path d="M11.5 10c-4 3.6-6.5 8.6-6.5 11.6 0 3.8 4 5.4 11 5.4s11-1.6 11-5.4c0-3-2.5-8-6.5-11.6z" />
      <path d="M11.5 10h9M13 10l-2-4.5h10l-2 4.5" />
    </Pic>
  ),
  folk: () => (
    <Pic>
      <circle cx="12" cy="11" r="4" />
      <path d="M4 27c0-5 3.6-8 8-8s8 3 8 8" />
      <circle cx="22" cy="10" r="3.2" />
      <path d="M20.5 17.6c4.6 0 7.5 3 7.5 8" />
    </Pic>
  ),
  hearth: () => (
    <Pic>
      <path d="M5 25h22" />
      <path d="M7 25c0-2 1.5-3 3.5-3M25 25c0-2-1.5-3-3.5-3M13 25c0-1.5 1.3-2.4 3-2.4s3 .9 3 2.4" />
      <path class="flame" d="M16 20c-3.6 0-5-2.6-4-5.6.8 1.6 1.8 2 1.8 2-.2-3.6 1.8-6 4-7.6-.2 2.8 2.8 3.8 2.8 7.4 0 2.6-1.6 3.8-4.6 3.8z" />
    </Pic>
  ),
  well: () => (
    <Pic>
      <path d="M6 10l10-5 10 5M8 10v16M24 10v16" />
      <path d="M16 10v5M14.2 15h3.6l-.5 3h-2.6z" />
      <path d="M6 20h20v6H6z" />
    </Pic>
  ),
  bench: () => (
    <Pic>
      <path d="M3 14h26v3H3z" />
      <path d="M6 17v9M26 17v9M6 22h20" />
      <path d="M11 14v-3h9v3M18 11l2-3" />
    </Pic>
  ),
  pan: () => (
    <Pic>
      <path d="M4 17h24l-2.5 3h-19z" />
      <path d="M6.5 20v6h19v-6M13 26v-2.5a3 3 0 0 1 6 0V26" />
      <path class="steam" d="M11 13c-1.2-1.2 1.2-2.2 0-3.6M16 13c-1.2-1.2 1.2-2.2 0-3.6M21 13c-1.2-1.2 1.2-2.2 0-3.6" />
    </Pic>
  ),
  hides: () => (
    <Pic>
      <path d="M7 4v24M25 4v24M5 6h22M5 26h22" />
      <path d="M11 9.5c2.5 1 7.5 1 10 0 1 2.6-1 3.6 0 6.5s1 4.4 0 6.5c-2.5-1-7.5-1-10 0-1-2.1 1-3.6 0-6.5s-1-3.9 0-6.5z" />
    </Pic>
  ),
  kiln: () => (
    <Pic>
      <path d="M3 26c2-8.5 7-12.5 13-12.5S27 17.5 29 26z" />
      <path d="M13 26v-2.6a3 3 0 0 1 6 0V26" />
      <path class="steam" d="M15 10c-1.6-1.6 1.6-2.6 0-4.6M19.5 11c-1.2-1.6 1.6-2.6.4-4.6" />
    </Pic>
  ),
  anvil: () => (
    <Pic>
      <path d="M5 13h16c0 3 2.4 4 6 4h-5c-2 0-3 1-3 3v1h3v4H10v-4h3v-1c0-2-1-3-3-3H8c-2 0-3-1.6-3-4z" />
      <path class="spark" d="M23 8l2-2M20 7V4M26 11h2.4" />
    </Pic>
  ),
  bed: () => (
    <Pic>
      <path d="M4 25V11M4 19h24v6" />
      <path d="M6.5 14.5h6v4.5h-6z" />
      <path d="M13 19c3.5-2.5 9-2.5 15 0" />
    </Pic>
  ),
  fish: () => (
    <Pic>
      <path d="M5 16c4-5 10-6 15-3l5-4v14l-5-4c-5 3-11 2-15-3z" />
      <circle cx="10" cy="15" r=".9" />
      <path class="steam" d="M4 25c3-1.5 5 1.5 8 0s5 1.5 8 0 5 1.5 8 0" />
    </Pic>
  ),
  driftwood: () => (
    <Pic>
      <path d="M4 21c6-2 14-3 24-7" />
      <path d="M4 25c7-1 13-1 22-4" />
      <path d="M17 18l3-6M21 16.5l4 1" />
      <path d="M8 21.5l1 3" />
    </Pic>
  ),
  pebbles: () => (
    <Pic>
      <ellipse cx="10" cy="20" rx="5" ry="3.5" />
      <ellipse cx="21" cy="22" rx="6" ry="4" />
      <ellipse cx="17" cy="13" rx="3.6" ry="2.6" />
      <ellipse cx="26" cy="13.5" rx="2.4" ry="1.8" />
    </Pic>
  ),
  footprints: () => (
    <Pic>
      <path d="M9 27c-2 0-3-2-3-4.5S7 18 9 18s3 2 3 4.5-1 4.5-3 4.5z" />
      <path d="M21 16c-2 0-3-2-3-4.5S19 7 21 7s3 2 3 4.5-1 4.5-3 4.5z" />
      <path d="M8 15.5l.5-1.5M10.5 15.2l.2-1.6M20 4.5l.5-1.5M22.5 4.3l.2-1.6" />
    </Pic>
  ),
  reed: () => (
    <Pic>
      <path d="M10 28V9M16 28V5M22 28V10" />
      <path d="M10 9c-1.4-1-1.4-4 0-5 1.4 1 1.4 4 0 5zM22 10c-1.4-1-1.4-4 0-5 1.4 1 1.4 4 0 5z" />
      <path d="M16 18c-4-2-7-2-10 1M16 14c4-2 8-2 11 1" />
    </Pic>
  ),
  nest: () => (
    <Pic>
      <path d="M4 18c2 6 7 9 12 9s10-3 12-9z" />
      <path d="M6 21c6 2 14 2 20 0M8 24.5c5 1 11 1 16 0" />
      <ellipse cx="12.5" cy="16" rx="2.6" ry="3.2" />
      <ellipse cx="19" cy="15.5" rx="2.6" ry="3.2" />
    </Pic>
  ),
  tracks: () => (
    <Pic>
      <path d="M7 24l2-3 2 3M9 21v-3M7 15l2-3 2 3M9 12V9" />
      <path d="M20 26l2-3 2 3M22 23v-3M20 17l2-3 2 3M22 14v-3M20 8l2-3 2 3M22 5V3" />
    </Pic>
  ),
  clay: () => (
    <Pic>
      <path d="M4 22c4-4 8-5 12-4s8 0 12-3v9H4z" />
      <path d="M10 13c0-2 2-4 4-4 1 2 4 2 5 0 2 0 4 2 4 4z" />
      <path class="steam" d="M8 26h4M17 25.5h5" />
    </Pic>
  ),
  burrow: () => (
    <Pic>
      <path d="M3 22c3-1 5-1 7 0M22 22c3-1 5-1 7 0" />
      <path d="M10 22c0-5 3-8 6-8s6 3 6 8z" />
      <path d="M13 22c0-3 1.4-4.6 3-4.6s3 1.6 3 4.6" />
      <path class="steam" d="M5 26c3-1 5 1 8 0s5 1 8 0 5 1 7 0" />
    </Pic>
  ),
  salt: () => (
    <Pic>
      <path d="M3 13l8-3 7 4 11-3M6 22l6-5 6 3 6-4 5 2M11 10l1 7M18 14l0 6M24 16l1 9" />
      <path d="M10 26l3-2 3 2 3-2 3 2" />
    </Pic>
  ),
  brine: () => (
    <Pic>
      <path d="M5 13h22M5 13v12h22V13M5 17h22M5 21h22" />
      <path d="M8 13l3-8M8 5h8" />
      <path d="M16 5v4M14.6 9h2.8l-.4 2h-2z" />
    </Pic>
  ),
  bark: () => (
    <Pic>
      <path d="M10 4v24M22 4v24" />
      <path d="M10 8c4 2 8 1 12 3M10 15c3 1 6 0 9 2M10 22c4 1 8 0 12 2" />
      <path d="M22 11l5-2-1 6-4 1" />
    </Pic>
  ),
  resin: () => (
    <Pic>
      <path d="M8 4v24M24 4v24" />
      <path d="M8 12c2 0 3 2 3 4 0 3-2 4-2 7" />
      <path d="M16 9c-2 3-3 5-3 7a3 3 0 0 0 6 0c0-2-1-4-3-7z" />
    </Pic>
  ),
  moss: () => (
    <Pic>
      <path d="M3 24c3-6 7-8 13-8s10 2 13 8" />
      <path d="M7 22c1-2 2.5-2.5 4-2M13 19c1-1.6 2.6-2 4-1.4M19 19.4c1.6-.6 3 0 4 1.6" />
      <path d="M4 27h24" />
      <path class="steam" d="M9 13c0-2 2-3 3-2M20 12c1-2 3-2 4-1" />
    </Pic>
  ),
  sticks: () => (
    <Pic>
      <path d="M4 24l24-9M5 18l22 7M6 27L26 10" />
      <path d="M12 21l-1-4M20 18.5l2-3" />
    </Pic>
  ),
  log: () => (
    <Pic>
      <path d="M8 12h18M8 24h18" />
      <ellipse cx="8" cy="18" rx="4" ry="6" />
      <ellipse cx="8" cy="18" rx="1.6" ry="2.6" />
      <path d="M26 12c2 1 3 3.4 3 6s-1 5-3 6" />
      <path d="M17 6l4-3 1 4" />
    </Pic>
  ),
  stoneblock: () => (
    <Pic>
      <path d="M4 26V18h12v8zM16 26V18h12v8zM9 18v-8h14v8" />
      <path d="M8 22h2M21 21.5h3M14 13.5h3" />
    </Pic>
  ),
  iron: () => (
    <Pic>
      <path d="M4 26c3-5 7-7 12-7s9 2 12 7z" />
      <path d="M11 19l-3-9 4 1M18 19l2-11M22 20l5-6" />
      <path class="steam" d="M13 23h2M19 22.5h3" />
    </Pic>
  ),
  sluice: () => (
    <Pic>
      <path d="M3 12h26M3 12v14M29 12v14M11 12v14M21 12v14" />
      <path d="M13 15h6v7h-6z" />
      <path d="M16 15V6M13 6h6" />
      <path class="steam" d="M4 28c2-1 4 1 6 0M22 28c2-1 4 1 6 0" />
    </Pic>
  ),
  stakes: () => (
    <Pic>
      <path d="M5 26V12l2-3 2 3v14M13 26V9l2-3 2 3v17M21 26V11l2-3 2 3v15" />
      <path d="M3 18h26M3 23h26" />
    </Pic>
  ),
  cart: () => (
    <Pic>
      <path d="M3 17h20l3-6M5 17l2-6h16" />
      <circle cx="8" cy="22" r="4" />
      <circle cx="21" cy="22" r="4" />
      <path d="M8 22h.01M21 22h.01M26 11l3-2" />
    </Pic>
  ),
  ford: () => (
    <Pic>
      <path class="steam" d="M3 12c3-1.5 5 1.5 8 0s5 1.5 8 0 5 1.5 8 0M3 24c3-1.5 5 1.5 8 0s5 1.5 8 0 5 1.5 8 0" />
      <ellipse cx="9" cy="18" rx="3" ry="2" />
      <ellipse cx="16" cy="18" rx="3" ry="2" />
      <ellipse cx="23" cy="18" rx="3" ry="2" />
    </Pic>
  ),
  grass: () => (
    <Pic>
      <path d="M4 26c3-2 5-2 8 0s5 2 8 0 5-2 8 0" />
      <path d="M9 24c-1-5 0-9 3-13M13 24c0-5 2-8 5-10M18 24c1-4 0-8-2-12M22 24c1-3 3-6 6-7" />
    </Pic>
  ),
  scales: () => (
    <Pic>
      <path d="M16 5v21M9 27h14M6 9h20" />
      <path d="M6 9l-3 8h6zM26 9l-3 8h6z" />
      <path d="M3 17a3 2 0 0 0 6 0M23 17a3 2 0 0 0 6 0" />
    </Pic>
  ),
  hall: () => (
    <Pic>
      <path d="M4 13L16 5l12 8M6 13h20v14H6z" />
      <path d="M13 27v-7h6v7M9 17h2M21 17h2" />
      <circle cx="16" cy="10" r="1.6" />
    </Pic>
  ),
  mug: () => (
    <Pic>
      <path d="M8 10h13v15a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z" />
      <path d="M21 13h3a3 3 0 0 1 0 6h-3M12 14v9M17 14v9" />
      <path class="steam" d="M10 7c0-2 2-2 2-4M15 7c0-2 2-2 2-4" />
    </Pic>
  ),
  pier: () => (
    <Pic>
      <path d="M3 14h20M6 14v10M12 14v10M18 14v10" />
      <path d="M21 20h9l-2 4h-5z" />
      <path class="steam" d="M3 27c3-1 5 1 8 0s5 1 8 0 5 1 8 0" />
    </Pic>
  ),
  ore: () => (
    <Pic>
      <path d="M5 22l4-7 6 1 3 6-5 4z" />
      <path d="M17 16l5-5 6 3-1 6-6 1z" />
      <path class="steam" d="M9 19h2M22 14h2M3 27h26" />
    </Pic>
  ),
  peat: () => (
    <Pic>
      <path d="M4 20h10v6H4zM14 20h10v6H14zM9 14h10v6H9z" />
      <path class="steam" d="M7 23h3M18 23h3M13 17h3" />
      <path d="M24 14l3-6M27 8l1 3" />
    </Pic>
  ),
  garden: () => (
    <Pic>
      <path d="M4 22h24M4 27h24" />
      <path d="M9 22c0-3 1.2-5 3.4-6M9 22c0-2.2-1-4-3.2-5" />
      <path d="M16 22c0-3.5 1.2-6 3.6-7M16 22c0-2.5-1.1-4.5-3.4-5.5" />
      <path d="M23 22c0-3 1.2-5 3.4-6M23 22c0-2.2-1-4-3.2-5" />
    </Pic>
  ),
  berry: () => (
    <Pic>
      <path d="M16 4c-1 4-4 7-8 9M16 4c2 4 5 6 8 7M16 4v9" />
      <circle cx="9" cy="18" r="3" />
      <circle cx="16" cy="21" r="3.2" />
      <circle cx="23" cy="17" r="3" />
      <circle cx="13" cy="26" r="2.4" />
    </Pic>
  ),
};

// Eye-level views of places (scripts/art.ts view): the head of a scene, the card of a place on the map.
const PAINTED_VIEWS = new Set(views as string[]);

/** The picture of a place seen at eye level, or null while it is not painted. */
export function viewUrl(key: string | undefined): string | null {
  if (!key || !PAINTED_VIEWS.has(key)) return null;
  return new URL(`./art/views/w${(VIEWS as readonly string[]).indexOf(key) + 1}.webp`, import.meta.url).href;
}

// Painted marks: atlases of 4×3 cells (scripts/art.ts marks) — spot icons, and '@' + scene for the map.
const MARKS = marks as unknown as Record<string, [number, number]>;

/** The painted mark under a key as the style of its atlas cell; null while it is not painted. */
export function markStyle(key: string): Record<string, string> | null {
  const p = MARKS[key];
  if (!p) return null;
  const [n, i] = p;
  return {
    backgroundImage: `url(${new URL(`./art/marks/m${n}.webp`, import.meta.url).href})`,
    backgroundPosition: `${((i % 4) / 3) * 100}% ${(Math.floor(i / 4) / 2) * 100}%`,
  };
}

export function picture(icon: string): JSX.Element {
  const m = markStyle(icon);
  if (m) return <span class="spot-pic painted" style={m} aria-hidden="true" />;
  return ((PICS as Record<string, () => JSX.Element>)[icon] ?? PICS.home)();
}

// ---------------------------------------------------------------------------- grounds

/** A tuft of reeds (or grass) at a point. */
function Tuft({ x, y, s = 1, cls = 'reed' }: { x: number; y: number; s?: number; cls?: string }) {
  return (
    <g class={cls} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0c-2-8-1-14 2-20M0 0c1-7 4-12 8-15M0 0c-3-5-7-8-11-9" />
    </g>
  );
}

/** Rings on water. */
function Ripple({ x, y, r = 10 }: { x: number; y: number; r?: number }) {
  return (
    <g class="ripple">
      <ellipse cx={x} cy={y} rx={r} ry={r * 0.4} />
      <ellipse cx={x} cy={y} rx={r * 1.8} ry={r * 0.75} />
    </g>
  );
}

/** A dead tree seen from above: a stump, roots, a few bare limbs. */
function DeadTree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g class="tree" transform={`translate(${x} ${y}) scale(${s})`}>
      <circle r="9" />
      <circle class="ring" r="4.5" />
      <path d="M8 5l14 9M-7 6l-12 12M-6-7l-16-8M7-6l10-15M18 10l8-2M-15 14l-3 8M-16-11l-8 1" />
    </g>
  );
}

/** The floor every plan stands on: a soft lighter oval. */
function Floor({ tone = 'earth' }: { tone?: 'earth' | 'salt' | 'bog' }) {
  return <ellipse class={`floor ${tone}`} cx="200" cy="186" rx="196" ry="166" />;
}

function Yard({ warm }: { warm: boolean }) {
  const reeds: Array<[number, number, number]> = [
    [14, 330, 1],
    [30, 342, 0.8],
    [372, 334, 1],
    [388, 318, 0.8],
    [8, 120, 0.9],
    [392, 222, 0.9],
    [130, 12, 0.7],
    [292, 10, 0.8],
  ];
  return (
    <>
      <Floor />
      {/* the fence of woven withies, fallen here and there; a gap where the path leaves */}
      <path
        class="fence"
        d="M180 340C96 334 18 284 10 196 4 120 52 46 140 26M168 22c40-6 84-6 124 10M318 46c50 26 78 80 72 140-6 70-56 128-140 148-12 3-24 5-36 6"
      />
      <path class="fence fallen" d="M140 26l26-7M292 32l26 12" />
      <path class="path" d="M200 172c-6 40 8 70 0 104-4 22-6 46-4 74" />
      <rect class="hut-floor" x="96" y="46" width="208" height="126" rx="3" />
      {warm && <rect class="hut-glow" x="96" y="46" width="208" height="126" fill="url(#plan-glow)" />}
      <path class="hut-wall" d="M190 172H96V46h208v126H210" />
      <path class="hut-thatch" d="M92 42h216M100 38l-8 8M124 38l-8 8M148 38l-8 8M172 38l-8 8M196 38l-8 8M220 38l-8 8M244 38l-8 8M268 38l-8 8M292 38l-8 8M308 42v134M92 42v134" />
      {reeds.map(([x, y, s]) => (
        <Tuft x={x} y={y} s={s} />
      ))}
    </>
  );
}

function Shore() {
  return (
    <>
      {/* the water comes from the top, the sand is grey and wet at its edge */}
      <path class="water" d="M0 0h400v96c-30 10-58 2-90 8s-56 22-96 16-64-14-100-8S40 124 0 116z" />
      <path class="wave" d="M20 40c20-6 40 6 60 0M150 28c20-6 40 6 60 0M280 50c20-6 40 6 60 0M70 76c20-6 40 6 60 0M230 86c16-5 32 5 48 0" />
      <path class="wet" d="M0 126c40 8 70-2 106 0s64 16 104 12 58-20 96-18 62 6 94-2" />
      <path class="fog" d="M30 14h120M210 8h150M100 60h90M300 70h80" />
      <path class="path" d="M200 350c-2-40 10-90-10-140s-40-60-52-70" />
      {/* driftwood, pebbles, shells */}
      <path class="wood" d="M20 214l70-18M30 232l58-8M64 190l10-14M44 246l40-4" />
      <g class="stone">
        <ellipse cx="340" cy="186" rx="8" ry="5" />
        <ellipse cx="362" cy="198" rx="6" ry="4" />
        <ellipse cx="350" cy="210" rx="9" ry="6" />
        <ellipse cx="378" cy="182" rx="4" ry="3" />
        <ellipse cx="326" cy="204" rx="4" ry="3" />
      </g>
      <path class="shell" d="M250 260c4-6 10-6 14 0M120 300c3-5 8-5 11 0M300 290c3-5 8-5 11 0M170 180c3-5 8-5 11 0" />
      <Tuft x={10} y={340} />
      <Tuft x={390} y={330} s={0.9} />
      <Tuft x={380} y={300} s={0.7} />
    </>
  );
}

function Reeds() {
  const tufts: Array<[number, number, number]> = [
    [20, 40, 1],
    [80, 30, 1.1],
    [120, 60, 0.9],
    [150, 20, 1],
    [250, 26, 0.9],
    [290, 50, 1.1],
    [380, 30, 1],
    [30, 120, 1],
    [100, 120, 1.1],
    [140, 150, 0.9],
    [270, 130, 1],
    [380, 120, 1],
    [20, 290, 1.1],
    [110, 320, 1],
    [150, 270, 0.8],
    [260, 300, 1],
    [300, 330, 1.1],
    [390, 300, 0.9],
    [70, 260, 0.8],
    [330, 270, 0.7],
  ];
  return (
    <>
      <Floor tone="bog" />
      {/* a still pool on the right, a channel across */}
      <path class="water" d="M300 160c30-10 70 0 86 24 14 22-2 50-30 54-30 4-62-10-70-30-8-22-6-40 14-48z" />
      <path class="water" d="M0 190c40-10 80 6 120 0s60-20 90-14l10 16c-34-4-58 12-96 16s-84-4-124 0z" />
      <Ripple x={340} y={200} r={10} />
      <path class="mud" d="M10 228c20-10 50-12 72-4 10 10 4 30-20 34-24 4-48-6-52-30z" />
      <path class="path" d="M200 350c4-40-10-80 0-120s-10-90 0-150" />
      {tufts.map(([x, y, s]) => (
        <Tuft x={x} y={y} s={s} />
      ))}
    </>
  );
}

function Saltflat() {
  return (
    <>
      <Floor tone="salt" />
      {/* the white crust is cracked into plates; dark mud shows through the seams */}
      <path
        class="crack"
        d="M0 60l60 10 40-30 70 16 50-20 60 24 50-14 70 10M60 70l-10 60 50 30 60-20 40 50 80-10 50 30 70-14M100 40l0 0M170 56l-10 74M220 36l10 60 70 20 20 60M50 130L0 160M100 160l-20 70 60 40 70-20 60 30 60-20 50 20M210 210l10-40M330 160l20 50M140 270l-20 80M270 280l20 70M80 230L0 250"
      />
      <path class="crack fine" d="M30 100l30 20M140 90l20 20M260 80l20 30M340 70l20 30M120 200l30 10M300 230l30-10M200 300l20 20M60 300l20 20" />
      <g class="puddle">
        <ellipse cx="110" cy="110" rx="14" ry="6" />
        <ellipse cx="300" cy="200" rx="18" ry="7" />
        <ellipse cx="80" cy="300" rx="10" ry="4" />
      </g>
      <path class="path" d="M200 350c0-50 6-100 0-180" />
    </>
  );
}

function Brine() {
  return (
    <>
      <Floor tone="salt" />
      <path class="path" d="M200 350c-4-40 4-90 0-150" />
      {/* the log frame over black brine, a trough, a broken sweep */}
      <rect class="water dark" x="150" y="92" width="100" height="82" />
      <path class="log" d="M140 86h120M140 180h120M144 82v102M256 82v102" />
      <path class="log thin" d="M136 92h128M136 174h128" />
      <path class="log" d="M276 120v74M268 194h20" />
      <path class="log" d="M276 122L360 52M290 110l-24-34" />
      <path class="log thin" d="M110 214h70v14h-70z" />
      <path class="crack fine" d="M60 120l30 10M320 230l30 10M40 260l40-10M330 140l40 6M80 60l30 20" />
      <Tuft x={30} y={330} cls="reed dry" />
      <Tuft x={380} y={320} s={0.9} cls="reed dry" />
    </>
  );
}

function Grove() {
  return (
    <>
      {/* the trees stand in water to their knees */}
      <rect class="water" x="0" y="0" width="400" height="350" />
      <Ripple x={120} y={140} r={12} />
      <Ripple x={300} y={130} r={9} />
      <Ripple x={250} y={250} r={11} />
      <Ripple x={90} y={300} r={8} />
      <DeadTree x={30} y={40} s={1.1} />
      <DeadTree x={150} y={50} s={0.9} />
      <DeadTree x={250} y={40} s={1} />
      <DeadTree x={370} y={40} s={1.1} />
      <DeadTree x={110} y={210} s={0.8} />
      <DeadTree x={300} y={190} s={0.9} />
      <DeadTree x={20} y={260} s={1} />
      <DeadTree x={380} y={260} s={1.1} />
      {/* a ridge of firmer ground where you can walk */}
      <path class="ridge" d="M200 350c-10-60 20-110 0-170s-30-90-10-140" />
      <path class="moss" d="M330 110c10-6 22-4 30 2M60 90c10-6 22-4 30 2M300 300c10-6 22-4 30 2" />
    </>
  );
}

function Dyke() {
  return (
    <>
      {/* the dammed water above, the stone dyke with three gates, a fall of old stones below */}
      <path class="water" d="M0 0h400v50H0z" />
      <path class="wave" d="M30 20c16-5 32 5 48 0M150 30c16-5 32 5 48 0M280 18c16-5 32 5 48 0" />
      <path class="dam" d="M0 52h400v62H0z" />
      <path class="dam-lines" d="M0 72h400M0 94h400M30 52v20M90 52v20M150 52v20M250 52v20M310 52v20M370 52v20M60 72v22M120 72v22M280 72v22M340 72v22M40 94v20M100 94v20M300 94v20M360 94v20" />
      <rect class="gate-slot" x="164" y="52" width="16" height="62" />
      <rect class="gate-slot" x="192" y="52" width="16" height="62" />
      <rect class="gate-slot" x="220" y="52" width="16" height="62" />
      <path class="water" d="M150 116c20 8 80 8 100 0 10 30-10 60-50 66-40-6-60-36-50-66z" />
      <Ripple x={200} y={146} r={12} />
      <g class="stone">
        <rect x="20" y="180" width="22" height="14" rx="2" />
        <rect x="48" y="196" width="18" height="12" rx="2" />
        <rect x="30" y="210" width="26" height="14" rx="2" />
        <rect x="340" y="186" width="24" height="14" rx="2" />
        <rect x="360" y="206" width="18" height="12" rx="2" />
        <rect x="326" y="210" width="22" height="13" rx="2" />
      </g>
      <path class="path" d="M200 350c-6-40 20-80 0-150" />
      <Tuft x={20} y={330} />
      <Tuft x={384} y={334} s={0.9} />
    </>
  );
}

function Causeway() {
  const rungs: number[] = [];
  for (let y = 340; y > 120; y -= 14) rungs.push(y);
  return (
    <>
      <Floor tone="bog" />
      <path class="water" d="M0 150c60-10 100 20 130 60s-20 90-70 100S0 290 0 260zM400 120c-50 0-90 30-100 70s20 90 70 100 30-10 30-30z" />
      {/* logs laid across the bog toward a palisade of stakes */}
      {rungs.map((y, i) => (
        <path class="log thin" d={`M${170 + (i % 2) * 6} ${y}h${60 - (i % 3) * 4}`} />
      ))}
      <path class="log" d="M176 346c4-80 0-150 10-226M226 346c-4-80 4-150 2-226" />
      <path class="stakes" d="M60 56l6-16 6 16M90 52l6-16 6 16M120 50l6-16 6 16M150 48l6-16 6 16M240 48l6-16 6 16M270 50l6-16 6 16M300 52l6-16 6 16M330 56l6-16 6 16" />
      <path class="stakes" d="M50 58h300" />
      <path class="smoke" d="M120 26c-6-8 6-12 0-20M290 24c-6-8 6-12 0-20" />
      <Tuft x={30} y={120} cls="reed dry" />
      <Tuft x={60} y={340} />
      <Tuft x={370} y={330} s={0.9} />
      <Tuft x={330} y={100} s={0.8} cls="reed dry" />
    </>
  );
}

function Road() {
  return (
    <>
      <Floor />
      {/* the beaten road with deep ruts, a ford on the right, wagons in a ring on the left */}
      <path class="rut" d="M0 196c70-12 120-40 190-44s140 26 210 10M0 214c70-12 120-40 190-44s140 26 210 10" />
      <path class="path" d="M200 350c-10-60 6-120-6-176" />
      <path class="water" d="M330 0c-20 60 10 110-6 170s20 120 4 180h72V0z" />
      <path class="wave" d="M350 60c8-4 16 4 24 0M346 150c8-4 16 4 24 0M352 250c8-4 16 4 24 0" />
      <g class="stone">
        <ellipse cx="338" cy="96" rx="9" ry="5" />
        <ellipse cx="356" cy="104" rx="8" ry="5" />
        <ellipse cx="374" cy="98" rx="9" ry="5" />
      </g>
      <g class="wagons">
        <rect x="26" y="40" width="40" height="22" rx="3" transform="rotate(-20 46 51)" />
        <rect x="74" y="24" width="40" height="22" rx="3" transform="rotate(10 94 35)" />
        <rect x="18" y="96" width="40" height="22" rx="3" transform="rotate(30 38 107)" />
      </g>
      <path class="smoke" d="M70 76c-6-8 6-12 0-20" />
      <circle class="ember" cx="70" cy="82" r="5" />
      <Tuft x={20} y={250} s={1} cls="reed dry" />
      <Tuft x={60} y={300} s={0.8} cls="reed dry" />
      <Tuft x={150} y={320} s={0.9} cls="reed dry" />
      <Tuft x={260} y={300} s={1} cls="reed dry" />
      <Tuft x={240} y={70} s={0.7} cls="reed dry" />
    </>
  );
}

function Town() {
  const houses: Array<[number, number, number, number]> = [
    [150, 40, 40, 26],
    [200, 34, 34, 24],
    [130, 150, 34, 26],
    [250, 150, 40, 24],
    [300, 110, 30, 22],
    [110, 210, 30, 22],
    [270, 210, 36, 24],
  ];
  return (
    <>
      <Floor />
      {/* the river mouth along the bottom, a creek by the tavern, streets meeting at the market */}
      <path class="water" d="M0 280c60-14 120 4 190-6s140-22 210-8v84H0z" />
      <path class="water" d="M400 0v120c-20-10-30-40-26-70s-4-40 6-50z" />
      <path class="wave" d="M40 310c10-4 20 4 30 0M180 300c10-4 20 4 30 0M300 300c10-4 20 4 30 0" />
      <path class="street" d="M200 350c0-80 0-150 0-246M40 80c60 10 110 24 160 24s110-10 170-30M200 104c-40 40-90 70-150 110" />
      <rect class="square" x="160" y="84" width="80" height="44" rx="4" />
      <rect class="hall-b" x="20" y="40" width="70" height="44" />
      <path class="hall-b" d="M16 40l39-18 39 18" />
      {/* gabled roofs seen from above: a ridge along the house and the far slope in shade */}
      {houses.map(([x, y, w, h]) => (
        <g class="house-g">
          <rect class="house" x={x} y={y} width={w} height={h} rx="2" />
          <rect class="house-shade" x={x + 1} y={y + h / 2} width={w - 2} height={h / 2 - 1} />
          <path class="house-roof" d={`M${x} ${y + h / 2}H${x + w}`} />
        </g>
      ))}
      <g class="saltpile">
        <path d="M120 120l14-18 14 18zM300 64l12-16 12 16zM330 70l10-13 10 13z" />
      </g>
      <path class="plank" d="M30 250h40M40 250v40M60 250v40" />
    </>
  );
}

function Bog() {
  const pools: Array<[number, number, number]> = [
    [70, 120, 26],
    [200, 160, 32],
    [320, 130, 24],
    [120, 260, 22],
    [290, 260, 28],
  ];
  return (
    <>
      <Floor tone="bog" />
      {pools.map(([x, y, r]) => (
        <ellipse class="rust" cx={x} cy={y} rx={r} ry={r * 0.55} />
      ))}
      <path class="sheen" d="M190 154c8-3 16-3 22 0M60 116c6-3 12-3 18 0M282 254c6-3 12-3 18 0" />
      <g class="stone">
        <path d="M40 60l10-8 12 4 2 10-12 6zM60 70l8-4 6 6-6 6z" />
      </g>
      <path class="pit" d="M150 40c10-8 30-8 40 0M250 50c8-6 22-6 30 0" />
      <path class="path" d="M200 350c10-50-20-90 0-140s-10-90 0-150" />
      <Tuft x={30} y={200} cls="reed dry" />
      <Tuft x={380} y={210} s={0.9} cls="reed dry" />
      <Tuft x={250} y={330} s={0.8} />
      <Tuft x={60} y={330} />
      <Tuft x={350} y={40} s={0.8} cls="reed dry" />
    </>
  );
}

function Isle() {
  return (
    <>
      {/* a hump of sand and willow in the open water; the boat is pulled up at the bottom */}
      <rect class="water" x="0" y="0" width="400" height="350" />
      <path class="wave" d="M20 30c20-6 40 6 60 0M300 24c20-6 40 6 60 0M330 300c20-6 40 6 60 0M10 320c20-6 40 6 60 0" />
      <path class="wet" d="M64 196c-6-70 50-130 136-136s150 50 140 130c-8 70-70 110-140 110S70 260 64 196z" />
      <ellipse class="floor bog" cx="204" cy="190" rx="120" ry="104" />
      <path class="mud" d="M20 206c14-16 40-20 58-8 6 14-8 30-30 30s-34-8-28-22z" />
      <Ripple x={40} y={230} r={8} />
      <g class="stone">
        <ellipse cx="190" cy="98" rx="14" ry="8" />
        <ellipse cx="214" cy="92" rx="10" ry="6" />
      </g>
      <path class="wood" d="M180 96l-12-14M208 88l10-16M196 100l4 12" />
      <path class="path" d="M200 330c-4-30 8-60 0-100" />
      <path class="wood" d="M184 330l32 0M188 338l24 0" />
      <Tuft x={330} y={180} />
      <Tuft x={352} y={200} s={1.1} />
      <Tuft x={370} y={176} s={0.9} />
      <Tuft x={340} y={220} s={0.8} />
      <Tuft x={120} y={260} s={0.8} />
    </>
  );
}

function Willow() {
  const willows: Array<[number, number, number]> = [
    [40, 70, 1],
    [110, 50, 0.9],
    [70, 140, 1.1],
    [160, 110, 0.8],
    [30, 220, 0.9],
  ];
  return (
    <>
      <Floor tone="bog" />
      {/* old willows on the left, cut for withies; the water comes in on the right */}
      <path class="water" d="M400 160c-40 0-70 20-80 50s0 70 20 90 50 40 60 50z" />
      <Ripple x={360} y={240} r={9} />
      {willows.map(([x, y, s]) => (
        <g class="tree" transform={`translate(${x} ${y}) scale(${s})`}>
          <circle r="7" />
          <path d="M0-7c-6-10-14-14-22-12M0-7c6-10 14-14 22-12M-6 4c-8 6-12 14-12 22M6 4c8 6 12 14 12 22M-8-2c-12 0-20 6-24 14M8-2c12 0 20 6 24 14" />
        </g>
      ))}
      {/* the old post with a rag on it */}
      <path class="log" d="M344 70v50M336 120h16" />
      <path class="log thin" d="M344 78l14 6-14 6" />
      <path class="path" d="M200 350c-10-50 20-100 0-160s-40-80-30-140" />
      <Tuft x={240} y={320} s={0.8} />
      <Tuft x={290} y={130} s={0.9} />
      <Tuft x={110} y={300} />
    </>
  );
}

const GROUNDS: Record<SceneId, (p: { warm: boolean }) => JSX.Element> = {
  yard: Yard,
  shore: Shore,
  reeds: Reeds,
  saltflat: Saltflat,
  brine: Brine,
  grove: Grove,
  dyke: Dyke,
  causeway: Causeway,
  road: Road,
  town: Town,
  bog: Bog,
  isle: Isle,
  willow: Willow,
};

/** The drawn ground of a plan. */
/** The weather and the evening laid over a painting (its parent carries `tones` and `sky-<kind>`). */
export function Tones({ dusk }: { dusk: number }) {
  return (
    <>
      <span class="tone-sky" />
      <span class="tone-dusk" style={{ opacity: String(dusk) }} />
    </>
  );
}

// Painted grounds (scripts/art.ts ground): a place with one shows the painting, the rest keep the ink.
const PAINTED = new Set(grounds as string[]);

function groundUrl(scene: string): string {
  return new URL(`./art/grounds/g${(SCENES as readonly string[]).indexOf(scene) + 1}.webp`, import.meta.url).href;
}

// Life on a painted ground: glints on water, smoke, drifting mist, now and then a pair of birds.
// Boxes are per cent of the plan, matched to each painting by eye.
type Life =
  | { kind: 'water'; x: number; y: number; w: number; h: number }
  | { kind: 'smoke'; x: number; y: number; warm?: boolean }
  | { kind: 'mist'; y: number; h: number }
  | { kind: 'birds'; y: number };

const LIFE: Record<SceneId, Life[]> = {
  yard: [{ kind: 'smoke', x: 37, y: 26, warm: true }],
  shore: [{ kind: 'water', x: 0, y: 0, w: 100, h: 30 }, { kind: 'birds', y: 14 }],
  reeds: [{ kind: 'water', x: 70, y: 34, w: 30, h: 34 }, { kind: 'water', x: 0, y: 50, w: 46, h: 10 }, { kind: 'birds', y: 12 }],
  saltflat: [{ kind: 'birds', y: 22 }],
  brine: [{ kind: 'water', x: 40, y: 10, w: 22, h: 22 }],
  grove: [{ kind: 'water', x: 0, y: 0, w: 100, h: 100 }, { kind: 'mist', y: 40, h: 45 }],
  dyke: [{ kind: 'water', x: 0, y: 0, w: 100, h: 9 }, { kind: 'water', x: 34, y: 20, w: 32, h: 26 }],
  causeway: [{ kind: 'water', x: 0, y: 20, w: 34, h: 70 }, { kind: 'water', x: 66, y: 15, w: 34, h: 70 }, { kind: 'mist', y: 25, h: 50 }],
  road: [{ kind: 'water', x: 80, y: 0, w: 20, h: 100 }, { kind: 'birds', y: 18 }],
  town: [{ kind: 'water', x: 0, y: 0, w: 15, h: 100 }, { kind: 'smoke', x: 26, y: 6 }, { kind: 'smoke', x: 74, y: 10 }, { kind: 'smoke', x: 62, y: 62 }],
  bog: [{ kind: 'water', x: 0, y: 20, w: 100, h: 60 }, { kind: 'mist', y: 15, h: 60 }],
  isle: [{ kind: 'water', x: 0, y: 0, w: 22, h: 100 }, { kind: 'water', x: 80, y: 0, w: 20, h: 100 }, { kind: 'birds', y: 10 }],
  willow: [{ kind: 'water', x: 74, y: 40, w: 26, h: 60 }, { kind: 'mist', y: 55, h: 35 }],
};

function LifeLayer({ scene, warm }: { scene: string; warm: boolean }) {
  const life = (LIFE as Record<string, Life[]>)[scene] ?? [];
  return (
    <>
      {life.map((l, i) => {
        if (l.kind === 'water') return <span key={i} class="life-water" style={{ left: `${l.x}%`, top: `${l.y}%`, width: `${l.w}%`, height: `${l.h}%` }} />;
        if (l.kind === 'smoke') {
          if (l.warm && !warm) return null;
          return (
            <span key={i} class="life-smoke" style={{ left: `${l.x}%`, top: `${l.y}%` }}>
              <i />
              <i />
              <i />
            </span>
          );
        }
        if (l.kind === 'mist') return <span key={i} class="life-mist" style={{ top: `${l.y}%`, height: `${l.h}%` }} />;
        return (
          <svg key={i} class="life-birds" style={{ top: `${l.y}%` }} viewBox="0 0 40 16" aria-hidden="true">
            <path d="M2 8q4-5 8 0q4-5 8 0" />
            <path d="M22 4q3-4 6 0q3-4 6 0" />
          </svg>
        );
      })}
    </>
  );
}

/**
 * The ground a plan is drawn on. A painting takes the evening (`dusk`, 0..1) and the weather (`sky`)
 * as tones laid over it; the ink plans have them from the page behind.
 */
export function Ground({ scene, warm, dusk = 0, sky }: { scene: string; warm: boolean; dusk?: number; sky?: string }) {
  if (PAINTED.has(scene)) {
    return (
      <div class={`plan-paint tones g-${scene} ${sky ? `sky-${sky}` : ''}`} aria-hidden="true">
        <img src={groundUrl(scene)} alt="" draggable={false} decoding="async" />
        <LifeLayer scene={scene} warm={warm} />
        {warm && <span class="plan-paint-glow" />}
        <Tones dusk={dusk} />
      </div>
    );
  }
  const Draw = (GROUNDS as Record<string, (p: { warm: boolean }) => JSX.Element>)[scene] ?? Yard;
  return (
    <svg class={`plan-ground g-${scene}`} viewBox="0 0 400 350" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="plan-floor" cx="50%" cy="55%" r="55%">
          <stop offset="0" stop-color="rgba(221, 184, 103, 0.10)" />
          <stop offset="0.7" stop-color="rgba(221, 184, 103, 0.04)" />
          <stop offset="1" stop-color="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <radialGradient id="plan-floor-salt" cx="50%" cy="50%" r="60%">
          <stop offset="0" stop-color="rgba(230, 217, 188, 0.1)" />
          <stop offset="0.75" stop-color="rgba(230, 217, 188, 0.05)" />
          <stop offset="1" stop-color="rgba(230, 217, 188, 0)" />
        </radialGradient>
        <radialGradient id="plan-floor-bog" cx="50%" cy="55%" r="60%">
          <stop offset="0" stop-color="rgba(141, 176, 143, 0.09)" />
          <stop offset="0.75" stop-color="rgba(141, 176, 143, 0.04)" />
          <stop offset="1" stop-color="rgba(141, 176, 143, 0)" />
        </radialGradient>
        <radialGradient id="plan-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0" stop-color="rgba(221, 150, 70, 0.28)" />
          <stop offset="1" stop-color="rgba(221, 150, 70, 0)" />
        </radialGradient>
      </defs>
      <Draw warm={warm} />
    </svg>
  );
}
