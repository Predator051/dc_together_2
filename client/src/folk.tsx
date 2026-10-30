// The residents on the painting of their room: each a face with the mark of the work they are on;
// the picked one opens below with what they are like, what they bring and the works to set them to.

import { useState } from 'preact/hooks';
import { FOLK } from '../../shared/src/pictures.js';
import type { FolkGarment, LarderView, PlayerView, ResidentView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { Thing } from './items.js';
import { markOf, stationSlots, stationUrl } from './pictures.js';
import { T } from './strings.js';
import painted from './art/folk.json';

const PAINTED_FOLK = new Set(painted as string[]);

/** A resident's painted face, or null while it is not painted. */
export function folkFace(id: string): string | null {
  if (!PAINTED_FOLK.has(id)) return null;
  return new URL(`./art/folk/${id}.webp`, import.meta.url).href;
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

function Face({ r, cls }: { r: ResidentView; cls: string }) {
  const url = folkFace(r.id);
  return url ? (
    <span class={`${cls} painted`} style={{ backgroundImage: `url(${url})` }} aria-hidden="true" />
  ) : (
    <span class={cls} aria-hidden="true">
      {r.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function FolkMedal({ r, i, at, on, onPick }: { r: ResidentView; i: number; at: [number, number]; on: boolean; onPick: () => void }) {
  const job = r.jobs.find((j) => j.id === r.job);
  const warn = r.state !== 'fed' || r.hurt;
  const says = [r.name, r.jobLabel ?? T.residentRest, r.state !== 'fed' ? STATE_WORD[r.state] : '', r.hurt ? T.residentHurt : ''].filter(Boolean).join(', ');
  return (
    <button
      type="button"
      class={`act-medal placed folk ${on ? 'on' : ''} ${r.job ? '' : 'idle'}`}
      style={{ left: `${at[0]}%`, top: `${at[1]}%`, '--i': String(i) }}
      aria-label={says}
      aria-pressed={on}
      title={says}
      onClick={onPick}
    >
      <span class="act-pic">
        <span class="act-disc">
          <Face r={r} cls="folk-face" />
        </span>
        {job?.icon && (
          <span class="folk-job" aria-hidden="true">
            {markOf(job.icon) ?? <Thing icon={job.icon} />}
          </span>
        )}
        {warn && <span class="folk-warn" aria-hidden="true" />}
      </span>
      <span class="act-label">{r.name}</span>
    </button>
  );
}

const STATE_WORD: Record<ResidentView['state'], string> = { fed: T.folkFed, low: T.folkLow, hungry: T.folkHungry, weak: T.folkWeak };

/** «+6,2», «−1,3»: a signed number with a Ukrainian comma. */
export function signed(n: number): string {
  const s = Math.abs(n).toFixed(1).replace('.', ',').replace(/,0$/, '');
  return n > 0.04 ? `+${s}` : n < -0.04 ? `−${s}` : '0';
}

function hours(n: number): string {
  return n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace('.', ',').replace(/,0$/, '');
}

/** The household's food: eaten and brought in an hour, what it comes to, how long it lasts, dishes. */
export function LarderStrip({ l, locked }: { l: LarderView; locked: boolean }) {
  const sum = l.gain - l.eat;
  const short = l.lasts !== undefined && l.lasts < 3;
  return (
    <section class={`larder ${short ? 'short' : ''}`} aria-label={T.larderNet}>
      <div class="larder-nums">
        <span>
          <small>{T.larderEat}</small>
          <b class="m loss">
            {signed(-l.eat)}
            {T.larderHour}
          </b>
        </span>
        <span>
          <small>{T.larderGain}</small>
          <b class="m gain">
            {signed(l.gain)}
            {T.larderHour}
          </b>
        </span>
        <span>
          <small>{T.larderNet}</small>
          <b class={sum < -0.04 ? 'm loss' : 'm gain'}>
            {signed(sum)}
            {T.larderHour}
          </b>
        </span>
      </div>
      <p class="larder-line">
        {T.larderStore}: <b>{l.stock}</b>
        {l.cap ? `/${l.cap}` : ''} · {l.lasts !== undefined ? (
          <b class={short ? 'warn-text' : ''}>
            {T.larderLasts} ~{hours(l.lasts)} {T.larderHours}
          </b>
        ) : (
          T.larderEnough
        )}
      </p>
      <label class={`larder-dishes ${l.dishes ? '' : 'none'}`}>
        <input type="checkbox" checked={l.feedDishes} disabled={locked} onChange={(e) => net.send({ c: 'feed', dishes: (e.target as HTMLInputElement).checked })} />
        <span>
          {T.larderDishes} <small>({l.dishes ? l.dishes : T.larderNoDishes})</small>
          <small class="larder-hint">{T.larderDishesHint}</small>
        </span>
      </label>
    </section>
  );
}

/** How full a resident is: a bar of hours in the belly, the state, when they eat again. */
function Belly({ r, stock }: { r: ResidentView; stock: number }) {
  const when = r.eatsIn > 0 ? `${T.folkEatsIn} ${T.folkIn} ~${hours(r.eatsIn)} ${T.larderHours}` : stock > 0 ? T.folkEatsSoon : T.folkEatsNow;
  return (
    <div class={`belly s-${r.state}`}>
      <span class="belly-bar" role="img" aria-label={`${STATE_WORD[r.state]}, ${when}`}>
        <span style={{ width: `${Math.min(100, (r.fed / 6) * 100)}%` }} />
      </span>
      <small>
        <b>{STATE_WORD[r.state]}</b>
        {r.good && ` · ${T.folkGood}`} · {when} · {T.folkEats} ~{hours(r.eats)}
        {T.larderHour}
      </small>
    </div>
  );
}

const pct = (x: number) => `+${Math.round((x - 1) * 100)}%`;

/** Their hand in the trade of their job: the step, the way to the next one, teaching the last; other trades. */
function Trade({ r, locked }: { r: ResidentView; locked: boolean }) {
  const t = r.trade;
  const others = r.trades.filter((x) => x.name !== t?.name);
  if (!t && !others.length) return null;
  return (
    <div class="folk-trade">
      {t && (
        <>
          <p class="folk-trade-now">
            <small>{T.folkTrade}:</small> <b>{t.name}</b> — {t.rankName}
            {t.x > 1 && ' '}
            {t.x > 1 && <span class="m gain">{pct(t.x)}</span>}
          </p>
          {t.p !== undefined && (
            <div class="folk-trade-next">
              <span class="belly-bar trade" role="img" aria-label={`${T.folkNext}: ${Math.round(t.p * 100)}%`}>
                <span style={{ width: `${t.p * 100}%` }} />
              </span>
              <small>
                {T.folkNext} «{T.folkRanks[t.rank + 1]}» — ~{hours(t.left ?? 0)} {T.folkWorkHours}
              </small>
            </div>
          )}
          {r.teach && (
            <div class="folk-teach">
              <small>{T.folkTeachLast}</small>
              <button type="button" class="btn small primary" disabled={locked || !!r.teach.reason} onClick={() => net.send({ c: 'teach', who: r.id })}>
                {T.folkTeach} · {pct(1.3)}
              </button>
              <small class={r.teach.reason ? 'warn-text' : ''}>{r.teach.reason ?? T.folkTeachHint}</small>
            </div>
          )}
        </>
      )}
      {others.length > 0 && (
        <p class="folk-trade-others">
          <small>{T.folkOther}:</small>{' '}
          {others.map((x, i) => (
            <span>
              {i > 0 && ' · '}
              {x.name.toLowerCase()} — {x.rankName}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function garmentNote(w: FolkGarment): string {
  const out = [w.guard ? T.folkGuard : '', w.warm ? T.folkWarm : '', w.heavy ? T.folkHeavy : ''].filter(Boolean);
  return out.length ? out.join(' · ') : T.folkPlain;
}

/** A tool of a trade and a garment: what they have on, and what the store holds for them. */
function Gear({ r, locked }: { r: ResidentView; locked: boolean }) {
  const [open, setOpen] = useState<'tool' | 'wear' | null>(null);
  const g = r.gear;
  const send = (slot: 'tool' | 'wear', id: string | null) => {
    net.send({ c: 'folkgear', who: r.id, slot, id });
    setOpen(null);
  };
  const toolNote = g.tool ? (g.tool.fits ? T.folkToolFits : `${T.folkToolFor} «${g.tool.trade.toLowerCase()}» — ${T.folkToolNo}`) : '';
  const row = (slot: 'tool' | 'wear', title: string, item: { name: string; icon?: string } | null, note: string, n: number) => (
    <button type="button" class={`folk-slot ${open === slot ? 'on' : ''} ${item ? '' : 'bare'}`} aria-expanded={open === slot} onClick={() => setOpen(open === slot ? null : slot)}>
      <span class="folk-slot-pic" aria-hidden="true">
        {item?.icon ? <Thing icon={item.icon} /> : null}
      </span>
      <span class="folk-slot-text">
        <small>{title}</small>
        <b>{item ? item.name : T.folkNone}</b>
        {item && <small class={note === T.folkToolFits || note.startsWith(T.folkGuard) || note.startsWith(T.folkWarm) ? 'gain' : ''}>{note}</small>}
      </span>
      {g.canChange && n > 0 && <span class="slot-more">+{n}</span>}
    </button>
  );
  const options =
    open === 'tool'
      ? g.tools.map((x) => ({ id: x.id, name: x.name, icon: x.icon, n: x.n, note: x.fits ? T.folkToolFits : `${T.folkToolFor} «${x.trade.toLowerCase()}»`, good: x.fits }))
      : open === 'wear'
        ? g.wears.map((x) => ({ id: x.id, name: x.name, icon: x.icon, n: x.n, note: garmentNote(x), good: (x.guard || x.warm) && !x.heavy }))
        : [];
  const worn = open === 'tool' ? g.tool : open === 'wear' ? g.wear : null;
  return (
    <div class="folk-gear">
      <small class="folk-gear-head">{T.folkGear}</small>
      <div class="folk-slots">
        {row('tool', T.folkTool, g.tool, toolNote, g.tools.length)}
        {row('wear', T.folkWear, g.wear, g.wear ? garmentNote(g.wear) : '', g.wears.length)}
      </div>
      {open && (
        <div class="folk-gear-pick">
          {!g.canChange && <small>{T.folkAwayGear}</small>}
          {g.canChange && !options.length && <small>{T.folkStoreEmpty}</small>}
          {g.canChange &&
            options.map((o) => (
              <button type="button" class="folk-job-opt" disabled={locked} onClick={() => send(open, o.id)}>
                <span class="folk-job-pic" aria-hidden="true">
                  {o.icon && <Thing icon={o.icon} />}
                </span>
                <span class="folk-job-text">
                  {T.folkPutOn}: {o.name} <small class="slot-n">×{o.n}</small>
                  <small class={o.good ? 'gain' : ''}>{o.note}</small>
                </span>
              </button>
            ))}
          {g.canChange && worn && (
            <button type="button" class="folk-job-opt rest" disabled={locked} onClick={() => send(open, null)}>
              <span class="folk-job-pic" aria-hidden="true" />
              <span class="folk-job-text">
                {T.folkTakeOff}: {worn.name}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The picked resident: who they are, what they bring now, and the works to set them to. */
function FolkCard({ r, locked, stock }: { r: ResidentView; locked: boolean; stock: number }) {
  const [why, setWhy] = useState(false);
  return (
    <div class="folk-card">
      <div class="folk-card-head">
        <Face r={r} cls="folk-card-face" />
        <span>
          <b class="folk-card-name">{r.name}</b>
          <small>{r.desc}</small>
        </span>
      </div>
      <p class="folk-card-now">
        {T.residentJob}: <b>{r.jobLabel ?? T.residentRest}</b>
        {r.rate !== undefined && (
          <button type="button" class="m gain folk-rate" aria-expanded={why} onClick={() => setWhy(!why)} title={T.folkWhy}>
            ~{hours(r.rate)} {T.residentPerHour}
            {r.why?.length ? ' ⓘ' : ''}
          </button>
        )}
        {r.hurt && <span class="pill warn">{T.residentHurt}</span>}
      </p>
      {why && r.why?.length ? (
        <ul class="folk-why">
          <li>{T.folkBase}</li>
          {r.why.map((p) => (
            <li class={p.x < 1 ? 'down' : 'up'}>
              {p.name} ×{String(p.x).replace('.', ',')}
            </li>
          ))}
        </ul>
      ) : null}
      <Belly r={r} stock={stock} />
      <Trade r={r} locked={locked} />
      <Gear r={r} locked={locked} />
      <ul class="traits">
        {r.traits.map((t) => (
          <li>
            <b>{t.name}.</b> {t.text}
          </li>
        ))}
      </ul>
      <div class="folk-jobs" role="group" aria-label={T.residentJob}>
        {r.jobs.map((j) => (
          <button
            type="button"
            class={`folk-job-opt ${r.job === j.id ? 'on' : ''}`}
            aria-pressed={r.job === j.id}
            disabled={locked || r.job === j.id || !!j.reason}
            onClick={() => net.send({ c: 'job', who: r.id, id: j.id })}
          >
            <span class="folk-job-pic" aria-hidden="true">
              {j.icon && (markOf(j.icon) ?? <Thing icon={j.icon} />)}
            </span>
            <span class="folk-job-text">
              {j.label}
              <small>
                {j.place} · {j.reason ?? `~${j.rate} ${T.residentPerHour}`}
                {j.rank ? ` · ${T.folkRanks[j.rank]}` : ''}
                {j.food !== undefined && !j.reason && (
                  <span class={`folk-food ${j.food < -0.04 ? 'loss' : 'gain'}`}>
                    {' '}
                    · {T.folkFood} {r.job === j.id ? '' : `${signed(r.food)} → `}
                    {signed(j.food)}
                    {T.larderHour}
                  </span>
                )}
              </small>
            </span>
          </button>
        ))}
        <button
          type="button"
          class={`folk-job-opt rest ${r.job === null ? 'on' : ''}`}
          aria-pressed={r.job === null}
          disabled={locked || r.job === null}
          onClick={() => net.send({ c: 'job', who: r.id, id: null })}
        >
          <span class="folk-job-pic" aria-hidden="true" />
          <span class="folk-job-text">{T.residentRest}</span>
        </button>
      </div>
    </div>
  );
}

/** The residents on the painting of their room (a painted one), the picked one in a card below. */
export function FolkStage({ v, locked }: { v: PlayerView; locked: boolean }) {
  const slots = stationSlots('folk');
  const [pick, setPick] = useState(() => load('bezgomin.folk'));
  const shown = v.residents.find((r) => r.id === pick) ?? v.residents.find((r) => r.state !== 'fed' || r.hurt) ?? v.residents[0];
  const choose = (id: string) => {
    setPick(id);
    store('bezgomin.folk', id);
  };
  return (
    <>
      {v.larder && <LarderStrip l={v.larder} locked={locked} />}
      <div class="stage">
        <div class="stage-paint" style={{ backgroundImage: `url(${stationUrl('folk') ?? ''})` }} aria-hidden="true" />
        {v.residents.map((r, i) => (
          <FolkMedal key={r.id} r={r} i={i} at={slots[i % slots.length]!} on={r === shown} onPick={() => choose(r.id)} />
        ))}
      </div>
      {shown && <FolkCard key={shown.id} r={shown} locked={locked} stock={v.larder?.stock ?? 0} />}
    </>
  );
}
