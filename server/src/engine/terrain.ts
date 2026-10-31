// Grounds of fights made fresh for every fight from pieces that belong to the place: water along a bank,
// reeds in clumps, a stand of trees, a stretch of wall. The heroes come in from below, the foes stand
// above; there is always a way across.
import type { SceneId } from '../../../shared/src/pictures.js';
import { FIELD_H, FIELD_W, feature, key, neighbours, reach, type Cell, type FeatureId, type Field } from '../../../shared/src/field.js';
import type { Rng } from '../../../shared/src/rng.js';

/** Rows the heroes come in on (from the bottom) and the foes stand on (from the top). */
export const HERO_ROWS = 2;
export const FOE_ROWS = 2;

type Stroke = (b: Board) => void;

class Board {
  readonly f: Field;
  constructor(
    readonly rng: Rng,
    ground: string,
  ) {
    this.f = { w: FIELD_W, h: FIELD_H, ground, cells: Array<FeatureId>(FIELD_W * FIELD_H).fill('') };
  }
  get(c: Cell): FeatureId {
    return this.f.cells[c[1] * this.f.w + c[0]]!;
  }
  set(c: Cell, v: FeatureId): void {
    if (c[0] < 0 || c[1] < 0 || c[0] >= this.f.w || c[1] >= this.f.h) return;
    this.f.cells[c[1] * this.f.w + c[0]] = v;
  }
  /** A cell in the middle band, away from where anyone comes in. */
  middle(): Cell {
    return [this.rng.int(0, this.f.w - 1), this.rng.int(FOE_ROWS - 1, this.f.h - HERO_ROWS - 1)];
  }
  any(): Cell {
    return [this.rng.int(0, this.f.w - 1), this.rng.int(0, this.f.h - 1)];
  }
}

// ----- strokes ---------------------------------------------------------------------

/** Deep water along a side; the bank wanders gently, a shallow edge (now and then wider) towards the land. */
function bank(side: 'left' | 'right' | 'pick', depth: [number, number], edge = 0.25): Stroke {
  return (b) => {
    const s = side === 'pick' ? (b.rng.chance(0.5) ? 'left' : 'right') : side;
    let d = b.rng.int(depth[0], depth[1]);
    for (let y = 0; y < b.f.h; y++) {
      if (y > 0 && b.rng.chance(0.35)) d = Math.max(depth[0], Math.min(depth[1], d + (b.rng.chance(0.5) ? 1 : -1)));
      const col = (i: number) => (s === 'left' ? i : b.f.w - 1 - i);
      for (let i = 0; i < d; i++) b.set([col(i), y], 'water');
      b.set([col(d), y], 'shallow');
      if (b.rng.chance(edge)) b.set([col(d + 1), y], 'shallow');
    }
  };
}

/** A stream winding across the field with a ford (shallow) or a footbridge. */
function stream(): Stroke {
  return (b) => {
    let y = b.rng.int(3, 4);
    const ys: number[] = [];
    for (let x = 0; x < b.f.w; x++) {
      if (x > 0 && b.rng.chance(0.3)) y = Math.max(2, Math.min(5, y + (b.rng.chance(0.5) ? 1 : -1)));
      ys.push(y);
      b.set([x, y], 'water');
      // where it bends, the water fills the corner so it runs on
      if (x > 0 && ys[x - 1] !== y) b.set([x, ys[x - 1]!], 'water');
    }
    const ford = b.rng.int(1, b.f.w - 3);
    const kind: FeatureId = b.rng.chance(0.5) ? 'shallow' : 'planks';
    for (const fx of [ford, ford + 1]) for (let yy = 0; yy < b.f.h; yy++) if (b.get([fx, yy]) === 'water') b.set([fx, yy], kind);
  };
}

/** Something that grows on the edge of water (reeds, willows) or lies on a bank (stones). */
function fringe(what: FeatureId, chance: number): Stroke {
  return (b) => {
    const edge: Cell[] = [];
    for (let y = FOE_ROWS - 1; y < b.f.h - HERO_ROWS; y++)
      for (let x = 0; x < b.f.w; x++) {
        if (b.get([x, y]) !== '') continue;
        if (neighbours(b.f, [x, y]).some((n) => b.get(n) === 'water' || b.get(n) === 'shallow')) edge.push([x, y]);
      }
    for (const c of edge) if (b.rng.chance(chance)) b.set(c, what);
  };
}

