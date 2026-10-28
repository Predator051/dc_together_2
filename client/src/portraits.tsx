// Portraits of foes: ink drawings in a round seal, the same hand as the plans.

import type { ComponentChildren, JSX } from 'preact';
import type { PortraitId } from '../../shared/src/pictures.js';
import painted from './art/foes.json';

function Ink({ children }: { children: ComponentChildren }) {
  return (
    <svg
      class="portrait-pic"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** A dot of an eye. */
const Eye = ({ x, y, r = 1.3 }: { x: number; y: number; r?: number }) => <circle class="eye" cx={x} cy={y} r={r} />;

const DRAW: Record<PortraitId, () => JSX.Element> = {
  rat: () => (
    <Ink>
      <path d="M9 27c1-4 5-7 9-7 6 0 11-2 15 0 4 2 6 6 5 10-1 3-4 4-8 4H17c-4 0-8-3-8-7z" />
      <path d="M9 27l-4 1.5 4 1" />
      <circle cx="15" cy="20.5" r="3" />
      <Eye x={11.5} y={25.5} />
      <path d="M38 31c4 1 6 4 4 7-2 2-6 1-9 3" />
      <path d="M17 34v3M30 34v3" />
      <path class="thin" d="M6 27.5l-3-2M6 28.5l-3 1" />
    </Ink>
  ),
  viper: () => (
    <Ink>
      <path d="M12 16c3-4 9-4 11 0" />
      <path d="M23 16c2 4-2 7-6 8-6 2-9 6-6 10 3 4 11 4 17 2 6-2 11-1 13 3" />
      <path d="M12 16c-2 2-1 5 2 5" />
      <Eye x={14.6} y={15.6} r={1.1} />
      <path class="thin" d="M9 17.5l-3 .5M6 18l-1.5-1.5M6 18l-1 1.8" />
      <path class="mark" d="M18 26l2-1M14 32l2-1.5M22 37l2-.5M30 35l2 .5" />
    </Ink>
  ),
  oldviper: () => (
    <Ink>
      <path class="thick" d="M10 15c3-5 11-5 13 0" />
      <path class="thick" d="M23 15c2 5-3 8-8 9-7 2-10 7-6 11 4 4 13 4 19 1 6-3 11-2 13 2" />
      <path class="thick" d="M10 15c-2 3 0 6 3 6" />
      <Eye x={13.2} y={14.3} r={1.3} />
      <path class="thin" d="M7 17l-3 .5M4 17.5l-1.5-1.5M4 17.5l-1 1.8" />
      <path class="mark" d="M17 26l2.4-1.2M12 32l2.4-1.6M20 38l2.6-.4M29 36l2.4.6M36 35l2 .8" />
      <path class="thin" d="M14 11l1-2.5M18 10.5V8M22 11.5l1.5-2" />
    </Ink>
  ),
  dog: () => (
    <Ink>
      <path d="M15 14l-3-7 8 5M33 14l3-7-8 5" />
      <path d="M15 14c-3 4-3 10 0 14l4 6c2 3 8 3 10 0l4-6c3-4 3-10 0-14-4-3-14-3-18 0z" />
      <Eye x={19} y={20} />
      <Eye x={29} y={20} />
      <path d="M21.5 29.5h5l-2.5 2.5z" />
      <path class="thin" d="M24 32v2.5M21 35c2 1.5 4 1.5 6 0" />
      <path class="thin" d="M14 34l-3 4M34 34l3 4" />
    </Ink>
  ),
  hound: () => (
    <Ink>
      <path d="M15 15l-1-5 5 3M33 15l1-5-5 3" />
      <path d="M15 15c-3 4-3 10 0 14l4 6c2 3 8 3 10 0l4-6c3-4 3-10 0-14-4-3-14-3-18 0z" />
      <Eye x={19.5} y={21} />
      <Eye x={28.5} y={21} />
      <path d="M21.5 30h5l-2.5 2.5z" />
      <path class="thin" d="M24 32.5v2" />
      <path d="M14 37c5 4 15 4 20 0" />
      <circle class="thin" cx="24" cy="40.5" r="1.4" />
    </Ink>
  ),
  leech: () => (
    <Ink>
      <path d="M10 30c0-8 6-15 14-16 7-1 13 3 14 9 1 5-3 9-8 9-4 0-6-3-5-6" />
      <path d="M10 30c0 3 2 5 5 5" />
      <circle cx="12.5" cy="31.5" r="2.5" />
      <path class="mark" d="M15 21l2.5 2M20 16.5l1.5 2.8M26 14.5l.5 3M32 16l-1 2.8M36.5 21l-2.2 1.6M37 28.5l-2.6-.6" />
    </Ink>
  ),
  boar: () => (
    <Ink>
      <path d="M12 19l-2-6 6 3M36 19l2-6-6 3" />
      <path d="M12 19c-3 6-2 13 3 17 2 2 5 3 9 3s7-1 9-3c5-4 6-11 3-17-6-4-18-4-24 0z" />
      <Eye x={18} y={24} />
      <Eye x={30} y={24} />
      <ellipse cx="24" cy="33" rx="5.5" ry="4" />
      <path class="thin" d="M22 33v.5M26 33v.5" />
      <path d="M17.5 33c-3 0-4-2-4-4M30.5 33c3 0 4-2 4-4" />
      <path class="thin" d="M20 13l1-4M24 12.5V8M28 13l-1-4" />
    </Ink>
  ),
  greyboar: () => (
    <Ink>
      <path d="M12 19l-2-6 6 3M36 19l2-6-6 3" />
      <path class="thick" d="M12 19c-3 6-2 13 3 17 2 2 5 3 9 3s7-1 9-3c5-4 6-11 3-17-6-4-18-4-24 0z" />
      <Eye x={18} y={24} />
      <Eye x={30} y={24} />
      <ellipse cx="24" cy="33" rx="5.5" ry="4" />
      <path class="thin" d="M22 33v.5M26 33v.5" />
      <path class="thick" d="M17.5 33c-5 0-7-4-6-9M30.5 33c5 0 7-4 6-9" />
      <path class="thin" d="M18 13.5l-1-5M21 12.5l.5-5.5M24 12.2V6.5M27 12.5l-.5-5.5M30 13.5l1-5" />
      <path class="mark" d="M15 21l2 1M33 21l-2 1" />
    </Ink>
  ),
  catfish: () => (
    <Ink>
      <path d="M8 25c4-7 13-10 22-9 5 1 8 4 10 7l5-4v12l-5-4c-2 3-5 6-10 7-9 1-18-2-22-9z" />
      <path d="M8 25c3 1 6 1 9 0" />
      <Eye x={14} y={21.5} />
      <path class="thin" d="M10 27c-3 3-4 7-2 11M13 28c-1 4 0 7 2 9M10 23c-3-2-6-2-8 0" />
      <path class="mark" d="M22 20l1 2M27 19l.6 2.2M32 20l0 2" />
    </Ink>
  ),
  cloak: () => (
    <Ink>
      <path d="M24 7c-5 0-8 4-8 9v4l-6 21h28l-6-21v-4c0-5-3-9-8-9z" />
      <path d="M17 18c2-2 4-3 7-3s5 1 7 3" />
      <path class="shade" d="M19.5 19.5c1.5 3 7.5 3 9 0" />
      <path d="M38 14l-4 18" />
      <path class="thick" d="M38 14l1.6-4" />
      <path class="thin" d="M18 30h12M22 30v4" />
    </Ink>
  ),
  chief: () => (
    <Ink>
      <path class="thick" d="M24 6c-6 0-9 4-9 10v4L7 42h34l-8-22v-4c0-6-3-10-9-10z" />
      <path d="M16 18c2-2 5-3 8-3s6 1 8 3" />
      <path class="shade" d="M19 19.5c1.5 3.5 8.5 3.5 10 0" />
      <path class="thin" d="M20 24l4 6 4-6" />
      <path d="M22.5 30h3v3h-3z" />
      <path d="M41 10l-5 22" />
      <path class="thick" d="M41 10l2-5" />
      <path class="thin" d="M14 34h20" />
    </Ink>
  ),
  wolf: () => (
    <Ink>
      <path d="M14 13l-2-8 7 5M30 12l3-7 1 9" />
      <path d="M14 13c-3 3-4 8-3 12l-5 6c-1 2 0 3 2 3h7c2 3 5 5 9 5s7-2 9-5c3-4 4-11 1-17-3-5-8-7-13-6-3 0-5 1-7 2z" />
      <Eye x={18} y={21} />
      <Eye x={28} y={20} />
      <path d="M6 34l3-1" />
      <path class="mark" d="M12 36l2 2M16 37l1 2" />
      <path class="thin" d="M33 30c3 1 6 0 8-2M34 25c3 0 6-1 8-3" />
    </Ink>
  ),
  snatcher: () => (
    <Ink>
      <path d="M24 7c-5 0-8 4-8 9v4l-6 21h28l-6-21v-4c0-5-3-9-8-9z" />
      <path class="shade" d="M19.5 19.5c1.5 3 7.5 3 9 0" />
      <path class="thin" d="M8 14c4 6 9 9 16 9M8 14l4 2M8 14l1 5M11 22l3-4M15 25l1-4" />
      <path d="M38 16l-3 18" />
      <path class="thin" d="M14 32h20M24 26l-3 4" />
    </Ink>
  ),
  hook: () => (
    <Ink>
      <path class="thick" d="M24 6c-6 0-9 4-9 10v4L8 42h32l-7-22v-4c0-6-3-10-9-10z" />
      <path class="shade" d="M19 19.5c1.5 3.5 8.5 3.5 10 0" />
      <path class="thin" d="M16 18c2-2 5-3 8-3s6 1 8 3" />
      <path class="thick" d="M38 22v8a4 4 0 0 1-8 0" />
      <path d="M38 22v-4" />
      <path class="mark" d="M12 30l3 2M12 33l3 1" />
    </Ink>
  ),
  matka: () => (
    <Ink>
      <path class="thick" d="M11 13c3-5 11-5 13 0" />
      <path class="thick" d="M24 13c2 5-3 8-8 9-6 2-9 6-6 10 3 4 12 4 18 2 7-2 12 0 13 4" />
      <path d="M11 13c-2 2-1 5 2 5" />
      <Eye x={13.8} y={12.8} r={1.2} />
      <path class="thin" d="M8 15l-3 .5M5 15.5l-1.5-1.5M5 15.5l-1 1.8" />
      <path class="mark" d="M18 24l2-1M14 30l2-1.5M22 36l2-.5M31 35l2 .5" />
      <ellipse cx="33" cy="22" rx="2.2" ry="1.6" />
      <ellipse cx="37.5" cy="24.5" rx="2.2" ry="1.6" />
      <ellipse cx="34" cy="27" rx="2.2" ry="1.6" />
    </Ink>
  ),
  elder: () => (
    <Ink>
      <path class="thick" d="M5 24c4-8 14-11 24-10 6 1 9 4 11 7l5-4v14l-5-4c-2 4-5 6-11 7-10 1-20-2-24-10z" />
      <path d="M5 24c3 1 7 1 10 0" />
      <Eye x={12} y={20.5} />
      <path class="thin" d="M7 26c-3 4-4 9-1 13M11 27c-1 5 0 9 3 11M7 22c-3-3-6-3-8-1" />
      <path class="mark" d="M20 18l1 2M26 17l.6 2.2M32 18l0 2" />
      <path class="thin" d="M22 26l6 3M24 30l5-1" />
      <path d="M40 21l3-1M40 29l3 1" />
    </Ink>
  ),
  shewolf: () => (
    <Ink>
      <path d="M14 13l-2-8 7 5M30 12l3-7 1 9" />
      <path class="thick" d="M14 13c-3 3-4 8-3 12l-5 6c-1 2 0 3 2 3h7c2 3 5 5 9 5s7-2 9-5c3-4 4-11 1-17-3-5-8-7-13-6-3 0-5 1-7 2z" />
      <Eye x={18} y={21} />
      <Eye x={28} y={20} />
      <path d="M6 34l3-1" />
      <path class="thin" d="M31 7l2 3" />
      <path class="mark" d="M22 14l3 5M25 13l2 4" />
      <path class="thin" d="M33 30c3 1 6 0 8-2M34 25c3 0 6-1 8-3M35 34c3 1 6 1 8 0" />
    </Ink>
  ),
};

// Painted portraits: atlases of 3×3 cells (scripts/art.ts foes); a foe not painted yet keeps its ink.
const PAINTED = painted as unknown as Record<string, [number, number]>;

function atlas(n: number): string {
  return new URL(`./art/foes/f${n}.webp`, import.meta.url).href;
}

/** A foe's portrait in its round seal. Unknown names fall back to a mark of a beast. */
export function Portrait({ icon, size = 'm', out = false }: { icon: string; size?: 's' | 'm' | 'l' | 'xl'; out?: boolean }) {
  const p = PAINTED[icon];
  if (p) {
    const [n, i] = p;
    return (
      <span class={`portrait painted ${size} ${out ? 'out' : ''}`}>
        <span
          class="portrait-paint"
          style={{ backgroundImage: `url(${atlas(n)})`, backgroundPosition: `${((i % 3) / 2) * 100}% ${(Math.floor(i / 3) / 2) * 100}%` }}
          aria-hidden="true"
        />
      </span>
    );
  }
  const draw = (DRAW as Record<string, () => JSX.Element>)[icon] ?? DRAW.rat;
  return <span class={`portrait ${size} ${out ? 'out' : ''}`}>{draw()}</span>;
}
