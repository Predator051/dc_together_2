// A place drawn as a plan: every workplace or corner is a spot to tap, its work opens on demand.

import { createContext, type ComponentChildren, type JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { PLAN_FIXED } from '../../shared/src/content.js';
import type { GroupView, PlayerView } from '../../shared/src/protocol.js';
import { IconPair } from './icons.js';
import { duskOf } from './ambient.js';
import { Ground, picture, stationUrl } from './pictures.js';
import { Sheet } from './sheet.js';
import { T } from './strings.js';

// ---------------------------------------------------------------------------- what was seen

const SEEN_KEY = 'bezgomin.planSeen';

function loadSeen(): string[] | null {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}
function storeSeen(ids: Set<string>): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* storage unavailable: the marks last until reload */
  }
}
function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

/** Places and works this device has shown. On the first run everything there is counts as seen. */
function useSeen(all: string[]): [Set<string>, (ids: string[]) => void] {
  const [seen, setSeen] = useState<Set<string>>(() => {
    const stored = loadSeen();
    if (stored) return new Set(stored);
    const now = new Set(all);
    storeSeen(now);
    return now;
  });
  const mark = (ids: string[]) =>
    setSeen((old) => {
      if (ids.every((id) => old.has(id))) return old;
      const next = new Set(old);
      for (const id of ids) next.add(id);
      storeSeen(next);
      return next;
    });
  return [seen, mark];
}

// ---------------------------------------------------------------------------- the plan

export interface Spot {
  id: string;
  name: string;
  x: number;
  y: number;
  icon: string;
  /** Things to do here right now. */
  ready: number;
  together: boolean;
  /** Something wants attention (people hungry or hurt). */
  warn?: boolean;
  /** Keys of what is here, for the "new" mark. */
  keys: string[];
  progress?: { n: number; max: number };
  /** The bag: how full it is (shown on the spot, so nobody has to open it to know). */
  meter?: { load: number; cap: number };
  /** What opens when the spot is tapped. */
  body: () => JSX.Element;
}

/**
 * Spots for the groups here, plus the way out. A group with named spots is split by them (a spot
 * with nothing to do yet is not drawn: it would tell too much). Groups without a spot are returned apart.
 */
export function groupSpots(groups: GroupView[], body: (g: GroupView) => JSX.Element): [Spot[], GroupView[]] {
  const spots: Spot[] = [];
  const rest: GroupView[] = [];
  const add = (g: GroupView, at: { x: number; y: number; icon: string }) =>
    spots.push({
      id: g.id,
      name: g.name,
      ...at,
      ready: g.id === 'paths' ? 0 : g.entries.filter((e) => e.enabled && e.kind !== 'go').length,
      together: g.entries.some((e) => e.enabled && !!e.together && (e.kind === 'scene' || e.kind === 'pool')),
      keys: [g.id, ...g.entries.filter((e) => e.kind !== 'go').map((e) => `${g.id}:${e.id}`)],
      ...(g.progress ? { progress: { n: g.progress.n, max: g.progress.max } } : {}),
      body: () => body(g),
    });
  for (const g of groups) {
    if (g.spots?.length) {
      for (const sp of g.spots) {
        const entries = g.entries.filter((e) => e.spot === sp.id);
        const partner = (g.partner ?? []).filter((m) => m.spot === sp.id);
        if (!entries.length && !partner.length) continue;
        add({ id: `${g.id}/${sp.id}`, name: sp.name, desc: '', base: false, entries, ...(partner.length ? { partner } : {}) }, sp);
      }
      const known = new Set(g.spots.map((sp) => sp.id));
      const loose = g.entries.filter((e) => !e.spot || !known.has(e.spot));
      const loosePartner = (g.partner ?? []).filter((m) => !m.spot || !known.has(m.spot));
      if (g.plan && (loose.length || loosePartner.length)) {
        add({ id: g.id, name: g.name, desc: '', base: g.base, entries: loose, ...(loosePartner.length ? { partner: loosePartner } : {}) }, g.plan);
      }
      continue;
    }
    const at = g.plan ?? (g.id === 'paths' ? PLAN_FIXED.gate : null);
    if (!at) {
      rest.push(g);
      continue;
    }
    add(g, at);
  }
  return [spots, rest];
}

/** Inside an opened spot with a painted close view: the spot's icon (what opens draws the view, its works on it). */
export const StageOn = createContext<string | null>(null);

/** An opened spot: one with a painted close view draws it with its works (or things, or people) on it. */
function Stage({ icon, children }: { icon: string; children: ComponentChildren }) {
  return stationUrl(icon) ? <StageOn.Provider value={icon}>{children}</StageOn.Provider> : <>{children}</>;
}

