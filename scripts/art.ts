// Turns pictures painted for the game into what the client loads (needs ImageMagick's `magick`).
//
//   tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows]
//   tsx scripts/art.ts things <painted.png> <n>
//   tsx scripts/art.ts foes <painted.png> <n>
//   tsx scripts/art.ts marks <painted.png> <n>
//   tsx scripts/art.ts ground <painted.png> <scene>
//   tsx scripts/art.ts view <painted.png> <scene|hearth1|hearth2>
//   tsx scripts/art.ts hero <painted.png> <maker-m|hunter-f|…>
//   tsx scripts/art.ts stations <painted.png> <n>
//   tsx scripts/art.ts folk <painted.png> <n> [crop]
//
// A map sheet is cut into tiles (client/src/art/<sheet>/r<row>c<col>.webp): the client asks only for
// the tiles over explored land; a small preview.webp stands in for each until it comes. The painting
// itself is kept, a little compressed, in art-src/ — it cannot be painted again the same way.
//
// A sheet of things is painted as a 4×3 grid on a transparent (or flat) ground. Each thing is found by
// its outline, centred in a square and put into an atlas of 128 px cells (client/src/art/things/t<n>.webp).
// Which thing is in which cell comes from .design/art/things.json (sheet n, row by row) and is written
// to client/src/art/things.json; file names say nothing about the things themselves.
// Portraits of foes go the same way (3×3 sheets, 192 px cells, client/src/art/foes/f<n>.webp).
//
// A ground is the painted plan of a place: a square painting cut to the plan's 8:7 and saved as
// client/src/art/grounds/g<i>.webp, i — the scene's number in SCENES; the painted scenes are listed
// in client/src/art/grounds.json.
//
// A view is a place seen at eye level (the head of a scene there, the card of the place on the map):
// a wide strip cut from the middle, client/src/art/views/w<i>.webp, i — the key's number in VIEWS;
// the painted keys are listed in client/src/art/views.json.
//
// A hero is painted at full height on a magenta ground: the figure (client/src/art/heroes/p<i>.webp,
// for the gear screen) and the face cut from the same painting (q<i>.webp), i — the key's number in
// HEROES; the painted keys are listed in client/src/art/heroes.json.
//
// A sheet of stations is four close views of workplaces in a 2×2 grid (order: .design/art/stations.json,
// sheet n); each quarter becomes client/src/art/stations/s<i>.webp, i — the spot icon's number in
// SPOT_ICONS; the painted ones are listed in client/src/art/stations.json.
//
// A sheet of folk is four faces of residents in a 2×2 grid (order: .design/art/folk.json, sheet n; keys
// not in FOLK are spares and dropped); the middle `crop` (0.8 by default) of each quarter becomes
// client/src/art/folk/f<i>.webp, i — the resident's number in FOLK; the painted ones are listed in
// client/src/art/folk.json.
//
// A sheet of feats is 4×3 things on the ground of a fight seen from above (trees, stones, carts…), cut
// like things (160 px cells, client/src/art/feats/e<n>.webp, order .design/art/feats.json).
// A sheet of tex is 3×3 square grounds painted edge to edge (see `textures`).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { FOLK, HEROES, SCENES, SPOT_ICONS, VIEWS } from '../shared/src/pictures.js';

const ROOT = resolve(import.meta.dirname, '..');

function magick(...args: string[]): string {
  return execFileSync('magick', args, { encoding: 'utf8' }).trim();
}

function sizeOf(src: string): [number, number] {
  return magick('identify', '-format', '%w %h', src).split(' ').map(Number) as [number, number];
}

function keep(src: string, name: string): void {
  mkdirSync(join(ROOT, 'art-src'), { recursive: true });
  magick(src, '-strip', '-quality', '92', join(ROOT, 'art-src', `${name}.webp`));
}

