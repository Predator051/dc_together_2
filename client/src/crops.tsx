// What grows on a bed, drawn by hand for each crop and each stage: 0 sown, 1 come up, 2 growing,
// 3 nearly ripe, 4 ripe. A plant stands with its root at (0, 0) and grows up (negative y), about
// 100 units at its tallest; the garden scene scales it, a picture in a card frames it.
import type { JSX } from 'preact';
import { CROP_LOOKS, type CropLook } from '../../shared/src/pictures.js';
import paintedCrops from './art/crops.json';

// Painted crops (scripts/art.ts crops): five stages on one canvas each; the number is the canvas's height
// to its width. A crop not painted yet is drawn in strokes below.
const PAINTED = paintedCrops as unknown as Partial<Record<CropLook | 'bed', number>>;

/** The painted stage of a crop, or null while the crop is not painted. */
export function cropUrl(look: CropLook, stage: number): string | null {
  if (!PAINTED[look]) return null;
  return new URL(`./art/crops/c${CROP_LOOKS.indexOf(look) + 1}s${stage}.webp`, import.meta.url).href;
}

/** The painted empty bed and its height to its width, or null. */
export function bedArt(): { url: string; ratio: number } | null {
  const ratio = PAINTED.bed;
  return ratio ? { url: new URL('./art/crops/bed.webp', import.meta.url).href, ratio } : null;
}

/** How wide a painted crop's canvas stands on a bed of the plain size, in the garden's units. */
const PAINT_W: Record<CropLook, number> = {
  garlic: 118,
  thyme: 112,
  beet: 122,
  flax: 70,
  pumpkin: 160,
};

/** Where a stage begins, as a share of the growing time (ripe at 1). */
export const STAGE_AT = [0, 0.12, 0.4, 0.75] as const;

/** The stage (0–4) a bed with this share grown is at. */
export function stageOf(share: number): number {
  if (share >= 1) return 4;
  let n = 0;
  for (let i = 0; i < STAGE_AT.length; i++) if (share >= STAGE_AT[i]!) n = i;
  return n;
}

/** How far into its stage the plant is (0–1), so it keeps growing between one look and the next. */
export function withinStage(share: number): number {
  const n = stageOf(share);
  if (n >= 4) return 1;
  const from = STAGE_AT[n]!;
  const to = n + 1 < STAGE_AT.length ? STAGE_AT[n + 1]! : 1;
  return Math.max(0, Math.min(1, (share - from) / (to - from)));
}

const INK = '#2a2214';
const SOIL = '#5a4330';
const SOIL_LIT = '#7a5c40';

/** A blade from the ground to a tip leaning sideways. */
function blade(x: number, h: number, lean: number, w: number): string {
  return `M${x - w / 2} 0Q${x - w / 2 + lean * 0.3} ${-h * 0.55} ${x + lean} ${-h}Q${x + w / 2 + lean * 0.3} ${-h * 0.55} ${x + w / 2} 0Z`;
}

/** A thin stem bending to one side. */
function stem(x: number, h: number, lean: number): string {
  return `M${x} 0Q${x + lean * 0.25} ${-h * 0.5} ${x + lean} ${-h}`;
}

/** A small heap of fresh earth where something was put in. */
function Mound({ peek }: { peek?: string }) {
  return (
    <g>
      <ellipse cx="0" cy="-1" rx="11" ry="4" fill={SOIL} />
      <ellipse cx="-2" cy="-2.5" rx="6" ry="2" fill={SOIL_LIT} opacity="0.7" />
      {peek && <path d="M-2 -2Q0 -9 2.5 -2Z" fill={peek} stroke={INK} stroke-width="0.6" stroke-opacity="0.5" />}
    </g>
  );
}

