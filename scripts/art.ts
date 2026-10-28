// Turns pictures painted for the game into what the client loads (needs ImageMagick's `magick`).
//
//   tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows]
//   tsx scripts/art.ts things <painted.png> <n>
//
// A map sheet is cut into tiles (client/src/art/<sheet>/r<row>c<col>.webp): the client asks only for
// the tiles over explored land. The painting itself is kept, a little compressed, in art-src/ —
// it cannot be painted again the same way.
//
// A sheet of things is painted as a 4×3 grid on a transparent (or flat) ground. Each thing is found by
// its outline, centred in a square and put into an atlas of 128 px cells (client/src/art/things/t<n>.webp).
// Which thing is in which cell comes from .design/art/things.json (sheet n, row by row) and is written
// to client/src/art/things.json; file names say nothing about the things themselves.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

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

const CELL = 128;
const COLS = 4;
const ROWS = 3;

/** A painting without real transparency: the flat ground around the things is wiped from the edges in. */
function clearGround(px: Buffer, w: number, h: number): boolean {
  let clear = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i]! < 250) clear++;
  if (clear > w * h * 0.1) return false;
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const med = (k: number) => {
    const v = border.map((i) => px[i * 4 + k]!).sort((a, b) => a - b);
    return v[v.length >> 1]!;
  };
  const bg = [med(0), med(1), med(2)];
  const dist = (i: number) => Math.hypot(px[i * 4]! - bg[0]!, px[i * 4 + 1]! - bg[1]!, px[i * 4 + 2]! - bg[2]!);
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
function cellBoxes(px: Buffer, w: number, h: number): Array<[number, number, number, number] | null> {
  // a haze of nearly see-through pixels around the things would show as dirt on the dark page
  for (let i = 3; i < px.length; i += 4) if (px[i]! < 40) px[i] = 0;
  const label = new Int32Array(w * h).fill(-1);
  const boxes: Array<[number, number, number, number] | null> = Array.from({ length: COLS * ROWS }, () => null);
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
    const c = Math.min(COLS - 1, Math.floor((sx / n / w) * COLS));
    const r = Math.min(ROWS - 1, Math.floor((sy / n / h) * ROWS));
    const k = r * COLS + c;
    const b = boxes[k];
    boxes[k] = b ? [Math.min(b[0], x0), Math.min(b[1], y0), Math.max(b[2], x1), Math.max(b[3], y1)] : [x0, y0, x1, y1];
  }
  return boxes;
}

function things(src: string, n: number): void {
  const order = JSON.parse(readFileSync(join(ROOT, '.design/art/things.json'), 'utf8')) as Array<Array<[string, string]>>;
  const keys = (order[n - 1] ?? []).map(([k]) => k);
  if (!keys.length) throw new Error(`no sheet ${n} in .design/art/things.json`);
  const [w, h] = sizeOf(src);
  const px = execFileSync('magick', [src, '-depth', '8', 'RGBA:-'], { maxBuffer: 64 << 20 });
  const wiped = clearGround(px, w, h);
  const boxes = cellBoxes(px, w, h);
  const tmp = mkdtempSync(join(tmpdir(), 'things-'));
  const clean = join(tmp, 'clean.png');
  execFileSync('magick', ['-size', `${w}x${h}`, '-depth', '8', 'RGBA:-', clean], { input: px });
  const cells: string[] = [];
  const missing: string[] = [];
  boxes.forEach((b, i) => {
    const f = join(tmp, `${String(i).padStart(2, '0')}_${keys[i] || 'none'}.png`);
    if (!b || !keys[i]) {
      if (keys[i]) missing.push(keys[i]!);
      magick('-size', `${CELL}x${CELL}`, 'xc:none', f);
    } else {
      const bw = b[2] - b[0] + 1;
      const bh = b[3] - b[1] + 1;
      const side = Math.round(Math.max(bw, bh) * 1.08);
      magick(clean, '-crop', `${bw}x${bh}+${b[0]}+${b[1]}`, '+repage', '-background', 'none', '-gravity', 'center', '-extent', `${side}x${side}`, '-filter', 'Lanczos', '-resize', `${CELL}x${CELL}`, f);
    }
    cells.push(f);
  });
  const outDir = join(ROOT, 'client/src/art/things');
  mkdirSync(outDir, { recursive: true });
  magick('montage', ...cells, '-tile', `${COLS}x${ROWS}`, '-geometry', `${CELL}x${CELL}+0+0`, '-background', 'none', '-quality', '82', '-define', 'webp:alpha-quality=90', join(outDir, `t${n}.webp`));
  // a check sheet for the eye: every cell with the name it was given
  const check = join(tmp, 'check.jpg');
  magick('montage', '-label', '%t', ...cells, '-tile', `${COLS}x${ROWS}`, '-geometry', `${CELL}x${CELL}+6+6`, '-background', '#3a3026', '-fill', '#e6d9bc', check);
  const manifestPath = join(ROOT, 'client/src/art/things.json');
  const manifest = (existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {}) as Record<string, [number, number]>;
  keys.forEach((k, i) => {
    if (k && boxes[i]) manifest[k] = [n, i];
  });
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(manifestPath, JSON.stringify(sorted, null, 1).replace(/\[\n\s+(\d+),\n\s+(\d+)\n\s+\]/g, '[$1, $2]') + '\n');
  keep(src, `things${n}`);
  console.log(`things ${n}: ${wiped ? 'flat ground wiped' : 'transparent'}, ${keys.filter(Boolean).length - missing.length} placed${missing.length ? `, missing: ${missing.join(' ')}` : ''}`);
  console.log(`check: ${check}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'map' && args[0] && args[1]) map(resolve(args[0]), args[1], Number(args[2] ?? 6), Number(args[3] ?? 4));
else if (cmd === 'things' && args[0] && args[1]) things(resolve(args[0]), Number(args[1]));
else {
  console.error('usage: tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows] | things <painted.png> <n>');
  process.exit(1);
}
