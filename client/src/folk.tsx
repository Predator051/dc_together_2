// The residents on the painting of their room: each a face with the mark of the work they are on;
// the picked one opens below with what they are like, what they bring and the works to set them to.

import { useState } from 'preact/hooks';
import { FOLK } from '../../shared/src/pictures.js';
import type { PlayerView, ResidentView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { Thing } from './items.js';
import { markOf, stationSlots, stationUrl } from './pictures.js';
import { T } from './strings.js';
import painted from './art/folk.json';

const PAINTED_FOLK = new Set(painted as string[]);

/** A resident's painted face, or null while it is not painted. */
export function folkFace(id: string): string | null {
  if (!PAINTED_FOLK.has(id)) return null;
  return new URL(`./art/folk/f${(FOLK as readonly string[]).indexOf(id) + 1}.webp`, import.meta.url).href;
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
  const warn = r.hungry || r.hurt;
  const says = [r.name, r.jobLabel ?? T.residentRest, r.hungry ? T.residentHungry : '', r.hurt ? T.residentHurt : ''].filter(Boolean).join(', ');
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

/** The picked resident: who they are, what they bring now, and the works to set them to. */
function FolkCard({ r, locked }: { r: ResidentView; locked: boolean }) {
  const job = r.jobs.find((j) => j.id === r.job);
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
        {job && (
          <span class="m gain">
            ~{job.rate} {T.residentPerHour}
          </span>
        )}
        {r.hungry && <span class="pill warn">{T.residentHungry}</span>}
        {r.hurt && <span class="pill warn">{T.residentHurt}</span>}
      </p>
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
  const shown = v.residents.find((r) => r.id === pick) ?? v.residents.find((r) => r.hungry || r.hurt) ?? v.residents[0];
  const choose = (id: string) => {
    setPick(id);
    store('bezgomin.folk', id);
  };
  return (
    <>
      <div class="stage">
        <div class="stage-paint" style={{ backgroundImage: `url(${stationUrl('folk') ?? ''})` }} aria-hidden="true" />
        {v.residents.map((r, i) => (
          <FolkMedal key={r.id} r={r} i={i} at={slots[i % slots.length]!} on={r === shown} onPick={() => choose(r.id)} />
        ))}
      </div>
      {shown && <FolkCard key={shown.id} r={shown} locked={locked} />}
    </>
  );
}
