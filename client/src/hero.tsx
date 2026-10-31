// The hero: a card with the main numbers, the gear on a drawn figure, and growth on its own page.

import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlayerView, SlotView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { Thing } from './items.js';
import { heroFace, heroFigure } from './portraits.js';
import { NeedChips } from './needs.js';
import { Sheet } from './sheet.js';
import { T } from './strings.js';
import { Growth } from './growth.js';

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

function Bar({ n, max, cls = '' }: { n: number; max: number; cls?: string }) {
  const p = max > 0 ? Math.max(0, Math.min(1, n / max)) : 0;
  return (
    <span class={`bar ${cls}`} aria-hidden="true">
      <span style={{ width: `${p * 100}%` }} />
    </span>
  );
}

// ---------------------------------------------------------------------------- pictures

function Pic({ children, size = 32 }: { children: ComponentChildren; size?: number }) {
  return (
    <svg
      class="spot-pic"
      viewBox={`0 0 ${size} ${size}`}
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

const SLOT_PICS: Record<string, () => JSX.Element> = {
  weapon: () => (
    <Pic>
      <path d="M24 4l4 4-15 15-4-4z" />
      <path d="M9 19l-3 3 4 4 3-3M5 27l2-2" />
      <path d="M21 7l4 4" />
    </Pic>
  ),
  offhand: () => (
    <Pic>
      <path d="M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8z" />
      <path d="M16 4v24M6 14h20" />
    </Pic>
  ),
  head: () => (
    <Pic>
      <path d="M7 24c0-10 4-17 9-17s9 7 9 17" />
      <path d="M5 24h22M11 24c0-5 2-8 5-8s5 3 5 8" />
    </Pic>
  ),
  body: () => (
    <Pic>
      <path d="M11 5l-6 4 2 8 3-1v12h12V16l3 1 2-8-6-4c-1 2-3 3-5 3s-4-1-5-3z" />
      <path d="M16 8v20" />
    </Pic>
  ),
  hands: () => (
    <Pic>
      <path d="M10 28v-7l-4-6c-1-2 1-3 2-2l3 3V7a1.6 1.6 0 0 1 3.2 0v7-9a1.6 1.6 0 0 1 3.2 0v9-8a1.6 1.6 0 0 1 3.2 0v9-6a1.6 1.6 0 0 1 3.2 0v10c0 4-2 7-4 9v1" />
    </Pic>
  ),
  legs: () => (
    <Pic>
      <path d="M11 4h7v14l8 4c2 1 2 5-1 5H8c-1 0-2-1-2-2l2-7c1-2 3-3 3-5z" />
      <path d="M6 24h20" />
    </Pic>
  ),
  belt: () => (
    <Pic>
      <path d="M3 13h26v6H3z" />
      <path d="M12 11h8v10h-8zM16 16h4" />
      <path d="M24 19v5M7 19v4" />
    </Pic>
  ),
};
function slotPic(slot: string): JSX.Element {
  return (SLOT_PICS[slot] ?? SLOT_PICS.body!)();
}

const NUM_PICS: Record<string, () => JSX.Element> = {
  hp: () => (
    <Pic size={24}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </Pic>
  ),
  dmg: () => (
    <Pic size={24}>
      <path d="M18 3l3 3-11 11-3-3zM7 14l-3 3 3 3 3-3M3 21l1.5-1.5" />
    </Pic>
  ),
  armor: () => (
    <Pic size={24}>
      <path d="M12 3l7 3v6c0 4.6-3 7.6-7 9-4-1.4-7-4.4-7-9V6z" />
    </Pic>
  ),
  hit: () => (
    <Pic size={24}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r=".8" />
    </Pic>
  ),
  dodge: () => (
    <Pic size={24}>
      <path d="M4 16c4 0 6-3 8-6s4-5 8-5M4 20c5 0 8-2 11-6M9 8c-2 0-4 1-5 3" />
    </Pic>
  ),
  carry: () => (
    <Pic size={24}>
      <path d="M8.5 7.5C5.6 10 4 13.6 4 15.8 4 18.6 7 20 12 20s8-1.4 8-4.2c0-2.2-1.6-5.8-4.5-8.3z" />
      <path d="M8.5 7.5h7M9.5 7.5L8 4h8l-1.5 3.5" />
    </Pic>
  ),
};

// ---------------------------------------------------------------------------- the card

/** Level in a seal whose rim fills with experience; the hero's face inside it once painted. */
function LevelSeal({ level, p, face }: { level: number; p: number; face: string | null }) {
  return (
    <span class={`level-seal ${face ? 'with-face' : ''}`} aria-hidden="true">
      {face && <span class="level-face" style={{ backgroundImage: `url(${face})` }} />}
      <svg viewBox="0 0 64 64">
        <circle class="rim" cx="32" cy="32" r="29" />
        <circle class="fill" cx="32" cy="32" r="29" pathLength={100} style={{ strokeDasharray: `${Math.round(p * 100)} 100` }} />
      </svg>
      <b>{level}</b>
    </span>
  );
}

function HeroCard({ v, onGrowth }: { v: PlayerView; onGrowth: () => void }) {
  const h = v.hero;
  const d = h.derived;
  const span = Math.max(1, h.xpNext - h.xpPrev);
  const nums: Array<[string, string, string | number]> = [
    ['hp', T.dHp, `${v.me.hp}/${d.hpMax}`],
    ['dmg', T.dDmg, `${d.dmg[0]}–${d.dmg[1]}`],
    ['armor', T.dArmor, d.armor],
    ['hit', T.dHit, `${d.hit}%`],
    ['dodge', T.dDodge, `${d.dodge}%`],
    ['carry', T.dCarry, d.carry],
  ];
  return (
    <section class="hero-card">
      <div class="hero-id">
        <LevelSeal level={h.level} p={(h.xp - h.xpPrev) / span} face={heroFace(v.me.role, v.me.gender)} />
        <div class="hero-who">
          <b class="hero-name">{v.me.name}</b>
          <span class="hero-role">
            {v.me.roleTitle} · {T.level.toLowerCase()} {h.level}
          </span>
          <span class="hero-hp">
            <Bar n={v.me.hp} max={d.hpMax} cls="hp mine" />
          </span>
          <small class="hero-xp">
            {h.cap?.reached ? (
              <>
                {T.capReached} {h.cap.level}
                {h.temper && (
                  <>
                    {' · '}
                    {T.temper} {h.temper.rank} ({h.temper.xp}/{h.temper.next})
                  </>
                )}
              </>
            ) : (
              <>
                {T.xp} {h.xp} / {h.xpNext}
                {h.cap && (
                  <>
                    {' · '}
                    {T.capOf} {h.cap.level}
                  </>
                )}
              </>
            )}
          </small>
          {!!h.catchUp && (
            <small class="hero-catch">
              {T.catchUp} {h.catchUp}
            </small>
          )}
        </div>
      </div>
      <dl class="hero-nums">
        {nums.map(([id, name, value]) => (
          <div class={`num n-${id}`}>
            <dt>
              {NUM_PICS[id]!()}
              {name}
            </dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <NeedChips v={v} />
      {(d.resist.length > 0 || d.tools.length > 0) && (
        <p class="hero-also">
          {d.resist.length > 0 && (
            <span>
              <b>{T.dResist}:</b> {d.resist.join(', ')}
            </span>
          )}
          {d.tools.length > 0 && (
            <span>
              <b>{T.dTools}:</b> {d.tools.join(', ')}
            </span>
          )}
        </p>
      )}
      {h.temper && <TemperBox t={h.temper} />}
      {v.hard && <HardBox h={v.hard} />}
      {(h.points > 0 || h.perkPoints > 0) && (
        <button type="button" class="hero-call" onClick={onGrowth}>
          <span class="hero-call-dot" />
          {[h.points > 0 ? `${T.points}: ${h.points}` : '', h.perkPoints > 0 ? `${T.perkPoints}: ${h.perkPoints}` : ''].filter(Boolean).join(' · ')}
          <span class="hero-call-go">→</span>
        </button>
      )}
    </section>
  );
}

/** The hard road: proposed by one, agreed by the other; either turns it off. */
function HardBox({ h }: { h: NonNullable<PlayerView['hard']> }) {
  const note = h.on ? T.hardOn : h.asked === 'me' ? T.hardAskedMe : h.asked === 'mate' ? T.hardAskedMate : T.hardOff;
  return (
    <div class={`hard ${h.on ? 'on' : ''} ${h.asked === 'mate' ? 'asked' : ''}`}>
      <p class="hard-head">
        <b>{T.hard}</b> {note}
      </p>
      <p class="hard-text">{T.hardText}</p>
      <div class="hard-btns">
        {h.on ? (
          <button type="button" class="btn small" onClick={() => net.send({ c: 'hard', on: false })}>
            {T.hardTurnOff}
          </button>
        ) : h.asked === 'me' ? (
          <button type="button" class="btn small" onClick={() => net.send({ c: 'hard', on: false })}>
            {T.hardTakeBack}
          </button>
        ) : (
          <button type="button" class="btn small" onClick={() => net.send({ c: 'hard', on: true })}>
            {h.asked === 'mate' ? T.hardAgree : T.hardPropose}
          </button>
        )}
      </div>
    </div>
  );
}

/** Past the act's ceiling: ranks of temper to spend, a little at a time. */
function TemperBox({ t }: { t: NonNullable<PlayerView['hero']['temper']> }) {
  return (
    <div class="temper">
      <p class="temper-head">
        <b>{T.temper}</b> {t.points > 0 ? `${T.temperFree}: ${t.points}` : T.temperNone}
      </p>
      <div class="temper-kinds">
        {t.kinds.map((k) => {
          const full = k.most !== null && k.taken >= k.most;
          return (
            <button
              type="button"
              class={`temper-kind ${full ? 'full' : ''}`}
              disabled={t.points <= 0 || full}
              title={k.text}
              onClick={() => net.send({ c: 'temper', id: k.id })}
            >
              <span class="temper-name">{k.name}</span>
              <span class="temper-n">{k.most !== null ? `${k.taken}/${k.most}` : k.taken > 0 ? `×${k.taken}` : ''}</span>
              <span class="temper-text">{k.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------- gear on a figure

/** Where each slot sits around the figure (per cent of the box) and where its line meets the drawn body. */
const SLOT_AT: Record<string, { x: number; y: number; to: [number, number] }> = {
  head: { x: 13, y: 12, to: [50, 14] },
  body: { x: 13, y: 37, to: [48, 36] },
  offhand: { x: 13, y: 62, to: [31, 60] },
  legs: { x: 13, y: 87, to: [44, 82] },
  hands: { x: 87, y: 24, to: [69, 58] },
  weapon: { x: 87, y: 49, to: [70, 62] },
  belt: { x: 87, y: 74, to: [56, 54] },
};

/**
 * The painted hero's box in the doll (per cent; the doll is 200 by 220). The 1:2 painting fills the
 * box's width and stands on its floor, so the figure itself takes `PAINTED` of the doll.
 */
const PAINT_BOX = { left: 29, top: 2, width: 42, height: 96 };
const PAINTED = (() => {
  const h = (PAINT_BOX.width * 2 * 200) / 220;
  return { left: PAINT_BOX.left, top: PAINT_BOX.top + PAINT_BOX.height - h, width: PAINT_BOX.width, height: h };
})();

/** Where each slot's line meets a painted hero: per cent of that painting (measured on it, by eye). */
const PAINTED_AT: Record<string, Record<string, [number, number]>> = {
  'maker-m': { head: [49, 7], body: [48, 28], offhand: [14, 54], legs: [30, 89], hands: [85, 50], weapon: [87, 56], belt: [62, 41] },
  'hunter-f': { head: [51, 7], body: [50, 27], offhand: [21, 52], legs: [31, 89], hands: [81, 49], weapon: [82, 54], belt: [58, 37] },
};

/** Where a slot's line ends: on the painted hero when there is one, else on the drawn body. */
function leadTo(slot: string, look: string | null): [number, number] | null {
  const at = look ? PAINTED_AT[look]?.[slot] : undefined;
  if (at) return [PAINTED.left + (at[0] / 100) * PAINTED.width, PAINTED.top + (at[1] / 100) * PAINTED.height];
  return SLOT_AT[slot]?.to ?? null;
}

function Figure({ slots, figure, look }: { slots: SlotView[]; figure: string | null; look: string | null }) {
  const box = { left: `${PAINT_BOX.left}%`, top: `${PAINT_BOX.top}%`, width: `${PAINT_BOX.width}%`, height: `${PAINT_BOX.height}%` };
  return (
    <>
      {figure && <span class="doll-paint" style={{ ...box, backgroundImage: `url(${figure})` }} aria-hidden="true" />}
      <svg class={`doll-figure ${figure ? 'painted' : ''}`} viewBox="0 0 200 220" preserveAspectRatio="none" aria-hidden="true">
        {slots.map((s) => {
          const at = SLOT_AT[s.slot];
          const to = leadTo(s.slot, figure ? look : null);
          if (!at || !to) return null;
          const x1 = at.x * 2 + (at.x < 50 ? 16 : -16);
          // a dot where the line meets the body, so it reads even over the clothes
          return (
            <g class={`lead ${s.item ? 'on' : ''}`}>
              <path d={`M${x1} ${at.y * 2.2}L${to[0] * 2} ${to[1] * 2.2}`} />
              {figure && <circle cx={to[0] * 2} cy={to[1] * 2.2} r={1.8} />}
            </g>
          );
        })}
        <g class="body">
          <ellipse cx="100" cy="27" rx="13" ry="15" />
          <path d="M93 42C93 46 92 48 90 50C80 51 72 54 68 60C64 76 62 96 60 118C59 124 60 128 63 130C66 129 67 125 66 120C67 100 70 82 74 70C76 90 78 104 80 118C78 128 78 136 80 142C80 160 82 182 84 200C78 202 74 204 74 207L92 207C92 204 91 202 90 200C94 178 96 160 99 142L100 141" />
          <path transform="translate(200 0) scale(-1 1)" d="M93 42C93 46 92 48 90 50C80 51 72 54 68 60C64 76 62 96 60 118C59 124 60 128 63 130C66 129 67 125 66 120C67 100 70 82 74 70C76 90 78 104 80 118C78 128 78 136 80 142C80 160 82 182 84 200C78 202 74 204 74 207L92 207C92 204 91 202 90 200C94 178 96 160 99 142L100 141" />
          <path class="seam" d="M80 118c13 3 27 3 40 0M90 50c3 4 7 6 10 6s7-2 10-6M100 56v60" />
        </g>
      </svg>
    </>
  );
}

function GearSheet({
  slots,
  pick,
  setPick,
  canChange,
  locked,
  desktop,
  onClose,
}: {
  slots: SlotView[];
  pick: string;
  setPick: (s: string) => void;
  canChange: boolean;
  locked: boolean;
  desktop: boolean;
  onClose: () => void;
}) {
  const s = slots.find((x) => x.slot === pick) ?? slots[0]!;
  const chips = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chips.current?.querySelector('.chip.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [s.slot]);
  return (
    <Sheet
      desktop={desktop}
      label={s.name}
      back={T.heroBack}
      bodyKey={s.slot}
      onClose={onClose}
      bar={
        <div class="station-chips" role="tablist" ref={chips}>
          {slots.map((x) => (
            <button
              type="button"
              role="tab"
              aria-selected={x.slot === s.slot}
              class={`chip ${x.slot === s.slot ? 'on' : ''}`}
              onClick={() => setPick(x.slot)}
            >
              {slotPic(x.slot)}
              <span>{x.name}</span>
              {x.slot !== s.slot && canChange && !x.item && x.options.length > 0 && <span class="badge" />}
            </button>
          ))}
        </div>
      }
    >
      <h3 class="gear-h">{T.heroNow}</h3>
      {s.item ? (
        <div class="gear-now">
          <span class="gear-now-pic">
            <Thing icon={s.item.icon} />
          </span>
          <span class="gear-now-text">
            <b>{s.item.name}</b>
            {s.item.note && <small>{s.item.note}</small>}
          </span>
          {canChange && (
            <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'equip', slot: s.slot, id: null })}>
              {T.takeOff}
            </button>
          )}
        </div>
      ) : (
        <p class="gear-empty">{T.empty}</p>
      )}
      {!canChange && <p class="meta gear-away">{T.gearAway}</p>}
      {s.options.length > 0 && (
        <>
          <h3 class="gear-h">{T.heroCanWear}</h3>
          <div class="tiles">
            {s.options.map((o) => (
              <button
                class="tile"
                disabled={locked || !canChange}
                onClick={() => net.send({ c: 'equip', slot: s.slot, id: o.id })}
              >
                <span class="tile-top">
                  <span class="tile-label">
                    <Thing icon={o.icon} />
                    {o.name}
                  </span>
                  {o.n > 1 && <span class="tile-secs">×{o.n}</span>}
                </span>
                {o.note && (
                  <span class="tile-meta">
                    <span class="m gain">{o.note}</span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
      {!s.item && !s.options.length && <p class="meta">{T.heroNothing}</p>}
    </Sheet>
  );
}

function Gear({ v, locked, desktop }: { v: PlayerView; locked: boolean; desktop: boolean }) {
  const h = v.hero;
  const [pick, setPick] = useState<string | null>(null);
  const open = pick && h.slots.some((s) => s.slot === pick) ? pick : null;
  return (
    <>
      {!(desktop && open) && (
        <div class="doll" role="group" aria-label={T.gear}>
          <Figure slots={h.slots} figure={heroFigure(v.me.role, v.me.gender)} look={v.me.role ? `${v.me.role}-${v.me.gender}` : null} />
          {h.slots.map((s, i) => {
            const at = SLOT_AT[s.slot];
            if (!at) return null;
            const more = h.canChange && s.options.length > 0;
            return (
              <button
                type="button"
                class={`slot-spot ${s.item ? 'filled' : 'bare'} ${open === s.slot ? 'on' : ''}`}
                style={{ left: `${at.x}%`, top: `${at.y}%`, '--i': String(i) }}
                aria-label={`${s.name}: ${s.item ? s.item.name : T.empty}`}
                onClick={() => setPick(open === s.slot ? null : s.slot)}
              >
                <span class="spot-medal">
                  {s.item?.icon ? <Thing icon={s.item.icon} /> : slotPic(s.slot)}
                  {more && <span class={`slot-more ${s.item ? '' : 'want'}`}>+{s.options.length}</span>}
                </span>
                <span class="slot-label">
                  <small>{s.name}</small>
                  {s.item && <span>{s.item.name}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && (
        <GearSheet
          slots={h.slots}
          pick={open}
          setPick={setPick}
          canChange={h.canChange}
          locked={locked}
          desktop={desktop}
          onClose={() => setPick(null)}
        />
      )}
      {!h.canChange && !open && <p class="meta center">{T.gearAway}</p>}
      <section class="outfits-row">
        <h3>{T.outfits}</h3>
        <div class="outfit-cards">
          {h.outfits.map((o) => (
            <div class="outfit-card">
              <b>{o.name === 'fight' ? T.outfitFight : T.outfitWork}</b>
              <small>{o.items.length ? o.items.join(', ') : T.outfitNone}</small>
              <span class="row">
                <button
                  class="btn small primary"
                  disabled={locked || !h.canChange || !o.items.length}
                  onClick={() => net.send({ c: 'outfit', name: o.name, save: false })}
                >
                  {T.outfitWear}
                </button>
                <button class="btn small ghost" disabled={locked} onClick={() => net.send({ c: 'outfit', name: o.name, save: true })}>
                  {T.outfitSave}
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// ---------------------------------------------------------------------------- the page

type HeroTab = 'gear' | 'growth';

export function HeroPanel({ v, locked, desktop }: { v: PlayerView; locked: boolean; desktop: boolean }) {
  const h = v.hero;
  const [tab, setTab] = useState<HeroTab>(() => (load('bezgomin.heroTab') === 'growth' ? 'growth' : 'gear'));
  useEffect(() => store('bezgomin.heroTab', tab), [tab]);
  const call = h.points > 0 || h.perkPoints > 0;
  return (
    <div class="hero">
      <HeroCard v={v} onGrowth={() => setTab('growth')} />
      <div class={`hero-tabs at-${tab}`} role="tablist">
        <button role="tab" aria-selected={tab === 'gear'} class={tab === 'gear' ? 'on' : ''} onClick={() => setTab('gear')}>
          {T.gear}
        </button>
        <button role="tab" aria-selected={tab === 'growth'} class={tab === 'growth' ? 'on' : ''} onClick={() => setTab('growth')}>
          {T.heroGrowth}
          {call && tab !== 'growth' && <span class="badge" />}
        </button>
      </div>
      <div class="hero-page" key={tab}>
        {tab === 'gear' ? <Gear v={v} locked={locked} desktop={desktop} /> : <Growth v={v} locked={locked} />}
      </div>
    </div>
  );
}