function map(src: string, sheet: string, cols: number, rows: number): void {
  const [w, h] = sizeOf(src);
  if (w % cols || h % rows) throw new Error(`${w}×${h} does not split into ${cols}×${rows} tiles`);
  const tw = w / cols;
  const th = h / rows;
  const out = join(ROOT, 'client/src/art', sheet);
  mkdirSync(out, { recursive: true });
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      magick(src, '-crop', `${tw}x${th}+${c * tw}+${r * th}`, '+repage', '-strip', '-quality', '80', '-define', 'webp:method=6', join(out, `r${r}c${c}.webp`));
    }
  }
  // a small blurry copy stands in for a tile until the tile itself comes
  magick(src, '-resize', '384x', '-strip', '-quality', '50', '-define', 'webp:method=6', join(out, 'preview.webp'));
  keep(src, sheet);
  console.log(`${sheet}: ${w}×${h} → ${cols}×${rows} tiles of ${tw}×${th}, and a preview`);
}

// ---------------------------------------------------------------------------- things

/** How a kind of sheet is laid out and where its atlas goes. */
interface AtlasKind {
  cols: number;
  rows: number;
  cell: number;
  /** Atlas file prefix in client/src/art/<kind>/. */
  prefix: string;
}

const KINDS: Record<'things' | 'foes' | 'marks' | 'feats', AtlasKind> = {
  things: { cols: 4, rows: 3, cell: 128, prefix: 't' },
  // things on the ground of a fight, seen from above
  feats: { cols: 4, rows: 3, cell: 160, prefix: 'e' },
  foes: { cols: 3, rows: 3, cell: 192, prefix: 'f' },
  // marks of spots on plans and of places on the map ('@' + scene)
  marks: { cols: 4, rows: 3, cell: 128, prefix: 'm' },
};

/** A painting without real transparency: the flat ground around the things is wiped from the edges in. */
function clearGround(px: Buffer, w: number, h: number): boolean {
  let clear = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i]! < 250) clear++;
  if (clear > w * h * 0.1) return false;
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  // the ground may be one colour or a painted checkerboard of two: every colour common along the edge
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (const i of border) {
    const r = px[i * 4]!;
    const g = px[i * 4 + 1]!;
    const b = px[i * 4 + 2]!;
    const k = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const e = buckets.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    e.n++;
    e.r += r;
    e.g += g;
    e.b += b;
    buckets.set(k, e);
  }
  const grounds = [...buckets.values()].filter((e) => e.n >= border.length * 0.08).map((e) => [e.r / e.n, e.g / e.n, e.b / e.n] as const);
  const dist = (i: number) =>
    Math.min(...grounds.map(([r, g, b]) => Math.hypot(px[i * 4]! - r, px[i * 4 + 1]! - g, px[i * 4 + 2]! - b)));
  // a magenta key (painted on purpose): it is wiped everywhere, even where the ground shows through a coil,
  // and its tint is taken off the edges
  const key = grounds.find(([r, g, b]) => r > 190 && b > 190 && g < 90);
  if (key) {
    for (let i = 0; i < w * h; i++) {
      const d = Math.hypot(px[i * 4]! - key[0], px[i * 4 + 1]! - key[1], px[i * 4 + 2]! - key[2]);
      if (d < 110) px[i * 4 + 3] = 0;
      else if (d < 190) px[i * 4 + 3] = Math.min(px[i * 4 + 3]!, Math.round(((d - 110) / 80) * 255));
      const spill = Math.min(px[i * 4]!, px[i * 4 + 2]!) - px[i * 4 + 1]!;
      if (d < 280 && spill > 12) {
        px[i * 4] = Math.max(0, px[i * 4]! - spill * 0.9);
        px[i * 4 + 2] = Math.max(0, px[i * 4 + 2]! - spill * 0.9);
      }
    }
    return true;
  }
  const seen = new Uint8Array(w * h);
  const stack = border.filter((i) => dist(i) < 40);
  for (const i of stack) seen[i] = 1;
  while (stack.length) {
    const i = stack.pop()!;
    px[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i / w) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (seen[j]) continue;
      seen[j] = 1;
      const d = dist(j);
      if (d < 40) stack.push(j);
      // the soft rim of a thing: half see-through
      else if (d < 72) px[j * 4 + 3] = Math.round(((d - 40) / 32) * 255);
    }
  }
  return true;
}

