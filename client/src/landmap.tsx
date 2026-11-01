// The painted map: land you drag about and zoom, the roads between places, fog over what nobody has
// seen yet, and the heroes walking the roads as it happens. Places without a spot on the painting
// keep the old drawn scheme (see MapPanel). There are several sheets (the north of the story, the south
// of the memories); the map shows the one that holds every place it shows now.
import type { JSX } from 'preact';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { MapLegView, MapNodeView, MapView } from '../../shared/src/protocol.js';
import sheet1 from './art/map1.json';
import sheet2 from './art/map2.json';
import sheet3 from './art/map3.json';
import sheet4 from './art/map4.json';
import { MapIcon } from './mapicons.js';
import { Tones, markStyle } from './pictures.js';
import { T } from './strings.js';

type Pt = [number, number];

interface Sheet {
  w: number;
  h: number;
  cols: number;
  rows: number;
  /** Where each place stands on the painting. */
  at: Record<string, Pt>;
  /** Roads between two places ("a|b"): the bends between the ends. */
  roads: Record<string, Pt[]>;
  /** Ways by water, drawn as a boat's track. */
  water: Record<string, Pt[]>;
  /** Places of another sheet shown at this one's edge, where the road to them leaves it. */
  edge?: Record<string, Pt>;
}

const SHEETS: Record<string, Sheet> = { map1: sheet1 as unknown as Sheet, map2: sheet2 as unknown as Sheet, map3: sheet3 as unknown as Sheet, map4: sheet4 as unknown as Sheet };
/** Each sheet as it is drawn: its own places and the edge ones together. */
const DRAWN: Record<string, Sheet> = Object.fromEntries(Object.entries(SHEETS).map(([k, sh]) => [k, { ...sh, at: { ...sh.edge, ...sh.at } }]));
const FILES = import.meta.glob('./art/map*/*.webp', { eager: true, query: '?url', import: 'default' });

// The sheet shown now (one map is on screen at a time).
let NAME = 'map1';
let SHEET = DRAWN.map1!;

/**
 * The map as the painting shows it: the sheet where the hero stands (or, before anyone stands anywhere, the
 * one that holds every place), with only the places on it and at its edge; null — the drawn scheme.
 */
export function paintedMap(m: MapView): MapView | null {
  if (!m.nodes.length) return null;
  const here = m.nodes.find((n) => n.here)?.id ?? m.travel?.to;
  for (const [name, sh] of Object.entries(SHEETS)) {
    const drawn = DRAWN[name]!;
    if (here ? !sh.at[here] && !(m.travel && drawn.at[here]) : !m.nodes.every((n) => drawn.at[n.id])) continue;
    NAME = name;
    SHEET = drawn;
    const nodes = m.nodes.filter((n) => drawn.at[n.id]);
    return nodes.length === m.nodes.length ? m : { ...m, nodes, links: m.links.filter(([a, b]) => drawn.at[a] && drawn.at[b]) };
  }
  return null;
}

function tileUrl(r: number, c: number): string {
  return FILES[`./art/${NAME}/r${r}c${c}.webp`] ?? '';
}
function previewUrl(): string {
  return FILES[`./art/${NAME}/preview.webp`] ?? '';
}

/**
 * Fetch the tiles of the land already seen while nobody looks at the map, so it opens painted at once.
 * The browser keeps them (the files are named by their content).
 */
export function preloadLand(full: MapView): void {
  const m = paintedMap(full);
  if (!m) return;
  for (const [r, c] of tilesOf(seenOf(m))) {
    const img = new Image();
    img.decoding = 'async';
    img.src = tileUrl(r, c);
  }
  new Image().src = previewUrl();
  fogUrl(seenOf(m), new Set());
}


// ---------------------------------------------------------------------------- roads

interface Way {
  key: string;
  a: string;
  b: string;
  water: boolean;
  /** Dense points along the way, from a to b. */
  pts: Pt[];
  /** Length walked up to each point. */
  run: number[];
  d: string;
}