// ------------------------------------------------------------------ garlic: blades, then a white head
function Garlic({ n }: { n: number }) {
  if (n === 0) return <Mound peek="#e6dcc4" />;
  const green = n === 4 ? '#a7a35a' : '#7f9a55';
  const dark = n === 4 ? '#7d7a3c' : '#56703a';
  const sets: Array<Array<[number, number, number, number]>> = [
    [],
    [[-2, 18, -6, 3], [2, 23, 5, 3]],
    [[-4, 42, -14, 4], [-1, 54, -4, 4.5], [2, 48, 10, 4], [4, 36, 18, 3.5]],
    [[-5, 54, -20, 4.5], [-2, 72, -7, 5], [1, 78, 3, 5], [3, 66, 14, 4.5], [5, 50, 24, 4]],
    [[-5, 48, -30, 4.5], [-2, 66, -16, 5], [1, 70, 6, 5], [3, 60, 22, 4.5], [5, 44, 32, 4]],
  ];
  const set = sets[n]!;
  return (
    <g>
      {n >= 3 && <path d={n === 4 ? 'M-12 -1Q-13 -17 0 -19Q13 -17 12 -1Q0 4 -12 -1Z' : 'M-9 0Q-9 -8 0 -9Q9 -8 9 0Z'} fill="#ece2cc" stroke="#9f9078" stroke-width="1" />}
      {n === 4 && <path d="M-5 -2Q-6 -12 -1 -17M4 -2Q5 -12 1 -17" fill="none" stroke="#a07c92" stroke-width="1.4" opacity="0.8" />}
      {set.map(([x, h, lean, w]) => (
        <path d={blade(x, h, lean, w + 1.6)} fill={dark} />
      ))}
      {set.map(([x, h, lean, w]) => (
        <path d={blade(x - 0.4, h - 2, lean, w)} fill={green} />
      ))}
      {n === 4 &&
        set.map(([x, h, lean]) => <path d={`M${x + lean * 0.75} ${-h * 0.75}L${x + lean} ${-h}`} stroke="#c9b06a" stroke-width="2.4" stroke-linecap="round" />)}
    </g>
  );
}

// ------------------------------------------------------------------ thyme: a low bush, then flowers
function tuft(rx: number, ry: number, count: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const a = i * 2.39996;
    const r = Math.sqrt(t);
    const x = Math.cos(a) * r * rx;
    // a dome: higher in the middle, low at the sides
    const top = ry * Math.sqrt(Math.max(0, 1 - (x / rx) ** 2));
    out.push([x, -2 - top * (0.25 + 0.75 * (Math.sin(a) * 0.5 + 0.5))]);
  }
  return out;
}

function Thyme({ n }: { n: number }) {
  if (n === 0) return <Mound peek="#7f8f5e" />;
  const size: Array<[number, number, number, number]> = [
    [0, 0, 0, 0],
    [7, 8, 9, 0],
    [15, 16, 26, 0],
    [21, 22, 40, 5],
    [25, 26, 52, 16],
  ];
  const [rx, ry, count, flowers] = size[n]!;
  const pts = tuft(rx, ry, count);
  const tops = [...pts].sort((a, b) => a[1] - b[1]).slice(0, flowers);
  return (
    <g>
      {n === 1 && <path d={`${stem(-3, 9, -2)}${stem(1, 11, 1)}${stem(4, 8, 3)}`} fill="none" stroke="#6b5a3a" stroke-width="1.2" />}
      {pts.map(([x, y]) => (
        <circle cx={x} cy={y} r="3.6" fill="#55653e" />
      ))}
      {pts.map(([x, y]) => (
        <circle cx={x - 0.6} cy={y - 0.7} r="2.5" fill="#8c9c66" />
      ))}
      {tops.map(([x, y]) => (
        <g>
          <circle cx={x} cy={y - 2.5} r="2.4" fill="#b48aa8" />
          <circle cx={x - 0.6} cy={y - 3.1} r="1" fill="#e2c6d8" />
        </g>
      ))}
    </g>
  );
}

// ------------------------------------------------------------------ beet: broad leaves on red stems, a red shoulder
function BeetLeaf({ a, len, w, s }: { a: number; len: number; w: number; s: number }) {
  return (
    <g transform={`rotate(${a})`}>
      <path d={`M0 0L0 ${-s}`} stroke="#8e2f33" stroke-width="2" />
      <g transform={`translate(0 ${-s})`}>
        <path d={`M0 0C${-w * 1.1} ${-len * 0.3} ${-w} ${-len * 0.85} 0 ${-len}C${w} ${-len * 0.85} ${w * 1.1} ${-len * 0.3} 0 0Z`} fill="#4c672c" />
        <path d={`M0 -1C${-w * 0.9} ${-len * 0.32} ${-w * 0.8} ${-len * 0.82} 0 ${-len + 2}C${w * 0.5} ${-len * 0.8} ${w * 0.6} ${-len * 0.4} 0 -1Z`} fill="#6c8a40" />
        <path d={`M0 0Q${w * 0.1} ${-len * 0.5} 0 ${-len * 0.92}`} fill="none" stroke="#a03a3a" stroke-width="1.3" />
      </g>
    </g>
  );
}