/** The box around everything painted in each cell (by where each blot's middle falls). */
function cellBoxes(px: Buffer, w: number, h: number, cols: number, rows: number): Array<[number, number, number, number] | null> {
  // a haze of nearly see-through pixels around the things would show as dirt on the dark page
  for (let i = 3; i < px.length; i += 4) if (px[i]! < 40) px[i] = 0;
  const label = new Int32Array(w * h).fill(-1);
  const boxes: Array<[number, number, number, number] | null> = Array.from({ length: cols * rows }, () => null);
  const solid = (i: number) => px[i * 4 + 3]! > 32;
  let id = 0;
  for (let start = 0; start < w * h; start++) {
    if (label[start]! >= 0 || !solid(start)) continue;
    const stack = [start];
    const blot: number[] = [];
    label[start] = id;
    let n = 0;
    let sx = 0;
    let sy = 0;
    let x0 = w;
    let y0 = h;
    let x1 = 0;
    let y1 = 0;
    while (stack.length) {
      const i = stack.pop()!;
      const x = i % w;
      const y = (i / w) | 0;
      blot.push(i);
      n++;
      sx += x;
      sy += y;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (label[j]! >= 0 || !solid(j)) continue;
          label[j] = id;
          stack.push(j);
        }
      }
    }
    id++;
    // specks of paint between the things are wiped, not kept
    if (n < 150) {
      for (const i of blot) px[i * 4 + 3] = 0;
      continue;
    }
    const c = Math.min(cols - 1, Math.floor((sx / n / w) * cols));
    const r = Math.min(rows - 1, Math.floor((sy / n / h) * rows));
    const k = r * cols + c;
    const b = boxes[k];
    boxes[k] = b ? [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1), Math.max(b[3], y1)] : [x0, y0, x1, y1];
  }
  return boxes;
}

function atlas(kind: keyof typeof KINDS, src: string, n: number): void {
  const { cols, rows, cell, prefix } = KINDS[kind];
  const order = JSON.parse(readFileSync(join(ROOT, `.design/art/${kind}.json`), 'utf8')) as Array<Array<[string, string]>>;
  const keys = (order[n - 1] ?? []).map(([k]) => k);
  if (!keys.length) throw new Error(`no sheet ${n} in .design/art/${kind}.json`);
  const [w, h] = sizeOf(src);
  const px = execFileSync('magick', [src, '-depth', '8', 'RGBA:-'], { maxBuffer: 64 << 20 });
  const wiped = clearGround(px, w, h);
  const boxes = cellBoxes(px, w, h, cols, rows);
  const tmp = mkdtempSync(join(tmpdir(), `${kind}-`));
  const clean = join(tmp, 'clean.png');
  execFileSync('magick', ['-size', `${w}x${h}`, '-depth', '8', 'RGBA:-', clean], { input: px });
  const cells: string[] = [];
  const missing: string[] = [];
  boxes.forEach((b, i) => {
    const f = join(tmp, `${String(i).padStart(2, '0')}_${keys[i] || 'none'}.png`);
    if (!b || !keys[i]) {
      if (keys[i]) missing.push(keys[i]!);
      magick('-size', `${cell}x${cell}`, 'xc:none', f);
    } else {
      const bw = b[2] - b[0] + 1;
      const bh = b[3] - b[1] + 1;
      const side = Math.round(Math.max(bw, bh) * 1.08);
      magick(clean, '-crop', `${bw}x${bh}+${b[0]}+${b[1]}`, '+repage', '-background', 'none', '-gravity', 'center', '-extent', `${side}x${side}`, '-filter', 'Lanczos', '-resize', `${cell}x${cell}`, f);
    }
    cells.push(f);
  });
  const outDir = join(ROOT, 'client/src/art', kind);
  mkdirSync(outDir, { recursive: true });
  magick('montage', ...cells, '-tile', `${cols}x${rows}`, '-geometry', `${cell}x${cell}+0+0`, '-background', 'none', '-quality', '82', '-define', 'webp:alpha-quality=90', join(outDir, `${prefix}${n}.webp`));
  // a check sheet for the eye: every cell with the name it was given
  const check = join(tmp, 'check.jpg');
  magick('montage', '-label', '%t', ...cells, '-tile', `${cols}x${rows}`, '-geometry', `${cell}x${cell}+6+6`, '-background', '#3a3026', '-fill', '#e6d9bc', check);
  const manifestPath = join(ROOT, `client/src/art/${kind}.json`);
  const manifest = (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}) as Record<string, [number, number]>;
  keys.forEach((k, i) => {
    if (k && boxes[i]) manifest[k] = [n, i];
  });
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(manifestPath, JSON.stringify(sorted, null, 1).replace(/\[\n\s+(\d+),\n\s+(\d+)\n\s+\]/g, '[$1, $2]') + '\n');
  keep(src, `${kind}${n}`);
  console.log(`${kind} ${n}: ${wiped ? 'flat ground wiped' : 'transparent'}, ${keys.filter(Boolean).length - missing.length} placed${missing.length ? `, missing: ${missing.join(' ')}` : ''}`);
  console.log(`check: ${check}`);
}