/** Stands of trees: a few close together with gaps between, not one here and one there. */
function stands(what: FeatureId, n: [number, number], size: [number, number]): Stroke {
  return (b) => {
    const count = b.rng.int(n[0], n[1]);
    for (let i = 0; i < count; i++) {
      const c = b.middle();
      const k = b.rng.int(size[0], size[1]);
      const placed: Cell[] = [];
      if (b.get(c) === '') {
        b.set(c, what);
        placed.push(c);
      }
      for (let j = 1; j < k && placed.length; j++) {
        const from = b.rng.pick(placed);
        const free = neighbours(b.f, from).filter((x) => b.get(x) === '' && x[1] >= FOE_ROWS - 1 && x[1] < b.f.h - HERO_ROWS);
        if (!free.length) continue;
        const nxt = b.rng.pick(free);
        b.set(nxt, what);
        placed.push(nxt);
      }
    }
  };
}

/** Single things scattered about. */
function scatter(what: FeatureId, n: [number, number], anywhere = false): Stroke {
  return (b) => {
    const count = b.rng.int(n[0], n[1]);
    for (let i = 0; i < count; i++) {
      const c = anywhere ? b.any() : b.middle();
      if (b.get(c) === '') b.set(c, what);
    }
  };
}

/** A straight stretch of wall or fence. */
function stretch(what: FeatureId, n: [number, number], len: [number, number]): Stroke {
  return (b) => {
    const count = b.rng.int(n[0], n[1]);
    for (let i = 0; i < count; i++) {
      const [x, y] = b.middle();
      const l = b.rng.int(len[0], len[1]);
      const across = b.rng.chance(0.6);
      for (let j = 0; j < l; j++) b.set(across ? [x + j, y] : [x, y + j], what);
    }
  };
}

/** A pool of deep water ringed with shallows. */
function pools(n: [number, number], size: [number, number]): Stroke {
  return (b) => {
    const count = b.rng.int(n[0], n[1]);
    for (let i = 0; i < count; i++) {
      let c = b.middle();
      const k = b.rng.int(size[0], size[1]);
      const deep: Cell[] = [];
      for (let j = 0; j < k; j++) {
        deep.push(c);
        c = b.rng.pick(neighbours(b.f, c));
      }
      for (const d of deep) for (const n2 of neighbours(b.f, d)) if (b.get(n2) === '') b.set(n2, 'shallow');
      for (const d of deep) b.set(d, 'water');
    }
  };
}

/** A causeway: bog water in wide patches between tussocks, a plank way up the middle. */
function causeway(): Stroke {
  return (b) => {
    for (let y = 0; y < b.f.h; y++)
      for (let x = 0; x < b.f.w; x++) {
        // wet where most of the neighbours are wet: patches, not salt and pepper
        const wet = b.rng.chance(0.62);
        if (wet) b.set([x, y], 'shallow');
      }
    for (let pass = 0; pass < 2; pass++) {
      const next = b.f.cells.slice();
      for (let y = 0; y < b.f.h; y++)
        for (let x = 0; x < b.f.w; x++) {
          const n = neighbours(b.f, [x, y]).filter((c) => b.get(c) === 'shallow').length;
          next[y * b.f.w + x] = n >= 5 ? 'shallow' : n <= 2 ? '' : b.get([x, y]);
        }
      b.f.cells = next;
    }
    let x = b.rng.int(2, b.f.w - 3);
    for (let y = 0; y < b.f.h; y++) {
      b.set([x, y], 'planks');
      b.set([x + 1, y], 'planks');
      // where the way bends, its boards widen for a row so it turns rather than steps
      if (y > 0 && y < b.f.h - 1 && b.rng.chance(0.18)) {
        const nx = Math.max(1, Math.min(b.f.w - 3, x + (b.rng.chance(0.5) ? 1 : -1)));
        b.set([nx, y], 'planks');
        b.set([nx + 1, y], 'planks');
        x = nx;
      }
    }
  };
}

