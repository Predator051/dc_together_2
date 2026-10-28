// The store and the bag on their paintings: shelves of things stand on the painting, each where such
// things lie (food on the sacks, tools in the chest); the picked shelf opens below as cells.

import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import type { PlayerView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { Cell } from './cells.js';
import { Thing } from './items.js';
import { picture, stationSlots, stationUrl } from './pictures.js';
import { T } from './strings.js';

/** A thing on a shelf: from the store, or from the bag (`bag`). */
interface Ware {
  id: string;
  name: string;
  n: number;
  cap?: number;
  icon?: string;
  note?: string;
  kind: string;
  ware?: boolean;
  usable?: boolean;
  bag?: boolean;
}

interface Shelf {
  key: string;
  name: string;
  /** Its place on the painting (an index into the painting's places). */
  slot: number;
  list: Ware[];
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

// where each shelf stands: on the store's painting (station-slots.json "store") and on the bag's ("bag")
const AT_HOME: Record<string, number> = { items: 0, res: 1, food: 2, use: 3, bag: 6 };
const ON_ROAD: Record<string, number> = { food: 0, res: 1, items: 2, use: 5 };

const KIND_SHELF: Record<string, string> = { food: 'food', use: 'use', res: 'res' };
const SHELF_NAME: Record<string, string> = { bag: T.bag, food: T.sortFood, use: T.sortUse, res: T.sortMake, items: T.items };

/** The shelves: at home the store by kind and the bag as one more; on the road the bag by kind. */
function shelves(v: PlayerView): Shelf[] {
  const bag: Ware[] = v.bag.items.map((x) => ({ ...x, bag: true }));
  const make = (key: string, list: Ware[], at: Record<string, number>): Shelf => ({ key, name: SHELF_NAME[key] ?? key, slot: at[key] ?? 0, list });
  if (!v.atHome) {
    const by = (key: string) => bag.filter((x) => (KIND_SHELF[x.kind] ?? 'items') === key);
    return ['food', 'use', 'res', 'items'].map((k) => make(k, by(k), ON_ROAD)).filter((s) => s.list.length > 0);
  }
  const res = (kind: string) => v.res.filter((r) => r.kind === kind);
  return [
    ...(bag.length ? [make('bag', bag, AT_HOME)] : []),
    make('food', res('food'), AT_HOME),
    make('use', res('use'), AT_HOME),
    make('res', res('res'), AT_HOME),
    make('items', v.res.filter((r) => (r.kind === 'tool' || r.kind === 'gear') && r.n > 0), AT_HOME),
  ].filter((s) => s.list.length > 0);
}

/** How many things to put into the bag at one go. */
function packCount(w: Ware): number {
  return w.ware ? Math.min(5, w.n) : w.kind === 'food' ? 2 : 1;
}

function ShelfMedal({ s, i, at, on, onPick }: { s: Shelf; i: number; at: [number, number]; on: boolean; onPick: () => void }) {
  const some = s.list.filter((w) => w.n > 0);
  // the disc shows what there is most of
  const top = [...some].sort((a, b) => b.n - a.n)[0] ?? s.list[0];
  return (
    <button
      type="button"
      class={`act-medal placed stack ${on ? 'on' : ''} ${some.length ? '' : 'blocked'}`}
      style={{ left: `${at[0]}%`, top: `${at[1]}%`, '--i': String(i) }}
      aria-label={`${s.name}: ${some.length}`}
      aria-pressed={on}
      title={s.name}
      onClick={onPick}
    >
      <span class="act-pic">
        <span class="act-disc">{top?.icon ? <Thing icon={top.icon} /> : picture(s.key === 'bag' ? 'bag' : 'store')}</span>
        <span class="act-count">{some.length}</span>
      </span>
      <span class="act-label">{s.name}</span>
    </button>
  );
}

/** The picked shelf: its things as cells, and what can be done with the picked one. */
function ShelfCard({ s, v, locked }: { s: Shelf; v: PlayerView; locked: boolean }) {
  const [sel, setSel] = useState<string | null>(null);
  const w = s.list.find((x) => x.id === sel) ?? null;
  const bagged = s.key === 'bag' || !v.atHome;
  const packable = (x: Ware) => !x.bag && v.atHome && x.n > 0 && (x.kind === 'use' || x.kind === 'food' || !!x.ware);
  return (
    <div class="shelf-card">
      <h4 class="shelf-name">
        {s.name}
        {bagged && (
          <span class={`bag-load ${v.bag.load >= v.bag.cap ? 'full' : ''}`}>
            {Math.round(v.bag.load * 10) / 10}/{v.bag.cap}
          </span>
        )}
      </h4>
      {bagged && (
        <span class="bar load" aria-hidden="true">
          <span style={{ width: `${Math.min(1, v.bag.load / Math.max(1, v.bag.cap)) * 100}%` }} />
        </span>
      )}
      <ul class="cells" aria-label={s.name}>
        {s.list.map((x) => (
          <Cell
            icon={x.icon}
            name={x.name}
            n={s.key === 'items' && !x.bag ? (x.n > 1 ? x.n : undefined) : x.n}
            cap={x.cap}
            cls={`${x.cap !== undefined && x.n >= x.cap ? 'full' : ''} ${x.n === 0 ? 'empty' : ''}`}
            sel={sel === x.id}
            onPick={() => setSel(sel === x.id ? null : x.id)}
          />
        ))}
      </ul>
      {w && (
        <div class="cell-detail" key={w.id}>
          <span class="bag-name">
            <span class="bag-title">
              <Thing icon={w.icon} />
              <span>
                {w.name} <b>{w.n}</b>
              </span>
            </span>
            {w.note && <small>{w.note}</small>}
          </span>
          <span class="row">
            {w.bag && w.usable && (
              <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'use', id: w.id })}>
                {T.bagUse}
              </button>
            )}
            {w.bag &&
              (v.atHome ? (
                <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'pack', id: w.id, n: -w.n })}>
                  {T.bagUnpack}
                </button>
              ) : (
                <button class="btn small ghost" disabled={locked} onClick={() => net.send({ c: 'drop', id: w.id, n: 1 })}>
                  {T.bagDrop}
                </button>
              ))}
            {packable(w) && (
              <button class="btn small" disabled={locked} onClick={() => net.send({ c: 'pack', id: w.id, n: packCount(w) })}>
                + {T.bagPack}
              </button>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * The store at home (or the bag on the road) on its painting `icon` (one that is painted). What
 * follows it (the store at home, looked at from the road) comes as `children`.
 */
export function StoreStage({ v, locked, icon, children }: { v: PlayerView; locked: boolean; icon: string; children?: ComponentChildren }) {
  const list = shelves(v);
  const slots = stationSlots(icon);
  const key = `bezgomin.shelf.${icon}`;
  const [pick, setPick] = useState(() => load(key));
  const shown = list.find((s) => s.key === pick) ?? list[0];
  const folk = v.atHome ? v.res.filter((r) => r.kind === 'people' && r.n > 0) : [];
  const choose = (k: string) => {
    setPick(k);
    store(key, k);
  };
  return (
    <>
      <div class="stage">
        <div class="stage-paint" style={{ backgroundImage: `url(${stationUrl(icon) ?? ''})` }} aria-hidden="true" />
        {list.map((s, i) => (
          <ShelfMedal key={s.key} s={s} i={i} at={slots[s.slot] ?? slots[i]!} on={s === shown} onPick={() => choose(s.key)} />
        ))}
      </div>
      {shown ? <ShelfCard key={shown.key} s={shown} v={v} locked={locked} /> : <p class="empty-note stage-note">{T.bagEmpty}</p>}
      {folk.length > 0 && (
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
      {children}
    </>
  );
}