/** A smooth line through the points (Catmull-Rom), sampled densely. */
function smooth(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts;
  const out: Pt[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    for (let s = 0; s < 14; s++) {
      const t = s / 14;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (k: 0 | 1) =>
        0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
      out.push([f(0), f(1)]);
    }
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/** A straight road still wanders a little, as roads do: the same bend every time. */
function wander(a: Pt, b: Pt, key: string): Pt[] {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const off = len * 0.05 * (h & 1 ? 1 : -1);
  const nx = -(b[1] - a[1]) / len;
  const ny = (b[0] - a[0]) / len;
  return [[(a[0] + b[0]) / 2 + nx * off, (a[1] + b[1]) / 2 + ny * off]];
}

function buildWay(sh: Sheet, key: string, mid: Pt[], water: boolean): Way | null {
  const [a, b] = key.split('|') as [string, string];
  const pa = sh.at[a];
  const pb = sh.at[b];
  if (!pa || !pb) return null;
  const pts = smooth([pa, ...(mid.length ? mid : wander(pa, pb, key)), pb]);
  const run = [0];
  for (let i = 1; i < pts.length; i++) run.push(run[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return { key, a, b, water, pts, run, d };
}

// the ways of each sheet (a road to an edge place is drawn on each sheet its own way)
const WAYS: Record<string, Map<string, Way>> = Object.fromEntries(
  Object.entries(DRAWN).map(([name, sh]) => {
    const all = new Map<string, Way>();
    for (const [k, mid] of Object.entries(sh.roads)) {
      const w = buildWay(sh, k, mid, false);
      if (w) all.set(k, w);
    }
    for (const [k, mid] of Object.entries(sh.water)) {
      const w = buildWay(sh, k, mid, true);
      if (w) all.set(k, w);
    }
    return [name, all];
  }),
);

function wayOf(a: string, b: string): Way | undefined {
  const ways = WAYS[NAME]!;
  return ways.get(`${a}|${b}`) ?? ways.get(`${b}|${a}`);
}

/** The point `share` (0..1) along the way from `from` to `to`. */
function along(from: string, to: string, share: number): Pt | null {
  const w = wayOf(from, to);
  if (!w) return null;
  const total = w.run[w.run.length - 1]!;
  const s = Math.max(0, Math.min(1, share)) * total;
  const dist = w.a === from ? s : total - s;
  let i = 1;
  while (i < w.run.length - 1 && w.run[i]! < dist) i++;
  const r0 = w.run[i - 1]!;
  const r1 = w.run[i]!;
  const t = r1 > r0 ? (dist - r0) / (r1 - r0) : 0;
  const p0 = w.pts[i - 1]!;
  const p1 = w.pts[i]!;
  return [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t];
}

/** Where a walking hero is now. */
function legPoint(leg: MapLegView, now: number): Pt | null {
  const span = Math.max(1, leg.until - leg.since);
  return along(leg.from, leg.to, (now - leg.since) / span) ?? SHEET.at[leg.to] ?? null;
}

// ---------------------------------------------------------------------------- what is seen

interface Seen {
  /** Clear circles: explored places (with their ids, to unveil the new ones). */
  clear: Array<[number, number, number, string]>;
  /** Half-seen circles: places only glimpsed. */
  dim: Array<[number, number, number]>;
  /** Roads cleared along their length. */
  ways: Way[];
}

const CLEAR_R = 150;
const DIM_R = 85;
const BLUR = 30;

function seenOf(m: MapView): Seen {
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  const clear: Seen['clear'] = [];
  const dim: Seen['dim'] = [];
  for (const n of m.nodes) {
    const p = SHEET.at[n.id];
    if (!p) continue;
    if (n.known) clear.push([p[0], p[1], n.home ? CLEAR_R + 40 : CLEAR_R, n.id]);
    else dim.push([p[0], p[1], DIM_R]);
  }
  const ways: Way[] = [];
  for (const [a, b] of m.links) {
    const w = wayOf(a, b);
    if (w && byId.get(a)?.known && byId.get(b)?.known) ways.push(w);
  }
  return { clear, dim, ways };
}

/** Tiles under anything seen: only those are fetched, the rest of the land stays unknown. */
function tilesOf(seen: Seen): Array<[number, number]> {
  const tw = SHEET.w / SHEET.cols;
  const th = SHEET.h / SHEET.rows;
  const spots: Array<[number, number, number]> = [...seen.clear.map(([x, y, r]) => [x, y, r] as [number, number, number]), ...seen.dim];
  for (const w of seen.ways) for (let i = 0; i < w.pts.length; i += 6) spots.push([w.pts[i]![0], w.pts[i]![1], 50]);
  const out: Array<[number, number]> = [];
  for (let r = 0; r < SHEET.rows; r++) {
    for (let c = 0; c < SHEET.cols; c++) {
      const x0 = c * tw;
      const y0 = r * th;
      const hit = spots.some(([x, y, rad]) => {
        const dx = Math.max(x0 - x, 0, x - (x0 + tw));
        const dy = Math.max(y0 - y, 0, y - (y0 + th));
        return Math.hypot(dx, dy) < rad + 2 * BLUR;
      });
      if (hit) out.push([r, c]);
    }
  }
  return out;
}

// The fog is a picture drawn once for what is seen (and kept), at a quarter of the painting's size and
// stretched over it: it is soft anyway. A blurred mask in the page itself made a phone redraw the
// fog each time the map opened, and the map stood black meanwhile.
const FOG_SCALE = 4;
const FOG_RGB = [34, 28, 21];
const fogs = new Map<string, string>();

/** One pass of a box blur, along rows (`step` 1) or columns (`step` w), edges held. */
function boxPass(src: Float32Array, out: Float32Array, n: number, lines: number, step: number, across: number, r: number): void {
  for (let l = 0; l < lines; l++) {
    const base = l * across;
    let sum = 0;
    for (let i = -r; i <= r; i++) sum += src[base + Math.min(n - 1, Math.max(0, i)) * step]!;
    for (let i = 0; i < n; i++) {
      out[base + i * step] = sum / (2 * r + 1);
      sum += src[base + Math.min(n - 1, i + r + 1) * step]! - src[base + Math.max(0, i - r) * step]!;
    }
  }
}

/** The fog over what is not seen (leaving out the places in `skip`), as a picture's address. */
function fogUrl(seen: Seen, skip: Set<string>): string {
  const ways = seen.ways.filter((w) => !skip.has(w.a) && !skip.has(w.b));
  const clear = seen.clear.filter((c) => !skip.has(c[3]));
  const key = JSON.stringify([clear, seen.dim, ways.map((w) => w.key)]);
  const kept = fogs.get(key);
  if (kept) return kept;
  const w = Math.ceil(SHEET.w / FOG_SCALE);
  const h = Math.ceil(SHEET.h / FOG_SCALE);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) return '';
  // how thick the fog is: white is all fog, grey half, black none (the same as the old mask)
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, w, h);
  ctx.scale(1 / FOG_SCALE, 1 / FOG_SCALE);
  ctx.fillStyle = '#777';
  for (const [x, y, r] of seen.dim) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 70;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const way of ways) ctx.stroke(new Path2D(way.d));
  ctx.fillStyle = '#000';
  for (const [x, y, r] of clear) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const img = ctx.getImageData(0, 0, w, h);
  let a = new Float32Array(w * h);
  let b = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) a[i] = img.data[i * 4]! / 255;
  // three box passes each way come close to the old blur
  const r = Math.max(1, Math.round(BLUR / FOG_SCALE));
  for (let k = 0; k < 3; k++) {
    boxPass(a, b, w, h, 1, w, r);
    boxPass(b, a, h, w, w, 1, r);
  }
  for (let i = 0; i < w * h; i++) {
    img.data[i * 4] = FOG_RGB[0]!;
    img.data[i * 4 + 1] = FOG_RGB[1]!;
    img.data[i * 4 + 2] = FOG_RGB[2]!;
    img.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, a[i]!)) * 255);
  }
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/png');
  fogs.set(key, url);
  return url;
}