// ---------------------------------------------------------------------------- grounds and views


function view(src: string, key: string): void {
  const i = (VIEWS as readonly string[]).indexOf(key) + 1;
  if (!i) throw new Error(`no view ${key}`);
  const [w, h] = sizeOf(src);
  const ch = Math.round(w / 2.4);
  const outDir = join(ROOT, 'client/src/art/views');
  mkdirSync(outDir, { recursive: true });
  // the strip sits a little above the middle, where the horizon was asked to be
  const top = Math.max(0, Math.round((h - ch) * 0.42));
  magick(src, '-crop', `${w}x${ch}+0+${top}`, '+repage', '-resize', '1200x500', '-strip', '-quality', '78', '-define', 'webp:method=6', join(outDir, `w${i}.webp`));
  const listPath = join(ROOT, 'client/src/art/views.json');
  const list = new Set<string>(existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : []);
  list.add(key);
  writeFileSync(listPath, JSON.stringify([...list].sort()) + '\n');
  keep(src, `view${i}`);
  console.log(`view ${key}: ${w}×${h} → w${i}.webp`);
}

function ground(src: string, scene: string): void {
  const i = (SCENES as readonly string[]).indexOf(scene) + 1;
  if (!i) throw new Error(`no scene ${scene}`);
  const [w, h] = sizeOf(src);
  const ch = Math.round((w * 7) / 8);
  const outDir = join(ROOT, 'client/src/art/grounds');
  mkdirSync(outDir, { recursive: true });
  magick(src, '-gravity', 'center', '-crop', `${w}x${Math.min(h, ch)}+0+0`, '+repage', '-resize', '960x840', '-strip', '-quality', '78', '-define', 'webp:method=6', join(outDir, `g${i}.webp`));
  const listPath = join(ROOT, 'client/src/art/grounds.json');
  const list = new Set<string>(existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : []);
  list.add(scene);
  writeFileSync(listPath, JSON.stringify([...list].sort()) + '\n');
  keep(src, `ground${i}`);
  console.log(`ground ${scene}: ${w}×${h} → g${i}.webp`);
}

// ---------------------------------------------------------------------------- heroes

