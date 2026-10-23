// The home garden: the beds with what grows in them, sowing and gathering. Growth runs between
// views, so the client counts it on from the rate the server gives.

import { useEffect, useState } from 'preact/hooks';
import type { GardenView, PlayerView } from '../../shared/src/protocol.js';
import { Thing } from './items.js';
import { net } from './net.js';
import { T } from './strings.js';

const MIN = 60_000;

function useClock(offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offset), 15_000);
    return () => window.clearInterval(id);
  }, [offset]);
  return now;
}

/** "~40 хв", "~1 год 20 хв". */
function span(ms: number): string {
  const m = Math.max(1, Math.ceil(ms / MIN));
  if (m < 60) return `~${m} ${T.min}`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return `~${h} ${T.hour}${r ? ` ${r} ${T.min}` : ''}`;
}

function Water({ gv, now }: { gv: GardenView; now: number }) {
  if (gv.rain) return <p class="garden-water wet">{T.gardenRain}</p>;
  if (gv.wetUntil > now) return <p class="garden-water wet">{`${T.gardenWet} ${span(gv.wetUntil - now)}`}</p>;
  return <p class="garden-water">{T.gardenDry}</p>;
}

export function GardenBeds({ v, offset, locked }: { v: PlayerView; offset: number; locked: boolean }) {
  const gv = v.garden!;
  const now = useClock(offset);
  const [sel, setSel] = useState<number | null>(null);
  const el = Math.max(0, now - v.now);
  const empty = gv.beds.findIndex((b) => !b.crop);
  const picked = sel !== null && !gv.beds[sel]?.crop ? sel : null;
  const sowable = gv.seeds.filter((s) => s.have > 0);
  return (
    <div class="garden">
      <Water gv={gv} now={now} />
      <div class="beds">
        {gv.beds.map((b, i) => {
          if (!b.crop)
            return (
              <button type="button" class={`bed empty ${picked === i ? 'on' : ''}`} disabled={locked} aria-pressed={picked === i} onClick={() => setSel(picked === i ? null : i)}>
                <span class="bed-soil" aria-hidden="true" />
                <span class="bed-name">{T.gardenEmpty}</span>
                <span class="bed-note">{T.gardenSow}</span>
              </button>
            );
          const grown = Math.min(b.grows, b.grown + el * gv.rate);
          const ready = b.ready || grown >= b.grows;
          const left = ready ? 0 : (b.grows - grown) / Math.max(0.1, gv.rate);
          return ready ? (
            <button type="button" class="bed ready" disabled={locked} onClick={() => net.send({ c: 'harvest', bed: i })}>
              <span class="bed-name">
                <Thing icon={b.crop.icon} />
                {b.crop.name}
              </span>
              <span class="bed-note">{T.gardenGather}</span>
            </button>
          ) : (
            <div class="bed growing">
              <span class="bed-name">
                <Thing icon={b.crop.icon} />
                {b.crop.name}
              </span>
              <span class="bed-bar" aria-hidden="true">
                <i style={{ width: `${Math.round((grown / b.grows) * 100)}%` }} />
              </span>
              <span class="bed-note">{span(left)}</span>
            </div>
          );
        })}
      </div>
      {picked !== null && (
        <div class="sow">
          <p class="sow-head">{T.gardenWhat}</p>
          {sowable.length ? (
            <div class="sow-list">
              {sowable.map((s) => (
                <button type="button" class="btn sow-seed" disabled={locked} onClick={() => (net.send({ c: 'plant', bed: picked, crop: s.crop }), setSel(null))}>
                  <span>
                    <Thing icon={s.icon} />
                    {s.name} <b>{s.have}</b>
                  </span>
                  <span class="sow-meta">{s.gives === s.name ? span(s.grows) : `${s.gives} · ${span(s.grows)}`}</span>
                </button>
              ))}
            </div>
          ) : (
            <p class="empty-note">{T.gardenNoSeed}</p>
          )}
        </div>
      )}
      {picked === null && empty >= 0 && sowable.length > 0 && <p class="garden-hint">{T.gardenHint}</p>}
    </div>
  );
}