/** The places explored as this browser last saw the map; null before it ever did. */
function loadMapSeen(): Set<string> | null {
  try {
    const raw = localStorage.getItem('bezgomin.mapSeen');
    return raw ? new Set(JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

/** Places explored since the map was last looked at: they unveil themselves once, then are remembered. */
function useFresh(m: MapView): Set<string> {
  const known = m.nodes.filter((n) => n.known).map((n) => n.id);
  const before = useRef<Set<string> | null>(loadMapSeen());
  const prev = before.current;
  const fresh = new Set(prev ? known.filter((id) => !prev.has(id)) : []);
  useEffect(() => {
    const t = window.setTimeout(() => {
      before.current = new Set(known);
      try {
        localStorage.setItem('bezgomin.mapSeen', JSON.stringify(known));
      } catch {
        // a private window: the unveiling just plays again next time
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [known.join()]);
  return fresh;
}

// ---------------------------------------------------------------------------- the view

interface Cam {
  x: number;
  y: number;
  k: number;
}

const K_MAX = 1.35;
/** A tap this far from a place (sheet px, more when zoomed out) picks it. */
const NEAR_TAP = 120;

// ---------------------------------------------------------------------------- life on the land

/** Lived-in places smoke; birds go over the water of the places that have it (once they are explored). */
const SMOKES = ['a_01', 'a_11', 'a_15'];
const BIRDS = ['a_02', 'a_03', 'a_07', 'a_12', 'a_13', 'a_14'];

function LandLife({ nodes }: { nodes: MapNodeView[] }) {
  const known = nodes.filter((n) => n.known && SHEET.at[n.id]);
  return (
    <>
      {known
        .filter((n) => SMOKES.includes(n.id))
        .map((n) => {
          const [x, y] = SHEET.at[n.id]!;
          return (
            <span key={`s${n.id}`} class="life-smoke land-smoke" style={{ left: `${x + 12}px`, top: `${y - 30}px` }}>
              <i />
              <i />
              <i />
            </span>
          );
        })}
      {known
        .filter((n) => BIRDS.includes(n.id))
        .map((n, i) => {
          const [x, y] = SHEET.at[n.id]!;
          return (
            <svg key={`b${n.id}`} class="land-birds" style={{ left: `${x - 140}px`, top: `${y - 60}px`, animationDelay: `${3 + ((i * 9) % 31)}s` }} viewBox="0 0 40 16" aria-hidden="true">
              <path d="M2 8q4-5 8 0q4-5 8 0" />
              <path d="M22 4q3-4 6 0q3-4 6 0" />
            </svg>
          );
        })}
    </>
  );
}

/**
 * `cover` fills the box with land; a tall phone may step back further, with dark margins,
 * but not so far that the marks of places pile up.
 */
function limits(box: HTMLElement): { kMin: number; cover: number; bw: number; bh: number } {
  const bw = box.clientWidth;
  const bh = box.clientHeight;
  const cover = Math.max(bw / SHEET.w, bh / SHEET.h);
  const contain = Math.min(bw / SHEET.w, bh / SHEET.h);
  return { kMin: Math.min(cover, Math.max(contain, cover * 0.55)), cover, bw, bh };
}

/** How far wider land may be dragged past its edge, so a place by the edge can come into the open. */
const SLACK = 90;

/** Land narrower than the box sits in its middle; wider land goes only a little past its edge. */
function fit(pos: number, span: number, room: number): number {
  return span <= room ? (room - span) / 2 : Math.min(SLACK, Math.max(room - span - SLACK, pos));
}

function clamp(box: HTMLElement, c: Cam): Cam {
  const { kMin, bw, bh } = limits(box);
  const k = Math.max(kMin, Math.min(K_MAX, c.k));
  return { k, x: fit(c.x, SHEET.w * k, bw), y: fit(c.y, SHEET.h * k, bh) };
}

function centerOn(box: HTMLElement, p: Pt, k: number): Cam {
  return clamp(box, { k, x: box.clientWidth / 2 - p[0] * k, y: box.clientHeight / 2 - p[1] * k });
}

/** What can be done with a picked place: a button on the ring around its mark. */
export interface RingItem {
  key: string;
  label: string;
  /** A second line under the label (how long the way is). */
  sub?: string;
  icon: JSX.Element;
  primary?: boolean;
  disabled?: boolean;
  onDo: () => void;
}

export function LandMap({
  m,
  sel,
  onPick,
  ring,
  now,
  wayIds,
  dusk,
  sky,
}: {
  m: MapView;
  sel: string | null;
  onPick: (id: string | null) => void;
  /** The buttons around the picked place. */
  ring: RingItem[];
  now: number;
  /** How far into the evening (0..1) and the weather, laid over the land. */
  dusk: number;
  sky?: string;
  /** The way to the picked place, stop by stop, to light up. */
  wayIds: string[];
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const meRef = useRef<HTMLSpanElement | null>(null);
  const mateRef = useRef<HTMLSpanElement | null>(null);
  const cam = useRef<Cam>({ x: 0, y: 0, k: 0.6 });
  const [ready, setReady] = useState(false);
  const skew = now - Date.now();

  const seen = useMemo(() => seenOf(m), [m]);
  const fresh = useFresh(m);
  const tiles = useMemo(() => tilesOf(seen), [seen]);
  // the fog as it is, and as it was before the places explored since the last look (it lifts off them)
  const fog = useMemo(() => fogUrl(seen, new Set()), [seen]);
  const fogBefore = useMemo(() => (fresh.size ? fogUrl(seen, fresh) : null), [seen, fresh.size]);
  const here = m.nodes.find((n) => n.here);
  const mate = m.nodes.find((n) => n.partner);
  const legs = m.legs;

  const apply = (glide = false) => {
    const w = worldRef.current;
    if (!w) return;
    const c = cam.current;
    w.classList.toggle('glide', glide);
    w.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) scale(${c.k})`;
    w.style.setProperty('--inv', String(1 / c.k));
  };
  const meAt = (): Pt | null => (legs.me ? legPoint(legs.me, Date.now() + skew) : here ? (SHEET.at[here.id] ?? null) : null);

  // open on where you stand, a little closer than the whole land (before the first paint: no jump)
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const { kMin, cover } = limits(box);
    const p = meAt() ?? [SHEET.w / 2, SHEET.h / 2];
    cam.current = centerOn(box, p, Math.max(kMin, Math.min(0.62, cover * 0.8)));
    apply();
    setReady(true);
    const ro = new ResizeObserver(() => {
      cam.current = clamp(box, cam.current);
      apply();
    });
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  // a tap on the land itself (not on a place or its ring) picks the place nearest to it, if one is near;
  // further off it lets the picked place go
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const nodesRef = useRef(m.nodes);
  nodesRef.current = m.nodes;
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const off = (e: MouseEvent) => {
      if ((e.target as Element).closest('.land-pin, .pin-ring, .land-tools')) return;
      const r = box.getBoundingClientRect();
      const c = cam.current;
      const at: Pt = [(e.clientX - r.left - c.x) / c.k, (e.clientY - r.top - c.y) / c.k];
      let best: { id: string; d: number } | null = null;
      for (const n of nodesRef.current) {
        const p = SHEET.at[n.id];
        if (!p) continue;
        const d = Math.hypot(p[0] - at[0], p[1] - at[1]);
        if (!best || d < best.d) best = { id: n.id, d };
      }
      pickRef.current(best && best.d <= NEAR_TAP / Math.min(1, c.k) ? best.id : null);
    };
    box.addEventListener('click', off);
    return () => box.removeEventListener('click', off);
  }, []);

  // a picked place near the edge comes towards the middle; its ring opens to where there is room
  const [face, setFace] = useState(-90);
  useEffect(() => {
    const box = boxRef.current;
    const p = sel ? SHEET.at[sel] : undefined;
    if (!box || !p) return;
    const at = () => [cam.current.x + p[0] * cam.current.k, cam.current.y + p[1] * cam.current.k] as Pt;
    const bw = box.clientWidth;
    const bh = box.clientHeight;
    let [x, y] = at();
    if (x < 110 || x > bw - 110 || y < 130 || y > bh - 50) {
      cam.current = centerOn(box, [p[0], p[1] - 30 / cam.current.k], cam.current.k);
      apply(true);
      [x, y] = at();
    }
    setFace(faceOf(x, y, bw));
  }, [sel]);

  // dragging, pinching and the wheel
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const pts = new Map<number, Pt>();
    let moved = 0;
    let pinch: { d: number; k: number } | null = null;
    const zoomAt = (k: number, cx: number, cy: number, glide = false) => {
      const c = cam.current;
      const r = box.getBoundingClientRect();
      const px = cx - r.left;
      const py = cy - r.top;
      const nk = Math.max(limits(box).kMin, Math.min(K_MAX, k));
      cam.current = clamp(box, { k: nk, x: px - ((px - c.x) / c.k) * nk, y: py - ((py - c.y) / c.k) * nk });
      apply(glide);
    };
    const down = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) moved = 0;
      if (pts.size === 2) {
        const [a, b] = [...pts.values()] as [Pt, Pt];
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, k: cam.current.k };
      }
    };
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const cur: Pt = [e.clientX, e.clientY];
      pts.set(e.pointerId, cur);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()] as [Pt, Pt];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        moved += 10;
        zoomAt(pinch.k * (d / pinch.d), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        return;
      }
      const dx = cur[0] - prev[0];
      const dy = cur[1] - prev[1];
      moved += Math.abs(dx) + Math.abs(dy);
      // a tap stays a tap until the finger really moves; only then the map takes the pointer
      if (moved > 6 && !box.hasPointerCapture(e.pointerId)) box.setPointerCapture(e.pointerId);
      if (moved > 6) {
        cam.current = clamp(box, { ...cam.current, x: cam.current.x + dx, y: cam.current.y + dy });
        apply();
      }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
    };
    // a drag that ends over a place must not pick it
    const click = (e: MouseEvent) => {
      if (moved > 6) {
        e.stopPropagation();
        e.preventDefault();
        moved = 0;
      }
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(cam.current.k * Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    };
    box.addEventListener('pointerdown', down);
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', up);
    box.addEventListener('click', click, true);
    box.addEventListener('wheel', wheel, { passive: false });
    (box as HTMLDivElement & { zoomBy?: (f: number) => void }).zoomBy = (f: number) => {
      const r = box.getBoundingClientRect();
      zoomAt(cam.current.k * f, r.left + r.width / 2, r.top + r.height / 2, true);
    };
    return () => {
      box.removeEventListener('pointerdown', down);
      box.removeEventListener('pointermove', move);
      box.removeEventListener('pointerup', up);
      box.removeEventListener('pointercancel', up);
      box.removeEventListener('click', click, true);
      box.removeEventListener('wheel', wheel);
    };
  }, []);

  // heroes on the road move every frame (or once a second for those who ask for less motion)
  useEffect(() => {
    if (!legs.me && !legs.mate) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let timer = 0;
    const step = () => {
      const t = Date.now() + skew;
      for (const [leg, el] of [
        [legs.me, meRef.current],
        [legs.mate, mateRef.current],
      ] as const) {
        if (!leg || !el) continue;
        const p = legPoint(leg, t);
        if (p) {
          el.style.left = `${p[0]}px`;
          el.style.top = `${p[1]}px`;
        }
      }
      if (still) timer = window.setTimeout(step, 1000);
      else raf = requestAnimationFrame(step);
    };
    step();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [legs.me, legs.mate, skew]);

  const zoom = (f: number) => (boxRef.current as (HTMLDivElement & { zoomBy?: (f: number) => void }) | null)?.zoomBy?.(f);
  const toMe = () => {
    const box = boxRef.current;
    const p = meAt();
    if (!box || !p) return;
    cam.current = centerOn(box, p, Math.max(cam.current.k, 0.75));
    apply(true);
  };

  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  const onWay = (a: string, b: string) =>
    wayIds.some((id, i) => i > 0 && ((wayIds[i - 1] === a && id === b) || (wayIds[i - 1] === b && id === a)));
  // the road still ahead of a walking hero
  const ahead = legs.me ? [legs.me.from, legs.me.to, ...legs.me.next] : [];
  const onAhead = (a: string, b: string) =>
    ahead.some((id, i) => i > 0 && ((ahead[i - 1] === a && id === b) || (ahead[i - 1] === b && id === a)));
  const tw = SHEET.w / SHEET.cols;
  const th = SHEET.h / SHEET.rows;
  const mePoint = legs.me ? legPoint(legs.me, now) : null;
  const matePoint = legs.mate ? legPoint(legs.mate, now) : null;

  return (
    <div class={`land ${ready ? 'ready' : ''}`} ref={boxRef}>
      <div class="land-world" ref={worldRef} style={{ width: `${SHEET.w}px`, height: `${SHEET.h}px` }}>
        <div class="land-ground">
          {tiles.map(([r, c]) => (
            <span
              key={`p${r}-${c}`}
              class="land-tile-ph"
              style={{
                left: `${c * tw}px`,
                top: `${r * th}px`,
                width: `${tw}px`,
                height: `${th}px`,
                backgroundImage: `url(${previewUrl()})`,
                backgroundSize: `${SHEET.w}px ${SHEET.h}px`,
                backgroundPosition: `-${c * tw}px -${r * th}px`,
              }}
            />
          ))}
          {tiles.map(([r, c]) => (
            <img
              key={`${r}-${c}`}
              class="land-tile"
              src={tileUrl(r, c)}
              alt=""
              draggable={false}
              decoding="async"
              style={{ left: `${c * tw}px`, top: `${r * th}px`, width: `${tw}px`, height: `${th}px` }}
            />
          ))}
          <svg class="land-svg" viewBox={`0 0 ${SHEET.w} ${SHEET.h}`} width={SHEET.w} height={SHEET.h} aria-hidden="true">
            {m.links.map(([a, b]) => {
              const w = wayOf(a, b);
              if (!w) return null;
              const faint = !(byId.get(a)?.known && byId.get(b)?.known);
              return (
                <g class={`land-way ${w.water ? 'water' : 'road'} ${faint ? 'faint' : ''} ${onWay(a, b) ? 'way' : ''} ${onAhead(a, b) ? 'ahead' : ''}`}>
                  <path class="under" d={w.d} />
                  <path class="over" d={w.d} />
                </g>
              );
            })}
          </svg>
          {fog && <img class="land-fog" src={fog} alt="" draggable={false} style={{ width: `${SHEET.w}px`, height: `${SHEET.h}px` }} />}
          {fog && <img class="land-fog drift" src={fog} alt="" draggable={false} style={{ width: `${SHEET.w}px`, height: `${SHEET.h}px` }} />}
          {fogBefore && (
            <img class="land-fog lifts" src={fogBefore} alt="" draggable={false} style={{ width: `${SHEET.w}px`, height: `${SHEET.h}px` }} />
          )}
          <LandLife nodes={m.nodes} />
          <div class={`land-tones tones ${sky ? `sky-${sky}` : ''}`}>
            <Tones dusk={dusk} />
          </div>
        </div>
        {m.nodes.map((n) => (
          <Pin key={n.id} n={n} sel={sel === n.id} fresh={fresh.has(n.id)} onPick={onPick} />
        ))}
        {sel && SHEET.at[sel] && ring.length > 0 && <PinRing key={sel} at={SHEET.at[sel]!} face={face} items={ring} />}
        {(here || mePoint) && (
          <span
            ref={meRef}
            class={`land-hero me ${legs.me ? 'walking' : ''}`}
            style={pinStyle(mePoint ?? SHEET.at[here!.id]!, legs.me ? null : -1)}
            aria-hidden="true"
          />
        )}
        {(mate || matePoint) && (
          <span
            ref={mateRef}
            class={`land-hero mate ${legs.mate ? 'walking' : ''}`}
            style={pinStyle(matePoint ?? SHEET.at[mate!.id]!, legs.mate ? null : 1)}
            aria-hidden="true"
          />
        )}
      </div>
      <div class="land-tools">
        <button class="land-tool" onClick={() => zoom(1.35)} aria-label={T.mapZoomIn} title={T.mapZoomIn}>
          +
        </button>
        <button class="land-tool" onClick={() => zoom(1 / 1.35)} aria-label={T.mapZoomOut} title={T.mapZoomOut}>
          −
        </button>
        <button class="land-tool me" onClick={toMe} aria-label={T.mapToMe} title={T.mapToMe}>
          <span class="dot me" />
        </button>
      </div>
    </div>
  );
}

/** A hero standing at a place keeps to one side of its mark (`side`), on the road it is exact. */
function pinStyle(p: Pt, side: number | null): Record<string, string> {
  return { left: `${p[0]}px`, top: `${p[1]}px`, ...(side === null ? {} : { '--side': String(side) }) };
}

function Pin({ n, sel, fresh, onPick }: { n: MapNodeView; sel: boolean; fresh: boolean; onPick: (id: string) => void }) {
  const p = SHEET.at[n.id]!;
  const can = !!n.go?.enabled || !!n.scout;
  const mark = n.known && n.icon ? markStyle(`@${n.icon}`) : null;
  return (
    <button
      class={`land-pin ${n.known ? 'known' : 'unknown'} ${n.home ? 'home' : ''} ${n.here ? 'here' : ''} ${sel ? 'sel' : ''} ${can ? 'can' : ''} ${fresh ? 'fresh' : ''}`}
      style={{ left: `${p[0]}px`, top: `${p[1]}px` }}
      onClick={() => onPick(n.id)}
      aria-label={n.known ? n.name : `${n.name} — ${T.mapUnknownShort}`}
      aria-pressed={sel}
    >
      <span class="pin-badge">
        {mark ? (
          <span class="pin-paint" style={mark} aria-hidden="true" />
        ) : n.known ? (
          <svg viewBox="-16 -16 32 32" aria-hidden="true">
            <MapIcon scene={n.icon} r={13} />
          </svg>
        ) : (
          <span class="pin-q" aria-hidden="true">
            ?
          </span>
        )}
        {n.known && n.danger > 0 && <span class="pin-danger">{n.danger}</span>}
      </span>
      {n.known && <span class="pin-name">{n.name}</span>}
    </button>
  );
}

/**
 * Which way a ring opens (degrees, -90 is up): up, unless the place is by the top edge; away from a
 * side edge it stands by.
 */
function faceOf(x: number, y: number, bw: number): number {
  const vx = x < 120 ? 1 : x > bw - 120 ? -1 : 0;
  const vy = y < 140 ? 1 : -1;
  return (Math.atan2(vy, vx * 1.2) * 180) / Math.PI;
}

/** The buttons around a picked place, fanned out in an arc on the side `face` looks to. */
function PinRing({ at, face, items }: { at: Pt; face: number; items: RingItem[] }) {
  const n = items.length;
  const span = n <= 1 ? 0 : Math.min(130, 58 * (n - 1));
  const R = 72;
  return (
    <div class="pin-ring" style={{ left: `${at[0]}px`, top: `${at[1]}px` }} role="menu">
      {items.map((it, i) => {
        const a = ((face - span / 2 + (n <= 1 ? 0 : (span / (n - 1)) * i)) * Math.PI) / 180;
        return (
          <button
            type="button"
            role="menuitem"
            class={`ring-btn ${it.primary ? 'primary' : ''}`}
            disabled={it.disabled}
            style={{ '--x': `${Math.round(Math.cos(a) * R)}px`, '--y': `${Math.round(Math.sin(a) * R)}px`, '--i': String(i) }}
            aria-label={it.sub ? `${it.label}, ${it.sub}` : it.label}
            onClick={(e) => {
              e.stopPropagation();
              it.onDo();
            }}
          >
            <span class="ring-disc">{it.icon}</span>
            <span class="ring-label">
              {it.label}
              {it.sub && <small>{it.sub}</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
