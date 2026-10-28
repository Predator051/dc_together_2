// Turns pictures painted for the game into what the client loads (needs ImageMagick's `magick`).
//
//   tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows]
//
// A map sheet is cut into tiles (client/src/art/<sheet>/r<row>c<col>.webp): the client asks only for
// the tiles over explored land. The painting itself is kept, a little compressed, in art-src/ —
// it cannot be painted again the same way.
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function magick(...args: string[]): string {
  return execFileSync('magick', args, { encoding: 'utf8' }).trim();
}

function map(src: string, sheet: string, cols: number, rows: number): void {
  const [w, h] = magick('identify', '-format', '%w %h', src).split(' ').map(Number) as [number, number];
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
  mkdirSync(join(ROOT, 'art-src'), { recursive: true });
  magick(src, '-strip', '-quality', '92', join(ROOT, 'art-src', `${sheet}.webp`));
  console.log(`${sheet}: ${w}×${h} → ${cols}×${rows} tiles of ${tw}×${th}`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'map' && args[0] && args[1]) map(resolve(args[0]), args[1], Number(args[2] ?? 6), Number(args[3] ?? 4));
else {
  console.error('usage: tsx scripts/art.ts map <painted.png> <sheet> [cols] [rows]');
  process.exit(1);
}
