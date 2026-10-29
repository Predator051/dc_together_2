// The home garden: raised beds on the ground behind the hut, each with what grows on it drawn as it is
// now (sown, come up, growing, nearly ripe, ripe). Growth runs between views, so the client counts
// it on from the rate the server gives; a bed tapped opens its card under the picture.

import { useEffect, useState } from 'preact/hooks';
import type { GardenView, PlayerView } from '../../shared/src/protocol.js';
import { bedArt, PER_BED, Plant, PlantPic, STAGE_AT, stageOf, withinStage } from './crops.js';
import { hasMark, Thing } from './items.js';
import { net } from './net.js';
import { stationUrl } from './pictures.js';
import { T } from './strings.js';
import { texUrl } from './terrain.js';

const MIN = 60_000;
const W = 900;
/** The height of the picture: three rows of beds want more ground. */
export function sceneHeight(beds: number): number {
  return Math.ceil(beds / 2) >= 3 ? 700 : 600;
}

type Bed = GardenView['beds'][number];

/** The clock of the garden: often enough that a plant is seen to grow while one looks. */
export function useGardenClock(offset: number): number {
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now() + offset), 5_000);
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

/** A bed as it is at `now`: how much has grown, the stage, how long until ripe. */
export interface BedNow {
  share: number;
  stage: number;
  ready: boolean;
  left: number;
}

export function bedNow(b: Bed, gv: GardenView, v: PlayerView, now: number): BedNow {
  if (!b.crop) return { share: 0, stage: 0, ready: false, left: 0 };
  const grown = Math.min(b.grows, b.grown + Math.max(0, now - v.now) * gv.rate);
  const ready = b.ready || grown >= b.grows;
  const share = ready ? 1 : grown / b.grows;
  return { share, stage: stageOf(share), ready, left: ready ? 0 : (b.grows - grown) / Math.max(0.1, gv.rate) };
}

/** How many beds want a hand now: ripe ones, and empty ones while there is seed. */
export function gardenWants(gv: GardenView, v: PlayerView, now: number): number {
  const seed = gv.seeds.some((s) => s.have > 0);
  return gv.beds.filter((b) => (b.crop ? bedNow(b, gv, v, now).ready : seed)).length;
}

// ------------------------------------------------------------------ where the beds lie
interface Lay {
  /** Centre of the bed's top. */
  cx: number;
  cy: number;
  /** Width, depth of the top, height of the side; `s` the scale of everything on it. */
  w: number;
  d: number;
  f: number;
  s: number;
}

/** Two beds in a row, one to three rows; the far ones a little smaller. */
function layout(n: number): Lay[] {
  const rows = Math.max(1, Math.ceil(n / 2));
  const at: Array<[number, number]> =
    rows === 1
      ? [[430, 1.08]]
      : rows === 2
        ? [
            [322, 0.92],
            [486, 1],
          ]
        : [
            [282, 0.84],
            [424, 0.92],
            [568, 1],
          ];
  const out: Lay[] = [];
  for (let i = 0; i < n; i++) {
    const [cy, s] = at[Math.floor(i / 2)]!;
    const alone = i === n - 1 && n % 2 === 1;
    const w = 392 * s;
    const cx = alone ? W / 2 : W / 2 + (i % 2 ? 1 : -1) * (w / 2 + 14 * s);
    out.push({ cx, cy, w, d: 62 * s, f: 24 * s, s });
  }
  return out;
}

function topFace(l: Lay): string {
  const { cx, cy, w, d, s } = l;
  const back = 10 * s;
  return `M${cx - w / 2 + back} ${cy - d / 2}L${cx + w / 2 - back} ${cy - d / 2}L${cx + w / 2} ${cy + d / 2}L${cx - w / 2} ${cy + d / 2}Z`;
}

function sideFace(l: Lay): string {
  const { cx, cy, w, d, f } = l;
  return `M${cx - w / 2} ${cy + d / 2}L${cx + w / 2} ${cy + d / 2}L${cx + w / 2 - 3} ${cy + d / 2 + f}L${cx - w / 2 + 3} ${cy + d / 2 + f}Z`;
}

/** Furrows along the bed's top. */
function furrows(l: Lay): string {
  const { cx, cy, w, d, s } = l;
  let p = '';
  for (const t of [-0.28, 0.02, 0.32]) {
    const y = cy + d * t;
    const inset = 14 * s * (0.6 - t);
    p += `M${cx - w / 2 + inset} ${y}Q${cx} ${y + 3 * s} ${cx + w / 2 - inset} ${y}`;
  }
  return p;
}

