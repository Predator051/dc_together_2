// The works of a place: tiles, medals on a painted workplace, cards, groups by kind.
import type { ComponentChildren, JSX } from 'preact';
import { useContext, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { EntrySort, EntryView, GroupView, MateEntryView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { StageOn } from './plan.js';
import { IconDown, IconLock, IconPair } from './icons.js';
import { T } from './strings.js';
import { heroFace } from './portraits.js';
import { Thing } from './items.js';
import { markOf, picture, stationSlots, stationUrl } from './pictures.js';
import { seatItems, stageItems } from './stage-place.js';
import { BedCard, firstBed, GardenBeds, GardenScene, GardenWater, sceneHeight, useGardenClock } from './garden.js';

import { SAFETY_MS, Fill, load, store, secsLeft, type Ctx, useEcho } from './clock.js';

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
/** On the garden the medals stand along the fence, clear of the beds. */
const GARDEN_SLOTS: Array<[number, number]> = [
  [11, 15],
  [89, 15],
  [30, 12],
  [70, 12],
  [50, 10],
];

function WorkStage({ g, c, icon }: { g: GroupView; c: Ctx; icon: string }) {
  const garden = c.v.garden && c.v.garden.group === g.id ? c.v.garden : null;
  const slots = garden ? GARDEN_SLOTS : stationSlots(icon);
  const gnow = useGardenClock(c.offset);
  const [bed, setBed] = useState<number | null>(() => firstBed(c.v, gnow));
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
    setBed(null);
    store(`bezgomin.work.${g.id}`, id);
    fold();
  };
  const shownBed = garden && bed !== null && bed < garden.beds.length ? bed : null;
  const placed = items.map((it, n) => {
    const list = it.ids.map((id) => byId.get(id)).filter((e): e is EntryView => !!e);
    const at = slots[seats[it.key] ?? n] ?? slots[0]!;
    return { it, list, at, n };
  });
  const open = placed.find((p) => p.it.key === fan);
  return (
    <>
      <div class={`stage ${garden ? 'garden-stage' : ''}`} style={garden ? { aspectRatio: `900 / ${sceneHeight(garden.beds.length)}` } : undefined} ref={box}>
        {garden ? (
          <GardenScene v={c.v} now={gnow} picked={shownBed} onPick={(i) => setBed(shownBed === i ? null : i)} locked={c.locked} />
        ) : (
          <div class="stage-paint" style={{ backgroundImage: `url(${stationUrl(icon) ?? ''})` }} aria-hidden="true" />
        )}
        {placed.map(({ it, list, at, n }) => (
          <Medal
            key={it.key}
            list={list}
            shown={list.find((e) => e === chosen) ?? list.find((e) => e.enabled) ?? list[0]!}
            sort={it.sort}
            c={c}
            place={icon}
            on={shownBed === null && !!chosen && list.includes(chosen)}
            at={at}
            i={n}
            onPick={() => (it.sort ? setFan(it.key) : choose(it.ids[0]!))}
          />
        ))}
        {open && (
          <Fan name={STACK_NAMES[open.it.sort ?? ''] ?? ''} at={open.at} onClose={fold}>
            {open.list.map((e, n) => (
              <Medal key={e.id} list={[e]} shown={e} c={c} place={icon} on={e === chosen && shownBed === null} i={n} named onPick={() => choose(e.id)} />
            ))}
          </Fan>
        )}
      </div>
      {garden && <GardenWater gv={garden} now={gnow} />}
      {shownBed !== null ? <BedCard v={c.v} now={gnow} bed={shownBed} locked={c.locked} /> : chosen && <WorkCard e={chosen} c={c} place={icon} />}
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

export function Group({ g, c }: { g: GroupView; c: Ctx }) {
  const stage = useContext(StageOn);
  if (stage) {
    return (
      <section class={`group staged ${g.base ? 'base' : ''}`}>
        <WorkStage g={g} c={c} icon={stage} />
        {(g.desc || g.progress) && <PlaceHead g={g} />}
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
export function PlaceHead({ g }: { g: GroupView }) {
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