function Beet({ n }: { n: number }) {
  if (n === 0) return <Mound />;
  const leaves: Array<Array<[number, number, number, number]>> = [
    [],
    [[-32, 12, 5, 2], [30, 13, 5, 2]],
    [[-52, 24, 8, 5], [-18, 30, 9, 6], [16, 29, 9, 6], [48, 23, 8, 5]],
    [[-64, 30, 10, 8], [-36, 38, 12, 9], [-10, 44, 12, 10], [14, 42, 12, 10], [38, 36, 12, 9], [62, 28, 10, 8]],
    [[-74, 32, 10, 9], [-44, 40, 12, 10], [-14, 46, 13, 11], [16, 44, 13, 11], [44, 38, 12, 10], [72, 30, 10, 9]],
  ];
  return (
    <g>
      {leaves[n]!.map(([a, len, w, s]) => (
        <BeetLeaf a={a} len={len} w={w} s={s} />
      ))}
      {n === 3 && <ellipse cx="0" cy="-1" rx="8" ry="4.5" fill="#6e1f2c" stroke={INK} stroke-width="0.7" stroke-opacity="0.5" />}
      {n === 4 && (
        <g>
          <path d="M-14 1Q-15 -15 0 -17Q15 -15 14 1Z" fill="#6e1f2c" stroke={INK} stroke-width="0.8" stroke-opacity="0.6" />
          <path d="M-8 -6Q-7 -13 0 -14" fill="none" stroke="#a8495a" stroke-width="2.2" stroke-linecap="round" />
        </g>
      )}
    </g>
  );
}