/** Withies woven along a bed's side. */
function weave(l: Lay): string {
  const { cx, cy, w, d, f } = l;
  const y0 = cy + d / 2;
  let p = '';
  for (const k of [0.3, 0.7]) {
    const y = y0 + f * k;
    let x = cx - w / 2 + 4;
    p += `M${x} ${y}`;
    let up = k < 0.5;
    while (x < cx + w / 2 - 12) {
      x += 14;
      p += `Q${x - 7} ${y + (up ? -3 : 3)} ${x} ${y}`;
      up = !up;
    }
  }
  return p;
}

// ------------------------------------------------------------------ the picture
function BedArt({ b, l, at, on, wet, i }: { b: Bed; l: Lay; at: BedNow; on: boolean; wet: boolean; i: number }) {
  const look = b.crop?.look;
  const per = look ? PER_BED[look] : null;
  const grow = 0.8 + 0.2 * withinStage(at.share);
  const ps = l.s * 1.7 * (at.ready ? 1 : grow);
  const baseY = l.cy + l.d * 0.12;
  const art = bedArt();
  return (
    <g class={`gbed ${on ? 'on' : ''} ${at.ready ? 'ripe' : ''} ${wet ? 'wet' : ''} ${art ? 'painted' : ''}`}>
      {art ? (
        // the painted bed: its earth lies about the middle of the picture, where the drawn top would be
        <image href={art.url} x={l.cx - l.w / 2} y={l.cy + l.f / 2 - (l.w * art.ratio) / 2} width={l.w} height={l.w * art.ratio} class="gbed-paint" />
      ) : (
        <>
          <path d={sideFace(l)} class="gbed-side" />
          <path d={weave(l)} class="gbed-weave" />
          <path d={topFace(l)} class="gbed-top" />
          <path d={topFace(l)} class="gbed-soil" />
          <path d={furrows(l)} class="gbed-furrow" />
          {wet && <path d={topFace(l)} class="gbed-wet" />}
        </>
      )}
      {on && !art && <path d={topFace(l)} class="gbed-ring" />}
      {at.ready && <ellipse class="gbed-glow" cx={l.cx} cy={baseY - 30 * l.s} rx={l.w * 0.48} ry={56 * l.s} />}
      {look &&
        per &&
        Array.from({ length: per.n }, (_, k) => {
          const x = l.cx + (k - (per.n - 1) / 2) * l.w * per.gap;
          // the rows are not drawn with a ruler
          const y = baseY + (k % 2 ? 3 : -2) * l.s;
          return (
            <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`} key={`${i}-${k}`}>
              <g class="gplant" style={{ '--sway': `${(k * 0.7 + i * 0.45) % 3}s` }}>
                <g class="gplant-size" style={{ transform: `scale(${ps.toFixed(3)})` }}>
                  <g key={at.stage} class="gplant-stage">
                    <Plant look={look} stage={at.stage} />
                  </g>
                </g>
              </g>
            </g>
          );
        })}
    </g>
  );
}

/** The garden seen from the hut: beds on the ground, the fence and the river behind. */
export function GardenScene({
  v,
  now,
  picked,
  onPick,
  locked,
}: {
  v: PlayerView;
  now: number;
  picked: number | null;
  onPick: (bed: number) => void;
  locked: boolean;
}) {
  const gv = v.garden!;
  const lays = layout(gv.beds.length);
  const H = sceneHeight(gv.beds.length);
  const wet = gv.rain || gv.wetUntil > now;
  const paint = stationUrl('garden');
  const grass = texUrl('grass');
  const dust = texUrl('dust');
  const mud = texUrl('mud');
  const ats = gv.beds.map((b) => bedNow(b, gv, v, now));
  return (
    <div class="garden-scene">
      <svg class="garden-art" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="gd-fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.2" stop-color="#fff" />
            <stop offset="0.3" stop-color="#000" />
          </linearGradient>
          <mask id="gd-top" maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill="url(#gd-fade)" />
          </mask>
          {grass && (
            <pattern id="gd-grass" patternUnits="userSpaceOnUse" width="320" height="320">
              <image href={grass} width="320" height="320" />
            </pattern>
          )}
          {dust && (
            <pattern id="gd-dust" patternUnits="userSpaceOnUse" width="260" height="260">
              <image href={dust} width="260" height="260" />
            </pattern>
          )}
          {mud && (
            <pattern id="gd-mud" patternUnits="userSpaceOnUse" width="200" height="200">
              <image href={mud} width="200" height="200" />
            </pattern>
          )}
          <radialGradient id="gd-ripe">
            <stop offset="0" stop-color="#f3c46a" stop-opacity="0.55" />
            <stop offset="1" stop-color="#f3c46a" stop-opacity="0" />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill={grass ? 'url(#gd-grass)' : '#5b5a33'} />
        <rect width={W} height={H} class="garden-dim" />
        <path d={`M${W / 2 - 20} 175L${W / 2 + 20} 175L${W / 2 + 46} ${H}L${W / 2 - 46} ${H}Z`} fill={dust ? 'url(#gd-dust)' : '#7a6448'} class="garden-path" />
        {paint && <image href={paint} width={W} height="600" preserveAspectRatio="xMidYMid slice" mask="url(#gd-top)" />}
        <rect x="0" y="150" width={W} height="40" class="garden-fence-foot" />
        <g class={mud ? 'soil-tex' : ''}>
          {gv.beds.map((b, i) => (
            <BedArt b={b} l={lays[i]!} at={ats[i]!} on={picked === i} wet={wet} i={i} key={i} />
          ))}
        </g>
      </svg>
      {gv.beds.map((b, i) => {
        const l = lays[i]!;
        const at = ats[i]!;
        const tall = 150 * l.s;
        const top = l.cy - l.d / 2 - tall;
        const bottom = l.cy + l.d / 2 + l.f;
        const label = b.crop
          ? `${T.gardenBed} ${i + 1}: ${b.crop.name}, ${at.ready ? T.gardenRipe.toLowerCase() : b.crop.stages[at.stage]!.toLowerCase()}`
          : `${T.gardenBed} ${i + 1}: ${T.gardenEmpty.toLowerCase()}`;
        return (
          <button
            type="button"
            class={`bed-hit ${picked === i ? 'on' : ''} ${at.ready ? 'ripe' : ''} ${b.crop ? '' : 'empty'}`}
            style={{
              left: `${((l.cx - l.w / 2) / W) * 100}%`,
              top: `${(top / H) * 100}%`,
              width: `${(l.w / W) * 100}%`,
              height: `${((bottom - top) / H) * 100}%`,
            }}
            aria-pressed={picked === i}
            aria-label={label}
            disabled={locked}
            onClick={() => onPick(i)}
            key={i}
          >
            <span class="bed-tag">
              {b.crop ? (
                <>
                  <Thing icon={b.crop.icon} />
                  <span class="bed-tag-name">{b.crop.name}</span>
                  {at.ready ? (
                    <span class="bed-tag-ripe" aria-hidden="true">
                      {hasMark('g_ripe') ? <Thing icon="g_ripe" /> : '✓'}
                    </span>
                  ) : (
                    <span class="bed-tag-bar" aria-hidden="true">
                      <i style={{ width: `${Math.round(at.share * 100)}%` }} />
                    </span>
                  )}
                </>
              ) : (
                gv.seeds.some((s) => s.have > 0) ? (
                  <span class="bed-tag-name idle">
                    {hasMark('g_seed') ? <Thing icon="g_seed" /> : '+ '}
                    {T.gardenSow}
                  </span>
                ) : (
                  <span class="bed-tag-name idle">{T.gardenEmpty}</span>
                )
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ under the picture
export function GardenWater({ gv, now }: { gv: GardenView; now: number }) {
  if (gv.rain)
    return (
      <p class="garden-water wet">
        <Thing icon="g_rain" />
        {T.gardenRain}
      </p>
    );
  if (gv.wetUntil > now)
    return (
      <p class="garden-water wet">
        <Thing icon="g_wet" />
        {`${T.gardenWet} ${span(gv.wetUntil - now)}`}
      </p>
    );
  return <p class="garden-water">{T.gardenDry}</p>;
}

/** A bar split at the stages, filled as far as the crop has grown. */
function StageBar({ share }: { share: number }) {
  return (
    <span class="stage-bar" aria-hidden="true">
      <i style={{ width: `${Math.round(share * 100)}%` }} />
      {STAGE_AT.slice(1).map((t) => (
        <b style={{ left: `${t * 100}%` }} class={share >= t ? 'past' : ''} />
      ))}
    </span>
  );
}

/** What can be sown, as buttons. */
function SeedList({ gv, bed, locked, onSown }: { gv: GardenView; bed: number; locked: boolean; onSown: () => void }) {
  const sowable = gv.seeds.filter((s) => s.have > 0);
  if (!sowable.length) return <p class="empty-note">{T.gardenNoSeed}</p>;
  return (
    <div class="sow-list">
      {sowable.map((s) => (
        <button
          type="button"
          class="btn sow-seed"
          disabled={locked}
          onClick={() => {
            net.send({ c: 'plant', bed, crop: s.crop });
            onSown();
          }}
          key={s.crop}
        >
          <PlantPic look={s.look} stage={4} class="sow-pic" />
          <span class="sow-text">
            <span class="sow-name">
              {s.name} <b>{s.have}</b>
            </span>
            <span class="sow-meta">{s.gives === s.name ? span(s.grows) : `${s.gives} · ${span(s.grows)}`}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** The card of one bed: what it is, how it goes, what to do with it. */
export function BedCard({ v, now, bed, locked }: { v: PlayerView; now: number; bed: number; locked: boolean }) {
  const gv = v.garden!;
  const b = gv.beds[bed];
  if (!b) return null;
  const at = bedNow(b, gv, v, now);
  const ripe = gv.beds.filter((x) => bedNow(x, gv, v, now).ready).length;
  if (!b.crop)
    return (
      <div class="bed-card" key={`e${bed}`}>
        <div class="bed-card-head">
          <span class={`bed-card-pic empty ${hasMark('g_soil') ? 'painted' : ''}`} aria-hidden="true">
            <Thing icon="g_soil" />
          </span>
          <div>
            <h4 class="bed-card-name">
              {T.gardenBed} {bed + 1}
            </h4>
            <p class="bed-card-stage">{T.gardenEmptyLong}</p>
          </div>
        </div>
        <p class="sow-head">{T.gardenWhat}</p>
        <SeedList gv={gv} bed={bed} locked={locked} onSown={() => undefined} />
      </div>
    );
  const word = at.ready ? T.gardenRipe : b.crop.stages[at.stage]!;
  return (
    <div class={`bed-card ${at.ready ? 'ripe' : ''}`} key={`c${bed}${b.crop.id}`}>
      <div class="bed-card-head">
        <span class="bed-card-pic" aria-hidden="true">
          <PlantPic look={b.crop.look} stage={at.stage} />
        </span>
        <div class="bed-card-text">
          <h4 class="bed-card-name">
            {b.crop.name}
            <span class="bed-card-no">
              {T.gardenBed} {bed + 1}
            </span>
          </h4>
          <p class="bed-card-stage">{word}</p>
          {!at.ready && (
            <>
              <StageBar share={at.share} />
              <p class="bed-card-left">
                {T.gardenRipens} {span(at.left)}
                {gv.why.map((w) => (
                  <span class={`why ${w.x >= 1 ? 'up' : 'down'}`}>
                    <Thing icon={w.icon} />
                    {w.text} ×{String(w.x).replace('.', ',')}
                  </span>
                ))}
              </p>
            </>
          )}
          <p class="bed-card-gives">
            {at.ready ? T.gardenWillGive : T.gardenGives} {b.crop.gives}
          </p>
        </div>
      </div>
      {at.ready && (
        <div class="bed-card-do">
          <button type="button" class="btn primary" disabled={locked} onClick={() => net.send({ c: 'harvest', bed })}>
            {T.gardenGather}
          </button>
          {ripe > 1 && (
            <button type="button" class="btn" disabled={locked} onClick={() => net.send({ c: 'harvest', bed: -1 })}>
              {T.gardenGatherAll} ({ripe})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** The bed to show first: a ripe one, else an empty one while there is seed. */
export function firstBed(v: PlayerView, now: number): number | null {
  const gv = v.garden;
  if (!gv) return null;
  const ripe = gv.beds.findIndex((b) => bedNow(b, gv, v, now).ready);
  if (ripe >= 0) return ripe;
  const empty = gv.beds.findIndex((b) => !b.crop);
  return empty >= 0 && gv.seeds.some((s) => s.have > 0) ? empty : null;
}

// ------------------------------------------------------------------ the beds as a list (the place shown as a list)
export function GardenBeds({ v, offset, locked }: { v: PlayerView; offset: number; locked: boolean }) {
  const gv = v.garden!;
  const now = useGardenClock(offset);
  const [sel, setSel] = useState<number | null>(null);
  const empty = gv.beds.findIndex((b) => !b.crop);
  const picked = sel !== null && !gv.beds[sel]?.crop ? sel : null;
  const sowable = gv.seeds.filter((s) => s.have > 0);
  return (
    <div class="garden">
      <GardenWater gv={gv} now={now} />
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
          const at = bedNow(b, gv, v, now);
          return at.ready ? (
            <button type="button" class="bed ready" disabled={locked} onClick={() => net.send({ c: 'harvest', bed: i })}>
              <PlantPic look={b.crop.look} stage={4} class="bed-pic" />
              <span class="bed-name">{b.crop.name}</span>
              <span class="bed-note">{T.gardenGather}</span>
            </button>
          ) : (
            <div class="bed growing">
              <PlantPic look={b.crop.look} stage={at.stage} class="bed-pic" />
              <span class="bed-name">{b.crop.name}</span>
              <span class="bed-stage">{b.crop.stages[at.stage]}</span>
              <span class="bed-bar" aria-hidden="true">
                <i style={{ width: `${Math.round(at.share * 100)}%` }} />
              </span>
              <span class="bed-note">{span(at.left)}</span>
            </div>
          );
        })}
      </div>
      {picked !== null && (
        <div class="sow">
          <p class="sow-head">{T.gardenWhat}</p>
          <SeedList gv={gv} bed={picked} locked={locked} onSown={() => setSel(null)} />
        </div>
      )}
      {picked === null && empty >= 0 && sowable.length > 0 && <p class="garden-hint">{T.gardenHint}</p>}
    </div>
  );
}
