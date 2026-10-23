// Needs of the hero: a small strip at the top of the place (food, warmth, rest) and a panel with what to do.

import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { NeedsView, PlayerView } from '../../shared/src/protocol.js';
import { Thing } from './items.js';
import { net } from './net.js';
import { Sheet } from './sheet.js';
import { T } from './strings.js';

const MIN = 60_000;

function Pic({ children }: { children: ComponentChildren }) {
  return (
    <svg class="need-pic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const PicFood = () => (
  <Pic>
    <path d="M4 11h16c0 4.5-3.6 8-8 8s-8-3.5-8-8z" />
    <path d="M9 8c-1-1.3 1-2.2 0-3.6M14.5 8c-1-1.3 1-2.2 0-3.6" />
  </Pic>
);
const PicWarm = () => (
  <Pic>
    <path d="M12 3c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5.5 2 1.5 3 3 3-1-3 0-5.5 0-7.5z" />
  </Pic>
);
const PicRest = () => (
  <Pic>
    <path d="M19 14.5A8 8 0 0 1 9.5 5a7 7 0 1 0 9.5 9.5z" />
  </Pic>
);
const PicDrop = () => (
  <svg class="need-drop" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z" />
  </svg>
);

/** The clock of the needs: they run between views, so the client counts on (unless paused). */
function useNeedsClock(n: NeedsView, viewNow: number, offset: number): number {
  const [, force] = useState(0);
  useEffect(() => {
    if (n.paused) return;
    const id = window.setInterval(() => force((x) => x + 1), 5000);
    return () => window.clearInterval(id);
  }, [n.paused]);
  return n.paused ? 0 : Math.max(0, Date.now() + offset - viewNow);
}

function mins(ms: number): string {
  return `${Math.max(1, Math.ceil(ms / MIN))} ${T.min}`;
}

/** What the strip and the panel read: counted on from the view by the time passed. */
function live(n: NeedsView, el: number) {
  const meals = n.meals.map((m) => ({ ...m, left: Math.max(0, m.left - el) })).filter((m) => m.left > 0);
  let hp = 0;
  for (const m of meals) hp += m.left < m.fadeAt ? Math.ceil(m.hp / 2) : m.hp;
  const warmth = Math.max(0, Math.min(100, n.warmth + (n.rate * el) / MIN));
  const rested = Math.max(0, n.rested - el);
  const awake = rested > 0 ? n.awake : n.awake + Math.max(0, el - n.rested);
  const tired = rested <= 0 && awake >= n.tiredAfter;
  const wet = Math.max(0, n.wet - el * n.dry);
  return { meals, hp, warmth, rested, awake, tired, wet, hungry: meals.length === 0 };
}

function warmLevel(warmth: number): NeedsView['level'] {
  if (warmth <= 0) return 'frozen';
  if (warmth <= 40) return 'cold';
  if (warmth >= 85) return 'warm';
  return 'ok';
}

const LEVEL: Record<NeedsView['level'], string> = { warm: T.needLvlWarm, ok: T.needLvlOk, cold: T.needLvlCold, frozen: T.needLvlFrozen };

export function NeedsBar({ v, offset, open, onOpen }: { v: PlayerView; offset: number; open: boolean; onOpen: () => void }) {
  const n = v.needs!;
  const el = useNeedsClock(n, v.now, offset);
  const s = live(n, el);
  const lvl = warmLevel(s.warmth);
  const restLeft = n.tiredAfter - s.awake;
  return (
    <button type="button" class={`needs-bar ${open ? 'on' : ''}`} aria-expanded={open} aria-label={T.needsTitle} onClick={onOpen}>
      <span class={`need need-food ${s.hungry ? 'bad' : ''}`}>
        <PicFood />
        <span class="need-pips" aria-hidden="true">
          {Array.from({ length: n.slots }, (_, i) => {
            const m = s.meals[i];
            return <i class={m ? (m.left < m.fadeAt ? 'half' : 'full') : ''} />;
          })}
        </span>
        <span class="need-text">{s.hungry ? T.needHungry : `+${s.hp}`}</span>
      </span>
      <span class={`need ${lvl === 'cold' || lvl === 'frozen' ? 'bad' : lvl === 'warm' ? 'good' : ''}`}>
        <PicWarm />
        <span class="need-meter" aria-hidden="true">
          <i style={{ width: `${s.warmth}%` }} />
        </span>
        {s.wet > 0 && <PicDrop />}
        {(lvl === 'cold' || lvl === 'frozen') && <span class="need-text">{LEVEL[lvl]}</span>}
      </span>
      <span class={`need need-rest ${s.tired ? 'bad' : s.rested > 0 ? 'good' : restLeft < 10 * MIN ? 'soon' : ''}`}>
        <PicRest />
        <span class="need-text">{s.rested > 0 ? mins(s.rested) : s.tired ? T.needTiredShort : restLeft < 10 * MIN ? mins(restLeft) : T.needFreshShort}</span>
      </span>
    </button>
  );
}

function Effects({ n }: { n: NeedsView }) {
  if (!n.effects.length) return null;
  return (
    <ul class="need-effects">
      {n.effects.map((e) => (
        <li class={e.good ? 'good' : 'bad'}>
          <b>{e.name}</b> {e.text}
        </li>
      ))}
    </ul>
  );
}

export function NeedsSheet({
  v,
  offset,
  desktop,
  locked,
  onClose,
}: {
  v: PlayerView;
  offset: number;
  desktop: boolean;
  locked: boolean;
  onClose: () => void;
}) {
  const n = v.needs!;
  const el = useNeedsClock(n, v.now, offset);
  const s = live(n, el);
  const lvl = warmLevel(s.warmth);
  const busy = v.busyUntil > Date.now() + offset;
  const off = locked || busy;
  const campLeft = n.camp?.until ? n.camp.until - (Date.now() + offset) : 0;
  return (
    <Sheet desktop={desktop} label={T.needsTitle} back={T.planBack} bodyKey="needs" onClose={onClose} bar={<h2 class="sheet-title">{T.needsTitle}</h2>}>
      <div class="needs-sheet">
        <Effects n={n} />

        <section class="need-block">
          <h3>
            <PicFood /> {T.needFood}
          </h3>
          <div class="meal-slots">
            {Array.from({ length: n.slots }, (_, i) => {
              const m = s.meals[i];
              if (!m) return <div class="meal-slot empty">{T.needSlotEmpty}</div>;
              const half = m.left < m.fadeAt;
              return (
                <div class={`meal-slot ${half ? 'half' : ''}`}>
                  <span class="meal-name">
                    <Thing icon={m.icon} />
                    {m.name}
                  </span>
                  <small>
                    +{half ? Math.ceil(m.hp / 2) : m.hp} {T.needHp}
                    {m.dmg && !half ? ` · +${m.dmg} ${T.needDmg}` : ''} · {mins(m.left)}
                  </small>
                  <span class="meal-time" aria-hidden="true">
                    <i style={{ width: `${(m.left / m.full) * 100}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
          {n.edible.length > 0 ? (
            <ul class="need-list">
              {n.edible.map((f) => (
                <li>
                  <span class="need-item">
                    <span>
                      <Thing icon={f.icon} />
                      {f.name} <b>{f.n}</b>
                    </span>
                    <small>{f.note}</small>
                    {f.reason && <small class="reason">{f.reason}</small>}
                  </span>
                  <button class="btn small" disabled={off || !f.can} onClick={() => net.send({ c: 'eat', id: f.id })}>
                    {T.needEat}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p class="meta">{T.needNoFood}</p>
          )}
          <p class="need-hint">{T.needFoodHint}</p>
        </section>

        <section class="need-block">
          <h3>
            <PicWarm /> {T.needWarm}
          </h3>
          <div class={`warm-meter ${lvl}`}>
            <span class="need-meter big" aria-hidden="true">
              <i style={{ width: `${s.warmth}%` }} />
            </span>
            <span class="warm-text">
              <b>{LEVEL[lvl]}</b>
              {n.rate > 0.1 && ` · ${T.needWarming}`}
              {n.rate < -0.1 && ` · ${T.needCooling} ${Math.round(-n.rate)} ${T.needPerMin}`}
              {s.wet > 0 && ` · ${n.dry > 1 ? T.needDrying : T.needWet}`}
            </span>
          </div>
          {n.fire === 'camp' && campLeft > 0 && (
            <p class="meta">
              {T.needCampBurns} {mins(campLeft)}
            </p>
          )}
          {n.drinks.length > 0 && (
            <ul class="need-list">
              {n.drinks.map((d) => (
                <li>
                  <span class="need-item">
                    <span>
                      <Thing icon={d.icon} />
                      {d.name} <b>{d.n}</b>
                    </span>
                    <small>{d.note}</small>
                  </span>
                  <button class="btn small" disabled={off} onClick={() => net.send({ c: 'use', id: d.id })}>
                    {T.needDrinkBtn}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {n.camp && (
            <div class="need-act">
              <button class="btn" disabled={off || !n.camp.can} onClick={() => net.send({ c: 'camp' })}>
                {T.needCamp} · {n.camp.need} {T.needCampWood}
              </button>
              {n.camp.reason && <p class="reason">{n.camp.reason}</p>}
            </div>
          )}
          <p class="need-hint">{T.needWarmHint}</p>
        </section>

        <section class="need-block">
          <h3>
            <PicRest /> {T.needRest}
          </h3>
          <p class="warm-text">
            {s.rested > 0 ? (
              <>
                <b>{T.needRested}</b> · {T.needStill} {mins(s.rested)}
              </>
            ) : s.tired ? (
              <b class="bad">{T.needTired}</b>
            ) : (
              <>
                <b>{T.needFresh}</b> · {T.needTiredIn} {mins(n.tiredAfter - s.awake)}
              </>
            )}
          </p>
          <div class="need-act">
            <button class="btn primary" disabled={off || !n.rest.can} onClick={() => net.send({ c: 'rest' })}>
              {T.needRestBtn} · {n.rest.minutes} {T.min}
            </button>
            {n.rest.reason && <p class="reason">{n.rest.reason}</p>}
          </div>
          {n.comfort.length > 0 && (
            <p class="meta">
              {T.needComfort} {n.comfort.length}: {n.comfort.map((c) => c.charAt(0).toLowerCase() + c.slice(1)).join(', ')}.
            </p>
          )}
          <p class="need-hint">{T.needRestHint}</p>
        </section>
      </div>
    </Sheet>
  );
}

/** Buffs and troubles, short, for the hero card. */
export function NeedChips({ v }: { v: PlayerView }) {
  const n = v.needs;
  if (!n || !n.effects.length) return null;
  return (
    <p class="need-chips">
      {n.effects.map((e) => (
        <span class={`need-chip ${e.good ? 'good' : 'bad'}`} title={e.text}>
          {e.name}
        </span>
      ))}
    </p>
  );
}
