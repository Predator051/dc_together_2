// The ground of a fight: a grid of cells, each with something on it or nothing. Pure functions shared by
// the server (rules, foes' minds), the client (what to light up) and the bots.

export type Cell = [number, number];

/** What can stand on a cell. '' is open ground. */
export type FeatureId =
  | ''
  | 'water'
  | 'shallow'
  | 'reeds'
  | 'bush'
  | 'tree'
  | 'rock'
  | 'log'
  | 'wall'
  | 'fence'
  | 'cart'
  | 'crate'
  | 'barrel'
  | 'salt'
  | 'stump'
  | 'planks';

export interface FeatureDef {
  /** Price of a step onto it (null: cannot be walked onto). */
  step: number | null;
  /** Hides what is behind it. */
  sight: boolean;
  /** Cover for one behind it (0 none, 1 light, 2 sound). */
  cover: 0 | 1 | 2;
  /** Cover for one standing in it (reeds, a bush). */
  inside?: number;
  /** Wet underfoot (a little harder to hit from). */
  wet?: boolean;
  /** Swimmers live here. */
  deep?: boolean;
}

export const FEATURES: Record<FeatureId, FeatureDef> = {
  '': { step: 1, sight: false, cover: 0 },
  water: { step: null, sight: false, cover: 0, deep: true },
  shallow: { step: 2, sight: false, cover: 0, wet: true },
  reeds: { step: 2, sight: false, cover: 1, inside: 0.15 },
  bush: { step: 2, sight: false, cover: 1, inside: 0.15 },
  tree: { step: null, sight: true, cover: 2 },
  rock: { step: null, sight: true, cover: 2 },
  log: { step: null, sight: false, cover: 2 },
  wall: { step: null, sight: true, cover: 2 },
  fence: { step: null, sight: false, cover: 1 },
  cart: { step: null, sight: false, cover: 2 },
  crate: { step: null, sight: false, cover: 2 },
  barrel: { step: null, sight: false, cover: 2 },
  salt: { step: null, sight: false, cover: 1 },
  stump: { step: null, sight: false, cover: 1 },
  planks: { step: 1, sight: false, cover: 0 },
};

export interface Field {
  w: number;
  h: number;
  /** Look of the open ground (grass, sand, salt, mud, dust, cobble). */
  ground: string;
  /** Row by row, w·h features. */
  cells: FeatureId[];
  /** For painting it: the same field always looks the same. */
  seed?: number;
}

export const FIELD_W = 7;
export const FIELD_H = 8;

export function inside(f: Field, [x, y]: Cell): boolean {
  return x >= 0 && y >= 0 && x < f.w && y < f.h;
}

export function at(f: Field, [x, y]: Cell): FeatureId {
  return f.cells[y * f.w + x] ?? '';
}

export function feature(f: Field, c: Cell): FeatureDef {
  return FEATURES[at(f, c)];
}

export function same(a: Cell, b: Cell): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

/** Steps between two cells when diagonals count as one. */
export function dist(a: Cell, b: Cell): number {
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));
}

export function key([x, y]: Cell): string {
  return `${x},${y}`;
}

export function parseCell(s: string): Cell | null {
  const m = /^(\d+),(\d+)$/.exec(s);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

const DIRS: Cell[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export function neighbours(f: Field, [x, y]: Cell): Cell[] {
  return DIRS.map(([dx, dy]) => [x + dx, y + dy] as Cell).filter((c) => inside(f, c));
}

/** Who may walk where: swimmers keep to the water, the rest to the land. */
export type Walker = 'land' | 'swim';

/** The price of stepping onto a cell for this walker (null: cannot). */
export function stepCost(f: Field, c: Cell, walker: Walker = 'land'): number | null {
  const d = feature(f, c);
  if (walker === 'swim') return d.deep || d.wet ? 1 : null;
  return d.step;
}

/**
 * Every cell reachable from `from` within `budget`, with its price and the way there. Cells in `blocked`
 * cannot be crossed (others stand there). A diagonal step may not cut a corner through something solid.
 */
export function reach(f: Field, from: Cell, budget: number, blocked: Set<string>, walker: Walker = 'land'): Map<string, { cost: number; path: Cell[] }> {
  const out = new Map<string, { cost: number; path: Cell[] }>();
  out.set(key(from), { cost: 0, path: [] });
  const open: Array<{ c: Cell; cost: number; path: Cell[] }> = [{ c: from, cost: 0, path: [] }];
  while (open.length) {
    open.sort((a, b) => a.cost - b.cost);
    const cur = open.shift()!;
    for (const n of neighbours(f, cur.c)) {
      const k = key(n);
      if (blocked.has(k)) continue;
      const step = stepCost(f, n, walker);
      if (step === null) continue;
      const dx = n[0] - cur.c[0];
      const dy = n[1] - cur.c[1];
      if (dx && dy) {
        // no cutting a corner past a wall, a tree or deep water
        if (stepCost(f, [cur.c[0] + dx, cur.c[1]], walker) === null || stepCost(f, [cur.c[0], cur.c[1] + dy], walker) === null) continue;
      }
      const cost = cur.cost + step;
      if (cost > budget) continue;
      const was = out.get(k);
      if (was && was.cost <= cost) continue;
      const path = [...cur.path, n];
      out.set(k, { cost, path });
      open.push({ c: n, cost, path });
    }
  }
  return out;
}

/** Steps of the way from one cell to another through open ground (others standing are not counted). */
export function pathLength(f: Field, from: Cell, to: Cell, blocked: Set<string>, walker: Walker = 'land'): number {
  const all = reach(f, from, 99, blocked, walker);
  return all.get(key(to))?.cost ?? Infinity;
}

/** Cells on the straight line between two cells, ends excluded. */
export function line(a: Cell, b: Cell): Cell[] {
  const out: Cell[] = [];
  let [x0, y0] = a;
  const [x1, y1] = b;
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
    if (x0 === x1 && y0 === y1) break;
    out.push([x0, y0]);
  }
  return out;
}

/** Can one at `a` see one at `b` (nothing that hides stands between)? */
export function sees(f: Field, a: Cell, b: Cell): boolean {
  return line(a, b).every((c) => !feature(f, c).sight);
}

/** How well `b` is covered from a shot out of `a`: 0 none, 1 light, 2 sound; plus cover of the cell it stands in. */
export function coverFrom(f: Field, a: Cell, b: Cell): { cover: number; inside: number } {
  const ln = line(a, b);
  const last = ln[ln.length - 1];
  const cover = last && dist(a, b) >= 2 ? feature(f, last).cover : 0;
  return { cover, inside: feature(f, b).inside ?? 0 };
}

/** Cells along a straight run (a row, a column, a diagonal) from `a` towards `b`, up to `n` cells. */
export function run(a: Cell, b: Cell, n: number): Cell[] | null {
  const dx = Math.sign(b[0] - a[0]);
  const dy = Math.sign(b[1] - a[1]);
  const ax = Math.abs(b[0] - a[0]);
  const ay = Math.abs(b[1] - a[1]);
  if (!(ax === 0 || ay === 0 || ax === ay)) return null;
  const out: Cell[] = [];
  for (let i = 1; i <= n; i++) out.push([a[0] + dx * i, a[1] + dy * i]);
  return out;
}