function hero(src: string, key: string): void {
  const i = (HEROES as readonly string[]).indexOf(key) + 1;
  if (!i) throw new Error(`no hero look ${key}`);
  const [w, h] = sizeOf(src);
  const px = execFileSync('magick', [src, '-depth', '8', 'RGBA:-'], { maxBuffer: 64 << 20 });
  clearGround(px, w, h);
  const [box] = cellBoxes(px, w, h, 1, 1);
  if (!box) throw new Error('no figure found');
  const tmp = mkdtempSync(join(tmpdir(), 'hero-'));
  const clean = join(tmp, 'clean.png');
  execFileSync('magick', ['-size', `${w}x${h}`, '-depth', '8', 'RGBA:-', clean], { input: px });
  const outDir = join(ROOT, 'client/src/art/heroes');
  mkdirSync(outDir, { recursive: true });
  const [x0, y0, x1, y1] = box;
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;
  // the figure stands in a 1:2 box, feet on its floor
  const fh = Math.round(bh * 1.03);
  const fw = Math.max(bw, Math.round(fh / 2));
  magick(clean, '-crop', `${bw}x${bh}+${x0}+${y0}`, '+repage', '-background', 'none', '-gravity', 'south', '-extent', `${fw}x${fh}`, '-resize', '400x800', '-quality', '84', '-define', 'webp:alpha-quality=90', join(outDir, `p${i}.webp`));
  // the face: head and shoulders, centred on where the head is
  const headRows = Math.round(bh * 0.1);
  let sx = 0;
  let n = 0;
  for (let y = y0; y < y0 + headRows; y++) for (let x = x0; x <= x1; x++) if (px[(y * w + x) * 4 + 3]! > 128) (sx += x), n++;
  const cx = n ? Math.round(sx / n) : Math.round((x0 + x1) / 2);
  const side = Math.round(bh * 0.27);
  const fx = Math.max(0, Math.min(w - side, cx - Math.round(side / 2)));
  const fy = Math.max(0, y0 - Math.round(bh * 0.015));
  magick(clean, '-crop', `${side}x${side}+${fx}+${fy}`, '+repage', '-background', 'none', '-gravity', 'center', '-extent', `${side}x${side}`, '-resize', '256x256', '-quality', '86', '-define', 'webp:alpha-quality=90', join(outDir, `q${i}.webp`));
  const listPath = join(ROOT, 'client/src/art/heroes.json');
  const list = new Set<string>(existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : []);
  list.add(key);
  writeFileSync(listPath, JSON.stringify([...list].sort()) + '\n');
  keep(src, `hero${i}`);
  console.log(`hero ${key}: figure ${bw}×${bh} → p${i}.webp, face → q${i}.webp`);
}

// ---------------------------------------------------------------------------- stations

function stations(src: string, n: number): void {
  const order = JSON.parse(readFileSync(join(ROOT, '.design/art/stations.json'), 'utf8')) as Array<Array<[string, string]>>;
  const keys = (order[n - 1] ?? []).map(([k]) => k);
  if (keys.length !== 4) throw new Error(`no sheet ${n} of four in .design/art/stations.json`);
  const [w, h] = sizeOf(src);
  const qw = Math.floor(w / 2);
  const qh = Math.floor(h / 2);
  // a little in from each quarter's edges, past the gutters between the paintings
  const inset = Math.round(Math.min(qw, qh) * 0.035);
  const outDir = join(ROOT, 'client/src/art/stations');
  mkdirSync(outDir, { recursive: true });
  const listPath = join(ROOT, 'client/src/art/stations.json');
  const list = new Set<string>(existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : []);
  keys.forEach((k, q) => {
    const i = (SPOT_ICONS as readonly string[]).indexOf(k) + 1;
    if (!i) throw new Error(`no spot icon ${k}`);
    const x = (q % 2) * qw + inset;
    const y = Math.floor(q / 2) * qh + inset;
    magick(src, '-crop', `${qw - 2 * inset}x${qh - 2 * inset}+${x}+${y}`, '+repage', '-resize', '720x480^', '-gravity', 'center', '-extent', '720x480', '-strip', '-quality', '76', '-define', 'webp:method=6', join(outDir, `s${i}.webp`));
    list.add(k);
  });
  writeFileSync(listPath, JSON.stringify([...list].sort()) + '\n');
  keep(src, `stations${n}`);
  console.log(`stations ${n}: ${keys.join(' ')}`);
}