const RECIPES: Record<SceneId | 'plain', { ground: string; strokes: Stroke[] }> = {
  yard: { ground: 'grass', strokes: [stretch('wall', [1, 1], [2, 3]), stretch('fence', [1, 2], [2, 3]), scatter('log', [0, 1]), scatter('barrel', [0, 1]), scatter('crate', [0, 1]), scatter('tree', [0, 1])] },
  shore: { ground: 'sand', strokes: [bank('pick', [1, 3]), fringe('reeds', 0.3), fringe('rock', 0.08), scatter('log', [0, 1])] },
  reeds: { ground: 'mud', strokes: [pools([1, 1], [2, 3]), fringe('reeds', 0.45), stands('reeds', [1, 2], [2, 3])] },
  saltflat: { ground: 'salt', strokes: [stands('salt', [1, 2], [1, 3]), scatter('rock', [0, 2])] },
  brine: { ground: 'salt', strokes: [pools([1, 2], [2, 4]), fringe('salt', 0.15), scatter('salt', [0, 2])] },
  grove: { ground: 'grass', strokes: [stands('tree', [2, 3], [2, 4]), stands('bush', [1, 2], [1, 2]), scatter('log', [0, 1]), scatter('stump', [0, 2])] },
  dyke: { ground: 'grass', strokes: [bank('pick', [2, 3]), fringe('reeds', 0.2), fringe('rock', 0.1), scatter('log', [0, 1])] },
  causeway: { ground: 'mud', strokes: [causeway(), pools([1, 2], [1, 2]), stands('reeds', [1, 2], [1, 2])] },
  road: { ground: 'dust', strokes: [scatter('cart', [1, 1]), scatter('crate', [1, 2]), stands('bush', [1, 2], [1, 2]), scatter('tree', [0, 1])] },
  town: { ground: 'cobble', strokes: [stretch('wall', [1, 2], [2, 3]), scatter('barrel', [1, 2]), scatter('crate', [1, 2]), stretch('fence', [0, 1], [2, 2])] },
  bog: { ground: 'mud', strokes: [pools([2, 2], [2, 4]), fringe('reeds', 0.35), scatter('stump', [1, 2]), scatter('tree', [0, 1])] },
  isle: { ground: 'grass', strokes: [bank('left', [0, 1], 0.1), bank('right', [0, 1], 0.1), stands('tree', [1, 2], [2, 3]), stands('bush', [1, 1], [1, 2])] },
  willow: { ground: 'grass', strokes: [stream(), fringe('reeds', 0.25), fringe('tree', 0.12)] },
  plain: { ground: 'grass', strokes: [scatter('rock', [1, 2]), stands('bush', [1, 2], [1, 2])] },
  workshop: { ground: 'grass', strokes: [stretch('fence', [1, 2], [2, 3]), scatter('log', [1, 2]), scatter('crate', [0, 1]), scatter('tree', [0, 1])] },
  kryvets: { ground: 'cobble', strokes: [stretch('wall', [1, 2], [2, 3]), scatter('barrel', [1, 2]), scatter('cart', [0, 1]), scatter('crate', [1, 2])] },
  quarry: { ground: 'sand', strokes: [scatter('rock', [2, 3]), scatter('cart', [0, 1]), scatter('crate', [1, 2]), stands('bush', [0, 1], [1, 2])] },
};

function zone(f: Field, rows: 'hero' | 'foe'): Cell[] {
  const out: Cell[] = [];
  const ys = rows === 'hero' ? [f.h - 1, f.h - 2] : [0, 1];
  for (const y of ys) for (let x = 0; x < f.w; x++) out.push([x, y]);
  return out;
}

/** Land you can stand on. */
export function standable(f: Field, c: Cell): boolean {
  return feature(f, c).step !== null;
}

function crossable(f: Field): boolean {
  const from = zone(f, 'hero').filter((c) => standable(f, c));
  if (from.length < 3) return false;
  const all = reach(f, from[Math.floor(from.length / 2)]!, 99, new Set());
  const foes = zone(f, 'foe').filter((c) => standable(f, c));
  if (foes.length < 4) return false;
  return foes.some((c) => all.has(key(c)));
}

