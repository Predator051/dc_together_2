// Panels of the second part: the map, the hero, the bag, a fight, the household.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { MapNodeView, PlayerView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { MapIcon } from './mapicons.js';
import { LandMap, paintedFits, type RingItem } from './landmap.js';
import { duskOf } from './ambient.js';
import { viewUrl } from './pictures.js';
import { Portrait } from './portraits.js';
import { Thing } from './items.js';
import { Cell } from './cells.js';
import { Sheet } from './sheet.js';
import { IconEye, IconPair, IconSignGo } from './icons.js';
import { T } from './strings.js';
import { LarderStrip, signed } from './folk.js';

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

export function MapPanel({ v, locked, now, desktop }: { v: PlayerView; locked: boolean; now: number; desktop: boolean }) {
  // a running action ends on its own: the walk unlocks by the clock, without waiting for the server
  const busy = v.busyUntil + 150 > now;
  const m = v.map;
  const here = m.nodes.find((n) => n.here);
  const [sel, setSel] = useState<string | null>(null);
  // on a phone the painted map keeps the place's card in a panel that slides up when asked for
  const [info, setInfo] = useState(false);
  const [box, width] = useWidth();
  const boxEl = useRef<HTMLDivElement | null>(null);
  const picked = m.nodes.find((n) => n.id === sel) ?? null;
  // a map wider than the screen opens on where you stand
  const hereX = here ? here.x : null;
  useEffect(() => {
    const el = boxEl.current;
    if (!el || hereX === null || el.scrollWidth <= el.clientWidth) return;
    const node = el.querySelector('.map-node.here') as SVGGElement | null;
    const svg = el.querySelector('svg');
    if (!node || !svg) return;
    const nr = node.getBoundingClientRect();
    const br = el.getBoundingClientRect();
    el.scrollLeft += nr.left + nr.width / 2 - (br.left + br.width / 2);
  }, [hereX, width]);
  // the card of a picked place may fall below the screen under a big map: bring it into view
  useEffect(() => {
    if (!sel) return;
    boxEl.current?.parentElement?.querySelector('.map-card')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);
  useEffect(() => {
    if (!sel) setInfo(false);
  }, [sel]);
  if (!m.nodes.length) return null;
  // the painted land, when it holds every place shown; otherwise the drawn scheme
  const painted = paintedFits(m);
  const xs = m.nodes.map((n) => n.x);
  const ys = m.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const cols = Math.max(...xs) - minX + 1;
  const rows = Math.max(...ys) - minY + 1;
  // room around the grid for the names under the edge places, so none is cut by the box
  const PAD_X = 24;
  const PAD_B = 18;
  const CELL = Math.max(52, Math.min(104, Math.floor((width - 2 * PAD_X) / cols)));
  const w = cols * CELL + 2 * PAD_X;
  const h = rows * CELL + PAD_B;
  // a node is big enough for its mark, yet leaves room for the names on a narrow phone
  const R = CELL >= 96 ? 20 : CELL >= 70 ? 17 : 15;
  const pos = (n: MapNodeView) => ({ x: PAD_X + (n.x - minX + 0.5) * CELL, y: (n.y - minY + 0.5) * CELL });
  const byId = new Map(m.nodes.map((n) => [n.id, n]));
  // the way to a far place goes through the near ones: show it
  const way = picked?.go && here ? [here.id, ...(picked.go.via ?? []), picked.id] : [];
  // the card in a panel over the map (a phone with the painting), or under the map as it was
  const sheeted = painted && !desktop;
  // what can be done with the picked place, on a ring around its mark: go, look out the way, read more
  const ring: RingItem[] = picked
    ? [
        ...(picked.go
          ? [
              {
                key: 'go',
                label: T.mapGo,
                sub: secs(picked.go.time),
                icon: <IconSignGo />,
                primary: true,
                disabled: locked || busy || !picked.go.enabled,
                onDo: () => {
                  net.send({ c: 'go', to: picked.id });
                  setSel(null);
                },
              },
            ]
          : []),
        ...(picked.scout
          ? [
              {
                key: 'scout',
                label: T.mapScout,
                icon: <IconPair />,
                primary: true,
                disabled: locked || !picked.scout.enabled,
                onDo: () => {
                  net.send({ c: 'act', id: picked.scout!.id });
                  setSel(null);
                },
              },
            ]
          : []),
        {
          key: 'more',
          label: T.mapMore,
          icon: <IconEye />,
          onDo: () => (sheeted ? setInfo(true) : boxEl.current?.parentElement?.querySelector('.map-card')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })),
        },
      ]
    : [];
  const onWay = (a: string, b: string) => way.some((id, i) => i > 0 && ((way[i - 1] === a && id === b) || (way[i - 1] === b && id === a)));
  const card = (picked: MapNodeView) => (
          <section class="map-card" key={picked.id}>
            {picked.known && viewUrl(picked.icon) && (
              <div class="map-card-art" style={{ backgroundImage: `url(${viewUrl(picked.icon)})` }} aria-hidden="true" />
            )}
            <h3>{picked.name}</h3>
            {picked.desc && <p class="desc">{picked.desc}</p>}
            {!picked.known && <p class="desc">{T.mapUnknown}</p>}
            {picked.known && picked.danger > 0 && (
              <p class="meta">
                {T.mapDanger}: <b>{picked.danger}</b>
              </p>
            )}
            {picked.known && picked.foes.length > 0 && (
              <ul class="map-foes" aria-label={T.mapFoes}>
                {picked.foes.map((f) => (
                  <li>
                    <Portrait icon={f.icon} size="s" />
                    <span>{f.name}</span>
                  </li>
                ))}
              </ul>
            )}
            <div class="row">
              {picked.go && (
                <button class="btn primary" disabled={locked || busy || !picked.go.enabled} onClick={() => net.send({ c: 'go', to: picked.id })}>
                  {T.mapGo} · {secs(picked.go.time)}
                </button>
              )}
              {picked.go?.via && (
                <p class="meta map-via">
                  {T.mapVia}: {picked.go.via.map((id) => byId.get(id)?.name ?? '?').join(' → ')}
                </p>
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
  );
  return (
    <div class="mapview">
      {m.travel && (
        <p class="map-travel">
          {T.mapOnWay} <b>{m.travel.name}</b>
        </p>
      )}
      {painted ? (
        <LandMap m={m} sel={sel} onPick={setSel} ring={ring} now={now} wayIds={way} dusk={duskOf(v.dayAt, now)} sky={v.ambient.sky ?? undefined} />
      ) : (
      <div
        class={`map-box ${w > width ? 'scrolls' : ''}`}
        ref={(el) => {
          box(el);
          boxEl.current = el;
        }}
      >
      <svg class="map-svg" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={T.tabMap}>
        {m.links.map(([a, b]) => {
          const na = byId.get(a);
          const nb = byId.get(b);
          if (!na || !nb) return null;
          const pa = pos(na);
          const pb = pos(nb);
          const cls = `map-link ${na.known && nb.known ? '' : 'faint'} ${onWay(a, b) ? 'way' : ''}`;
          // a way that would run over another place bends around it, so it does not seem to lead through
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const len = Math.hypot(dx, dy) || 1;
          const over = m.nodes.some((n) => {
            if (n.id === a || n.id === b) return false;
            const q = pos(n);
            const t = ((q.x - pa.x) * dx + (q.y - pa.y) * dy) / (len * len);
            if (t <= 0.05 || t >= 0.95) return false;
            return Math.hypot(pa.x + t * dx - q.x, pa.y + t * dy - q.y) < R + 8;
          });
          if (!over) return <line class={cls} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />;
          // the middle of the curve passes half the bend away: well clear of the place in between
          const bend = Math.max(CELL * 0.6, 2 * (R + 14));
          const cx = (pa.x + pb.x) / 2 + (-dy / len) * bend;
          const cy = (pa.y + pb.y) / 2 + (dx / len) * bend;
          return <path class={cls} fill="none" d={`M${pa.x} ${pa.y}Q${cx} ${cy} ${pb.x} ${pb.y}`} />;
        })}
        {m.nodes.map((n) => {
          const p = pos(n);
          const can = !!n.go?.enabled || !!n.scout;
          return (
            <g
              class={`map-node ${n.known ? 'known' : 'unknown'} ${n.here ? 'here' : ''} ${n.home ? 'home' : ''} ${sel === n.id ? 'sel' : ''} ${can ? 'can' : ''}`}
              transform={`translate(${p.x},${p.y})`}
              onClick={() => setSel(n.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSel(n.id);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={n.name}
            >
              <circle r={n.home ? R + 3 : R} />
              {n.known && <MapIcon scene={n.icon} r={n.home ? R + 3 : R} />}
              {n.danger > 0 && n.known && (
                <g class="map-danger" transform={`translate(${R - 2},${R - 3})`}>
                  <circle r={7} />
                  <text y={3.5}>{n.danger}</text>
                </g>
              )}
              {!n.known && (
                <text class="map-q" y={5}>
                  ?
                </text>
              )}
              {n.known && (
                <text class="map-name" y={(n.home ? R + 3 : R) + 15}>
                  {n.name}
                </text>
              )}
              {n.partner && <circle class="map-mate" r={5} cx={R} cy={-R} />}
              {n.here && <circle class="map-me" r={5} cx={-R} cy={-R} />}
            </g>
          );
        })}
      </svg>
      </div>
      )}
      <div class="map-legend">
        <span>
          <i class="dot me" /> {T.mapHere}
        </span>
        <span>
          <i class="dot mate" /> {v.partner.name || '—'}
        </span>
      </div>
      {picked && !sheeted && card(picked)}
      {!picked && <p class="desc map-hint">{here ? T.mapTap : ''}</p>}
      {picked && sheeted && info && (
        <Sheet desktop={false} label={picked.name} bar={<h3 class="map-sheet-name">{picked.name}</h3>} back={T.planBack} bodyKey={picked.id} onClose={() => setInfo(false)}>
          {card(picked)}
        </Sheet>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------- the bag

export function BagPanel({ v, locked }: { v: PlayerView; locked: boolean }) {
  const b = v.bag;
  const [sel, setSel] = useState<string | null>(null);
  if (!b.items.length) return null;
  const it = b.items.find((x) => x.id === sel) ?? null;
  return (
    <section class="stock bag">
      <h3>
        {T.bag}
        <span class={`bag-load ${b.load >= b.cap ? 'full' : ''}`}>
          {Math.round(b.load * 10) / 10}/{b.cap}
        </span>
      </h3>
      <Bar n={b.load} max={b.cap} cls="load" />
      <ul class="cells" aria-label={T.bag}>
        {b.items.map((x) => (
          <Cell icon={x.icon} name={x.name} n={x.n} sel={sel === x.id} onPick={() => setSel(sel === x.id ? null : x.id)} />
        ))}
      </ul>
      {it && (
        <div class="cell-detail" key={it.id}>
          <span class="bag-name">
            <span class="bag-title">
              <Thing icon={it.icon} />
              <span>
                {it.name} <b>{it.n}</b>
              </span>
            </span>
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
        </div>
      )}
    </section>
  );
}

/** At home: things to take along (consumables and food) can go into the bag. */
export function PackList({ v, locked }: { v: PlayerView; locked: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  if (!v.atHome) return null;
  const list = v.res.filter((r) => (r.kind === 'use' || r.kind === 'food' || r.ware) && r.n > 0);
  if (!list.length) return null;
  const r = list.find((x) => x.id === sel) ?? null;
  return (
    <section class="stock packs">
      <h3>{T.usesList}</h3>
      <ul class="cells" aria-label={T.usesList}>
        {list.map((x) => (
          <Cell icon={x.icon} name={x.name} n={x.n} sel={sel === x.id} onPick={() => setSel(sel === x.id ? null : x.id)} />
        ))}
      </ul>
      {r && (
        <div class="cell-detail" key={r.id}>
          <span class="bag-name">
            <span class="bag-title">
              <Thing icon={r.icon} />
              <span>
                {r.name} <b>{r.n}</b>
              </span>
            </span>
            {r.note && <small>{r.note}</small>}
          </span>
          <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'pack', id: r.id, n: r.ware ? Math.min(5, r.n) : r.kind === 'food' ? 2 : 1 })}>
            + {T.bagPack}
          </button>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------- a fight nearby

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
      {v.larder && <LarderStrip l={v.larder} locked={locked} />}
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
            {r.state !== 'fed' && ' '}
            {r.state !== 'fed' && <span class="pill warn">{r.state === 'low' ? T.folkLow : r.state === 'weak' ? T.folkWeak : T.folkHungry}</span>}
            {r.hurt && ' '}
            {r.hurt && <span class="pill warn">{T.residentHurt}</span>}
          </p>
          {r.trade && (
            <p class="meta">
              {T.folkTrade}: <b>{r.trade.name}</b> — {r.trade.rankName}
              {r.trade.left !== undefined && ` (${T.folkNext}: ~${Math.round(r.trade.left)} ${T.folkWorkHours})`}
              {r.teach && (
                <>
                  {' '}
                  <button class="btn small" disabled={locked || !!r.teach.reason} title={r.teach.reason} onClick={() => net.send({ c: 'teach', who: r.id })}>
                    {T.folkTeach}
                  </button>
                </>
              )}
            </p>
          )}
          <div class="slot-options jobs">
            {r.jobs.map((j) => (
              <button
                class={`chip-btn ${r.job === j.id ? 'on' : ''}`}
                disabled={locked || r.job === j.id || !!j.reason}
                onClick={() => net.send({ c: 'job', who: r.id, id: j.id })}
              >
                {j.label}{' '}
                <small>
                  {j.place} · {j.reason ?? `~${j.rate} ${T.residentPerHour}`}
                  {j.food !== undefined && !j.reason && ` · ${T.folkFood} ${signed(j.food)}${T.larderHour}`}
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