export function extraSpot(
  id: 'store' | 'bag' | 'folk',
  name: string,
  body: () => JSX.Element,
  warn = false,
  meter?: Spot['meter'],
): Spot {
  const at = id === 'bag' ? { ...PLAN_FIXED.store, icon: 'bag' as const } : PLAN_FIXED[id];
  return { id, name, ...at, ready: 0, together: false, warn, keys: [id], body, ...(meter ? { meter } : {}) };
}

/** Room left in the bag, as a short number. */
export function bagFree(m: NonNullable<Spot['meter']>): string {
  return String(Math.max(0, Math.floor((m.cap - m.load) * 10) / 10));
}

/** A ring around the bag spot: how full it is. */
function FillRing({ m }: { m: NonNullable<Spot['meter']> }) {
  const p = Math.max(0, Math.min(1, m.load / Math.max(1, m.cap)));
  return (
    <svg class={`spot-fill ${p >= 1 ? 'full' : p >= 0.8 ? 'high' : ''}`} viewBox="0 0 50 50" aria-hidden="true">
      <circle cx="25" cy="25" r="23" pathLength={100} style={{ strokeDashoffset: `${(1 - p) * 100}px` }} />
    </svg>
  );
}

/** A ring around the spot that fills while my work here runs (pure CSS, like the other bars). */
function RunRing({ from, until, offset }: { from: number; until: number; offset: number }) {
  const [start] = useState(() => {
    const now = Date.now() + offset;
    const span = Math.max(1, until - from);
    return { p: Math.max(0, Math.min(1, (now - from) / span)), left: Math.max(0, until - now) };
  });
  return (
    <svg class="spot-run" viewBox="0 0 50 50" aria-hidden="true">
      <circle cx="25" cy="25" r="23" pathLength={100} style={{ '--p0': String(start.p), animationDuration: `${start.left}ms` }} />
    </svg>
  );
}

function SpotButton({
  s,
  i,
  active,
  fresh,
  running,
  v,
  offset,
  now,
  onPick,
}: {
  s: Spot;
  /** Its order: spots come up one after another. */
  i: number;
  active: boolean;
  fresh: boolean;
  running: boolean;
  v: PlayerView;
  offset: number;
  now: number;
  onPick: () => void;
}) {
  const label = [
    s.name,
    s.ready > 0 ? `${T.planReady} ${s.ready}` : '',
    s.together ? T.together : '',
    fresh ? T.planNew : '',
    s.meter ? `${T.bagFree} ${bagFree(s.meter)}` : '',
  ]
    .filter(Boolean)
    .join(', ');
  // standing on a building drawn in the yard: the mark steps to its lower inner corner, smaller
  const on = v.yard.find((y) => y.spot === s.icon);
  const at = on ? { x: s.x + (s.x < 50 ? 1 : -1) * on.w * 0.36, y: s.y + on.w * 0.36 } : s;
  return (
    <button
      type="button"
      class={`spot ${on ? 'on-built' : ''} ${active ? 'on' : ''} ${s.ready > 0 || s.id === 'paths' || s.id === 'store' || s.id === 'bag' || s.id === 'folk' ? 'live' : 'idle'} ${s.together ? 'pair' : ''} ${running ? 'running' : ''}`}
      style={{ left: `${at.x}%`, top: `${at.y}%`, '--i': String(i) }}
      aria-label={label}
      aria-pressed={active}
      onClick={onPick}
    >
      <span class="spot-medal">
        {picture(s.icon)}
        {running && <RunRing key={v.busyUntil} from={v.busyFrom} until={v.busyUntil} offset={offset} />}
        {s.meter && <FillRing m={s.meter} />}
        {s.ready > 0 && (
          <span key={s.ready} class="spot-count">
            {s.ready}
          </span>
        )}
        {s.together && (
          <span class="spot-pair">
            <IconPair />
          </span>
        )}
        {(fresh || s.warn) && <span class={`spot-dot ${s.warn ? 'warn' : ''}`} />}
      </span>
      <span class="spot-name">
        {s.name}
        {running && <small>{Math.max(1, Math.ceil((v.busyUntil - now) / 1000))} {T.sec}</small>}
        {s.meter && (
          <small class={`spot-free ${s.meter.load >= s.meter.cap ? 'full' : ''}`}>
            {T.bagFree} {bagFree(s.meter)}
          </small>
        )}
      </span>
      {s.progress && (
        <span class="spot-progress" aria-hidden="true">
          <span style={{ width: `${(s.progress.n / s.progress.max) * 100}%` }} />
        </span>
      )}
    </button>
  );
}

