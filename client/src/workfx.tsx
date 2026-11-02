// Work in motion: while the hero is busy, a small painted vignette in the middle of the screen shows
// the work being done (the tool moves, chips and sparks fly) and the thing that comes of it slowly
// appearing. Painted marks of things are the actors; the motion is drawn here, frame by frame.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { FxKind } from '../../shared/src/content.js';
import type { PlayerView } from '../../shared/src/protocol.js';
import type { WorkLook, WorkVerb } from '../../shared/src/work.js';
import { paintedStyle } from './items.js';
import { heroFace } from './portraits.js';
import { load, store } from './clock.js';
import { T } from './strings.js';

// ---------- the player's choice: big in the middle, small in the corner, or none ----------

type Mode = 'big' | 'small' | 'off';
const KEY = 'bezgomin.workfx';

class Pref {
  mode: Mode = (['big', 'small', 'off'] as const).find((m) => m === load(KEY)) ?? 'big';
  private listeners = new Set<() => void>();
  set(m: Mode) {
    this.mode = m;
    store(KEY, m);
    for (const fn of this.listeners) fn();
  }
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
export const workPref = new Pref();

function usePref(): Mode {
  const [, force] = useState(0);
  useEffect(() => workPref.subscribe(() => force((x) => x + 1)), []);
  return workPref.mode;
}

// ---------- beats: the accent's sound and the blow on screen land together ----------

const beatListeners = new Set<(fx: FxKind) => void>();
/** Called by the ambient engine on each beat of an accent (one sound + one burst). */
export function workBeat(fx: FxKind, mate: boolean): void {
  if (!mate) for (const fn of beatListeners) fn(fx);
}

// ---------- one-shots: instant commands (sowing, gathering a bed) get a short vignette ----------

interface Shot {
  look: WorkLook;
  from: number;
  until: number;
}
let shot: Shot | null = null;
const shotListeners = new Set<() => void>();
/** Show a short vignette now (local time). */
export function playWork(verb: WorkVerb, icon?: string, ms = 1800): void {
  const now = Date.now();
  shot = { look: { verb, ...(icon ? { icon } : {}) }, from: now, until: now + ms };
  for (const fn of shotListeners) fn();
}

// ---------- programs: how each kind of work moves ----------

type Svg = 'hammer' | 'needle';
type Motion =
  | 'swing' // a tool on a handle comes down on the thing
  | 'slide' // a blade drawn across it
  | 'stir' // a ladle going round
  | 'tilt' // something poured
  | 'stitch' // a needle going in and out along rows
  | 'toss' // something thrown into the fire
  | 'pop' // things come up out of the ground into the heap
  | 'dip' // dipped into water and lifted
  | 'sway' // an oar
  | 'steps' // footprints
  | 'pulse' // breathing, a heartbeat
  | 'swap' // coins going over
  | 'shake' // shaken, sifted
  | 'twist' // twisted
  | 'draw' // a bow drawn
  | 'twang' // a bowstring fitted
  | 'squish' // kneaded
  | 'orbit' // bees round a hive
  | 'strike' // flint on steel
  | 'sow' // seeds falling, a sprout coming up
  | 'pull'; // pulled out of the ground
type Bit =
  | 'spark'
  | 'chip'
  | 'curl'
  | 'dust'
  | 'steam'
  | 'drop'
  | 'tea'
  | 'ring'
  | 'grain'
  | 'seed'
  | 'ember'
  | 'leaf'
  | 'stone'
  | 'glint'
  | 'bee'
  | 'print'
  | 'streak'
  | 'fiber'
  | 'crumb'
  | 'glow'
  | 'beat';

interface Program {
  motion: Motion;
  /** The tool: a painted thing or one drawn here. */
  prop?: string | { svg: Svg };
  /** Seconds between blows (strokes). Accents with a beat follow the beat instead. */
  every: number;
  /** Where in a stroke the blow lands (0..1). */
  hit: number;
  bits: Bit[];
  /** Bits per blow. */
  n: number;
  ground?: 'soil' | 'water';
  /** A fire under the work; 'grow' — it catches as the work goes. */
  flame?: true | 'grow';
  /** The thing glows hot on each blow. */
  heat?: boolean;
  /** No thing in the middle (the fire itself is the point). */
  bare?: boolean;
  /** What stands in the middle when the work yields nothing painted; 'face' — the hero. */
  stand?: string;
}

const P: Record<WorkVerb, Program> = {
  fire: { motion: 'toss', prop: 'wood', every: 1.4, hit: 0.55, bits: ['ember'], n: 7, flame: true, bare: true },
  flint: { motion: 'strike', prop: 'flint', every: 0.9, hit: 0.3, bits: ['spark'], n: 8, flame: 'grow', bare: true },
  forge: { motion: 'swing', prop: { svg: 'hammer' }, every: 0.7, hit: 0.12, bits: ['spark'], n: 12, heat: true, stand: 'iron' },
  whet: { motion: 'slide', prop: 'knife', every: 1.2, hit: 0.5, bits: ['spark'], n: 4 },
  chop: { motion: 'swing', prop: 'axe', every: 1.1, hit: 0.12, bits: ['chip'], n: 7 },
  water: { motion: 'dip', prop: 'water', every: 1.6, hit: 0.45, bits: ['ring', 'drop'], n: 5, ground: 'water', stand: 'water' },
  fish: { motion: 'dip', prop: 'weir', every: 2.4, hit: 0.45, bits: ['ring', 'drop'], n: 4, ground: 'water' },
  row: { motion: 'sway', prop: 'oar', every: 1.5, hit: 0.5, bits: ['ring', 'drop'], n: 3, ground: 'water' },
  steam: { motion: 'stir', prop: 'ladle', every: 1.2, hit: 0.5, bits: ['steam', 'steam', 'ring'], n: 3, flame: true, stand: 'soup' },
  walk: { motion: 'steps', every: 0.5, hit: 0, bits: ['print'], n: 1, stand: 'face' },
  twigs: { motion: 'steps', every: 0.5, hit: 0, bits: ['print', 'chip'], n: 2 },
  snare: { motion: 'steps', prop: 'rope', every: 0.55, hit: 0, bits: ['print'], n: 1 },
  send: { motion: 'steps', every: 0.35, hit: 0, bits: ['print', 'dust'], n: 2, stand: 'face' },
  arrow: { motion: 'draw', prop: 'bow', every: 2.6, hit: 0.55, bits: ['streak'], n: 1 },
  string: { motion: 'twang', prop: 'bow', every: 1.6, hit: 0.3, bits: ['fiber'], n: 3 },
  carve: { motion: 'slide', prop: 'knife', every: 0.9, hit: 0.5, bits: ['curl'], n: 3 },
  rope: { motion: 'twist', every: 1.3, hit: 0.5, bits: ['fiber'], n: 4 },
  build: { motion: 'swing', prop: { svg: 'hammer' }, every: 1.2, hit: 0.12, bits: ['chip', 'dust'], n: 5, stand: 'wood' },
  rubble: { motion: 'swing', prop: 'pick', every: 1.3, hit: 0.12, bits: ['stone', 'dust'], n: 6, ground: 'soil', stand: 'stone' },
  scrap: { motion: 'swing', prop: { svg: 'hammer' }, every: 1.4, hit: 0.12, bits: ['stone', 'spark'], n: 5 },
  sift: { motion: 'shake', every: 1.1, hit: 0.2, bits: ['grain'], n: 9 },
  rummage: { motion: 'shake', prop: 'bag', every: 1.3, hit: 0.3, bits: ['dust'], n: 2 },
  bowl: { motion: 'tilt', prop: 'millet', every: 1.8, hit: 0.35, bits: ['seed'], n: 8 },
  salt: { motion: 'slide', prop: 'knife', every: 1.2, hit: 0.5, bits: ['grain'], n: 6 },
  wax: { motion: 'squish', every: 0.9, hit: 0.3, bits: ['glint'], n: 1 },
  hive: { motion: 'orbit', every: 2.2, hit: 0.1, bits: ['bee', 'bee'], n: 2 },
  trade: { motion: 'swap', prop: 'coin', every: 1.8, hit: 0.6, bits: ['glint'], n: 3, stand: 'bag' },
  care: { motion: 'tilt', prop: 'ladle', every: 2.4, hit: 0.35, bits: ['tea', 'steam'], n: 6, stand: 'soup' },
  breath: { motion: 'pulse', every: 3.4, hit: 0, bits: ['glow'], n: 1, stand: 'face' },
  heart: { motion: 'pulse', every: 1.05, hit: 0, bits: ['beat'], n: 1, stand: 'face' },
  sew: { motion: 'stitch', prop: { svg: 'needle' }, every: 0.8, hit: 0.5, bits: [], n: 0 },
  make: { motion: 'swing', prop: { svg: 'hammer' }, every: 1, hit: 0.12, bits: ['chip', 'dust'], n: 4, stand: 'wood' },
  pick: { motion: 'pop', every: 1.2, hit: 0.75, bits: ['leaf', 'crumb'], n: 4, ground: 'soil', stand: 'g_ripe' },
  plant: { motion: 'sow', prop: 'seeds', every: 1.8, hit: 0.3, bits: ['seed'], n: 10, ground: 'soil' },
  harvest: { motion: 'pull', every: 1.8, hit: 0.35, bits: ['crumb', 'leaf'], n: 10, ground: 'soil' },
};

/** Every motion is drawn (the table is complete by its type; this is for the tests' eyes). */
export const WORK_PROGRAMS: Readonly<Record<WorkVerb, Readonly<Program>>> = P;

// ---------- small maths ----------

const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
const easeIn = (t: number) => t * t;
const rnd = (a: number, b: number) => a + Math.random() * (b - a);

/** A pose of the tool: centre in stage fractions, turn in degrees, scale, opacity. */
interface Pose {
  x: number;
  y: number;
  r: number;
  s?: number;
  o?: number;
}
/** How the thing itself moves (offsets in stage fractions). */
interface Body {
  dx?: number;
  dy?: number;
  r?: number;
  sx?: number;
  sy?: number;
}

const MID = { x: 0.5, y: 0.54 };

// ---------- the vignette ----------

const SVGS: Record<Svg, string> = {
  hammer: `<svg viewBox="0 0 100 100" aria-hidden="true"><defs>
<linearGradient id="wfh-w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9a7350"/><stop offset="1" stop-color="#5e4129"/></linearGradient>
<linearGradient id="wfh-i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8d939a"/><stop offset=".55" stop-color="#4e5359"/><stop offset="1" stop-color="#2e3135"/></linearGradient></defs>
<path d="M33 37 L86 88" stroke="#1a130d" stroke-opacity=".55" stroke-width="12" stroke-linecap="round"/>
<path d="M33 37 L86 88" stroke="url(#wfh-w)" stroke-width="8.5" stroke-linecap="round"/>
<path d="M40 41 L80 80" stroke="#c8a275" stroke-opacity=".45" stroke-width="2" stroke-linecap="round"/>
<g transform="rotate(-45 30 34)"><rect x="8" y="22" width="44" height="24" rx="4" fill="#1a130d" fill-opacity=".55"/>
<rect x="10" y="24" width="40" height="20" rx="3" fill="url(#wfh-i)"/><rect x="12" y="26" width="36" height="4" rx="2" fill="#c9ced3" fill-opacity=".55"/>
<rect x="8" y="23" width="6" height="22" rx="2" fill="#3a3d42"/></g></svg>`,
  needle: `<svg viewBox="0 0 100 100" aria-hidden="true">
<path d="M14 86 L80 20" stroke="#1a130d" stroke-opacity=".5" stroke-width="6" stroke-linecap="round"/>
<path d="M14 86 L80 20" stroke="#c9ced3" stroke-width="3.4" stroke-linecap="round"/>
<path d="M30 72 L76 26" stroke="#f4f6f8" stroke-opacity=".8" stroke-width="1" stroke-linecap="round"/>
<ellipse cx="76" cy="24" rx="5" ry="2.4" transform="rotate(-45 76 24)" fill="#2a2219"/></svg>`,
};

/** Draws one work and lives until it is over (then a short flourish). */
class Vignette {
  private root: HTMLDivElement;
  private stage: HTMLDivElement;
  private thing: HTMLDivElement | null = null;
  private ghost: HTMLDivElement | null = null;
  private body: HTMLDivElement | null = null;
  private tool: HTMLDivElement | null = null;
  private flame: HTMLDivElement | null = null;
  private ring: SVGCircleElement;
  private thread: SVGPolylineElement | null = null;
  private trail: Array<[number, number]> = [];
  private raf = 0;
  private stroke = -1; // local time the current stroke began
  private strokes = 0;
  private hitDone = false;
  private ended = 0;
  private size = 200;
  private p: Program;
  private off: () => void;

