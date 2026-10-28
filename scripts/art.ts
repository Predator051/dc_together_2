// Turns pictures painted for the game into what the client loads (needs ImageMagick's `magick`).
//
//   tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows]
//   tsx scripts/art.ts things <painted.png> <n>
//   tsx scripts/art.ts foes <painted.png> <n>
//   tsx scripts/art.ts ground <painted.png> <scene>
//
// A map sheet is cut into tiles (client/src/art/<sheet>/r<row>c<col>.webp): the client asks only for
// the tiles over explored land. The painting itself is kept, a little compressed, in art-src/ —
// it cannot be painted again the same way.
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
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { SCENES } from '../shared/src/pictures.js';

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
  keep(src, sheet);
  console.log(`${sheet}: ${w}×${h} → ${cols}×${rows} tiles of ${tw}×${th}`);
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

const KINDS: Record<'things' | 'foes', AtlasKind> = {
  things: { cols: 4, rows: 3, cell: 128, prefix: 't' },
  foes: { cols: 3, rows: 3, cell: 192, prefix: 'f' },
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

// ---------------------------------------------------------------------------- grounds

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

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'map' && args[0] && args[1]) map(resolve(args[0]), args[1], Number(args[2] ?? 6), Number(args[3] ?? 4));
else if ((cmd === 'things' || cmd === 'foes') && args[0] && args[1]) atlas(cmd, resolve(args[0]), Number(args[1]));
else if (cmd === 'ground' && args[0] && args[1]) ground(resolve(args[0]), args[1]);
else {
  console.error('usage: tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows] | things|foes <painted.png> <n> | ground <painted.png> <scene>');
  process.exit(1);
}
