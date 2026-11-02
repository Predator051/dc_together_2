import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { GroupView, PlayerView, SummaryView, WelcomeView } from '../../shared/src/protocol.js';
import type { NetState } from './net.js';
import { net } from './net.js';
import { Ambient } from './ambient.js';
import { Notes, useSeenClues } from './notes.js';
import { HeroPanel } from './hero.js';
import { AreaPlan, PlanBack, extraSpot, groupSpots } from './plan.js';
import type { Spot } from './plan.js';
import { notifier } from './notify.js';
import { sound } from './sound.js';
import { Scene } from './scene.js';
import { IconBell, IconBellOff, IconDown, IconFlame, IconHero, IconLog, IconMap, IconMotion, IconMotionOff, IconMute, IconNotes, IconPair, IconPin, IconSnow, IconSound, IconWork } from './icons.js';
import { T } from './strings.js';
import { BagPanel, MapPanel, NearFight, PackList, ResidentsPanel } from './world.js';
import { FightPanel } from './fight.js';
import { preloadLand } from './landmap.js';
import { Cell } from './cells.js';
import { heroFace } from './portraits.js';
import { Thing } from './items.js';
import { stationUrl } from './pictures.js';
import { StoreStage } from './store.js';
import { FolkStage } from './folk.js';
import { NeedsBar, NeedsSheet } from './needs.js';
import { WeatherChip } from './weather.js';
import { EventCards } from './events.js';
import { AsksStrip } from './asks.js';
import { gardenWants } from './garden.js';
import { WorkFx, workPref } from './workfx.js';

import { SAFETY_MS, useServerClock, Fill, useMedia, load, store, type Ctx } from './clock.js';
import { Group, PlaceHead } from './works.js';
type Tab = 'work' | 'map' | 'hero' | 'notes' | 'log';

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

function WorkFxToggle() {
  const [, force] = useState(0);
  useEffect(() => workPref.subscribe(() => force((x) => x + 1)), []);
  const on = workPref.mode !== 'off';
  const label = on ? T.workFxOff : T.workFxOn;
  return (
    <button class={`sound-toggle ${on ? 'on' : ''}`} aria-label={label} title={label} onClick={() => workPref.set(on ? 'off' : 'big')}>
      {on ? <IconMotion /> : <IconMotionOff />}
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
  const status = !p.online ? T.partnerOffline : p.remembering ? T.partnerRemembering : working ? working.text : T.partnerIdle;
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
  const heroBadge = v.hero.points > 0 || v.hero.perkPoints > 0;
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
      // ripe beds, and empty ones while there is seed, count as things to do in the garden
      const gardenSpot = v.garden && spots.find((x) => x.id === v.garden!.group);
      if (gardenSpot) gardenSpot.ready += gardenWants(v.garden!, v, now);
      const extra: Spot[] = [];
      if (v.atHome && v.residents.length > 0) {
        const warn = v.residents.some((r) => r.state !== 'fed' || r.hurt) || (v.larder?.lasts !== undefined && v.larder.lasts < 3);
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
      {v.memories && v.atHome && !v.past && (
        <button
          type="button"
          class="remember-btn"
          disabled={locked || !v.memories.can}
          title={v.memories.reason}
          onClick={() => net.send({ c: 'remember', on: true })}
        >
          <IconFlame />
          <span class="remember-text">
            <b>{T.remember}</b>
            <small>{v.memories.can ? T.rememberHint : v.memories.reason}</small>
          </span>
        </button>
      )}
      {v.together && v.atHome && !v.past && (
        <button
          type="button"
          class="remember-btn together"
          disabled={locked || !v.together.can}
          title={v.together.reason}
          onClick={() => net.send({ c: 'remember', on: true, together: true })}
        >
          <IconFlame />
          <span class="remember-text">
            <b>{T.rememberTogether}</b>
            <small>{v.together.can ? (v.together.mateIn ? T.rememberTogetherMate.replace('{name}', v.partner.name) : T.rememberTogetherHint) : v.together.reason}</small>
          </span>
        </button>
      )}
      {!v.past && <AsksStrip v={v} locked={locked} desktop={desktop} />}
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
    <div class={`game ${s.connected || !s.lost ? '' : 'offline'} ${v.past ? 'in-past' : ''}`}>
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
          <WorkFxToggle />
          <SoundToggle />
          <span class={`net ${s.connected ? 'ok' : 'bad'}`} title={s.connected ? T.onlineDot : T.offlineDot} />
        </div>
        {(!v.past || v.past.shared) && <Partner v={v} now={now} offset={s.offset} />}
        {!s.connected && s.lost && <div class="warn-bar">{T.reconnecting}</div>}
        {v.past && (
          <div class="past-bar">
            <span class="past-title">{v.past.title}</span>
            <button type="button" class="past-back" disabled={!!v.fight} onClick={() => net.send({ c: 'remember', on: false })}>
              {T.rememberBack}
            </button>
          </div>
        )}
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
      <WorkFx v={v} offset={s.offset} hidden={!!v.scene || !!shownFight || !!v.summary || !!v.welcome} />
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