  constructor(
    host: HTMLElement,
    private look: WorkLook,
    private from: number,
    private until: number,
    /** Local time → the clock `from`/`until` are on. */
    private clock: () => number,
    private still: boolean,
    /** The hero's painted face (shown when resting). */
    private face: string | null,
    private onGone: () => void,
  ) {
    this.p = P[look.verb];
    this.root = document.createElement('div');
    this.root.className = `wf v-${look.verb}`;
    this.root.innerHTML = `<svg class="wf-time" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" pathLength="100"/></svg>`;
    this.ring = this.root.querySelector('circle')!;
    this.stage = document.createElement('div');
    this.stage.className = 'wf-stage';
    this.root.appendChild(this.stage);
    host.appendChild(this.root);
    this.build();
    const onBeat = (fx: FxKind) => {
      if (fx === look.verb) this.begin();
    };
    beatListeners.add(onBeat);
    this.off = () => beatListeners.delete(onBeat);
    this.frame = this.frame.bind(this);
    this.raf = requestAnimationFrame(this.frame);
  }

  private el(cls: string, parent: HTMLElement = this.stage): HTMLDivElement {
    const d = document.createElement('div');
    d.className = cls;
    parent.appendChild(d);
    return d;
  }

  private painted(cls: string, icon: string, parent?: HTMLElement): HTMLDivElement | null {
    const st = paintedStyle(icon);
    if (!st) return null;
    const d = this.el(`${cls} wf-paint`, parent);
    d.style.backgroundImage = st.backgroundImage;
    d.style.backgroundPosition = st.backgroundPosition;
    return d;
  }