// ------------------------------------------------------------------ flax: thin stems, blue flowers, golden bolls
function Flax({ n }: { n: number }) {
  if (n === 0) return <Mound />;
  const stems: Array<Array<[number, number, number]>> = [
    [],
    [[-4, 11, -2], [0, 14, 0], [4, 10, 2]],
    [[-8, 40, -8], [-4, 50, -3], [0, 54, 1], [4, 48, 4], [8, 40, 9]],
    [[-9, 62, -11], [-5, 72, -5], [0, 78, 0], [5, 70, 5], [9, 60, 12]],
    [[-9, 66, -13], [-5, 76, -6], [0, 82, 0], [5, 74, 6], [9, 64, 14]],
  ];
  const ripe = n === 4;
  const color = ripe ? '#b99a4c' : '#7f9a50';
  const set = stems[n]!;
  return (
    <g>
      {set.map(([x, h, lean]) => (
        <g>
          <path d={stem(x, h, lean)} fill="none" stroke={ripe ? '#8a6f35' : '#55703a'} stroke-width="2.6" />
          <path d={stem(x, h, lean)} fill="none" stroke={color} stroke-width="1.4" />
          {n >= 2 &&
            [0.3, 0.5, 0.7].map((t) => {
              const px = x + lean * t * t;
              const py = -h * t;
              return <path d={`M${px} ${py}l${t > 0.45 ? 5 : -5} -6`} stroke={color} stroke-width="1.6" stroke-linecap="round" />;
            })}
          {n === 3 && (
            <g transform={`translate(${x + lean} ${-h})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse cx="0" cy="-3.2" rx="2.2" ry="3" fill="#6f8fc4" transform={`rotate(${a})`} />
              ))}
              <circle r="1.4" fill="#e8e0b0" />
            </g>
          )}
          {ripe && (
            <g>
              <circle cx={x + lean} cy={-h} r="3.4" fill="#c9a65a" stroke="#7d6230" stroke-width="0.9" />
              <circle cx={x + lean * 0.7 - 4} cy={-h * 0.88} r="2.8" fill="#c9a65a" stroke="#7d6230" stroke-width="0.9" />
            </g>
          )}
        </g>
      ))}
    </g>
  );
}

// ------------------------------------------------------------------ pumpkin: lobed leaves on a vine, a flower, the fruit
function lobed(r: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 ? r * 0.72 : r;
    pts.push(`${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr * 0.8).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

function PumpkinLeaf({ x, y, r, old }: { x: number; y: number; r: number; old?: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={lobed(r + 1.5)} fill={old ? '#6a6a2c' : '#3f5a26'} />
      <path d={lobed(r)} fill={old ? '#9a9442' : '#5f7d36'} />
      <path d={`M0 ${r * 0.6}L0 ${-r * 0.6}M0 ${r * 0.3}L${-r * 0.55} ${-r * 0.3}M0 ${r * 0.3}L${r * 0.55} ${-r * 0.3}`} stroke={old ? '#c0b46a' : '#86a356'} stroke-width="1" />
    </g>
  );
}

function Pumpkin({ n }: { n: number }) {
  if (n === 0) return <Mound />;
  if (n === 1)
    return (
      <g>
        <path d="M0 0L0 -8" stroke="#6f8a44" stroke-width="2" />
        <ellipse cx="-6" cy="-10" rx="7" ry="3.6" fill="#6f8f40" transform="rotate(-22 -6 -10)" />
        <ellipse cx="6" cy="-10" rx="7" ry="3.6" fill="#7d9b4a" transform="rotate(22 6 -10)" />
      </g>
    );
  const leaves: Array<Array<[number, number, number]>> = [
    [],
    [],
    [[-18, -12, 12], [14, -16, 13], [-2, -26, 11]],
    [[-28, -12, 15], [24, -14, 16], [-10, -30, 15], [12, -34, 14], [36, -26, 11]],
    [[-32, -12, 15], [30, -16, 16], [-14, -32, 15], [14, -36, 14], [40, -28, 11]],
  ];
  return (
    <g>
      <path d="M-40 -2Q-20 -8 0 -4T40 -6" fill="none" stroke="#5d7432" stroke-width="2.4" />
      {leaves[n]!.map(([x, y, r], i) => (
        <PumpkinLeaf x={x} y={y} r={r} old={n === 4 && i % 2 === 1} />
      ))}
      {n === 3 && (
        <g>
          <g transform="translate(-34 -26)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse cx="0" cy="-4" rx="3.2" ry="4.6" fill="#e0ad3a" transform={`rotate(${a})`} />
            ))}
            <circle r="2" fill="#a9741d" />
          </g>
          <ellipse cx="6" cy="-6" rx="8" ry="6" fill="#7c8f3f" stroke={INK} stroke-width="0.7" stroke-opacity="0.5" />
        </g>
      )}
      {n === 4 && (
        <g transform="translate(4 -16)">
          <ellipse rx="26" ry="18" fill="#b9652a" />
          <ellipse rx="24" ry="17" fill="#cf7d33" />
          <path d="M-8 -16Q-13 0 -8 16M8 -16Q13 0 8 16M0 -17L0 17" fill="none" stroke="#9c521f" stroke-width="1.6" opacity="0.8" />
          <path d="M-18 -8Q-15 -13 -9 -14" fill="none" stroke="#efb36a" stroke-width="2.6" stroke-linecap="round" />
          <path d="M0 -17Q1 -23 5 -25" fill="none" stroke="#6b5a2a" stroke-width="3" stroke-linecap="round" />
        </g>
      )}
    </g>
  );
}

const DRAW: Record<CropLook, (p: { n: number }) => JSX.Element> = {
  garlic: Garlic,
  thyme: Thyme,
  beet: Beet,
  flax: Flax,
  pumpkin: Pumpkin,
};

/** How many plants stand on one bed, and how far apart (a share of the bed's width). */
export const PER_BED: Record<CropLook, { n: number; gap: number }> = {
  garlic: { n: 3, gap: 0.27 },
  thyme: { n: 3, gap: 0.28 },
  beet: { n: 3, gap: 0.28 },
  flax: { n: 4, gap: 0.21 },
  pumpkin: { n: 2, gap: 0.24 },
};

/** One plant of a crop at a stage, with its shadow; its root at (0, 0). */
export function Plant({ look, stage }: { look: CropLook; stage: number }) {
  const url = cropUrl(look, stage);
  if (url) {
    // the drawn plants are about 100 high at 1.7×; the painted canvas is sized to sit the same
    const w = PAINT_W[look] / 1.7;
    const h = w * PAINTED[look]!;
    return <image href={url} x={-w / 2} y={-h + 2} width={w} height={h} />;
  }
  const Draw = DRAW[look];
  return (
    <g>
      <ellipse cx="0" cy="1" rx={stage === 0 ? 10 : look === 'pumpkin' ? 38 : 16} ry="3.5" fill="#000" opacity="0.28" />
      <Draw n={stage} />
    </g>
  );
}

/** The frame each crop fills when grown; a fresh shoot is framed closer, so it can be seen at all. */
const FRAME: Record<CropLook, string> = {
  garlic: '-42 -82 84 88',
  thyme: '-32 -50 64 56',
  beet: '-44 -60 88 66',
  flax: '-36 -90 72 96',
  pumpkin: '-58 -60 116 66',
};

/** A crop drawn on its own, for cards and lists. */
export function PlantPic({ look, stage, class: cls }: { look: CropLook; stage: number; class?: string }) {
  const url = cropUrl(look, stage);
  if (url) return <img class={`plant-pic painted ${cls ?? ''}`} src={url} alt="" aria-hidden="true" draggable={false} />;
  return (
    <svg class={`plant-pic ${cls ?? ''}`} viewBox={stage < 2 ? '-24 -32 48 36' : FRAME[look]} aria-hidden="true">
      <Plant look={look} stage={stage} />
    </svg>
  );
}
