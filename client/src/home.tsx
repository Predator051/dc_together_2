// Home drawn as a plan of the yard: every workplace is a spot to tap, its work opens on demand.

import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { PLAN_FIXED } from '../../shared/src/content.js';
import type { GroupView, PlayerView } from '../../shared/src/protocol.js';
import { IconPair } from './icons.js';
import { T } from './strings.js';

// ---------------------------------------------------------------------------- pictures

function Pic({ children }: { children: ComponentChildren }) {
  return (
    <svg
      class="spot-pic"
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const PICS: Record<string, () => JSX.Element> = {
  hearth: () => (
    <Pic>
      <path d="M5 25h22" />
      <path d="M7 25c0-2 1.5-3 3.5-3M25 25c0-2-1.5-3-3.5-3M13 25c0-1.5 1.3-2.4 3-2.4s3 .9 3 2.4" />
      <path class="flame" d="M16 20c-3.6 0-5-2.6-4-5.6.8 1.6 1.8 2 1.8 2-.2-3.6 1.8-6 4-7.6-.2 2.8 2.8 3.8 2.8 7.4 0 2.6-1.6 3.8-4.6 3.8z" />
    </Pic>
  ),
  well: () => (
    <Pic>
      <path d="M6 10l10-5 10 5M8 10v16M24 10v16" />
      <path d="M16 10v5M14.2 15h3.6l-.5 3h-2.6z" />
      <path d="M6 20h20v6H6z" />
    </Pic>
  ),
  bench: () => (
    <Pic>
      <path d="M3 14h26v3H3z" />
      <path d="M6 17v9M26 17v9M6 22h20" />
      <path d="M11 14v-3h9v3M18 11l2-3" />
    </Pic>
  ),
  pan: () => (
    <Pic>
      <path d="M4 17h24l-2.5 3h-19z" />
      <path d="M6.5 20v6h19v-6M13 26v-2.5a3 3 0 0 1 6 0V26" />
      <path class="steam" d="M11 13c-1.2-1.2 1.2-2.2 0-3.6M16 13c-1.2-1.2 1.2-2.2 0-3.6M21 13c-1.2-1.2 1.2-2.2 0-3.6" />
    </Pic>
  ),
  hides: () => (
    <Pic>
      <path d="M7 4v24M25 4v24M5 6h22M5 26h22" />
      <path d="M11 9.5c2.5 1 7.5 1 10 0 1 2.6-1 3.6 0 6.5s1 4.4 0 6.5c-2.5-1-7.5-1-10 0-1-2.1 1-3.6 0-6.5s-1-3.9 0-6.5z" />
    </Pic>
  ),
  kiln: () => (
    <Pic>
      <path d="M3 26c2-8.5 7-12.5 13-12.5S27 17.5 29 26z" />
      <path d="M13 26v-2.6a3 3 0 0 1 6 0V26" />
      <path class="steam" d="M15 10c-1.6-1.6 1.6-2.6 0-4.6M19.5 11c-1.2-1.6 1.6-2.6.4-4.6" />
    </Pic>
  ),
  anvil: () => (
    <Pic>
      <path d="M5 13h16c0 3 2.4 4 6 4h-5c-2 0-3 1-3 3v1h3v4H10v-4h3v-1c0-2-1-3-3-3H8c-2 0-3-1.6-3-4z" />
      <path class="spark" d="M23 8l2-2M20 7V4M26 11h2.4" />
    </Pic>
  ),
  bed: () => (
    <Pic>
      <path d="M4 25V11M4 19h24v6" />
      <path d="M6.5 14.5h6v4.5h-6z" />
      <path d="M13 19c3.5-2.5 9-2.5 15 0" />
    </Pic>
  ),
  gate: () => (
    <Pic>
      <path d="M14 28V5" />
      <path d="M14 7h10l3 3-3 3H14zM14 15H6l-3 3 3 3h8" />
    </Pic>
  ),
  store: () => (
    <Pic>
      <path d="M4 14h24v12H4zM4 14l3-6h18l3 6M4 19h24" />
      <path d="M14 19v3h4v-3" />
    </Pic>
  ),
  folk: () => (
    <Pic>
      <circle cx="12" cy="11" r="4" />
      <path d="M4 27c0-5 3.6-8 8-8s8 3 8 8" />
      <circle cx="22" cy="10" r="3.2" />
      <path d="M20.5 17.6c4.6 0 7.5 3 7.5 8" />
    </Pic>
  ),
  home: () => (
    <Pic>
      <path d="M4 15L16 5l12 10M7.5 12.5V26h17V12.5M13.5 26v-6h5v6" />
    </Pic>
  ),
};

function picture(icon: string): JSX.Element {
  return (PICS[icon] ?? PICS.home!)();
}

/** The yard itself, drawn in ink: the hut, the broken fence, the path out, reeds around. */
function Ground({ warm }: { warm: boolean }) {
  const reeds: Array<[number, number, number]> = [
    [14, 330, 1],
    [30, 342, 0.8],
    [372, 334, 1],
    [388, 318, 0.8],
    [8, 120, 0.9],
    [392, 222, 0.9],
    [130, 12, 0.7],
    [292, 10, 0.8],
  ];
  return (
    <svg class="plan-ground" viewBox="0 0 400 350" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <radialGradient id="yard-floor" cx="50%" cy="55%" r="55%">
          <stop offset="0" stop-color="rgba(221, 184, 103, 0.10)" />
          <stop offset="0.7" stop-color="rgba(221, 184, 103, 0.04)" />
          <stop offset="1" stop-color="rgba(0, 0, 0, 0)" />
        </radialGradient>
        <radialGradient id="hut-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0" stop-color="rgba(221, 150, 70, 0.28)" />
          <stop offset="1" stop-color="rgba(221, 150, 70, 0)" />
        </radialGradient>
      </defs>
      <ellipse cx="200" cy="186" rx="196" ry="166" fill="url(#yard-floor)" />
      {/* the fence of woven withies, fallen here and there; a gap where the path leaves */}
      <path
        class="fence"
        d="M180 340C96 334 18 284 10 196 4 120 52 46 140 26M168 22c40-6 84-6 124 10M318 46c50 26 78 80 72 140-6 70-56 128-140 148-12 3-24 5-36 6"
      />
      <path class="fence fallen" d="M140 26l26-7M292 32l26 12" />
      {/* the path from the door out through the gap */}
      <path class="path" d="M200 172c-6 40 8 70 0 104-4 22-6 46-4 74" />
      {/* the hut */}
      <rect class="hut-floor" x="96" y="46" width="208" height="126" rx="3" />
      {warm && <rect class="hut-glow" x="96" y="46" width="208" height="126" fill="url(#hut-glow)" />}
      <path class="hut-wall" d="M190 172H96V46h208v126H210" />
      <path class="hut-thatch" d="M92 42h216M100 38l-8 8M124 38l-8 8M148 38l-8 8M172 38l-8 8M196 38l-8 8M220 38l-8 8M244 38l-8 8M268 38l-8 8M292 38l-8 8M308 42v134M92 42v134" />
      {reeds.map(([x, y, s]) => (
        <g class="reed" transform={`translate(${x} ${y}) scale(${s})`}>
          <path d="M0 0c-2-8-1-14 2-20M0 0c1-7 4-12 8-15M0 0c-3-5-7-8-11-9" />
        </g>
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------- what was seen

const SEEN_KEY = 'bezgomin.homeSeen';

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
  /** What opens when the spot is tapped. */
  body: () => JSX.Element;
}

/** Spots for the groups of home, plus the way out. Groups without a spot are returned apart. */
export function groupSpots(groups: GroupView[], body: (g: GroupView) => JSX.Element): [Spot[], GroupView[]] {
  const spots: Spot[] = [];
  const rest: GroupView[] = [];
  for (const g of groups) {
    const at = g.plan ?? (g.id === 'paths' ? PLAN_FIXED.gate : null);
    if (!at) {
      rest.push(g);
      continue;
    }
    spots.push({
      id: g.id,
      name: g.name,
      ...at,
      ready: g.id === 'paths' ? 0 : g.entries.filter((e) => e.enabled && e.kind !== 'go').length,
      together: g.entries.some((e) => e.enabled && (e.kind === 'scene' || e.kind === 'pool')),
      keys: [g.id, ...g.entries.filter((e) => e.kind !== 'go').map((e) => `${g.id}:${e.id}`)],
      ...(g.progress ? { progress: { n: g.progress.n, max: g.progress.max } } : {}),
      body: () => body(g),
    });
  }
  return [spots, rest];
}

export function extraSpot(id: 'store' | 'folk', name: string, body: () => JSX.Element, warn = false): Spot {
  return { id, name, ...PLAN_FIXED[id], ready: 0, together: false, warn, keys: [id], body };
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
  active,
  fresh,
  running,
  v,
  offset,
  now,
  onPick,
}: {
  s: Spot;
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
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <button
      type="button"
      class={`spot ${active ? 'on' : ''} ${s.ready > 0 || s.id === 'paths' || s.id === 'store' || s.id === 'folk' ? 'live' : 'idle'} ${s.together ? 'pair' : ''} ${running ? 'running' : ''}`}
      style={{ left: `${s.x}%`, top: `${s.y}%` }}
      aria-label={label}
      aria-pressed={active}
      onClick={onPick}
    >
      <span class="spot-medal">
        {picture(s.icon)}
        {running && <RunRing key={v.busyUntil} from={v.busyFrom} until={v.busyUntil} offset={offset} />}
        {s.ready > 0 && <span class="spot-count">{s.ready}</span>}
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
      </span>
      {s.progress && (
        <span class="spot-progress" aria-hidden="true">
          <span style={{ width: `${(s.progress.n / s.progress.max) * 100}%` }} />
        </span>
      )}
    </button>
  );
}

/** Close the open place with Escape; on a phone keep the page behind the sheet still. */
function useSheetKeys(open: boolean, still: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    if (still) document.body.classList.add('sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('sheet-open');
    };
  }, [open, still]);
}

export function HomePlan({
  spots,
  v,
  now,
  offset,
  desktop,
  onList,
}: {
  spots: Spot[];
  v: PlayerView;
  now: number;
  offset: number;
  desktop: boolean;
  onList: () => void;
}) {
  const [seen, mark] = useSeen(spots.flatMap((s) => s.keys));
  // a tap opens the place: on a phone it slides up over the plan, on a computer it takes the plan's room
  const [pick, setPick] = useState<string | null>(() => load('bezgomin.station'));
  const [sheet, setSheet] = useState(false);
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
    if (pick) store('bezgomin.station', pick);
  }, [pick]);
  useSheetKeys(!!shown, !desktop, () => setSheet(false));
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
            <Ground warm={v.stove.state === 'warm' || v.stove.state === 'low'} />
            {spots.map((s) => (
              <SpotButton
                key={s.id}
                s={s}
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
        <>
          {!desktop && <div class="sheet-shade" onClick={() => setSheet(false)} />}
          <section class={`station-sheet ${desktop ? 'docked' : ''}`} role="dialog" aria-label={shown.name}>
            <header class="station-bar">
              <div class="station-chips" role="tablist" ref={chips}>
                {spots.map((s) => (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={s.id === shown.id}
                    class={`chip ${s.id === shown.id ? 'on' : ''} ${runsAt === s.id ? 'running' : ''}`}
                    onClick={() => setPick(s.id)}
                  >
                    {picture(s.icon)}
                    <span>{s.name}</span>
                    {s.id !== shown.id && (isFresh(s) || s.together) && <span class="badge" />}
                  </button>
                ))}
              </div>
              {desktop ? (
                <button type="button" class="btn small ghost station-back" onClick={() => setSheet(false)}>
                  {picture('home')}
                  {T.planBack}
                </button>
              ) : (
                <button type="button" class="station-close" aria-label={T.planClose} onClick={() => setSheet(false)}>
                  ×
                </button>
              )}
            </header>
            <div class="station-body" key={shown.id}>
              {shown.body()}
            </div>
          </section>
        </>
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
