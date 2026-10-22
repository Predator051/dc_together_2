// Panels of the second part: the map, the hero, the bag, a fight, the household.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { FightView, MapNodeView, PlayerView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { sound } from './sound.js';
import { T } from './strings.js';

function secs(ms: number): string {
  return `${Math.max(1, Math.round(ms / 1000))} ${T.sec}`;
}

function Bar({ n, max, cls = '' }: { n: number; max: number; cls?: string }) {
  const p = max > 0 ? Math.max(0, Math.min(1, n / max)) : 0;
  return (
    <span class={`bar ${cls}`} aria-hidden="true">
      <span style={{ width: `${p * 100}%` }} />
    </span>
  );
}

// ---------------------------------------------------------------------------- the map

/** Width of the map's column, so the drawing keeps its letters readable at any size. */
function useWidth(): [(el: HTMLDivElement | null) => void, number] {
  const [w, setW] = useState(360);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = (el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    setW(el.clientWidth || 360);
    ro.current = new ResizeObserver(() => setW(el.clientWidth || 360));
    ro.current.observe(el);
  };
  return [ref, w];
}

export function MapPanel({ v, locked, now }: { v: PlayerView; locked: boolean; now: number }) {
  // a running action ends on its own: the walk unlocks by the clock, without waiting for the server
  const busy = v.busyUntil + 150 > now;
  const m = v.map;
  const here = m.nodes.find((n) => n.here);
  const [sel, setSel] = useState<string | null>(null);
  const [box, width] = useWidth();
  const picked = m.nodes.find((n) => n.id === sel) ?? null;
  if (!m.nodes.length) return null;
  const xs = m.nodes.map((n) => n.x);
  const ys = m.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const cols = Math.max(...xs) - minX + 1;
  const rows = Math.max(...ys) - minY + 1;
  const CELL = Math.max(52, Math.min(104, Math.floor(width / cols)));
  const w = cols * CELL;
  const h = rows * CELL;
  const pos = (n: MapNodeView) => ({ x: (n.x - minX + 0.5) * CELL, y: (n.y - minY + 0.5) * CELL });
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  return (
    <div class="mapview">
      {m.travel && (
        <p class="map-travel">
          {T.mapOnWay} <b>{m.travel.name}</b>
        </p>
      )}
      <div class="map-box" ref={box}>
      <svg class="map-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={T.tabMap}>
        {m.links.map(([a, b]) => {
          const na = byId.get(a);
          const nb = byId.get(b);
          if (!na || !nb) return null;
          const pa = pos(na);
          const pb = pos(nb);
          return <line class={`map-link ${na.known && nb.known ? '' : 'faint'}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
        })}
        {m.nodes.map((n) => {
          const p = pos(n);
          const can = !!n.go?.enabled || !!n.scout;
          return (
            <g
              class={`map-node ${n.known ? 'known' : 'unknown'} ${n.here ? 'here' : ''} ${n.home ? 'home' : ''} ${sel === n.id ? 'sel' : ''} ${can ? 'can' : ''}`}
              transform={`translate(${p.x},${p.y})`}
              onClick={() => setSel(n.id)}
              role="button"
              tabIndex={0}
              aria-label={n.name}
            >
              <circle r={n.home ? 15 : 12} />
              {n.danger > 0 && n.known && (
                <text class="map-danger" y={4}>
                  {n.danger}
                </text>
              )}
              {!n.known && (
                <text class="map-q" y={5}>
                  ?
                </text>
              )}
              {n.known && (
                <text class="map-name" y={30}>
                  {n.name}
                </text>
              )}
              {n.partner && <circle class="map-mate" r={5} cx={13} cy={-12} />}
              {n.here && <circle class="map-me" r={5} cx={-13} cy={-12} />}
            </g>
          );
        })}
      </svg>
      </div>
      <div class="map-legend">
        <span>
          <i class="dot me" /> {T.mapHere}
        </span>
        <span>
          <i class="dot mate" /> {v.partner.name || '—'}
        </span>
      </div>
      {picked ? (
        <section class="map-card">
          <h3>{picked.name}</h3>
          {picked.desc && <p class="desc">{picked.desc}</p>}
          {!picked.known && <p class="desc">{T.mapUnknown}</p>}
          {picked.known && picked.danger > 0 && (
            <p class="meta">
              {T.mapDanger}: <b>{picked.danger}</b>
              {picked.foes.length > 0 && (
                <>
                  {' '}
                  · {T.mapFoes}: {picked.foes.join(', ')}
                </>
              )}
            </p>
          )}
          <div class="row">
            {picked.go && (
              <button class="btn primary" disabled={locked || busy || !picked.go.enabled} onClick={() => net.send({ c: 'go', to: picked.id })}>
                {T.mapGo} · {secs(picked.go.time)}
              </button>
            )}
            {picked.scout && (
              <button class="btn primary" disabled={locked || !picked.scout.enabled} onClick={() => net.send({ c: 'act', id: picked.scout!.id })}>
                {picked.scout.label}
              </button>
            )}
          </div>
          {picked.go?.reason && <p class="reason">{picked.go.reason}</p>}
          {picked.scout?.reason && <p class="reason">{picked.scout.reason}</p>}
        </section>
      ) : (
        <p class="desc map-hint">{here ? T.mapTap : ''}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- the hero

export function HeroPanel({ v, locked }: { v: PlayerView; locked: boolean }) {
  const h = v.hero;
  const d = h.derived;
  return (
    <div class="hero">
      <section class="panel hero-head">
        <div class="hero-level">
          <span class="big">{h.level}</span>
          <span>
            {T.level}
            <small>
              {T.xp} {h.xp} / {h.xpNext}
            </small>
          </span>
        </div>
        <Bar n={h.xp - h.xpPrev} max={h.xpNext - h.xpPrev} cls="xp" />
        <dl class="derived">
          <div>
            <dt>{T.dHp}</dt>
            <dd>
              {v.me.hp}/{d.hpMax}
            </dd>
          </div>
          <div>
            <dt>{T.dDmg}</dt>
            <dd>
              {d.dmg[0]}–{d.dmg[1]}
            </dd>
          </div>
          <div>
            <dt>{T.dArmor}</dt>
            <dd>{d.armor}</dd>
          </div>
          <div>
            <dt>{T.dHit}</dt>
            <dd>{d.hit}%</dd>
          </div>
          <div>
            <dt>{T.dDodge}</dt>
            <dd>{d.dodge}%</dd>
          </div>
          <div>
            <dt>{T.dCarry}</dt>
            <dd>{d.carry}</dd>
          </div>
        </dl>
        {(d.resist.length > 0 || d.tools.length > 0) && (
          <p class="meta">
            {d.resist.length > 0 && (
              <>
                {T.dResist}: {d.resist.join(', ')}.{' '}
              </>
            )}
            {d.tools.length > 0 && (
              <>
                {T.dTools}: {d.tools.join(', ')}.
              </>
            )}
          </p>
        )}
      </section>

      {h.perkChoice && (
        <section class="panel perk-choice">
          <h3>{T.perkPick}</h3>
          <div class="options">
            {h.perkChoice.map((p) => (
              <button class="opt" disabled={locked} onClick={() => net.send({ c: 'perk', id: p.id })}>
                <span class="opt-body">
                  <span>{p.name}</span>
                  <em class="way-note">{p.text}</em>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section class="panel">
        <h3>
          {T.stats}
          {h.points > 0 && (
            <span class="pill new">
              {T.points}: {h.points}
            </span>
          )}
        </h3>
        {h.points > 0 && <p class="meta">{T.pointsHint}</p>}
        <ul class="stats">
          {h.stats.map((s) => (
            <li>
              <span class="stat-name">
                {s.name}
                <small>{s.text}</small>
              </span>
              <b>{s.value}</b>
              {h.points > 0 && (
                <button class="btn small plus" disabled={locked} aria-label={`+ ${s.name}`} onClick={() => net.send({ c: 'stat', id: s.id })}>
                  +
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel">
        <h3>{T.gear}</h3>
        {!h.canChange && <p class="meta">{T.gearAway}</p>}
        <ul class="slots">
          {h.slots.map((s) => (
            <li class={s.item ? 'filled' : ''}>
              <div class="slot-head">
                <span class="slot-name">{s.name}</span>
                <span class="slot-item">
                  {s.item ? (
                    <>
                      <b>{s.item.name}</b>
                      {s.item.note && <small>{s.item.note}</small>}
                    </>
                  ) : (
                    <span class="muted">{T.empty}</span>
                  )}
                </span>
                {s.item && h.canChange && (
                  <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'equip', slot: s.slot, id: null })}>
                    {T.takeOff}
                  </button>
                )}
              </div>
              {h.canChange && s.options.length > 0 && (
                <div class="slot-options">
                  {s.options.map((o) => (
                    <button class="chip-btn" disabled={locked} onClick={() => net.send({ c: 'equip', slot: s.slot, id: o.id })}>
                      {T.wear}: <b>{o.name}</b>
                      {o.note && <small>{o.note}</small>}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section class="panel">
        <h3>{T.outfits}</h3>
        <ul class="outfits">
          {h.outfits.map((o) => (
            <li>
              <span class="outfit-name">
                <b>{o.name === 'fight' ? T.outfitFight : T.outfitWork}</b>
                <small>{o.items.length ? o.items.join(', ') : T.outfitNone}</small>
              </span>
              <span class="row">
                <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'outfit', name: o.name, save: true })}>
                  {T.outfitSave}
                </button>
                <button
                  class="btn small primary"
                  disabled={locked || !h.canChange || !o.items.length}
                  onClick={() => net.send({ c: 'outfit', name: o.name, save: false })}
                >
                  {T.outfitWear}
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {h.perks.length > 0 && (
        <section class="panel">
          <h3>{T.perks}</h3>
          <ul class="traits">
            {h.perks.map((p) => (
              <li>
                <b>{p.name}.</b> {p.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section class="panel">
        <h3>{T.skills}</h3>
        <ul class="skills">
          {h.skills.map((s) => (
            <li>
              <span>{s.name}</span>
              <b>{s.level}</b>
              <Bar n={s.p} max={1} cls="skill" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------- the bag

export function BagPanel({ v, locked }: { v: PlayerView; locked: boolean }) {
  const b = v.bag;
  if (!b.items.length) return null;
  return (
    <section class="stock bag">
      <h3>
        {T.bag}
        <span class={`bag-load ${b.load >= b.cap ? 'full' : ''}`}>
          {Math.round(b.load * 10) / 10}/{b.cap}
        </span>
      </h3>
      <Bar n={b.load} max={b.cap} cls="load" />
      <ul class="bag-items">
        {b.items.map((it) => (
          <li>
            <span class="bag-name">
              {it.name} <b>{it.n}</b>
              {it.note && <small>{it.note}</small>}
            </span>
            <span class="row">
              {it.usable && (
                <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'use', id: it.id })}>
                  {T.bagUse}
                </button>
              )}
              {v.atHome ? (
                <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'pack', id: it.id, n: -it.n })}>
                  {T.bagUnpack}
                </button>
              ) : (
                <button class="btn small ghost" disabled={locked} onClick={() => net.send({ c: 'drop', id: it.id, n: 1 })}>
                  {T.bagDrop}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** At home: things to take along (consumables and food) can go into the bag. */
export function PackList({ v, locked }: { v: PlayerView; locked: boolean }) {
  if (!v.atHome) return null;
  const list = v.res.filter((r) => (r.kind === 'use' || r.kind === 'food') && r.n > 0);
  if (!list.length) return null;
  return (
    <section class="stock packs">
      <h3>{T.usesList}</h3>
      <ul class="bag-items">
        {list.map((r) => (
          <li>
            <span class="bag-name">
              {r.name} <b>{r.n}</b>
              {r.note && <small>{r.note}</small>}
            </span>
            <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'pack', id: r.id, n: r.kind === 'food' ? 2 : 1 })}>
              + {T.bagPack}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------- a fight

export function FightPanel({ f, v, locked }: { f: FightView; v: PlayerView; locked: boolean }) {
  const lastRound = useRef(f.round);
  useEffect(() => {
    if (f.round !== lastRound.current) {
      lastRound.current = f.round;
      sound.beat('chop', false);
    }
  }, [f.round]);
  const groups: Array<FightView['moves'][number]['group']> = ['hit', 'self', 'help', 'item', 'out'];
  return (
    <div class="sheet-wrap fight-wrap" role="dialog" aria-labelledby="fight-title">
      <section class="sheet fight">
        <header class="fight-head">
          <h2 id="fight-title">{T.fightTitle}</h2>
          <span class="fight-round">
            {T.fightRound} {f.round}
          </span>
        </header>
        <div class="fight-grid">
        <div class="fight-side">
        <ul class="foes">
          {f.foes.map((x) => (
            <li class={`foe ${x.out ? 'out' : ''}`}>
              <div class="foe-top">
                <b>{x.name}</b>
                <span class="foe-lvl">{x.level}</span>
                {x.out && <span class="foe-out">{T.fightOut[x.out] ?? ''}</span>}
              </div>
              {!x.out && (
                <>
                  <Bar n={x.hp} max={x.hpMax} cls="hp" />
                  {x.morale !== undefined && (
                    <span class="fear-row">
                      <small>{T.combatFear}</small>
                      <Bar n={x.fear ?? 0} max={x.morale} cls="fear" />
                    </span>
                  )}
                  {x.intent && <p class="intent">→ {x.intent}</p>}
                  {x.next && (
                    <p class="intent next">
                      {T.fightNext}: {x.next}
                    </p>
                  )}
                  {x.holds && (
                    <p class="intent hold">
                      {T.fightHolds}: {x.holds}
                    </p>
                  )}
                  {x.calling !== undefined && <p class="intent hold">{T.fightCalling}</p>}
                  {x.weak && <p class="weak">{x.weak}</p>}
                  {x.traits.length > 0 && (
                    <p class="foe-traits">
                      {x.traits.map((t) => (
                        <span class="pill">{t}</span>
                      ))}
                    </p>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
        <ul class="fparty">
          {f.party.map((p) => (
            <li class={`${p.me ? 'me' : ''} ${p.down ? 'down' : ''}`}>
              <span class="fparty-name">
                {p.name}
                {p.picked && !p.me && <span class="tick"> ✓</span>}
              </span>
              <Bar n={p.hp} max={p.hpMax} cls="hp mine" />
              <span class="fparty-hp">
                {p.hp}/{p.hpMax}
              </span>
              {p.down && <span class="pill">{T.fightDown}</span>}
              {p.held && <span class="pill warn">{T.fightHeld}</span>}
              {p.poison > 0 && <span class="pill warn">{T.fightPoison}</span>}
            </li>
          ))}
          {f.dog && (
            <li class="dog">
              <span class="fparty-name">{f.dog}</span> <span class="muted">{T.fightDog}</span>
            </li>
          )}
        </ul>
        </div>
        <div class="fight-main">
        {f.lines.length > 0 && (
          <div class="fight-lines">
            {f.lines.map((l) => (
              <p>{l}</p>
            ))}
          </div>
        )}
        <div class="fight-moves">
          {groups.map((gr) => {
            const list = f.moves.filter((m) => m.group === gr);
            if (!list.length) return null;
            return (
              <div class={`move-group g-${gr}`}>
                {list.map((m) => (
                  <button
                    class={`opt ${f.myPick === m.id ? 'on' : ''} ${gr === 'hit' ? 'strike' : ''}`}
                    disabled={locked || !m.enabled || !!f.myPick}
                    onClick={() => net.send({ c: 'fight', id: m.id })}
                  >
                    <span class="opt-body">
                      <span>{m.label}</span>
                      {m.reason && <em class="way-note">{m.reason}</em>}
                    </span>
                  </button>
                ))}
              </div>
            );
          })}
          {f.waiting && <p class="waiting">{T.fightWaiting}</p>}
          {!f.moves.length && <p class="waiting">{T.fightDown}…</p>}
        </div>
        </div>
        </div>
      </section>
    </div>
  );
}

export function NearFight({ v, locked }: { v: PlayerView; locked: boolean }) {
  if (!v.nearFight) return null;
  return (
    <div class="proposal near-fight">
      <span class="proposal-text">
        <span>{v.nearFight.text}</span>
      </span>
      <button class="btn primary small" disabled={locked} onClick={() => net.send({ c: 'help' })}>
        {T.fightHelp}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------- the household

export function ResidentsPanel({ v, locked }: { v: PlayerView; locked: boolean }) {
  if (!v.residents.length) return null;
  return (
    <section class="group residents">
      <header class="group-head">
        <h3>{T.residents}</h3>
      </header>
      {v.residents.map((r) => (
        <article class="resident">
          <div class="resident-head">
            <span class="avatar small">{r.name.slice(0, 1).toUpperCase()}</span>
            <span>
              <b>{r.name}</b>
              <small>{r.desc}</small>
            </span>
          </div>
          <ul class="traits">
            {r.traits.map((t) => (
              <li>
                <b>{t.name}.</b> {t.text}
              </li>
            ))}
          </ul>
          <p class="meta">
            {T.residentJob}: <b>{r.jobLabel ?? T.residentRest}</b>
            {r.hungry && <span class="pill warn">{T.residentHungry}</span>}
            {r.hurt && <span class="pill warn">{T.residentHurt}</span>}
          </p>
          <div class="slot-options">
            {r.jobs.map((j) => (
              <button
                class={`chip-btn ${r.job === j.id ? 'on' : ''}`}
                disabled={locked || r.job === j.id || !!j.reason}
                onClick={() => net.send({ c: 'job', who: r.id, id: j.id })}
              >
                {j.label}{' '}
                <small>
                  {j.place} · {j.reason ?? `~${j.rate} ${T.residentPerHour}`}
                </small>
              </button>
            ))}
            <button class={`chip-btn ${r.job === null ? 'on' : ''}`} disabled={locked || r.job === null} onClick={() => net.send({ c: 'job', who: r.id, id: null })}>
              {T.residentRest}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