// ---------------------------------------------------------------------------- folk

function folk(src: string, n: number, crop: number): void {
  const order = JSON.parse(readFileSync(join(ROOT, '.design/art/folk.json'), 'utf8')) as Array<Array<[string, string]>>;
  const keys = (order[n - 1] ?? []).map(([k]) => k);
  if (keys.length !== 4) throw new Error(`no sheet ${n} of four in .design/art/folk.json`);
  const [w, h] = sizeOf(src);
  const qw = Math.floor(w / 2);
  const qh = Math.floor(h / 2);
  const side = Math.round(Math.min(qw, qh) * crop);
  const outDir = join(ROOT, 'client/src/art/folk');
  mkdirSync(outDir, { recursive: true });
  const listPath = join(ROOT, 'client/src/art/folk.json');
  const list = new Set<string>(existsSync(listPath) ? JSON.parse(readFileSync(listPath, 'utf8')) : []);
  const made: string[] = [];
  keys.forEach((k, q) => {
    const i = (FOLK as readonly string[]).indexOf(k) + 1;
    if (!i) return;
    const x = (q % 2) * qw + Math.round((qw - side) / 2);
    const y = Math.floor(q / 2) * qh + Math.round((qh - side) / 2);
    magick(src, '-crop', `${side}x${side}+${x}+${y}`, '+repage', '-resize', '256x256', '-strip', '-quality', '84', '-define', 'webp:method=6', join(outDir, `f${i}.webp`));
    list.add(k);
    made.push(`f${i}`);
  });
  writeFileSync(listPath, JSON.stringify([...list].sort()) + '\n');
  keep(src, `folk${n}`);
  console.log(`folk ${n}: ${made.join(' ')}`);
}

/**
 * Grounds of fights: a 3×3 sheet of square textures painted edge to edge (grass, sand, water…). Each ninth
 * (a little inset, so no seam shows) becomes client/src/art/tex/x<i>.webp; which is which comes from
 * .design/art/tex.json (sheet n, row by row) and goes to client/src/art/tex.json (key → file number).
 */
function textures(src: string, n: number): void {
  const order = JSON.parse(readFileSync(join(ROOT, '.design/art/tex.json'), 'utf8')) as Array<Array<[string, string]>>;
  const keys = (order[n - 1] ?? []).map(([k]) => k);
  if (!keys.length) throw new Error(`no sheet ${n} in .design/art/tex.json`);
  const [w, h] = sizeOf(src);
  const cw = Math.floor(w / 3);
  const ch = Math.floor(h / 3);
  const inset = Math.round(Math.min(cw, ch) * 0.04);
  const outDir = join(ROOT, 'client/src/art/tex');
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(ROOT, 'client/src/art/tex.json');
  const manifest = (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}) as Record<string, number>;
  let next = Math.max(0, ...Object.values(manifest)) + 1;
  keys.forEach((k, i) => {
    if (!k) return;
    const x = (i % 3) * cw + inset;
    const y = Math.floor(i / 3) * ch + inset;
    const file = manifest[k] ?? next++;
    magick(src, '-crop', `${cw - 2 * inset}x${ch - 2 * inset}+${x}+${y}`, '+repage', '-filter', 'Lanczos', '-resize', '448x448!', '-quality', '80', join(outDir, `x${file}.webp`));
    manifest[k] = file;
  });
  writeFileSync(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
  keep(src, `tex${n}`);
  console.log(`tex ${n}: ${keys.filter(Boolean).join(' ')}`);
}

