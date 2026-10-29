// A fight on a field of cells, seen from above: the ground of the place, the fighters as seals on it,
// the cells you can walk to lit on your turn. Others' turns are played out step by step: a seal slides
// along its way, lunges, a number rises. Below, what is in your hands and what it lets you do.
import type { JSX } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { FightEvent } from '../../shared/src/state.js';
import type { FightMoveView, FightView, PlayerView } from '../../shared/src/protocol.js';
import { at, key, type Cell } from '../../shared/src/field.js';
import { net } from './net.js';
import { Portrait, allyUrl, heroFace } from './portraits.js';
import { Thing } from './items.js';
import { FLAT, Feature, texUrl } from './terrain.js';
import { canPaint, paintField } from './fieldpaint.js';
import { sound } from './sound.js';
import { T } from './strings.js';

/** Inline custom properties (positions, lunges). */
type Vars = Record<string, string>;

function still(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** How long a beat takes on screen; a step of a walk is quicker. */
const BEAT = 420;
const STEP = 150;

function Bar({ n, max, cls = '' }: { n: number; max: number; cls?: string }) {
  const p = max > 0 ? Math.max(0, Math.min(1, n / max)) : 0;
  return (
    <span class={`bar ${cls}`} aria-hidden="true">
      <span style={{ width: `${p * 100}%` }} />
    </span>
  );
}

/** Action points as pips: what is left and what is spent. */
function Pips({ n, max }: { n: number; max: number }) {
  const out: JSX.Element[] = [];
  for (let i = 0; i < max; i++) out.push(<i class={i < n ? 'on' : ''} />);
  return <span class="pips">{out}</span>;
}

function Cost({ n }: { n: number }) {
  if (!n) return null;
  const out: JSX.Element[] = [];
  for (let i = 0; i < n; i++) out.push(<i />);
  return <span class="cost">{out}</span>;
}

// ---------------------------------------------------------------------------- marks over a foe

const INTENT_ICON: Record<string, () => JSX.Element> = {
  attack: () => <path d="M5 19L17 7M14 5l5 0 0 5M7 14l3 3" />,
  venom: () => <path d="M12 4c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10z" />,
  charge: () => <path d="M3 12h10M9 7l5 5-5 5M13 12h6M16 8l4 4-4 4" />,
  grab: () => <path d="M7 13V7a1.5 1.5 0 0 1 3 0v4M10 11V5.5a1.5 1.5 0 0 1 3 0V11M13 11V6.5a1.5 1.5 0 0 1 3 0V13c0 4-2 6-5 6s-5-2-6-5l-1-3" />,
  drag: () => <path d="M3 8c3 2 6 2 9 0s6-2 9 0M3 14c3 2 6 2 9 0s6-2 9 0M12 4v16" />,
  leech: () => <path d="M6 16c0-5 3-9 7-9 3 0 5 2 5 5s-3 6-7 6c-3 0-5-1-5-2zM16 10l3-2" />,
  steal: () => <path d="M6 9h12l-1 10H7zM9 9V7a3 3 0 0 1 6 0v2" />,
  call: () => <path d="M4 10h3l6-4v12l-6-4H4zM16 9c1 1 1 5 0 6M19 7c2 2 2 8 0 10" />,
  guard: () => <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" />,
  hold: () => <path d="M8 8a3 3 0 0 1 4 0l1 1a3 3 0 0 1 0 4M16 16a3 3 0 0 1-4 0l-1-1a3 3 0 0 1 0-4" />,
};

function IntentMark({ move }: { move?: string }) {
  const draw = (move && INTENT_ICON[move]) || INTENT_ICON.attack!;
  return (
    <svg class="intent-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {draw()}
    </svg>
  );
}

// ---------------------------------------------------------------------------- the beats, played out

interface Beat {
  e: FightEvent;
  /** A step of a walk (the seal stands here now). */
  step?: Cell;
}

/** Where everyone stands in this view. */
function positions(f: FightView): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  for (const p of f.party) if (p.pos) out[p.pid] = p.pos as Cell;
  for (const x of f.foes) if (x.pos && !x.out) out[`f${x.uid}`] = x.pos as Cell;
  if (f.dogPos) out.dog = f.dogPos as Cell;
  return out;
}