export function AreaPlan({
  scene,
  spots,
  v,
  now,
  offset,
  desktop,
  onList,
}: {
  scene: string;
  spots: Spot[];
  v: PlayerView;
  now: number;
  offset: number;
  desktop: boolean;
  onList: () => void;
}) {
  const [seen, mark] = useSeen(spots.flatMap((s) => s.keys));
  // a tap opens the place: on a phone it slides up over the plan, on a computer it takes the plan's room
  const [pick, setPick] = useState<string | null>(() => load(`bezgomin.spot.${scene}`));
  const [sheet, setSheet] = useState(false);
  // which way the open place came in from: a swipe slides it in from its side, a tap just opens it
  const [came, setCame] = useState<-1 | 0 | 1>(0);
  const fallback = spots.find((s) => s.ready > 0)?.id ?? spots[0]?.id ?? null;
  const openId = spots.some((s) => s.id === pick) ? pick : fallback;
  const open = spots.find((s) => s.id === openId) ?? null;
  const shown = sheet ? open : null;
  const busy = v.busyUntil > now ? v.busyAction : null;
  const runsAt = busy ? spots.find((s) => s.keys.some((k) => k.endsWith(`:${busy}`)))?.id : undefined;

  useEffect(() => {
    if (shown) mark(shown.keys);
  }, [shown?.id, shown?.keys.join()]);
  useEffect(() => {
    if (pick) store(`bezgomin.spot.${scene}`, pick);
  }, [pick]);
  // the close views of this place come ahead, so a swipe to the next one shows it painted at once
  const icons = spots.map((s) => s.icon).join();
  useEffect(() => {
    const id = window.setTimeout(() => {
      for (const icon of new Set(icons.split(','))) {
        const url = stationUrl(icon);
        if (url) new Image().src = url;
      }
    }, 800);
    return () => window.clearTimeout(id);
  }, [icons]);
  // the chip of the open place is always in sight
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chips.current?.querySelector('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [shown?.id]);

  const choose = (id: string) => {
    if (sheet && id === openId) {
      setSheet(false);
      return;
    }
    setCame(0);
    setPick(id);
    setSheet(true);
  };
  const isFresh = (s: Spot) => s.keys.some((k) => !seen.has(k));

  return (
    <div class="home">
      {!(desktop && shown) && (
        <>
          <div class="plan-tools">
            <button type="button" class="btn small ghost" onClick={onList}>
              {T.planAsList}
            </button>
          </div>
          <div class="plan" role="group" aria-label={T.planTitle}>
            <Ground
              scene={scene}
              warm={v.stove.state === 'warm' || v.stove.state === 'low'}
              dusk={v.ambient.kind === 'cellar' || v.ambient.kind === 'candle' ? 0 : duskOf(v.dayAt, now)}
              sky={v.ambient.sky ?? undefined}
              pieces={v.yard}
            />
            {spots.map((s, i) => (
              <SpotButton
                key={s.id}
                s={s}
                i={i}
                active={!!shown && shown.id === s.id}
                fresh={isFresh(s) && !(shown && shown.id === s.id)}
                running={runsAt === s.id}
                v={v}
                offset={offset}
                now={now}
                onPick={() => choose(s.id)}
              />
            ))}
          </div>
        </>
      )}
      {shown && (
        <Sheet
          desktop={desktop}
          label={shown.name}
          back={T.planBack}
          backIcon={picture('home')}
          bodyKey={shown.id}
          onClose={() => setSheet(false)}
          low
          came={came}
          onSwipe={(dir) => {
            const i = spots.findIndex((x) => x.id === shown.id);
            const next = spots[(i + dir + spots.length) % spots.length];
            if (!next) return;
            setCame(dir);
            setPick(next.id);
          }}
          bar={
            <div class="station-chips" role="tablist" ref={chips}>
              {spots.map((s) => (
                <button
                  type="button"
                  role="tab"
                  aria-selected={s.id === shown.id}
                  class={`chip ${s.id === shown.id ? 'on' : ''} ${runsAt === s.id ? 'running' : ''}`}
                  onClick={() => {
                    setCame(0);
                    setPick(s.id);
                  }}
                >
                  {picture(s.icon)}
                  <span>{s.name}</span>
                  {s.meter && (
                    <small class={`chip-free ${s.meter.load >= s.meter.cap ? 'full' : ''}`} title={T.bagFree}>
                      {bagFree(s.meter)}
                    </small>
                  )}
                  {s.id !== shown.id && (isFresh(s) || s.together) && <span class="badge" />}
                </button>
              ))}
            </div>
          }
        >
          <Stage icon={shown.icon}>
            {shown.body()}
          </Stage>
        </Sheet>
      )}
    </div>
  );
}

/** Back from the list to the plan. */
export function PlanBack({ onPlan }: { onPlan: () => void }) {
  return (
    <div class="plan-tools">
      <button type="button" class="btn small ghost" onClick={onPlan}>
        {T.planAsPlan}
      </button>
    </div>
  );
}