  private build() {
    const { p, look } = this;
    if (p.ground) this.el(`wf-ground g-${p.ground}`);
    if (p.flame) {
      this.flame = this.el('wf-flame');
      this.el('wf-tongue a', this.flame);
      this.el('wf-tongue b', this.flame);
      this.el('wf-tongue c', this.flame);
    }
    const icon = look.icon && paintedStyle(look.icon) ? look.icon : p.stand;
    if (!p.bare && icon === 'face' && this.face) {
      this.body = this.el('wf-body');
      this.el('wf-face', this.body).style.backgroundImage = `url(${this.face})`;
    } else if (!p.bare && icon && icon !== 'face') {
      this.body = this.el('wf-body');
      // grown and pulled things turn on their root, the rest on their middle
      if (p.motion === 'sow' || p.motion === 'pull' || p.motion === 'squish') this.body.style.transformOrigin = '50% 92%';
      this.ghost = this.painted('wf-ghost', icon, this.body);
      this.thing = this.painted('wf-thing', icon, this.body);
    }
    if (p.prop) {
      if (typeof p.prop === 'string') this.tool = this.painted('wf-tool', p.prop);
      else {
        this.tool = this.el('wf-tool wf-svg');
        this.tool.innerHTML = SVGS[p.prop.svg];
      }
    }
    if (p.motion === 'stitch') {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'wf-thread');
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'none');
      this.thread = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      svg.appendChild(this.thread);
      this.stage.appendChild(svg);
    }
    // the tool's handle is where it turns
    if (this.tool && (p.motion === 'swing' || p.motion === 'sway')) this.tool.style.transformOrigin = '84% 84%';
    if (this.tool && p.motion === 'sway') this.tool.style.transformOrigin = '86% 14%';
  }

  /** A new stroke (on the beat, or by our own clock when no beat comes). */
  private begin() {
    this.stroke = performance.now();
    this.strokes++;
    this.hitDone = false;
  }

  private frame(t: number) {
    this.raf = requestAnimationFrame(this.frame);
    const size = this.stage.clientWidth;
    if (size) this.size = size;
    const now = this.clock();
    const span = Math.max(1, this.until - this.from);
    const prog = clamp((now - this.from) / span);
    this.ring.style.strokeDashoffset = String(100 - prog * 100);

    if (this.ended) {
      this.finale(t);
      return;
    }
    if (now >= this.until) {
      this.end(t);
      return;
    }
    // the thing appears from the bottom up as the work goes
    if (this.thing) {
      const edge = 6 + prog * 100;
      const mask = `linear-gradient(to top, #000 ${edge - 12}%, transparent ${edge}%)`;
      this.thing.style.maskImage = mask;
      this.thing.style.webkitMaskImage = mask;
    }
    if (this.flame) {
      const k = this.p.flame === 'grow' ? 0.35 + 0.65 * prog : 1;
      this.flame.style.transform = `translateX(-50%) scale(${k})`;
    }
    if (this.still) return;

    const every = this.p.every * 1000;
    // no beat came in time: keep our own rhythm
    if (this.stroke < 0 || t - this.stroke > every * 1.15) this.begin();
    const k = clamp((t - this.stroke) / every);
    const { pose, body } = this.move(k, prog);
    if (this.tool && pose) {
      const s = pose.s ?? 1;
      this.tool.style.transform = `translate(${(pose.x - 0.5) * this.size}px, ${(pose.y - 0.5) * this.size}px) rotate(${pose.r}deg) scale(${s})`;
      this.tool.style.opacity = String(pose.o ?? 1);
    }
    if (this.body) {
      const b = body ?? {};
      this.body.style.transform = `translate(${(b.dx ?? 0) * this.size}px, ${(b.dy ?? 0) * this.size}px) rotate(${b.r ?? 0}deg) scale(${b.sx ?? 1}, ${b.sy ?? 1})`;
    }
    if (!this.hitDone && k >= this.p.hit) {
      this.hitDone = true;
      this.blow(pose, prog);
    }
  }

  /** Where the tool and the thing are at this point of a stroke. */
  private move(k: number, prog: number): { pose: Pose | null; body?: Body } {
    const p = this.p;
    const side = this.strokes % 2 ? 1 : -1;
    switch (p.motion) {
      case 'swing': {
        // down fast, a short rest on the thing, back up slowly
        const down = p.hit;
        const r =
          k < down ? 15 - 55 * easeIn(k / down) : k < down + 0.08 ? -40 : -40 + 55 * easeOut(clamp((k - down - 0.08) / 0.55));
        return { pose: { x: 0.735, y: 0.33, r }, body: k >= down && k < down + 0.1 ? { sy: 0.96, sx: 1.03 } : {} };
      }
      case 'slide': {
        const x = MID.x + 0.16 * Math.sin(k * Math.PI * 2);
        return { pose: { x: x + 0.05, y: MID.y - 0.17, r: -12 + 6 * Math.cos(k * Math.PI * 2) } };
      }
      case 'stir': {
        const a = k * Math.PI * 2;
        return { pose: { x: MID.x + 0.1 + 0.12 * Math.cos(a), y: MID.y - 0.2 + 0.04 * Math.sin(a), r: -20 + 8 * Math.sin(a) } };
      }
      case 'tilt': {
        const r = k < 0.25 ? -45 * easeOut(k / 0.25) : k < 0.65 ? -45 : -45 + 45 * easeOut((k - 0.65) / 0.35);
        return { pose: { x: 0.72, y: 0.25, r, s: 0.85 } };
      }
      case 'stitch': {
        // rows across the thing, top to bottom as the work goes; in and out on every stroke
        const rows = 5;
        const row = Math.min(rows - 1, Math.floor(prog * rows));
        const along = (prog * rows) % 1;
        const dir = row % 2 ? -1 : 1;
        const x = MID.x + dir * (along - 0.5) * 0.34;
        const y = MID.y - 0.16 + row * 0.08;
        const dip = Math.sin(k * Math.PI * 2) * 0.03;
        return { pose: { x: x + 0.13, y: y - 0.13 + dip, r: 0 } };
      }
      case 'toss': {
        const t = clamp(k / p.hit);
        const x = 0.86 - 0.36 * t;
        const y = 0.12 + 0.6 * t - 0.34 * Math.sin(t * Math.PI);
        return { pose: { x, y, r: 260 * t, s: 0.8 - 0.3 * t, o: k < p.hit ? 1 : 0 } };
      }
      case 'pop':
        return { pose: null, body: k >= p.hit && k < p.hit + 0.1 ? { sy: 1.05, sx: 0.97 } : {} };
      case 'dip': {
        const y = 0.26 + 0.38 * Math.sin(clamp(k / 0.9) * Math.PI);
        return { pose: { x: 0.5 + 0.18 * side, y, r: 8 * side, s: 0.8 } };
      }
      case 'sway':
        return { pose: { x: 0.62, y: 0.4, r: 22 * Math.sin(k * Math.PI * 2) } };
      case 'steps':
        return { pose: this.tool ? { x: 0.8, y: 0.3, r: 0, s: 0.6 } : null, body: { dy: -0.015 * Math.abs(Math.sin(k * Math.PI)) } };
      case 'pulse': {
        const beat = this.look.verb === 'heart' ? Math.max(0, Math.sin(k * Math.PI * 2)) ** 6 + 0.6 * Math.max(0, Math.sin((k - 0.18) * Math.PI * 2)) ** 6 : Math.sin(k * Math.PI) ** 2;
        const s = 1 + (this.look.verb === 'heart' ? 0.06 : 0.05) * beat;
        return { pose: null, body: { sx: s, sy: s } };
      }
      case 'swap': {
        const t = easeOut(clamp(k / p.hit));
        return { pose: { x: 0.86 - 0.36 * t, y: 0.3 + 0.2 * t - 0.2 * Math.sin(t * Math.PI), r: 0, s: 0.55, o: k < p.hit ? 1 : 1 - clamp((k - p.hit) / 0.2) } };
      }
      case 'shake': {
        const j = k < 0.45 ? Math.sin(k * 60) * (0.45 - k) * 0.06 : 0;
        return { pose: this.tool ? { x: 0.75 + j, y: 0.3, r: j * 300, s: 0.75 } : null, body: this.tool ? {} : { dx: j, r: j * 120 } };
      }
      case 'twist':
        return { pose: null, body: { r: 10 * Math.sin(k * Math.PI * 2), sx: 1 - 0.03 * Math.abs(Math.sin(k * Math.PI * 2)) } };
      case 'draw': {
        const pull = k < p.hit ? easeIn(k / p.hit) : 0;
        return { pose: { x: 0.22, y: 0.45, r: -30, s: 1 - 0.12 * pull } };
      }
      case 'twang': {
        const w = k > p.hit ? Math.sin((k - p.hit) * 50) * (1 - k) : 0;
        return { pose: { x: 0.25, y: 0.42, r: -30 + w * 6, s: 1 + w * 0.04 } };
      }
      case 'squish': {
        const q = Math.sin(clamp(k / 0.6) * Math.PI);
        return { pose: null, body: { sx: 1 + 0.1 * q, sy: 1 - 0.08 * q } };
      }
      case 'orbit':
        return { pose: null, body: { dy: -0.01 * Math.sin(k * Math.PI * 2) } };
      case 'strike': {
        const r = k < p.hit ? 20 * (1 - easeIn(k / p.hit)) : 20 * easeOut((k - p.hit) / (1 - p.hit));
        return { pose: { x: 0.42, y: 0.56, r, s: 0.6 } };
      }
      case 'sow': {
        const r = k < 0.2 ? -60 * easeOut(k / 0.2) : k < 0.6 ? -60 : -60 + 60 * easeOut((k - 0.6) / 0.4);
        const up = clamp((prog - 0.25) / 0.6);
        return { pose: { x: 0.66, y: 0.24, r, s: 0.7, o: 1 - clamp((prog - 0.75) / 0.2) }, body: { sy: 0.1 + 0.9 * easeOut(up), sx: 0.6 + 0.4 * up, dy: 0.08 * (1 - up) } };
      }
      case 'pull': {
        const up = easeIn(clamp((prog - 0.15) / 0.75));
        const tug = prog < 0.15 ? Math.sin(k * 40) * 0.01 : 0;
        return { pose: null, body: { dy: 0.12 - 0.3 * up + tug, r: tug * 200 } };
      }
    }
  }

  /** The blow: bits fly from where the tool met the thing. */
  private blow(pose: Pose | null, prog: number) {
    const p = this.p;
    let at = { x: MID.x, y: MID.y - 0.08 };
    switch (p.motion) {
      case 'swing':
        at = { x: 0.47, y: 0.44 };
        if (p.heat && this.thing) {
          this.thing.animate([{ filter: 'brightness(1.6) sepia(.6) saturate(3) hue-rotate(-20deg) drop-shadow(0 0 10px #e0703a)' }, { filter: 'none' }], { duration: 420 });
        }
        break;
      case 'slide':
        at = { x: pose ? pose.x - 0.1 : MID.x, y: MID.y - 0.12 };
        break;
      case 'stir':
        at = { x: MID.x, y: MID.y - 0.22 };
        break;
      case 'tilt':
        at = { x: 0.56, y: 0.32 };
        break;
      case 'stitch':
        if (pose && this.thread) {
          this.trail.push([(pose.x - 0.13) * 100, (pose.y + 0.13) * 100]);
          if (this.trail.length > 9) this.trail.shift();
          this.thread.setAttribute('points', [...this.trail, [(pose.x + 0.15) * 100, (pose.y - 0.15) * 100]].map((q) => q.join(',')).join(' '));
        }
        return;
      case 'toss':
        at = { x: 0.5, y: 0.74 };
        this.flame?.animate([{ filter: 'brightness(1.5)' }, { filter: 'brightness(1)' }], { duration: 500 });
        break;
      case 'pop': {
        // a small one comes out of the ground and lands on the heap
        const icon = this.look.icon && paintedStyle(this.look.icon) ? this.look.icon : 'g_ripe';
        const one = this.painted('wf-mini', icon);
        if (one) {
          const sx = (Math.random() < 0.5 ? -1 : 1) * rnd(0.28, 0.36) * this.size;
          one.animate(
            [
              { transform: `translate(${sx}px, ${0.3 * this.size}px) scale(.6)`, opacity: 0 },
              { transform: `translate(${sx * 0.5}px, ${-0.12 * this.size}px) scale(.7)`, opacity: 1, offset: 0.45 },
              { transform: 'translate(0, 0) scale(.5)', opacity: 0 },
            ],
            { duration: 700, easing: 'ease-in-out' },
          ).onfinish = () => one.remove();
        }
        at = { x: 0.5 + rnd(-0.3, 0.3), y: 0.8 };
        break;
      }
      case 'dip':
        at = { x: pose?.x ?? 0.5, y: 0.78 };
        break;
      case 'sway':
        at = { x: 0.4, y: 0.8 };
        break;
      case 'steps':
        at = { x: 0.18 + ((this.strokes * 0.09) % 0.64), y: this.strokes % 2 ? 0.84 : 0.9 };
        break;
      case 'draw':
        at = { x: 0.3, y: 0.45 };
        break;
      case 'swap':
        at = { x: 0.5, y: 0.45 };
        break;
      case 'strike':
        at = { x: 0.48, y: 0.62 };
        break;
      case 'sow':
        at = { x: 0.58, y: 0.36 };
        break;
      case 'pull':
        at = { x: 0.5, y: 0.78 };
        if (prog < 0.15 || prog > 0.85) return;
        break;
      default:
        break;
    }
    for (let i = 0; i < p.n; i++) this.bit(p.bits[i % p.bits.length]!, at, i);
  }

  /** One flying bit, animated by the browser and gone when done. */
  private bit(kind: Bit, at: { x: number; y: number }, i: number) {
    const S = this.size;
    const d = this.el(`wf-bit b-${kind}`);
    d.style.left = `${at.x * S}px`;
    d.style.top = `${at.y * S}px`;
    const fall = (vx: number, vy: number, g: number, ms: number, spin = 0, fade = true) => {
      const fr: Keyframe[] = [];
      for (let j = 0; j <= 8; j++) {
        const t = j / 8;
        fr.push({ transform: `translate(${vx * t * S}px, ${(vy * t + g * t * t) * S}px) rotate(${spin * t}deg)`, opacity: fade ? 1 - t ** 3 : 1 });
      }
      return d.animate(fr, { duration: ms, fill: 'forwards' });
    };
    let a: Animation;
    switch (kind) {
      case 'spark':
        a = fall(rnd(-0.35, 0.35), rnd(-0.4, -0.1), 0.5, rnd(350, 550));
        break;
      case 'chip':
      case 'stone':
        a = fall(rnd(-0.3, 0.3), rnd(-0.35, -0.15), 0.6, rnd(550, 800), rnd(-500, 500));
        break;
      case 'crumb':
        a = fall(rnd(-0.2, 0.2), rnd(-0.25, -0.08), 0.4, rnd(500, 700));
        break;
      case 'curl':
      case 'fiber':
        a = fall(rnd(-0.15, 0.15), rnd(-0.08, 0.02), 0.22, rnd(800, 1100), rnd(-300, 300));
        break;
      case 'leaf':
        a = fall(rnd(-0.25, 0.25), rnd(-0.3, -0.12), 0.45, rnd(800, 1100), rnd(-400, 400));
        break;
      case 'drop':
      case 'tea':
        a = kind === 'tea' ? fall(rnd(-0.03, 0.03), 0.02, 0.32, 520 + i * 40) : fall(rnd(-0.15, 0.15), rnd(-0.3, -0.12), 0.55, rnd(450, 650));
        break;
      case 'grain':
      case 'seed':
        a = fall(rnd(-0.06, 0.06), rnd(0, 0.04), 0.4, rnd(500, 750) + i * 25);
        break;
      case 'ember':
        a = fall(rnd(-0.12, 0.12), rnd(-0.55, -0.35), 0.15, rnd(900, 1300));
        break;
      case 'steam':
        d.style.left = `${(at.x + rnd(-0.12, 0.12)) * S}px`;
        a = d.animate(
          [
            { transform: 'translate(0,0) scale(.5)', opacity: 0 },
            { transform: `translate(${rnd(-0.04, 0.04) * S}px, ${-0.14 * S}px) scale(1)`, opacity: 1, offset: 0.3 },
            { transform: `translate(${rnd(-0.1, 0.1) * S}px, ${-0.4 * S}px) scale(1.7)`, opacity: 0 },
          ],
          { duration: rnd(1400, 1900), fill: 'forwards' },
        );
        break;
      case 'dust':
        d.style.left = `${(at.x + rnd(-0.08, 0.08)) * S}px`;
        a = d.animate(
          [
            { transform: 'translate(0,0) scale(.4)', opacity: 0.9 },
            { transform: `translate(${rnd(-0.12, 0.12) * S}px, ${rnd(-0.12, -0.04) * S}px) scale(1.8)`, opacity: 0 },
          ],
          { duration: rnd(700, 1000), fill: 'forwards' },
        );
        break;
      case 'ring':
        a = d.animate([{ transform: 'scale(.2)', opacity: 0.9 }, { transform: 'scale(1.6)', opacity: 0 }], { duration: 1000 + i * 120, fill: 'forwards' });
        break;
      case 'glint':
        d.style.left = `${(at.x + rnd(-0.18, 0.18)) * S}px`;
        d.style.top = `${(at.y + rnd(-0.15, 0.1)) * S}px`;
        a = d.animate([{ transform: 'rotate(45deg) scale(0)', opacity: 1 }, { transform: 'rotate(45deg) scale(1.2)', opacity: 1, offset: 0.4 }, { transform: 'rotate(45deg) scale(0)', opacity: 0 }], {
          duration: 600,
          delay: i * 90,
          fill: 'forwards',
        });
        break;
      case 'bee': {
        const r = rnd(0.2, 0.3) * S;
        const a0 = rnd(0, Math.PI * 2);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const fr: Keyframe[] = [];
        for (let j = 0; j <= 12; j++) {
          const q = a0 + dir * (j / 12) * Math.PI * 2;
          fr.push({ transform: `translate(${Math.cos(q) * r}px, ${Math.sin(q) * r * 0.6 + Math.sin(j * 2) * 3}px)`, opacity: j === 0 || j === 12 ? 0 : 1 });
        }
        a = d.animate(fr, { duration: 2000, fill: 'forwards' });
        break;
      }
      case 'print':
        d.style.transform = `rotate(${this.strokes % 2 ? 8 : -8}deg)`;
        a = d.animate([{ opacity: 0 }, { opacity: 0.7, offset: 0.1 }, { opacity: 0 }], { duration: 1600, fill: 'forwards' });
        break;
      case 'streak':
        a = d.animate([{ transform: 'translateX(0) scaleX(.3)', opacity: 1 }, { transform: `translateX(${0.75 * S}px) scaleX(1)`, opacity: 0 }], { duration: 380, fill: 'forwards' });
        break;
      case 'glow':
      case 'beat':
        d.style.left = `${MID.x * S}px`;
        d.style.top = `${MID.y * S}px`;
        a = d.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0.8 }, { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }], {
          duration: kind === 'glow' ? 3000 : 900,
          fill: 'forwards',
        });
        break;
      default:
        a = d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500 });
    }
    a.onfinish = () => d.remove();
  }

  /** The work is done: the thing shows whole, a little flash, and the vignette goes. */
  private end(t: number) {
    this.ended = t;
    this.off();
    if (this.thing) {
      this.thing.style.maskImage = 'none';
      this.thing.style.webkitMaskImage = 'none';
    }
    if (this.tool) this.tool.animate([{ opacity: Number(this.tool.style.opacity || 1) }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    if (this.still) return;
    if (this.body) this.body.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 650, easing: 'ease-out' });
    this.thing?.animate([{ filter: 'brightness(1.8)' }, { filter: 'brightness(1)' }], { duration: 700 });
    const at = { x: MID.x, y: MID.y - 0.05 };
    for (let i = 0; i < 6; i++) this.bit('glint', at, i);
  }

  private finale(t: number) {
    const k = (t - this.ended) / 1400;
    if (k > 0.6) this.root.style.opacity = String(clamp(1 - (k - 0.6) / 0.4));
    if (k >= 1) this.destroy();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.off();
    this.root.remove();
    this.onGone();
  }
}