/**
 * Plays new beats one by one: walks step by step from where the walker stood in the last view, blows as
 * a lunge and a number. While it plays, seals stand where the play has them.
 */
function usePlayback(f: FightView): { beat: Beat | null; shown: Record<string, Cell>; busy: boolean; lingering: Set<string> } {
  const [beat, setBeat] = useState<Beat | null>(null);
  const [shown, setShown] = useState<Record<string, Cell>>({});
  const [busy, setBusy] = useState(false);
  // those who fall or run in the beats being played stay in sight until their last beat has been seen
  const [lingering, setLingering] = useState<Set<string>>(new Set());
  const seen = useRef<{ fight: number; s: number } | null>(null);
  const last = useRef<Record<string, Cell>>({});
  const timers = useRef<number[]>([]);
  const tail = f.events.length ? (f.events[f.events.length - 1]!.s ?? 0) : 0;
  useEffect(() => {
    const now = positions(f);
    const before = last.current;
    last.current = now;
    // a fight first seen is not replayed from its start
    if (!seen.current || seen.current.fight !== f.id) {
      seen.current = { fight: f.id, s: tail };
      return;
    }
    const fresh = f.events.filter((e) => (e.s ?? 0) > seen.current!.s);
    seen.current.s = tail;
    if (!fresh.length || still()) return;
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    // those who walk start where they stood before
    const start: Record<string, Cell> = {};
    for (const e of fresh) if (e.k === 'move' && before[e.a] && !(e.a in start)) start[e.a] = before[e.a]!;
    const stay = new Set<string>();
    for (const e of fresh) {
      if (e.a.startsWith('f')) stay.add(e.a);
      if (e.t?.startsWith('f')) stay.add(e.t);
    }
    setShown(start);
    setLingering(stay);
    setBusy(true);
    let t = 0;
    for (const e of fresh) {
      if (e.k === 'move' && e.path?.length) {
        for (const c of e.path) {
          timers.current.push(
            window.setTimeout(() => {
              setShown((s) => ({ ...s, [e.a]: c as Cell }));
              setBeat({ e, step: c as Cell });
            }, t),
          );
          t += STEP;
        }
        continue;
      }
      timers.current.push(
        window.setTimeout(() => {
          setBeat({ e });
          if (e.k === 'hit') sound.beat('chop', false);
        }, t),
      );
      t += BEAT;
    }
    timers.current.push(
      window.setTimeout(() => {
        setBeat(null);
        setShown({});
        setLingering(new Set());
        setBusy(false);
      }, t + 120),
    );
  }, [f.id, tail]);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);
  return { beat, shown, busy, lingering };
}

/** What a beat does to one seal. */
function beatClass(beat: Beat | null, id: string): string {
  if (!beat || beat.step) return '';
  const { e } = beat;
  const out: string[] = [];
  if (e.a === id) {
    if (e.k === 'hit' || e.k === 'miss') out.push('lunge');
    if (e.k === 'guard' || e.k === 'block') out.push('brace');
    if (e.k === 'aim' || e.k === 'call' || e.k === 'come') out.push('pulse');
    if (e.k === 'down') out.push('falls');
    if (e.k === 'flee') out.push('flees');
    if (e.k === 'open' || (e.k === 'stun' && !e.t)) out.push('reels');
  }
  if (e.t === id) {
    if (e.k === 'hit') out.push('struck');
    if (e.k === 'block' || e.k === 'dodge') out.push('parry');
    if (e.k === 'heal') out.push('mended');
    if (e.k === 'stun') out.push('reels');
  }
  return out.join(' ');
}

/** The direction of a lunge (towards the one struck), as a CSS offset. */
function lungeTo(beat: Beat | null, id: string, where: (id: string) => Cell | undefined): Vars | undefined {
  if (!beat || beat.step || beat.e.a !== id || !beat.e.t || (beat.e.k !== 'hit' && beat.e.k !== 'miss')) return undefined;
  const a = where(id);
  const b = where(beat.e.t);
  if (!a || !b) return undefined;
  return { '--lx': `${Math.sign(b[0] - a[0]) * 30}%`, '--ly': `${Math.sign(b[1] - a[1]) * 30}%` } as Vars;
}

