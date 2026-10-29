// Paints the ground of a fight as one picture: the place's ground, a bank of sand or mud where it meets the
// water, shallows fading into deep water along an uneven shore, planks laid in a way; then the things on it
// (trees, stones, carts) a little larger than a cell, each with its shadow. The cells stay a grid only for
// the rules; the eye sees a place.
import type { Field, FeatureId } from '../../shared/src/field.js';
import feats from './art/feats.json';
import { texUrl } from './terrain.js';

const PAINTED = feats as unknown as Record<string, [number, number]>;

/** How big a thing is drawn, in cells, and whether it may turn freely. */
const LOOK: Partial<Record<FeatureId, { size: number; spin: boolean }>> = {
  tree: { size: 1.6, spin: true },
  bush: { size: 1.15, spin: true },
  reeds: { size: 1.45, spin: true },
  rock: { size: 1.1, spin: true },
  log: { size: 1.4, spin: false },
  wall: { size: 1.08, spin: false },
  fence: { size: 1.05, spin: false },
  cart: { size: 1.45, spin: false },
  crate: { size: 0.85, spin: false },
  barrel: { size: 0.78, spin: true },
  salt: { size: 1.1, spin: true },
  stump: { size: 0.95, spin: true },
};

/** Which painted ground lies along the water on each kind of field. */
/** Grounds whose water is bog water. */
const MURKY = new Set(['mud']);

const BANK: Record<string, string | null> = { grass: 'sand', sand: null, mud: null, salt: null, dust: 'sand', cobble: 'mud' };

const cache = new Map<string, Promise<HTMLImageElement>>();
function load(url: string): Promise<HTMLImageElement> {
  let p = cache.get(url);
  if (!p) {
    p = new Promise((ok, fail) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = fail;
      img.src = url;
    });
    cache.set(url, p);
  }
  return p;
}

/** Everything a field needs is painted (else the cells keep their ink). */
export function canPaint(f: Field): boolean {
  if (!texUrl(f.ground) || !texUrl('water') || !texUrl('shallow')) return false;
  return f.cells.every((c) => !c || c === 'water' || c === 'shallow' || (c === 'planks' ? !!texUrl('planks') : !!PAINTED[c]));
}