/** Dev lab only: one vignette in a host, started over every time it ends. */
export function loopWork(host: HTMLElement, look: WorkLook, ms: number): () => void {
  let vig: Vignette | null = null;
  let stop = false;
  const go = () => {
    if (stop) return;
    const from = Date.now();
    vig = new Vignette(host, look, from, from + ms, () => Date.now(), false, null, () => window.setTimeout(go, 400));
  };
  go();
  return () => {
    stop = true;
    vig?.destroy();
  };
}

function reducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * The vignette of the hero's running work. `hidden` while a scene or a fight is up (the work goes on,
 * it is just not shown over them).
 */
export function WorkFx({ v, offset, hidden }: { v: PlayerView; offset: number; hidden: boolean }) {
  const mode = usePref();
  const host = useRef<HTMLDivElement>(null);
  const live = useRef<{ key: string; vig: Vignette } | null>(null);
  const [, force] = useState(0);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const fn = () => force((x) => x + 1);
    shotListeners.add(fn);
    return () => void shotListeners.delete(fn);
  }, []);

  const serverNow = Date.now() + offset;
  const work = v.busyLook && v.busyUntil > serverNow ? { key: `${v.busyAction}:${v.busyUntil}`, look: v.busyLook, from: v.busyFrom, until: v.busyUntil, clock: () => Date.now() + offset } : null;
  const one = shot && shot.until > Date.now() ? { key: `shot:${shot.from}`, look: shot.look, from: shot.from, until: shot.until, clock: () => Date.now() } : null;
  const run = work ?? one;
  const key = mode === 'off' ? null : run?.key ?? null;

  useEffect(() => {
    const cur = live.current;
    if (cur && cur.key === key) return;
    if (!key || !run || !host.current) return; // a finished vignette ends by itself
    cur?.vig.destroy();
    const vig = new Vignette(host.current, run.look, run.from, run.until, run.clock, reducedMotion(), heroFace(v.me.role, v.me.gender), () => {
      if (live.current?.vig === vig) {
        live.current = null;
        setOn(false);
      }
    });
    live.current = { key, vig };
    setOn(true);
  }, [key]);
  useEffect(() => () => live.current?.vig.destroy(), []);
  useEffect(() => {
    if (mode === 'off') live.current?.vig.destroy();
  }, [mode]);

  const label = mode === 'small' ? T.workFxBig : T.workFxSmall;
  return (
    <div
      ref={host}
      class={`workfx ${mode === 'small' ? 'small' : 'big'} ${on && !hidden ? 'on' : ''}`}
      role="button"
      tabIndex={on && !hidden ? 0 : -1}
      aria-label={label}
      title={label}
      onClick={() => workPref.set(mode === 'small' ? 'big' : 'small')}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          workPref.set(mode === 'small' ? 'big' : 'small');
        }
      }}
    />
  );
}