/**
 * A portrait of one of the heroes' own (the hunter's dog): painted alone on a transparent ground, the figure
 * cut by its outline, centred in a square, client/src/art/allies/a<i>.webp at 192 px; key into allies.json.
 */
function ally(src: string, key: string): void {
  const outDir = join(ROOT, 'client/src/art/allies');
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(ROOT, 'client/src/art/allies.json');
  const manifest = (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}) as Record<string, number>;
  const file = manifest[key] ?? Math.max(0, ...Object.values(manifest)) + 1;
  const box = magick(src, '-alpha', 'extract', '-threshold', '40%', '-format', '%@', 'info:').trim();
  const m = /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(box);
  if (!m) throw new Error(`no figure found in ${src} (${box})`);
  const side = Math.round(Math.max(Number(m[1]), Number(m[2])) * 1.06);
  magick(src, '-crop', box, '+repage', '-background', 'none', '-gravity', 'center', '-extent', `${side}x${side}`, '-filter', 'Lanczos', '-resize', '192x192', '-quality', '85', '-define', 'webp:alpha-quality=90', join(outDir, `a${file}.webp`));
  manifest[key] = file;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 1) + '\n');
  keep(src, `ally-${key}`);
  console.log(`ally ${key}: a${file}.webp`);
}

/** One ground painted alone at full size: client/src/art/tex/x<i>.webp at 1024 px, key into tex.json. */
function texture(src: string, key: string): void {
  const outDir = join(ROOT, 'client/src/art/tex');
  mkdirSync(outDir, { recursive: true });
  const manifestPath = join(ROOT, 'client/src/art/tex.json');
  const manifest = (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}) as Record<string, number>;
  const file = manifest[key] ?? Math.max(0, ...Object.values(manifest)) + 1;
  const [w, h] = sizeOf(src);
  const side = Math.min(w, h);
  magick(src, '-gravity', 'center', '-crop', `${side}x${side}+0+0`, '+repage', '-filter', 'Lanczos', '-resize', '1024x1024', '-quality', '78', join(outDir, `x${file}.webp`));
  manifest[key] = file;
  writeFileSync(manifestPath, JSON.stringify(Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b))), null, 1) + '\n');
  keep(src, `tex-${key}`);
  console.log(`tex ${key}: x${file}.webp`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'map' && args[0] && args[1]) map(resolve(args[0]), args[1], Number(args[2] ?? 6), Number(args[3] ?? 4));
else if ((cmd === 'things' || cmd === 'foes' || cmd === 'marks' || cmd === 'feats') && args[0] && args[1]) atlas(cmd, resolve(args[0]), Number(args[1]));
else if (cmd === 'tex' && args[0] && args[1] && /^\d+$/.test(args[1])) textures(resolve(args[0]), Number(args[1]));
else if (cmd === 'tex' && args[0] && args[1]) texture(resolve(args[0]), args[1]);
else if (cmd === 'ground' && args[0] && args[1]) ground(resolve(args[0]), args[1]);
else if (cmd === 'view' && args[0] && args[1]) view(resolve(args[0]), args[1]);
else if (cmd === 'hero' && args[0] && args[1]) hero(resolve(args[0]), args[1]);
else if (cmd === 'stations' && args[0] && args[1]) stations(resolve(args[0]), Number(args[1]));
else if (cmd === 'folk' && args[0] && args[1]) folk(resolve(args[0]), Number(args[1]), Number(args[2] ?? 0.8));
else if (cmd === 'ally' && args[0] && args[1]) ally(resolve(args[0]), args[1]);
else {
  console.error('usage: tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows] | things|foes|marks <painted.png> <n> | ground <painted.png> <scene> | view <painted.png> <key> | hero <painted.png> <role-gender> | stations <painted.png> <n> | folk <painted.png> <n> [crop] | feats <painted.png> <n> | tex <painted.png> <n|key> | ally <painted.png> <key>');
  process.exit(1);
}
