import type { ComponentChildren, JSX } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { EntrySort, EntryView, GroupView, MateEntryView, PlayerView, SummaryView, WelcomeView } from '../../shared/src/protocol.js';
import type { NetState } from './net.js';
import { net } from './net.js';
import { Ambient } from './ambient.js';
import { Notes, useSeenClues } from './notes.js';
import { HeroPanel } from './hero.js';
import { AreaPlan, PlanBack, StageOn, extraSpot, groupSpots } from './plan.js';
import type { Spot } from './plan.js';
import { notifier } from './notify.js';
import { sound } from './sound.js';
import { Scene } from './scene.js';
import { IconBell, IconBellOff, IconDown, IconFlame, IconHero, IconLock, IconLog, IconMap, IconMute, IconNotes, IconPair, IconPin, IconSnow, IconSound, IconWork } from './icons.js';
import { T } from './strings.js';
import { BagPanel, MapPanel, NearFight, PackList, ResidentsPanel } from './world.js';
import { FightPanel } from './fight.js';
import { preloadLand } from './landmap.js';
import { Cell } from './cells.js';
import { heroFace } from './portraits.js';
import { Thing } from './items.js';
import { markOf, picture, stationSlots, stationUrl } from './pictures.js';
import { seatItems, stageItems } from './stage-place.js';
import { StoreStage } from './store.js';
import { FolkStage } from './folk.js';
import { NeedsBar, NeedsSheet } from './needs.js';
import { WeatherChip } from './weather.js';
import { EventCards } from './events.js';
import { GardenBeds } from './garden.js';

type Tab = 'work' | 'map' | 'hero' | 'notes' | 'log';

/** A button unlocks this long after the server says it may (absorbs clock jitter). */
const SAFETY_MS = 150;

/**
 * Current server time. Instead of ticking constantly, the component re-renders exactly when
 * something visible changes: a countdown second rolls over or a lock ends. Progress bars are
 * pure CSS animations, so they run at the display's refresh rate without re-rendering.
 */