/** A fresh ground for a fight at a place of this kind. */
export function makeField(rng: Rng, scene: SceneId | undefined): Field {
  const r = RECIPES[scene ?? 'plain'] ?? RECIPES.plain;
  for (let attempt = 0; attempt < 40; attempt++) {
    const b = new Board(rng, r.ground);
    for (const s of r.strokes) s(b);
    // the heroes' own rows are clear of anything that blocks (a bank or a bog may still wet them)
    // a river does not stop short of them: it runs on as a ford they can wade
    for (const c of zone(b.f, 'hero')) if (!standable(b.f, c)) b.set(c, b.get(c) === 'water' ? 'shallow' : scene === 'causeway' ? 'planks' : '');
    if (crossable(b.f)) {
      b.f.seed = rng.int(1, 1e9);
      return b.f;
    }
  }
  const plain = new Board(rng, r.ground).f;
  plain.seed = rng.int(1, 1e9);
  return plain;
}

/** A ground drawn by hand (boss fights, errands): rows of letters, see FIELD_KEYS; `h`/`f` mark where the sides stand. */
export function fieldFrom(rows: string[], ground: string): { field: Field; heroes: Cell[]; foes: Cell[] } {
  const f: Field = { w: FIELD_W, h: FIELD_H, ground, cells: Array<FeatureId>(FIELD_W * FIELD_H).fill('') };
  const heroes: Cell[] = [];
  const foes: Cell[] = [];
  rows.slice(0, FIELD_H).forEach((row, y) => {
    for (let x = 0; x < FIELD_W; x++) {
      const ch = row[x] ?? '.';
      if (ch === 'h') heroes.push([x, y]);
      if (ch === 'f' || ch === 'F') foes.push([x, y]);
      // F: a foe that waits in deep water
      f.cells[y * FIELD_W + x] = ch === 'F' ? 'water' : (FIELD_KEYS[ch] ?? '');
    }
  });
  return { field: f, heroes, foes };
}

/** What is wrong with a hand-drawn ground (empty if nothing). */
export function fieldProblems(rows: string[]): string[] {
  const out: string[] = [];
  if (rows.length !== FIELD_H) out.push(`${rows.length} rows, not ${FIELD_H}`);
  rows.forEach((r, y) => {
    if (r.length !== FIELD_W) out.push(`row ${y}: ${r.length} cells, not ${FIELD_W}`);
    for (const ch of r) if (!(ch in FIELD_KEYS) && !'hfF'.includes(ch)) out.push(`row ${y}: unknown '${ch}'`);
  });
  if (out.length) return out;
  const { field, heroes, foes } = fieldFrom(rows, 'grass');
  if (!heroes.length) out.push('no hero start (h)');
  if (!foes.length) out.push('no foe start (f)');
  const from = heroes[0];
  if (from) {
    const all = reach(field, from, 99, new Set());
    // a foe on land must be reachable; one in the water must be able to swim to a bank the heroes reach
    const meets = (c: Cell) => {
      if (all.has(key(c)) || neighbours(field, c).some((n) => all.has(key(n)))) return true;
      if (!feature(field, c).deep) return false;
      const swim = reach(field, c, 99, new Set(), 'swim');
      return [...swim.keys()].some((k) => {
        const [x, y] = k.split(',').map(Number) as Cell;
        return neighbours(field, [x, y]).some((n) => all.has(key(n)));
      });
    };
    if (!foes.some(meets)) out.push('the foes cannot be reached');
    if (heroes.some((c) => !all.has(key(c)))) out.push('the heroes stand apart');
  }
  return out;
}

export const FIELD_KEYS: Record<string, FeatureId> = {
  '.': '',
  '~': 'water',
  ',': 'shallow',
  '"': 'reeds',
  '*': 'bush',
  T: 'tree',
  o: 'rock',
  '=': 'log',
  '#': 'wall',
  '+': 'fence',
  C: 'cart',
  x: 'crate',
  b: 'barrel',
  s: 'salt',
  i: 'stump',
  '_': 'planks',
};