// ----- noise: an uneven shore, the same for the same field ------------------------------

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function noise(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = smooth(x - xi);
  const yf = smooth(y - yi);
  const a = hash(xi, yi, seed);
  const b = hash(xi + 1, yi, seed);
  const c = hash(xi, yi + 1, seed);
  const d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

function rand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * A soft mask over the cells that `has`: blurred, then cut along a wavering line. `grow` above 0 spreads it
 * past its cells (a bank around water), below 0 pulls it in (the deep middle of a pool).
 */
function mask(f: Field, C: number, has: (id: FeatureId) => boolean, grow: number, seed: number): HTMLCanvasElement {
  const W = f.w * C;
  const H = f.h * C;
  const S = 12;
  // a cell's worth of border around, as the edge cells are: water at the edge runs on past it
  const small = canvas((f.w + 2) * S, (f.h + 2) * S);
  const sc = small.getContext('2d')!;
  sc.fillStyle = '#000';
  sc.fillRect(0, 0, small.width, small.height);
  sc.fillStyle = '#fff';
  for (let y = -1; y <= f.h; y++)
    for (let x = -1; x <= f.w; x++) {
      const cx = Math.max(0, Math.min(f.w - 1, x));
      const cy = Math.max(0, Math.min(f.h - 1, y));
      if (has(f.cells[cy * f.w + cx]!)) sc.fillRect((x + 1) * S, (y + 1) * S, S, S);
    }
  const out = canvas(W, H);
  const oc = out.getContext('2d', { willReadFrequently: true })!;
  oc.filter = `blur(${Math.round(C * 0.62)}px)`;
  oc.drawImage(small, -C, -C, W + 2 * C, H + 2 * C);
  oc.filter = 'none';
  const img = oc.getImageData(0, 0, W, H);
  const d = img.data;
  const t = 0.5 - grow * 0.32;
  const k = 1 / C;
  for (let y = 0, i = 0; y < H; y++) {
    for (let x = 0; x < W; x++, i += 4) {
      const n = noise(x * k * 1.3, y * k * 1.3, seed) * 0.7 + noise(x * k * 3.1, y * k * 3.1, seed + 7) * 0.3;
      const v = d[i]! / 255 + (n - 0.5) * 0.34;
      const a = Math.max(0, Math.min(1, (v - (t - 0.05)) / 0.1));
      d[i] = d[i + 1] = d[i + 2] = 255;
      d[i + 3] = Math.round(a * 255);
    }
  }
  oc.putImageData(img, 0, 0);
  return out;
}

/**
 * A painted ground laid over the whole field as one picture (no tiling, so no seam and no repeat), turned
 * and placed by the field's seed so two fields of a place do not share one look.
 */
function layer(img: HTMLImageElement, W: number, H: number, _C: number, _span: number, shift = 0): HTMLCanvasElement {
  const c = canvas(W, H);
  const cx = c.getContext('2d')!;
  const turn = Math.floor(shift * 4) % 4;
  const side = Math.max(W, H) * 1.02;
  cx.translate(W / 2, H / 2);
  cx.rotate((turn * Math.PI) / 2);
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(img, -side / 2, -side / 2, side, side);
  cx.setTransform(1, 0, 0, 1, 0, 0);
  return c;
}

/** Planks repeat as planks do: laid in a pattern, `span` cells to a picture. */
function tiled(img: HTMLImageElement, W: number, H: number, C: number, span: number): HTMLCanvasElement {
  const c = canvas(W, H);
  const cx = c.getContext('2d')!;
  const p = cx.createPattern(img, 'repeat')!;
  const s = (C * span) / img.width;
  p.setTransform(new DOMMatrix().scale(s, s));
  cx.fillStyle = p;
  cx.fillRect(0, 0, W, H);
  return c;
}

function through(src: HTMLCanvasElement, m: HTMLCanvasElement): HTMLCanvasElement {
  const cx = src.getContext('2d')!;
  cx.globalCompositeOperation = 'destination-in';
  cx.drawImage(m, 0, 0);
  cx.globalCompositeOperation = 'source-over';
  return src;
}

/** Paint the field onto the canvas at `cell` CSS pixels a cell. */
export async function paintField(target: HTMLCanvasElement, f: Field, cell: number): Promise<void> {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const C = Math.max(16, Math.round(cell * dpr));
  const W = f.w * C;
  const H = f.h * C;
  const seed = f.seed ?? 7;
  const has = (ids: FeatureId[]) => (id: FeatureId) => ids.includes(id);
  const bankKey = BANK[f.ground] ?? null;
  const [ground, water, shallow, bank, planks, atlas] = await Promise.all([
    load(texUrl(f.ground)!),
    load(texUrl('water')!),
    load(texUrl('shallow')!),
    bankKey && texUrl(bankKey) ? load(texUrl(bankKey)!) : Promise.resolve(null),
    texUrl('planks') ? load(texUrl('planks')!) : Promise.resolve(null),
    load(new URL(`./art/feats/e1.webp`, import.meta.url).href),
  ]);
  const out = canvas(W, H);
  const cx = out.getContext('2d')!;
  // the ground, with darker and lighter patches so it is not one even sheet
  cx.drawImage(layer(ground, W, H, C, 0, (seed % 97) / 97), 0, 0);
  const patches = canvas(f.w * 4, f.h * 4);
  const pc = patches.getContext('2d')!;
  for (let y = 0; y < patches.height; y++)
    for (let x = 0; x < patches.width; x++) {
      const n = noise(x / 3, y / 3, seed + 3);
      pc.fillStyle = n < 0.5 ? `rgba(20,14,8,${(0.5 - n) * 0.5})` : `rgba(255,236,190,${(n - 0.5) * 0.12})`;
      pc.fillRect(x, y, 1, 1);
    }
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(patches, 0, 0, W, H);
  const wet = f.cells.some((c) => c === 'water' || c === 'shallow');
  if (wet) {
    // a bank of sand or mud where the land goes down to the water
    if (bank) cx.drawImage(through(layer(bank, W, H, C, 0, ((seed >> 3) % 89) / 89), mask(f, C, has(['water', 'shallow']), 0.9, seed + 11)), 0, 0);
    // the wet edge darkens the bank
    const damp = mask(f, C, has(['water', 'shallow']), 0.55, seed + 13);
    const dc = canvas(W, H);
    const dcx = dc.getContext('2d')!;
    dcx.fillStyle = 'rgba(40,30,16,0.2)';
    dcx.fillRect(0, 0, W, H);
    cx.drawImage(through(dc, damp), 0, 0);
    // shallows, then the deep water over them, fading at its edge
    const sh = layer(shallow, W, H, C, 0, ((seed >> 5) % 83) / 83);
    // bog water is dark and brown, not clear over pebbles
    if (MURKY.has(f.ground)) {
      const sx = sh.getContext('2d')!;
      sx.fillStyle = 'rgba(46,36,18,0.62)';
      sx.fillRect(0, 0, W, H);
    }
    cx.drawImage(through(sh, mask(f, C, has(['water', 'shallow']), 0.12, seed + 17)), 0, 0);
    if (f.cells.includes('water')) {
      const dl = layer(water, W, H, C, 0, ((seed >> 7) % 79) / 79);
      if (MURKY.has(f.ground)) {
        const dx = dl.getContext('2d')!;
        dx.fillStyle = 'rgba(28,24,12,0.7)';
        dx.fillRect(0, 0, W, H);
      }
      const deep = through(dl, mask(f, C, has(['water']), 0.05, seed + 19));
      cx.globalAlpha = 0.92;
      cx.drawImage(deep, 0, 0);
      cx.globalAlpha = 1;
      const deeper = canvas(W, H);
      const dd = deeper.getContext('2d')!;
      dd.fillStyle = 'rgba(8,16,24,0.35)';
      dd.fillRect(0, 0, W, H);
      cx.drawImage(through(deeper, mask(f, C, has(['water']), -0.55, seed + 23)), 0, 0);
    }
  }
  // planks laid down as a way, with a shadow under them
  if (planks && f.cells.includes('planks')) {
    // the boards lie across the way, as on a causeway
    const pl = canvas(W, H);
    const plx = pl.getContext('2d')!;
    plx.translate(W, 0);
    plx.rotate(Math.PI / 2);
    plx.drawImage(tiled(planks, H, W, C, 2.6), 0, 0);
    plx.setTransform(1, 0, 0, 1, 0, 0);
    const pm = canvas(W, H);
    const pmc = pm.getContext('2d')!;
    pmc.fillStyle = '#fff';
    const pr = rand(seed + 31);
    for (let y = 0; y < f.h; y++)
      for (let x = 0; x < f.w; x++) {
        if (f.cells[y * f.w + x] !== 'planks') continue;
        // each stretch a little uneven, reaching into the next so the way runs on
        const l = (pr() - 0.5) * C * 0.1;
        pmc.beginPath();
        pmc.roundRect(x * C + C * 0.04 + l, y * C - C * 0.06, C * 0.92, C * 1.12, C * 0.08);
        pmc.fill();
      }
    cx.save();
    cx.shadowColor = 'rgba(0,0,0,0.5)';
    cx.shadowBlur = C * 0.12;
    cx.shadowOffsetY = C * 0.05;
    cx.drawImage(through(pl, pm), 0, 0);
    cx.restore();
  }
  // the things, back to front, each a little turned and shifted so no two look set by a ruler
  const r = rand(seed + 29);
  const sprites: Array<{ x: number; y: number; id: FeatureId }> = [];
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    const id = f.cells[y * f.w + x]!;
    if (id && LOOK[id] && PAINTED[id]) sprites.push({ x, y, id });
  }
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= f.w || y >= f.h ? '' : f.cells[y * f.w + x]);
  for (const s of sprites) {
    const look = LOOK[s.id]!;
    const [, i] = PAINTED[s.id]!;
    const cellPx = atlas.width / 4;
    const sx = (i % 4) * cellPx;
    const sy = Math.floor(i / 4) * cellPx;
    const size = C * look.size * (0.92 + r() * 0.16);
    let angle = look.spin ? r() * Math.PI * 2 : (r() - 0.5) * 0.12;
    // walls, fences and logs run along their neighbours
    if (!look.spin && (s.id === 'wall' || s.id === 'fence' || s.id === 'log' || s.id === 'cart')) {
      const upDown = at(s.x, s.y - 1) === s.id || at(s.x, s.y + 1) === s.id;
      const side = at(s.x - 1, s.y) === s.id || at(s.x + 1, s.y) === s.id;
      if (upDown && !side) angle += Math.PI / 2;
      else if (!upDown && !side && s.id !== 'wall' && s.id !== 'fence' && r() < 0.5) angle += Math.PI / 2;
    }
    const jx = look.spin ? (r() - 0.5) * C * 0.14 : 0;
    const jy = look.spin ? (r() - 0.5) * C * 0.14 : 0;
    cx.save();
    cx.translate(s.x * C + C / 2 + jx, s.y * C + C / 2 + jy);
    cx.rotate(angle);
    if (look.spin && r() < 0.5) cx.scale(-1, 1);
    cx.shadowColor = 'rgba(0,0,0,0.45)';
    cx.shadowBlur = C * 0.16;
    cx.shadowOffsetX = C * 0.06;
    cx.shadowOffsetY = C * 0.08;
    cx.drawImage(atlas, sx, sy, cellPx, cellPx, -size / 2, -size / 2, size, size);
    cx.restore();
  }
  // a soft darkening at the edges, as on the map
  const v = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,6,3,0.5)');
  cx.fillStyle = v;
  cx.fillRect(0, 0, W, H);
  target.width = W;
  target.height = H;
  target.getContext('2d')!.drawImage(out, 0, 0);
}