function useServerClock(offset: number, moments: number[]): number {
  const [, force] = useState(0);
  const now = Date.now() + offset;
  useEffect(() => {
    let dt = Infinity;
    for (const t of moments) {
      const left = t - now;
      if (left <= 0) continue;
      dt = Math.min(dt, left, left % 1000 || 1000);
    }
    if (!Number.isFinite(dt)) return;
    const id = window.setTimeout(() => force((x) => x + 1), dt + 10);
    return () => window.clearTimeout(id);
  });
  useEffect(() => {
    const onShow = () => force((x) => x + 1);
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);
  return now;
}

/**
 * Progress fill animated by CSS (transform: scaleX), started from the current fraction.
 * Re-key it by `until` so a new task starts a fresh animation.
 */
function Fill({ from, until, offset, cls }: { from: number; until: number; offset: number; cls: string }) {
  const [start] = useState(() => {
    const now = Date.now() + offset;
    const span = Math.max(1, until - from);
    return { p: Math.max(0, Math.min(1, (now - from) / span)), left: Math.max(0, until - now) };
  });
  return <span class={`anim-fill ${cls}`} style={{ '--p0': String(start.p), animationDuration: `${start.left}ms` }} />;
}

function useMedia(query: string): boolean {
  const [hit, setHit] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setHit(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return hit;
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

function secsLeft(until: number, now: number): string {
  return `${Math.max(1, Math.ceil((until - now) / 1000))} ${T.sec}`;
}

interface Ctx {
  v: PlayerView;
  now: number;
  offset: number;
  locked: boolean;
}

/** A one-off "echo" ring when a task this tile was running comes to an end. */
function useEcho(running: boolean): number {
  const [ring, setRing] = useState(0);
  const was = useRef(running);
  useEffect(() => {
    if (was.current && !running) setRing(Date.now());
    was.current = running;
  }, [running]);
  useEffect(() => {
    if (!ring) return;
    const id = window.setTimeout(() => setRing(0), 1200);
    return () => window.clearTimeout(id);
  }, [ring]);
  return ring;
}

function Entry({ e, c }: { e: EntryView; c: Ctx }) {
  const { v, now } = c;
  const busy = v.busyUntil + SAFETY_MS > now;
  const mine = v.busyAction === e.id && v.busyUntil > now;
  const recharge = e.readyAt && e.readyAt + SAFETY_MS > now ? e.readyAt : 0;
  const disabled = c.locked || !e.enabled || ((e.kind === 'act' || e.kind === 'go') && (busy || !!recharge));
  const reason = e.enabled ? (recharge ? secsLeft(recharge, now) : null) : e.reason;
  const gains = e.gain ?? [];
  const costs = e.cost ?? [];
  const walk = e.kind === 'go' && e.cooldown ? `${Math.round(e.cooldown / 1000)} ${T.sec}` : null;
  const meta = gains.length > 0 || costs.length > 0 || !!reason || !!e.hint || !!walk;
  const ring = useEcho(mine);

  return (
    <button
      class={`tile ${e.together ? 'together' : ''} ${mine ? 'running' : ''} ${!e.enabled ? 'blocked' : ''}`}
      disabled={disabled}
      onClick={() => (e.kind === 'go' ? net.send({ c: 'go', to: e.id.slice(3) }) : net.send({ c: 'act', id: e.id }))}
    >
      {mine && <Fill key={v.busyUntil} from={v.busyFrom} until={v.busyUntil} offset={c.offset} cls="tile-fill" />}
      {ring > 0 && <span key={ring} class="ring" aria-hidden="true" />}
      <span class="tile-top">
        <span class="tile-label">{e.label}</span>
        {mine ? (
          <span class="tile-secs">{secsLeft(v.busyUntil, now)}</span>
        ) : (
          <>
            {e.quest && <span class="pill errand">{T.questTag}</span>}
            {e.together && (
              <span class="pill pair">
                <IconPair />
                {T.together}
              </span>
            )}
          </>
        )}
      </span>
      {meta && (
        <span class="tile-meta">
          {gains.map((x) => (
            <span class={`m gain ${x.unsure ? 'unsure' : ''}`}>{x.text}</span>
          ))}
          {costs.map((c) =>
            c.stock ? (
              <span class="m stock-left">
                {c.name}: {c.have}
              </span>
            ) : (
              <span class={`m cost ${c.ok ? '' : 'short'}`}>
                −{c.n} {c.name}
                {!c.ok && ` (${T.have} ${c.have})`}
              </span>
            ),
          )}
          {reason && (
            <span class="m reason">
              {!e.enabled && <IconLock />}
              {reason}
            </span>
          )}
          {walk && <span class="m walk">{walk}</span>}
          {!reason && e.hint && <span class="m hint">{e.hint}</span>}
        </span>
      )}
    </button>
  );
}

/** What only the partner can do here: read-only, folded by default (the choice is remembered). */
function MateList({ items, name, face }: { items: MateEntryView[]; name: string; face: string | null }) {
  const [open, setOpen] = useState(() => load('bezgomin.mate') === 'open');
  const toggle = () => {
    store('bezgomin.mate', open ? 'closed' : 'open');
    setOpen(!open);
  };
  const ready = items.filter((m) => m.ready).length;
  // "not online" / "elsewhere" applies to everything: say it once, in the header
  const common = items[0]?.reason && items.every((m) => m.reason === items[0]!.reason) ? items[0]!.reason : null;
  return (
    <div class={`mate-list ${open ? 'open' : ''}`}>
      <button type="button" class="mate-list-head" aria-expanded={open} onClick={toggle}>
        {face ? (
          <span class="avatar small painted" style={{ backgroundImage: `url(${face})` }} />
        ) : (
          <span class="avatar small">{name.slice(0, 1).toUpperCase()}</span>
        )}
        <span class="mate-list-title">
          {name} {T.mateCan}
          <span class="mate-list-count">
            {items.length}
            {ready > 0 && ready < items.length && ` · ${T.mateNow} ${ready}`}
          </span>
          {common && <span class="mate-list-note">{common}</span>}
        </span>
        <IconDown class="topic-chev" />
      </button>
      {open && (
        <ul class="mate-items">
          {items.map((m) => (
            <li class={`mate-item ${m.ready ? 'ready' : ''}`}>
              <span class="mate-item-label">{m.label}</span>
              <span class="tile-meta">
                {(m.gain ?? []).map((x) => (
                  <span class={`m gain ${x.unsure ? 'unsure' : ''}`}>{x.text}</span>
                ))}
                {(m.cost ?? []).map((c) =>
                  c.stock ? null : (
                    <span class={`m cost ${c.ok ? '' : 'short'}`}>
                      −{c.n} {c.name}
                      {!c.ok && ` (${T.have} ${c.have})`}
                    </span>
                  ),
                )}
                {m.reason && !common && <span class="m reason">{m.reason}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const SORTS: Array<[EntrySort, string]> = [
  ['pair', T.sortPair],
  ['keep', T.sortKeep],
  ['build', T.sortBuild],
  ['train', T.sortTrain],
  ['sell', T.sortSell],
  ['buy', T.sortBuy],
  ['arms', T.sortArms],
  ['wear', T.sortWear],
  ['tool', T.sortTool],
  ['food', T.sortFood],
  ['use', T.sortUse],
  ['make', T.sortMake],
];

/** The mark of a work: what it gives, the place a way leads to, two for a joint one, else the place's. */
function workMark(e: EntryView, place: string): JSX.Element {
  if (e.icon) return markOf(e.icon) ?? <Thing icon={e.icon} />;
  return e.kind === 'scene' || e.kind === 'pool' ? <IconPair /> : picture(place);
}

/** Stacks on a crowded painting come in the order of the list's sections. */
const STACK_ORDER = SORTS.map(([id]) => id);
const STACK_NAMES: Record<string, string> = { ...Object.fromEntries(SORTS), more: T.stageMore };

/**
 * A work on a workplace's painting: the mark of what it yields (or of the place) in a disc. A stack
 * is several works of one kind under one disc, its name below. A tap picks it; the card below does it.
 */
function Medal({
  list,
  shown,
  sort,
  c,
  place,
  on,
  at,
  i,
  named = false,
  onPick,
}: {
  list: EntryView[];
  /** The work whose mark the disc shows. */
  shown: EntryView;
  /** A stack: the kind of works it holds. */
  sort?: string;
  c: Ctx;
  place: string;
  on: boolean;
  /** Where it stands on the painting, in percent; none in an opened stack. */
  at?: [number, number];
  i: number;
  named?: boolean;
  onPick: () => void;
}) {
  const { v, now } = c;
  const run = list.find((e) => v.busyAction === e.id && v.busyUntil > now);
  const ring = useEcho(!!run);
  const ready = list.filter((e) => e.enabled).length;
  const pair = shown.kind === 'scene' || shown.kind === 'pool';
  const together = list.some((e) => e.together);
  const name = sort ? STACK_NAMES[sort] ?? sort : shown.label;
  const says = sort ? `${name}: ${list.length}` : [shown.label, shown.enabled ? '' : shown.reason].filter(Boolean).join(' — ');
  const where = at ? { left: `${at[0]}%`, top: `${at[1]}%` } : {};
  return (
    <button
      type="button"
      class={`act-medal ${at ? 'placed' : ''} ${sort ? 'stack' : ''} ${on ? 'on' : ''} ${together ? 'together' : ''} ${run ? 'running' : ''} ${ready ? '' : 'blocked'}`}
      style={{ ...where, '--i': String(i) }}
      aria-label={says}
      aria-pressed={sort ? undefined : on}
      aria-haspopup={sort ? 'dialog' : undefined}
      title={says}
      data-key={sort ? `#${sort}` : shown.id}
      onClick={onPick}
    >
      <span class="act-pic">
        <span class="act-disc">
          {run && <Fill key={v.busyUntil} from={v.busyFrom} until={v.busyUntil} offset={c.offset} cls="act-fill" />}
          {workMark(shown, place)}
        </span>
        {ring > 0 && <span key={ring} class="ring" aria-hidden="true" />}
        {run && <span class="act-secs">{secsLeft(v.busyUntil, now)}</span>}
        {sort && <span class="act-count">{list.length}</span>}
        {!sort && !shown.enabled && (
          <span class="act-lock" aria-hidden="true">
            <IconLock />
          </span>
        )}
        {together && !pair && (
          <span class="act-pair" aria-hidden="true">
            <IconPair />
          </span>
        )}
        {list.some((e) => e.quest) && <span class="act-quest" aria-hidden="true" />}
      </span>
      {(named || sort) && <span class="act-label">{name}</span>}
    </button>
  );
}

/** A stack opened over the painting: its works spread out from where it stands. Escape folds it. */
function Fan({ name, at, children, onClose }: { name: string; at: [number, number]; children: ComponentChildren; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Escape folds the stack first, the place stays open
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape') return;
      ev.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    box.current?.querySelector<HTMLButtonElement>('.act-medal')?.focus({ preventScroll: true });
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
  return (
    <div class="stage-fan" role="dialog" aria-label={name} ref={box}>
      <button type="button" class="stage-fan-shade" aria-label={T.stageFold} onClick={onClose} />
      <div class="stage-fan-body" style={{ transformOrigin: `${at[0]}% ${at[1]}%` }}>
        <div class="stage-fan-name">{name}</div>
        <div class="stage-fan-list">{children}</div>
      </div>
    </div>
  );
}

/** The picked work: what it takes and gives, why it cannot be done yet, and the button that does it. */
function WorkCard({ e, c, place }: { e: EntryView; c: Ctx; place: string }) {
  const { v, now } = c;
  const busy = v.busyUntil + SAFETY_MS > now;
  const mine = v.busyAction === e.id && v.busyUntil > now;
  const recharge = e.readyAt && e.readyAt + SAFETY_MS > now ? e.readyAt : 0;
  const waits = e.kind === 'act' || e.kind === 'go';
  const disabled = c.locked || !e.enabled || (waits && (busy || !!recharge));
  const pair = e.kind === 'scene' || e.kind === 'pool';
  const walk = e.kind === 'go' && e.cooldown ? `${Math.round(e.cooldown / 1000)} ${T.sec}` : null;
  const word = mine
    ? secsLeft(v.busyUntil, now)
    : e.enabled && recharge
      ? secsLeft(recharge, now)
      : e.enabled && waits && busy
        ? T.busyNow
        : e.kind === 'go'
          ? T.mapGo
          : pair
            ? T.workOffer
            : T.workDo;
  return (
    <div class={`work-card ${e.together ? 'together' : ''} ${mine ? 'running' : ''} ${!e.enabled ? 'blocked' : ''}`} key={e.id}>
      <span class="work-card-pic" aria-hidden="true">
        {workMark(e, place)}
      </span>
      <div class="work-card-text">
        <h4 class="work-card-name">
          {e.label}
          {e.quest && <span class="pill errand">{T.questTag}</span>}
          {e.together && (
            <span class="pill pair">
              <IconPair />
              {T.together}
            </span>
          )}
        </h4>
        <span class="tile-meta">
          {(e.gain ?? []).map((x) => (
            <span class={`m gain ${x.unsure ? 'unsure' : ''}`}>{x.text}</span>
          ))}
          {(e.cost ?? []).map((x) =>
            x.stock ? (
              <span class="m stock-left">
                {x.name}: {x.have}
              </span>
            ) : (
              <span class={`m cost ${x.ok ? '' : 'short'}`}>
                −{x.n} {x.name}
                {!x.ok && ` (${T.have} ${x.have})`}
              </span>
            ),
          )}
          {!e.enabled && e.reason && (
            <span class="m reason">
              <IconLock />
              {e.reason}
            </span>
          )}
          {walk && <span class="m walk">{walk}</span>}
          {e.enabled && e.hint && <span class="m hint">{e.hint}</span>}
        </span>
      </div>
      <button
        type="button"
        class="btn primary work-do"
        disabled={disabled}
        onClick={() => (e.kind === 'go' ? net.send({ c: 'go', to: e.id.slice(3) }) : net.send({ c: 'act', id: e.id }))}
      >
        {mine && <Fill key={v.busyUntil} from={v.busyFrom} until={v.busyUntil} offset={c.offset} cls="work-do-fill" />}
        <span>{word}</span>
      </button>
    </div>
  );
}

/** Where each medal stood on this device: kept, so a medal does not move when another comes or goes. */
function useSeats(id: string, keys: string[], room: number): Record<string, number> {
  const seats = useMemo(() => {
    let was: Record<string, number> = {};
    try {
      was = JSON.parse(load(`bezgomin.seats.${id}`) ?? '{}') as Record<string, number>;
    } catch {
      /* a broken note: start afresh */
    }
    return { was, now: seatItems(keys, room, was) };
  }, [id, keys.join('|'), room]);
  useEffect(() => {
    const { was, now } = seats;
    if (Object.keys(now).every((k) => was[k] === now[k])) return;
    // the gone keep their places only while nobody has taken them
    const used = new Set(Object.values(now));
    const kept = Object.fromEntries(Object.entries(was).filter(([k, s]) => !(k in now) && !used.has(s)));
    store(`bezgomin.seats.${id}`, JSON.stringify({ ...kept, ...now }));
  }, [seats]);
  return seats.now;
}

/**
 * A workplace's painting with its works standing on it, and under it the card of the picked one.
 * When there are more works than places, works of a kind share a stack that opens on a tap.
 */
function WorkStage({ g, c, icon }: { g: GroupView; c: Ctx; icon: string }) {
  const slots = stationSlots(icon);
  const items = stageItems(g.entries, slots.length, STACK_ORDER);
  const seats = useSeats(g.id, items.map((it) => it.key), slots.length);
  const [pick, setPick] = useState(() => load(`bezgomin.work.${g.id}`));
  const [fan, setFan] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // a folded stack gets the focus back, so the keyboard stays where it was
  const fold = () => {
    const key = fan;
    setFan(null);
    if (key) box.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.focus({ preventScroll: true });
  };
  const byId = new Map(g.entries.map((e) => [e.id, e] as const));
  const running = g.entries.find((e) => c.v.busyAction === e.id && c.v.busyUntil > c.now);
  const chosen = (pick ? byId.get(pick) : undefined) ?? running ?? g.entries.find((e) => e.enabled) ?? g.entries[0];
  const choose = (id: string) => {
    setPick(id);
    store(`bezgomin.work.${g.id}`, id);
    fold();
  };
  const placed = items.map((it, n) => {
    const list = it.ids.map((id) => byId.get(id)).filter((e): e is EntryView => !!e);
    const at = slots[seats[it.key] ?? n] ?? slots[0]!;
    return { it, list, at, n };
  });
  const open = placed.find((p) => p.it.key === fan);
  return (
    <>
      <div class="stage" ref={box}>
        <div class="stage-paint" style={{ backgroundImage: `url(${stationUrl(icon) ?? ''})` }} aria-hidden="true" />
        {placed.map(({ it, list, at, n }) => (
          <Medal
            key={it.key}
            list={list}
            shown={list.find((e) => e === chosen) ?? list.find((e) => e.enabled) ?? list[0]!}
            sort={it.sort}
            c={c}
            place={icon}
            on={!!chosen && list.includes(chosen)}
            at={at}
            i={n}
            onPick={() => (it.sort ? setFan(it.key) : choose(it.ids[0]!))}
          />
        ))}
        {open && (
          <Fan name={STACK_NAMES[open.it.sort ?? ''] ?? ''} at={open.at} onClose={fold}>
            {open.list.map((e, n) => (
              <Medal key={e.id} list={[e]} shown={e} c={c} place={icon} on={e === chosen} i={n} named onPick={() => choose(e.id)} />
            ))}
          </Fan>
        )}
      </div>
      {chosen && <WorkCard e={chosen} c={c} place={icon} />}
    </>
  );
}

/**
 * A workplace's things to do. What can be done now comes first; a long list is split into
 * sections by what it is for, so a crowded hearth reads as food, supplies and upkeep, not a heap.
 */
function Tiles({ g, c }: { g: GroupView; c: Ctx }) {
  if (g.id === 'paths') {
    return (
      <div class="tiles">
        {g.entries.map((e) => (
          <Entry key={e.id} e={e} c={c} />
        ))}
      </div>
    );
  }
  const ready = (list: EntryView[]) => [...list.filter((e) => e.enabled), ...list.filter((e) => !e.enabled)];
  const sections = SORTS.map(([id, name]) => ({ id, name, list: g.entries.filter((e) => (e.sort ?? 'keep') === id) })).filter(
    (s) => s.list.length > 0,
  );
  if (g.entries.length < 6 || sections.length < 2) {
    return (
      <div class="tiles">
        {ready(g.entries).map((e) => (
          <Entry key={e.id} e={e} c={c} />
        ))}
      </div>
    );
  }
  return (
    <>
      {sections.map((s) => (
        <section class="tile-section" key={s.id} aria-label={s.name}>
          <h4 class="tile-section-name">
            {s.name}
            <span class="tile-section-count">
              {s.list.filter((e) => e.enabled).length}/{s.list.length}
            </span>
          </h4>
          <div class="tiles">
            {ready(s.list).map((e) => (
              <Entry key={e.id} e={e} c={c} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Group({ g, c }: { g: GroupView; c: Ctx }) {
  const stage = useContext(StageOn);
  if (stage) {
    return (
      <section class={`group staged ${g.base ? 'base' : ''}`}>
        <WorkStage g={g} c={c} icon={stage} />
        {(g.desc || g.progress) && <PlaceHead g={g} />}
        {c.v.garden && c.v.garden.group === g.id && <GardenBeds v={c.v} offset={c.offset} locked={c.locked} />}
        {g.partner && g.partner.length > 0 && <MateList items={g.partner} name={c.v.partner.name} face={heroFace(c.v.partner.role, c.v.partner.gender)} />}
      </section>
    );
  }
  return (
    <section class={`group ${g.base ? 'base' : ''}`}>
      <header class="group-head">
        <h3>{g.name}</h3>
        {g.desc && <p class="desc">{g.desc}</p>}
        {g.progress && (
          <div class={`progress ${g.progress.n >= g.progress.max ? 'done' : ''}`}>
            <span class="progress-label">{g.progress.label}</span>
            <span class="progress-bar" aria-hidden="true">
              <span style={{ width: `${(g.progress.n / g.progress.max) * 100}%` }} />
            </span>
            <b>
              {g.progress.n}/{g.progress.max}
            </b>
          </div>
        )}
      </header>
      {c.v.garden && c.v.garden.group === g.id && <GardenBeds v={c.v} offset={c.offset} locked={c.locked} />}
      <Tiles g={g} c={c} />
      {g.partner && g.partner.length > 0 && <MateList items={g.partner} name={c.v.partner.name} face={heroFace(c.v.partner.role, c.v.partner.gender)} />}
    </section>
  );
}

/** Above the plan of a place away from home: what it looks like, and shared work under way. */
function PlaceHead({ g }: { g: GroupView }) {
  return (
    <header class="place-head">
      {g.desc && <p class="desc">{g.desc}</p>}
      {g.progress && (
        <div class={`progress ${g.progress.n >= g.progress.max ? 'done' : ''}`}>
          <span class="progress-label">{g.progress.label}</span>
          <span class="progress-bar" aria-hidden="true">
            <span style={{ width: `${(g.progress.n / g.progress.max) * 100}%` }} />
          </span>
          <b>
            {g.progress.n}/{g.progress.max}
          </b>
        </div>
      )}
    </header>
  );
}

function Stock({ v, foldable = false }: { v: PlayerView; foldable?: boolean }) {
  const res = v.res.filter((r) => r.kind === 'res' || r.kind === 'food' || r.kind === 'use');
  const tools = v.res.filter((r) => (r.kind === 'tool' || r.kind === 'gear') && r.n > 0);
  const folk = v.res.filter((r) => r.kind === 'people' && r.n > 0);
  // on a phone the long ledger folds away (the choice is remembered)
  const [open, setOpen] = useState(() => load('bezgomin.stock') !== 'closed');
  if (res.length === 0 && tools.length === 0 && folk.length === 0) return null;
  const shown = !foldable || open;
  const toggle = () => {
    store('bezgomin.stock', open ? 'closed' : 'open');
    setOpen(!open);
  };
  return (
    <section class={`stock ${foldable ? 'foldable' : ''} ${shown ? '' : 'folded'}`}>
      {foldable && (
        <button type="button" class="stock-toggle" aria-expanded={shown} onClick={toggle}>
          <span>{T.stock}</span>
          <span class="stock-count">{res.filter((r) => r.n > 0).length}</span>
          <IconDown class="topic-chev" />
        </button>
      )}
      {shown && res.length > 0 && (
        <>
          {!foldable && <h3>{T.stock}</h3>}
          <ul class="cells" aria-label={T.stock}>
            {res.map((r) => (
              <Cell
                icon={r.icon}
                name={r.name}
                n={r.n}
                cap={r.cap}
                cls={`${r.cap !== undefined && r.n >= r.cap ? 'full' : ''} ${r.n === 0 ? 'empty' : ''}`}
              />
            ))}
          </ul>
        </>
      )}
      {shown && folk.length > 0 && (
        <p class="inline-list folk">
          <span class="il-head">{T.folk}:</span>{' '}
          {folk.map((r, i) => (
            <span>
              {i > 0 && ', '}
              {r.name} <b>{r.n}</b>
            </span>
          ))}
        </p>
      )}
      {shown && tools.length > 0 && (
        <>
          <p class="il-head cells-head">{T.items}</p>
          <ul class="cells" aria-label={T.items}>
            {tools.map((r) => (
              <Cell icon={r.icon} name={r.name} n={r.n > 1 ? r.n : undefined} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function SoundToggle() {
  const [, force] = useState(0);
  useEffect(() => sound.subscribe(() => force((x) => x + 1)), []);
  const label = sound.on ? T.soundOff : T.soundOn;
  return (
    <button class={`sound-toggle ${sound.on ? 'on' : ''}`} aria-label={label} title={label} onClick={() => sound.toggle()}>
      {sound.on ? <IconSound /> : <IconMute />}
    </button>
  );
}

function NotifyToggle() {
  const [, force] = useState(0);
  useEffect(() => notifier.subscribe(() => force((x) => x + 1)), []);
  const label = notifier.on ? T.notifyOff : T.notifyOn;
  const click = async () => {
    const err = await notifier.toggle({ denied: T.notifyDenied, unsupported: T.notifyUnsupported });
    if (err) net.showToast(err);
  };
  return (
    <button class={`sound-toggle ${notifier.on ? 'on' : ''}`} aria-label={label} title={label} onClick={click}>
      {notifier.on ? <IconBell /> : <IconBellOff />}
    </button>
  );
}

function plus(n: number): string {
  return n > 0 ? `+${n}` : `−${-n}`;
}

/** "While you were away": shown once after a real absence. */
function Welcome({ w, partner }: { w: WelcomeView; partner: string }) {
  return (
    <div class="sheet-wrap" role="dialog" aria-labelledby="welcome-title">
      <section class="sheet">
        <h2 id="welcome-title">{T.awayTitle}</h2>
        {w.days > 0 && (
          <p class="sheet-line">
            <span class="sheet-key">{T.awayDays}</span> <b>{w.days}</b>
          </p>
        )}
        {w.res.length > 0 && (
          <div class="sheet-block">
            <h3>{T.awayStock}</h3>
            <p class="sheet-deltas">
              {w.res.map((r) => (
                <span class={r.n > 0 ? 'plus' : 'minus'}>
                  <Thing icon={r.icon} />
                  {r.name} {plus(r.n)}
                </span>
              ))}
            </p>
          </div>
        )}
        {w.lines.length > 0 && (
          <div class="sheet-block">
            <h3>{partner}</h3>
            <div class="log">
              {w.lines.map((l) => (
                <p class="from-partner">{l}</p>
              ))}
            </div>
          </div>
        )}
        {w.clues > 0 && (
          <p class="sheet-line">
            <span class="sheet-key">{T.awayClues}</span> <b>{w.clues}</b>
          </p>
        )}
        <button class="btn primary sheet-ok" onClick={() => net.send({ c: 'ack', what: 'welcome' })}>
          {T.ok}
        </button>
      </section>
    </div>
  );
}

const ACT_NAMES = ['', T.act1, T.act2, T.act3, T.act4, T.act5];

/** The end of an act: what the two of you have been through, in numbers. */
function Summary({ s, me, partner }: { s: SummaryView; me: string; partner: string }) {
  const rows: Array<[string, string | number]> = [
    [T.sDays, s.days],
    [T.sPlaces, s.places],
    [T.sScenes, s.scenes],
    [T.sClues, s.clues],
    [T.sCluesMine, s.cluesMine],
    [T.sSolved, s.solved],
    [T.sPeople, s.people],
    [T.sFights, s.fights],
  ];
  const counted: Array<[string, string | number]> = [
    [T.sSuppers, s.suppers],
    [T.sCrafted, s.crafted],
    [T.sTrips, s.trips],
  ];
  const anyCounted = s.actions.me + s.actions.partner > 0;
  return (
    <div class="sheet-wrap" role="dialog" aria-labelledby="summary-title">
      <section class="sheet summary">
        <h2 id="summary-title">
          {s.final ? T.summaryFinal : `${T.summaryTitle} ${ACT_NAMES[s.act] ?? s.act}`}
        </h2>
        <dl class="ledger summary-ledger">
          {rows
            .filter(([, v]) => v !== 0)
            .map(([k, v]) => (
              <div class="ledger-row">
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          {anyCounted &&
            counted
              .filter(([, v]) => v !== 0)
              .map(([k, v]) => (
                <div class="ledger-row">
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
        </dl>
        {anyCounted && (
          <div class="sheet-block">
            <h3>{T.sActions}</h3>
            <p class="sheet-line">
              {me} <b>{s.actions.me}</b> · {partner} <b>{s.actions.partner}</b>
            </p>
          </div>
        )}
        {s.gathered.length > 0 && (
          <div class="sheet-block">
            <h3>{T.sGathered}</h3>
            <p class="sheet-deltas">
              {s.gathered.map((r) => (
                <span class="plus">
                  <Thing icon={r.icon} />
                  {r.name} {r.n}
                </span>
              ))}
            </p>
          </div>
        )}
        {!anyCounted && <p class="sheet-note">{T.sSince}</p>}
        <button class="btn primary sheet-ok" onClick={() => net.send({ c: 'ack', what: 'summary' })}>
          {T.next}
        </button>
      </section>
    </div>
  );
}

function Partner({ v, now, offset }: { v: PlayerView; now: number; offset: number }) {
  const p = v.partner;
  const face = heroFace(p.role, p.gender);
  if (!p.joined)
    return (
      <div class="mate off">
        <span class="avatar">?</span>
        <span class="mate-status muted">{T.partnerNone}</span>
      </div>
    );
  const working = p.online && p.busy && p.busy.until > now ? p.busy : null;
  const status = !p.online ? T.partnerOffline : working ? working.text : T.partnerIdle;
  return (
    <div class={`mate ${p.online ? 'on' : 'off'}`}>
      <span class={`avatar ${face ? 'painted' : ''}`} style={face ? { backgroundImage: `url(${face})` } : undefined}>
        {!face && p.name.slice(0, 1).toUpperCase()}
        {working && <span key={working.from} class="ring" aria-hidden="true" />}
      </span>
      <span class="mate-body">
        <span class="mate-line">
          <b>{p.name}</b>
          {p.area !== v.me.area && (
            <span class="mate-where">
              <IconPin />
              {p.where}
            </span>
          )}
        </span>
        <span class="mate-status">
          <span class="status-text">{status}</span>
          {working && (
            <span class="mini-bar" aria-hidden="true">
              <Fill key={working.until} from={working.from} until={working.until} offset={offset} cls="" />
            </span>
          )}
        </span>
      </span>
    </div>
  );
}

function Log({ v }: { v: PlayerView }) {
  const items = [...v.log].reverse();
  if (!items.length) return <p class="empty">{T.emptyLog}</p>;
  return (
    <div class="log">
      {items.map((l, i) => (
        <p key={l.id} class={`log-${l.kind} ${l.partner ? 'from-partner' : ''} ${i < 3 ? 'fresh' : ''}`}>
          {l.text}
        </p>
      ))}
    </div>
  );
}

export function Game({ s }: { s: NetState }) {
  const v = s.view!;
  const [tab, setTab] = useState<Tab>((load('bezgomin.tab') as Tab) || 'work');
  const moments: number[] = [v.busyUntil, v.busyUntil + SAFETY_MS];
  for (const g of v.groups) for (const e of g.entries) if (e.readyAt) moments.push(e.readyAt, e.readyAt + SAFETY_MS);
  if (v.partner.busy) moments.push(v.partner.busy.until);
  moments.push(v.ambient.fxUntil, v.ambient.partnerFxUntil);
  const now = useServerClock(s.offset, moments);
  // Pending clicks are swallowed in net.send (no visual flicker); a stale view locks visibly.
  const locked = s.stale || !s.connected;
  const ctx: Ctx = { v, now, offset: s.offset, locked };
  const [seen, markSeen] = useSeenClues(v.journal.clues.map((c) => c.id));
  const newNotes = v.journal.clues.some((c) => !seen.has(c.id));
  const desktop = useMedia('(min-width: 960px)');
  const [side, setSide] = useState<'log' | 'notes'>(load('bezgomin.side') === 'notes' ? 'notes' : 'log');
  useEffect(() => store('bezgomin.side', side), [side]);

  useEffect(() => store('bezgomin.tab', tab), [tab]);
  const [homeView, setHomeView] = useState<'plan' | 'list'>(load('bezgomin.homeView') === 'list' ? 'list' : 'plan');
  const [needsOpen, setNeedsOpen] = useState(false);
  const needsShown = needsOpen && !!v.needs;
  useEffect(() => store('bezgomin.homeView', homeView), [homeView]);
  // a new day: its number shows a moment over the page, as the chronicle turns a leaf
  const [dayCard, setDayCard] = useState<number | null>(null);
  const lastDay = useRef(v.day);
  useEffect(() => {
    const before = lastDay.current;
    lastDay.current = v.day;
    if (before <= 0 || v.day <= before) return;
    setDayCard(v.day);
    const t = window.setTimeout(() => setDayCard(null), 2600);
    return () => clearTimeout(t);
  }, [v.day]);
  // a fight that has just ended stays a moment, so its last blow is seen; then it goes for good
  const [goneFight, setGoneFight] = useState<number | null>(null);
  const shownFight = v.fight ?? (v.fightEnd && v.fightEnd.id !== goneFight ? v.fightEnd : null);

  // The partner calls you: a knock.
  const calling = v.proposal && !v.proposal.mine ? v.proposal.label : null;
  useEffect(() => {
    if (!calling) return;
    sound.call();
    notifier.ping('call', `${v.partner.name} ${T.notifyCalls}`, `«${calling}»`);
  }, [calling]);

  // A scene begins (e.g. the partner accepted while this tab was in the background).
  const sceneId = v.scene?.id ?? null;
  useEffect(() => {
    if (sceneId && v.scene) notifier.ping('scene', `${T.notifyScene}: ${v.scene.title}`);
  }, [sceneId]);

  // The partner comes back.
  const partnerOn = v.partner.online;
  const wasOn = useRef(partnerOn);
  useEffect(() => {
    if (partnerOn && !wasOn.current) notifier.ping('back', `${v.partner.name} ${T.notifyBack}`);
    wasOn.current = partnerOn;
  }, [partnerOn]);

  // A long task of mine is done while the game is in the background.
  const running = v.busyUntil > now ? v.busyAction : null;
  const lastRun = useRef<{ id: string; long: boolean } | null>(null);
  useEffect(() => {
    if (running) {
      const label = v.groups.flatMap((g) => g.entries).find((e) => e.id === running)?.label ?? '';
      lastRun.current = { id: label, long: v.busyUntil - v.busyFrom >= 20_000 };
    } else if (lastRun.current) {
      if (lastRun.current.long) notifier.ping('done', T.notifyDone, lastRun.current.id);
      lastRun.current = null;
    }
  }, [running]);

  useEffect(() => {
    if (!s.toast) return;
    const id = window.setTimeout(() => net.clearToast(), 2500);
    return () => window.clearTimeout(id);
  }, [s.toast?.id]);

  // the painted land is fetched while the work is looked at, so the map opens painted, not dark
  const seenLand = v.map.nodes.filter((n) => n.known).map((n) => n.id).join();
  useEffect(() => {
    if (!v.tabs.includes('map')) return;
    const id = window.setTimeout(() => preloadLand(v.map), 1500);
    return () => window.clearTimeout(id);
  }, [seenLand]);

  const hasNotes = v.journal.clues.length + v.journal.questions.length + v.journal.people.length + v.bestiary.length > 0;
  const groups = useMemo(() => v.groups.filter((g) => g.entries.length > 0 || g.desc), [v.groups]);
  const hasMap = v.tabs.includes('map');
  const hasHero = v.tabs.includes('hero');
  const heroBadge = v.hero.points > 0 || !!v.hero.perkChoice;
  // a tab that is not open (yet) falls back to the work
  const view: Tab = (tab === 'map' && !hasMap) || (tab === 'hero' && !hasHero) ? 'work' : tab;

  const tabs: Array<{ id: Tab; label: string; icon: JSX.Element; badge?: boolean }> = [
    { id: 'work', label: T.tabHere, icon: <IconWork />, badge: v.events.length > 0 && view !== 'work' },
    ...(hasMap ? [{ id: 'map' as Tab, label: T.tabMap, icon: <IconMap /> }] : []),
    ...(hasHero ? [{ id: 'hero' as Tab, label: T.tabHero, icon: <IconHero />, badge: heroBadge && view !== 'hero' }] : []),
    ...(hasNotes ? [{ id: 'notes' as Tab, label: T.tabNotes, icon: <IconNotes />, badge: newNotes && view !== 'notes' }] : []),
    { id: 'log', label: T.tabLog, icon: <IconLog /> },
  ];
  // on a computer the middle column switches between work, map and hero
  const midTabs = tabs.filter((t) => t.id === 'work' || t.id === 'map' || t.id === 'hero');
  const mid: Tab = desktop ? (view === 'map' || view === 'hero' ? view : 'work') : view;

  // every place is laid out on a drawn plan (or, if preferred, as before: a list)
  let plan: { scene: string; spots: Spot[]; rest: GroupView[] } | null = null;
  if (v.ground && homeView === 'plan') {
    const [spots, rest] = groupSpots(groups, (g) => <Group g={g} c={ctx} />);
    if (spots.length > 0) {
      const gate = spots.findIndex((x) => x.id === 'paths');
      // ripe beds count as things to do in the garden
      const gardenSpot = v.garden && spots.find((x) => x.id === v.garden!.group);
      if (gardenSpot) gardenSpot.ready += v.garden!.beds.filter((b) => b.ready).length;
      const extra: Spot[] = [];
      if (v.atHome && v.residents.length > 0) {
        const warn = v.residents.some((r) => r.hungry || r.hurt);
        extra.push(
          extraSpot('folk', T.residents, () => (stationUrl('folk') ? <FolkStage v={v} locked={locked} /> : <ResidentsPanel v={v} locked={locked} />), warn),
        );
      }
      // on a phone the store, the bag and what to take along are one more place in the yard;
      // away from home the bag is (and the store, to look at)
      if (!desktop && !v.atHome) {
        extra.push(
          extraSpot('bag', T.bag, () =>
            stationUrl('bag') ? (
              <StoreStage v={v} locked={locked} icon="bag">
                <Stock v={v} />
              </StoreStage>
            ) : (
              <>
                <BagPanel v={v} locked={locked} />
                {!v.bag.items.length && <p class="empty-note">{T.bagEmpty}</p>}
                <Stock v={v} />
              </>
            ), false, { load: v.bag.load, cap: v.bag.cap }),
        );
      }
      if (!desktop && v.atHome) {
        extra.push(
          extraSpot('store', T.stock, () =>
            stationUrl('store') ? (
              <StoreStage v={v} locked={locked} icon="store" />
            ) : (
              <>
                <BagPanel v={v} locked={locked} />
                <PackList v={v} locked={locked} />
                <Stock v={v} />
              </>
            ), false, v.bag.items.length ? { load: v.bag.load, cap: v.bag.cap } : undefined),
        );
      }
      // the way out stays last
      if (gate >= 0) spots.splice(gate, 0, ...extra);
      else spots.push(...extra);
      plan = { scene: v.ground, spots, rest };
    }
  }

  const work = (
    <div class="work">
      {v.actDone && (
        <section class="panel actdone">
          <h3>{T.actDone}</h3>
          <p>{v.actDone.text}</p>
        </section>
      )}
      {v.goal && (
        <p class="goal">
          <span class="goal-label">{T.goal}.</span> {v.goal}
        </p>
      )}
      <EventCards v={v} locked={locked} />
      {v.needs && <NeedsBar v={v} offset={s.offset} open={needsShown} onOpen={() => setNeedsOpen(!needsOpen)} />}
      {needsShown && <NeedsSheet v={v} offset={s.offset} desktop={desktop} locked={locked} onClose={() => setNeedsOpen(false)} />}
      {v.stove.text && (
        <p class={`stove ${v.stove.state}`}>
          {v.stove.state === 'cold' ? <IconSnow /> : <IconFlame />}
          <span>{v.stove.text}</span>
        </p>
      )}
      <div class="only-mobile">
        {!v.atHome && !plan && <BagPanel v={v} locked={locked} />}
        {!plan && <Stock v={v} foldable />}
      </div>
      {desktop && needsShown ? null : plan ? (
        <>
          {groups
            .filter((g) => g.spots?.length && (g.desc || g.progress))
            .map((g) => (
              <PlaceHead key={g.id} g={g} />
            ))}
          <AreaPlan
            key={plan.scene}
            scene={plan.scene}
            spots={plan.spots}
            v={v}
            now={now}
            offset={s.offset}
            desktop={desktop}
            onList={() => setHomeView('list')}
          />
          {plan.rest.map((g) => (
            <Group key={g.id} g={g} c={ctx} />
          ))}
        </>
      ) : (
        <>
          {v.ground && <PlanBack onPlan={() => setHomeView('plan')} />}
          {groups.map((g) => (
            <Group key={g.id} g={g} c={ctx} />
          ))}
          {v.atHome && <ResidentsPanel v={v} locked={locked} />}
          <div class="only-mobile">
            {v.atHome && <BagPanel v={v} locked={locked} />}
            <PackList v={v} locked={locked} />
          </div>
        </>
      )}
    </div>
  );

  return (
    <div class={`game ${s.connected ? '' : 'offline'}`}>
      <Ambient
        a={{
          ...v.ambient,
          // accents stop exactly when the action runs out, without waiting for the next update
          fx: v.ambient.fxUntil > now ? v.ambient.fx : null,
          partnerFx: v.ambient.partnerFxUntil > now ? v.ambient.partnerFx : null,
        }}
        paused={!!v.scene}
        mood={v.scene && !v.scene.paused ? v.scene.mood : null}
        dayAt={v.dayAt}
        offset={s.offset}
      />
      <header class="top">
        <span class="brand">{T.title}</span>
        <div class="top-info">
          <span class="place">
            <IconPin />
            <span>{v.map.travel ? `${T.travelling} → ${v.map.travel.name}` : v.me.where}</span>
          </span>
          <WeatherChip v={v} offset={s.offset} />
          {v.day > 0 && (
            <span class="day">
              {T.day} {v.day}
            </span>
          )}
          <NotifyToggle />
          <SoundToggle />
          <span class={`net ${s.connected ? 'ok' : 'bad'}`} title={s.connected ? T.onlineDot : T.offlineDot} />
        </div>
        <Partner v={v} now={now} offset={s.offset} />
        {!s.connected && <div class="warn-bar">{T.reconnecting}</div>}
        {v.busyUntil > now && (
          <div class="me-progress" aria-hidden="true">
            <Fill key={v.busyUntil} from={v.busyFrom} until={v.busyUntil} offset={s.offset} cls="" />
          </div>
        )}
      </header>

      <main class={`layout ${mid === 'map' ? 'map-open' : ''}`}>
        <aside class="col-left only-desktop">
          <BagPanel v={v} locked={locked} />
          <Stock v={v} />
          <PackList v={v} locked={locked} />
        </aside>
        <div class={`col-mid ${mid === 'work' || mid === 'map' || mid === 'hero' ? '' : 'hide-mobile'}`}>
          {desktop && midTabs.length > 1 && (
            <div class="side-switch mid-switch" role="tablist">
              {midTabs.map((t) => (
                <button role="tab" aria-selected={mid === t.id} class={mid === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
                  {t.icon}
                  {t.label}
                  {t.badge && <span class="badge" />}
                </button>
              ))}
            </div>
          )}
          {mid === 'work' && work}
          {mid === 'map' && <MapPanel v={v} locked={locked} now={now} desktop={desktop} />}
          {mid === 'hero' && <HeroPanel v={v} locked={locked} desktop={desktop} />}
          {mid === 'work' && (
            <div class="only-mobile mini-log">
              <Log v={{ ...v, log: v.log.slice(-4) }} />
            </div>
          )}
        </div>
        <div class={`col-notes only-mobile ${view === 'notes' ? '' : 'hide-mobile'}`}>
          {!desktop && <Notes v={v} seen={seen} markSeen={markSeen} active={view === 'notes'} />}
        </div>
        <aside class={`col-right ${view === 'log' ? '' : 'hide-mobile'}`}>
          {desktop && hasNotes && (
            <div class="side-switch" role="tablist">
              <button role="tab" aria-selected={side === 'log'} class={side === 'log' ? 'on' : ''} onClick={() => setSide('log')}>
                <IconLog />
                {T.tabLog}
              </button>
              <button
                role="tab"
                aria-selected={side === 'notes'}
                class={side === 'notes' ? 'on' : ''}
                onClick={() => setSide('notes')}
              >
                <IconNotes />
                {T.tabNotes}
                {newNotes && side !== 'notes' && <span class="badge" />}
              </button>
            </div>
          )}
          {desktop && !hasNotes && <h3>{T.tabLog}</h3>}
          {desktop && hasNotes && side === 'notes' ? (
            <Notes v={v} seen={seen} markSeen={markSeen} active />
          ) : (
            <Log v={v} />
          )}
        </aside>
      </main>

      <nav class="bottom-nav only-mobile">
        {tabs.map((t) => (
          <button
            class={view === t.id ? 'on' : ''}
            onClick={() => {
              setTab(t.id);
              window.scrollTo({ top: 0 });
            }}
          >
            <span class="nav-ico">
              {t.icon}
              {t.badge && <span class="badge" />}
            </span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {!v.fight && !v.scene && <NearFight v={v} locked={locked} />}
      {v.proposal && !v.scene && (
        <div class="proposal">
          {v.proposal.mine ? (
            <>
              <span class="proposal-text">
                <IconPair />
                <span>{v.proposal.text}</span>
              </span>
              <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'cancel' })}>
                {T.cancel}
              </button>
            </>
          ) : (
            <>
              <span class="proposal-text">
                <span class="call">
                  <IconPair />
                  <span class="ring" aria-hidden="true" />
                </span>
                <span>
                  {v.proposal.text} <b>«{v.proposal.label}»</b>
                </span>
              </span>
              <div class="row">
                <button class="btn primary small" disabled={locked} onClick={() => net.send({ c: 'accept' })}>
                  {T.accept}
                </button>
                <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'decline' })}>
                  {T.decline}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {v.scene && <Scene v={v} sc={v.scene} locked={locked} />}
      {shownFight && <FightPanel f={shownFight} v={v} locked={locked || !!shownFight.ended} onGone={() => setGoneFight(shownFight.id)} />}
      {!v.scene && !shownFight && v.summary && <Summary s={v.summary} me={v.me.name} partner={v.partner.name} />}
      {!v.scene && !shownFight && !v.summary && v.welcome && <Welcome w={v.welcome} partner={v.partner.name} />}
      {dayCard !== null && (
        <div class="day-card" key={dayCard} aria-hidden="true">
          <span>{T.day}</span>
          <b>{dayCard}</b>
        </div>
      )}
      {s.toast && <div class="toast">{s.toast.text}</div>}
      {s.deltas.length > 0 && (
        <div class="deltas" aria-live="polite">
          {s.deltas.map((d) => (
            <div key={d.id} class={`delta from-${d.by}`}>
              {d.by !== 'me' && <span class="who">{d.by === 'both' ? T.deltaBoth : v.partner.name}</span>}
              {d.items.map((it) => (
                <span class={`item ${it.n > 0 ? 'plus' : 'minus'}`}>
                  {it.n > 0 ? `+${it.n}` : `−${-it.n}`} <Thing icon={it.icon} />
                  {it.name}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