function BeatPop({ beat, id }: { beat: Beat | null; id: string }) {
  if (!beat || beat.step) return null;
  const { e } = beat;
  let text = '';
  let cls = '';
  if (e.k === 'hit' && e.t === id) [text, cls] = [`−${e.n ?? 0}`, 'blow'];
  else if (e.k === 'tick' && e.a === id) [text, cls] = [`−${e.n ?? 0}`, 'blow'];
  else if (e.k === 'heal' && e.t === id) [text, cls] = [`+${e.n ?? 0}`, 'mend'];
  else if (e.k === 'miss' && e.t === id) [text, cls] = [T.fightPopMiss, 'word'];
  else if (e.k === 'dodge' && e.t === id) [text, cls] = [T.fightPopDodge, 'word'];
  else if (e.k === 'block' && e.t === id) [text, cls] = [T.fightPopBlock, 'word'];
  else if (e.k === 'stun' && (e.t === id || (!e.t && e.a === id))) [text, cls] = [T.fightStunned, 'word warn'];
  else if (e.k === 'open' && e.a === id) [text, cls] = [T.fightOpen, 'word gold'];
  if (!text) return null;
  return (
    <span key={`${e.s}:${id}`} class={`delta-pop ${cls}`} aria-hidden="true">
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------- the painted ground

/** Paints the field once (and again when its size changes); true once the picture is up. */
function useFieldPaint(f: FightView): [(el: HTMLCanvasElement | null) => void, boolean] {
  const [done, setDone] = useState(false);
  const el = useRef<HTMLCanvasElement | null>(null);
  const sig = `${f.id}:${f.field.seed ?? 0}:${f.field.cells.join('')}`;
  const can = canPaint(f.field);
  useEffect(() => {
    const c = el.current;
    if (!c || !can) return;
    let stop = false;
    let last = 0;
    const draw = () => {
      const w = c.parentElement?.clientWidth ?? 0;
      const cell = w / f.field.w;
      if (!cell || Math.abs(cell - last) < 1) return;
      last = cell;
      paintField(c, f.field, cell)
        .then(() => !stop && setDone(true))
        .catch(() => !stop && setDone(false));
    };
    draw();
    const ro = new ResizeObserver(() => draw());
    if (c.parentElement) ro.observe(c.parentElement);
    return () => {
      stop = true;
      ro.disconnect();
    };
  }, [sig, can]);
  return [(c) => (el.current = c), can && done];
}

// ---------------------------------------------------------------------------- your hands

function TechButton({ m, onPick, locked }: { m: FightMoveView; onPick: () => void; locked: boolean }) {
  return (
    <button class={`tech ${m.perk ? 'perk' : ''}`} disabled={locked || !m.enabled} onClick={onPick} aria-label={`${m.name ?? m.label}${m.cost ? ` (${T.fightAp} ${m.cost})` : ''}`}>
      <span class="tech-top">
        <b>{m.name ?? m.label}</b>
        <Cost n={m.cost ?? 0} />
      </span>
      <span class="tech-sub">{m.reason ?? (m.dmg ? `${m.dmg[0]}–${m.dmg[1]} · ${m.note ?? ''}` : (m.note ?? ''))}</span>
    </button>
  );
}

function Hand({ title, hand, moves, target, pick, locked }: { title: string; hand: FightView['hands']['main'] | null; moves: FightMoveView[]; target: number | null; pick: (id: string) => void; locked: boolean }) {
  // one button per move: an aimed one goes at the chosen foe
  const techs = new Map<string, FightMoveView>();
  for (const m of moves) {
    const t = m.tech!;
    const cur = techs.get(t);
    if (!cur || (m.target !== undefined && m.target === target)) techs.set(t, m);
  }
  return (
    <div class={`hand ${hand ? '' : 'empty'}`}>
      <div class="hand-head">
        <span class="hand-pic">{hand?.icon ? <Thing icon={hand.icon} /> : null}</span>
        <span class="hand-who">
          <small>{title}</small>
          <b>{hand?.name ?? T.handEmpty}</b>
        </span>
        {hand?.dmg && (
          <span class="hand-dmg">
            {hand.dmg[0]}–{hand.dmg[1]}
          </span>
        )}
      </div>
      <div class="hand-techs">
        {[...techs.values()].map((m) => (
          <TechButton m={m} locked={locked} onPick={() => pick(m.id)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------- the panel

type Party = FightView['party'][number];
type Foe = FightView['foes'][number];

export function FightPanel({ f, v, locked, onGone }: { f: FightView; v: PlayerView; locked: boolean; onGone: () => void }) {
  const { beat, shown, busy, lingering } = usePlayback(f);
  const [paintRef, painted] = useFieldPaint(f);
  const live = f.foes.filter((x) => !x.out && x.pos);
  const [target, setTarget] = useState<number | null>(null);
  const [showLog, setShowLog] = useState(false);
  const me = f.party.find((p) => p.me);
  // the chosen foe stays chosen while it stands; else the nearest one that can be struck, else the nearest
  const strikeable = (uid: number) => f.moves.some((m) => m.target === uid && m.enabled);
  const near = [...live].sort((a, b) => cheb(a.pos, me?.pos) - cheb(b.pos, me?.pos));
  const aimed = live.find((x) => x.uid === target)?.uid ?? near.find((x) => strikeable(x.uid))?.uid ?? near[0]?.uid ?? null;
  // an ended fight plays its last blows out, shows how it ended a moment, then fades and goes;
  // a won one waits on the field with its loot until it is taken
  const [leaving, setLeaving] = useState(false);
  const spoils = f.ended === 'win' && f.loot ? f.loot : null;
  const take = () => {
    setLeaving(true);
    window.setTimeout(() => net.send({ c: 'loot' }), still() ? 0 : 280);
  };
  useEffect(() => {
    if (!f.ended || busy || spoils) return;
    const fade = window.setTimeout(() => setLeaving(true), still() ? 600 : 1300);
    const gone = window.setTimeout(onGone, still() ? 900 : 1800);
    return () => {
      clearTimeout(fade);
      clearTimeout(gone);
    };
  }, [f.ended, f.id, busy, !!spoils]);
  const send = (id: string) => net.send({ c: 'fight', id });
  const pickMove = (id: string) => {
    const m = f.moves.find((x) => x.id === id);
    if (m?.target !== undefined && aimed !== null) {
      const there = f.moves.find((x) => x.tech === m.tech && x.target === aimed);
      if (there) return send(there.id);
    }
    send(id);
  };
  const hurt = beat && me && beat.e.t === me.pid && beat.e.k === 'hit';
  const can = f.myTurn && !busy && !locked && !f.ended;
  const fld = f.field;
  const reach = new Map(f.reach.map((r) => [key(r.c as Cell), r.cost]));
  const lanes = new Set<string>();
  for (const x of live) for (const c of x.line ?? []) lanes.add(key(c as Cell));
  const where = (id: string): Cell | undefined => {
    if (shown[id]) return shown[id];
    if (id === 'dog') return f.dogPos as Cell | undefined;
    if (id.startsWith('f')) return f.foes.find((x) => `f${x.uid}` === id)?.pos as Cell | undefined;
    return f.party.find((p) => p.pid === id)?.pos as Cell | undefined;
  };
  const cells: JSX.Element[] = [];
  for (let y = 0; y < fld.h; y++)
    for (let x = 0; x < fld.w; x++) {
      const c: Cell = [x, y];
      const k = key(c);
      const cost = can ? reach.get(k) : undefined;
      const feat = at(fld, c);
      // water, shallows and planks are painted ground, laid across the field so they run on from cell to cell
      const flat = !painted && feat && FLAT.has(feat) ? texUrl(feat) : null;
      cells.push(
        <button
          class={`cell ${feat ? `f-${feat}` : ''} ${flat ? 'painted' : ''} ${cost !== undefined ? 'reach' : ''} ${lanes.has(k) ? 'lane' : ''} ${y === fld.h - 1 && !f.scene ? 'edge' : ''}`}
          style={flat ? { backgroundImage: `url(${flat})`, backgroundSize: `calc(var(--cell) * ${fld.w}) calc(var(--cell) * ${fld.h})`, backgroundPosition: `calc(var(--cell) * ${-x}) calc(var(--cell) * ${-y})` } : undefined}
          disabled={cost === undefined}
          onClick={() => cost !== undefined && send(`go:${x},${y}`)}
          aria-label={cost !== undefined ? `${T.fightGo} ${x + 1}, ${y + 1} (${cost})` : undefined}
          tabIndex={cost === undefined ? -1 : 0}
        >
          {!painted && <Feature id={feat} />}
          {cost !== undefined && <span class="cell-cost">{cost}</span>}
        </button>,
      );
    }
  const handMoves = (hand: 'main' | 'off') => f.moves.filter((m) => m.hand === hand);
  const help = f.moves.filter((m) => m.group === 'help');
  const belt = f.moves.filter((m) => m.group === 'item');
  const out = f.moves.filter((m) => m.group === 'out');
  const endMove = f.moves.find((m) => m.id === 'end');
  const struggle = f.moves.find((m) => m.id === 'struggle');
  const activeName = f.order.find((o) => o.id === f.active)?.name;
  return (
    <div class={`fight-wrap grid-fight ${f.ended ? 'ended' : ''} ${leaving ? 'leaving' : ''}`} role="dialog" aria-labelledby="fight-title">
      <section class={`fight-board ${hurt ? 'hurt' : ''}`}>
        <header class="grid-top">
          <h2 id="fight-title">{T.fightTitle}</h2>
          <span class="fight-round">
            {T.fightRound} {f.round}
          </span>
        </header>
        <ol class="turn-order" aria-label={T.fightOrder}>
          {f.order.map((o) => (
            <li class={`turn-chip k-${o.kind} ${o.id === f.active ? 'now' : ''} ${o.me ? 'me' : ''}`}>
              <ChipFace o={o} v={v} />
              <span>{o.name}</span>
            </li>
          ))}
        </ol>
        <p class={`turn-banner ${f.myTurn ? 'mine' : ''}`}>
          {f.ended ? (
            !busy && <b class={`fight-end ${f.ended}`}>{T.fightEnd[f.ended]}</b>
          ) : f.myTurn ? (
            <>
              <b>{T.fightYourTurn}</b> <Pips n={f.ap} max={f.apMax} />
            </>
          ) : (
            <>
              {T.fightTheirTurn} <b>{activeName ?? '…'}</b>
            </>
          )}
        </p>
        <div class="grid-main">
        <div
          class={`grid-field g-${fld.ground} ${texUrl(fld.ground) ? 'painted' : ''} ${painted ? 'paint-on' : ''}`}
          style={{ '--w': String(fld.w), '--h': String(fld.h), ...(texUrl(fld.ground) ? { '--ground': `url(${texUrl(fld.ground)}) center / cover` } : {}) } as Vars}
        >
          <canvas class="field-paint" ref={paintRef} aria-hidden="true" />
          <div class="field-cells">{cells}</div>
          <div class="units">
            {f.party.map((p) => (
              <HeroSeal key={p.pid} p={p} v={v} c={where(p.pid)} beat={beat} style={lungeTo(beat, p.pid, where)} active={f.active === p.pid} />
            ))}
            {f.dog && where('dog') && (
              <div class={`seal dog ${beatClass(beat, 'dog')} ${f.active === 'dog' ? 'now' : ''}`} style={{ ...place(where('dog')!), ...(lungeTo(beat, 'dog', where) ?? {}) }} title={f.dog}>
                <span class={`seal-body ${allyUrl('dog') ? 'painted' : ''}`}>
                  {allyUrl('dog') ? <span class="seal-face ally" style={{ backgroundImage: `url(${allyUrl('dog')})` }} /> : <PawMark />}
                  <BeatPop beat={beat} id="dog" />
                </span>
              </div>
            )}
            {spoils && !busy && <Spoils items={spoils} onTake={take} disabled={leaving} />}
            {f.foes.map((x) => {
              const c = where(`f${x.uid}`);
              if (!c || (x.out && !lingering.has(`f${x.uid}`))) return null;
              return <FoeSeal key={x.uid} x={x} v={v} c={c} beat={beat} style={lungeTo(beat, `f${x.uid}`, where)} chosen={x.uid === aimed} active={f.active === `f${x.uid}`} onPick={() => setTarget(x.uid)} />;
            })}
          </div>
        </div>
        <div class="grid-side">
        <FoeInfo x={live.find((x) => x.uid === aimed)} v={v} />
        <div class={`fight-log ${showLog ? 'open' : ''}`} onClick={() => setShowLog(!showLog)}>
          {(showLog ? f.lines : f.lines.slice(-2)).map((l) => (
            <p>{l}</p>
          ))}
        </div>
        {!f.ended && (
          <div class="fight-deck">
            <div class="hands">
              {handMoves('main').length > 0 && <Hand title={T.handMain} hand={f.hands.main} moves={handMoves('main')} target={aimed} pick={pickMove} locked={!can} />}
              {(f.hands.off || handMoves('off').length > 0) && <Hand title={T.handOff} hand={f.hands.off} moves={handMoves('off')} target={aimed} pick={pickMove} locked={!can} />}
              {f.moves.length === 0 && <p class="waiting">{f.waiting ? T.fightWaitTurn : T.fightDown}</p>}
            </div>
            {f.moves.length > 0 && (
              <div class="deck-side">
                {belt.length > 0 && (
                  <div class="belt">
                    {belt.map((m) => (
                      <button class="belt-item" disabled={!can || !m.enabled} onClick={() => send(aimed !== null ? `${m.id}:${aimed}` : m.id)} title={m.label}>
                        <span class="belt-pic">{m.icon ? <Thing icon={m.icon} /> : null}</span>
                        <span class="belt-label">{m.label}</span>
                      </button>
                    ))}
                  </div>
                )}
                {(help.length > 0 || struggle) && (
                  <div class="side-moves help">
                    {[...(struggle ? [struggle] : []), ...help].map((m) => (
                      <button class="side-move" disabled={!can || !m.enabled} onClick={() => send(m.id)}>
                        <span>{m.label}</span>
                        {m.reason ? <small>{m.reason}</small> : <Cost n={m.cost ?? 0} />}
                      </button>
                    ))}
                  </div>
                )}
                <div class="side-moves">
                  {out.map((m) => (
                    <button class={`side-move out ${m.id === 'rout' ? 'rout' : ''}`} disabled={!can || !m.enabled} onClick={() => send(m.id)}>
                      <span>{m.label}</span>
                      {m.reason && <small>{m.reason}</small>}
                    </button>
                  ))}
                  {endMove && (
                    <button class="side-move end" disabled={!can} onClick={() => send('end')}>
                      <span>{endMove.label}</span>
                      {endMove.note && <small>{endMove.note}</small>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        </div>
        </div>
      </section>
    </div>
  );
}

function cheb(a: number[] | undefined, b: number[] | undefined): number {
  if (!a || !b) return 99;
  return Math.max(Math.abs(a[0]! - b[0]!), Math.abs(a[1]! - b[1]!));
}

/** A seal's place on the field (column, row). */
function place(c: Cell): Vars {
  return { '--x': String(c[0]), '--y': String(c[1]) } as Vars;
}

function ChipFace({ o, v }: { o: FightView['order'][number]; v: PlayerView }) {
  if (o.kind === 'foe') return <Portrait icon={o.icon ?? 'rat'} size="s" />;
  if (o.kind === 'dog') {
    const pic = allyUrl('dog');
    return pic ? (
      <span class="chip-face ally" style={{ backgroundImage: `url(${pic})` }} />
    ) : (
      <span class="chip-paw">
        <PawMark />
      </span>
    );
  }
  const look = o.id === v.me.pid ? v.me : v.partner;
  const face = heroFace(look.role, look.gender);
  return face ? <span class="chip-face" style={{ backgroundImage: `url(${face})` }} /> : <span class="chip-face blank">{o.name.slice(0, 1)}</span>;
}

function PawMark() {
  return (
    <svg class="paw" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <ellipse cx="12" cy="16" rx="5" ry="4" />
      <circle cx="6" cy="10" r="2" />
      <circle cx="10" cy="6.5" r="2" />
      <circle cx="14" cy="6.5" r="2" />
      <circle cx="18" cy="10" r="2" />
    </svg>
  );
}

function HeroSeal({ p, v, c, beat, style, active }: { p: Party; v: PlayerView; c: Cell | undefined; beat: Beat | null; style?: Vars; active: boolean }) {
  if (!c) return null;
  const look = p.pid === v.me.pid ? v.me : v.partner;
  const face = heroFace(look.role, look.gender);
  return (
    <div class={`seal hero ${p.me ? 'me' : ''} ${p.down ? 'down' : ''} ${active ? 'now' : ''} ${beatClass(beat, p.pid)}`} style={{ ...place(c), ...(style ?? {}) }} title={p.name}>
      <span class="seal-body">
        {face ? <span class="seal-face" style={{ backgroundImage: `url(${face})` }} /> : <span class="seal-face blank">{p.name.slice(0, 1)}</span>}
        {(p.guard > 0 || p.stance) && <span class={`seal-mark ${p.stance ? `s-${p.stance}` : 'guard'}`} aria-hidden="true" />}
        <BeatPop beat={beat} id={p.pid} />
      </span>
      <Bar n={p.hp} max={p.hpMax} cls="hp mine" />
    </div>
  );
}

function FoeSeal({ x, v, c, beat, style, chosen, active, onPick }: { x: Foe; v: PlayerView; c: Cell; beat: Beat | null; style?: Vars; chosen: boolean; active: boolean; onPick: () => void }) {
  const id = `f${x.uid}`;
  return (
    <button
      class={`seal foe ${chosen ? 'chosen' : ''} ${x.open ? 'open' : ''} ${x.stunned ? 'stunned' : ''} ${active ? 'now' : ''} ${beatClass(beat, id)}`}
      style={{ ...place(c), ...(style ?? {}) }}
      onClick={onPick}
      aria-pressed={chosen}
      aria-label={`${T.fightTarget}: ${x.name}`}
    >
      <span class="seal-body">
        <Portrait icon={x.icon} size="m" />
        {x.move && !x.stunned && x.move !== 'none' && (
          <span class={`seal-intent ${x.aim === v.me.pid ? 'at-me' : ''} ${x.move === 'charge' || x.move === 'call' ? 'loud' : ''}`}>
            <IntentMark move={x.move} />
          </span>
        )}
        <BeatPop beat={beat} id={id} />
      </span>
      <Bar n={x.hp} max={x.hpMax} cls="hp" />
    </button>
  );
}

/** What the fallen left on the field: take it into the bag, or (with nothing left) end the fight. */
function Spoils({ items, onTake, disabled }: { items: NonNullable<FightView['loot']>; onTake: () => void; disabled: boolean }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div class="spoils-wrap" role="dialog" aria-labelledby="spoils-title">
      <div class="spoils">
        <h3 id="spoils-title">{items.length ? T.lootTitle : T.fightEnd.win}</h3>
        {items.length ? (
          <ul class="spoils-list">
            {items.map((x, i) => (
              <li style={{ '--i': String(i) } as Vars}>
                <span class="spoils-pic">{x.icon ? <Thing icon={x.icon} /> : null}</span>
                <span class="spoils-name">{x.name}</span>
                <b class="spoils-n">×{x.n}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p class="spoils-none">{T.lootNone}</p>
        )}
        <button ref={ref} class="btn primary" disabled={disabled} onClick={onTake}>
          {items.length ? T.lootTake : T.lootEnd}
        </button>
      </div>
    </div>
  );
}

/** The chosen foe, in words: health, what it means to do, what is known of it. */
function FoeInfo({ x, v }: { x: Foe | undefined; v: PlayerView }) {
  if (!x) return null;
  return (
    <div class="foe-info">
      <Portrait icon={x.icon} size="s" />
      <div class="foe-info-body">
        <div class="foe-info-top">
          <b>{x.name}</b> <small class="foe-lvl">{x.level}</small>
          <span class="unit-nums">
            {x.hp}/{x.hpMax}
          </span>
        </div>
        <div class="foe-plan">
          {x.stunned ? (
            <span class="intent stun">{T.fightStunned}</span>
          ) : (
            x.intent && (
              <span class={`intent ${x.aim === v.me.pid ? 'at-me' : ''}`}>
                <IntentMark move={x.move} />
                {x.intent}
              </span>
            )
          )}
          {x.next && (
            <span class="intent next">
              {T.fightNext}: {x.next}
            </span>
          )}
          {x.open && <span class="pill gold">{T.fightOpen}</span>}
          {x.holds && x.move !== 'hold' && (
            <span class="pill warn">
              {T.fightHolds}: {x.holds}
            </span>
          )}
          {x.calling !== undefined && <span class="pill warn">{T.fightCalling}</span>}
          {x.weak && <span class="pill weak">{x.weak}</span>}
          {x.traits.map((t) => (
            <span class="pill">{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
