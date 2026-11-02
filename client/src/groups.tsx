// Things in the store and the bag laid out by what they are, not in one heap: what is there first,
// the empty places of the store folded under a small button. A long store gets a search field, a shelf
// folds under its heading, and what has just come in wears a small mark for a while.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { T } from './strings.js';
import { load, store } from './clock.js';

export type Shelf = 'stuff' | 'food' | 'means' | 'ware' | 'gear' | 'items';

/** Up to this many things go in one grid without headings. */
const FEW = 8;
/** How long, in seconds the page is in sight, a thing that came in stays marked. */
const FRESH_S = 20;
const ORDER: Shelf[] = ['stuff', 'food', 'means', 'ware', 'gear', 'items'];
const NAME: Record<Shelf, string> = {
  stuff: T.shelfStuff,
  food: T.shelfFood,
  means: T.shelfMeans,
  ware: T.shelfWare,
  gear: T.shelfGear,
  items: T.shelfItems,
};

/** Which shelf a thing of this kind goes on. */
export function shelfOf(kind: string, ware = false): Shelf {
  if (ware) return 'ware';
  if (kind === 'food') return 'food';
  if (kind === 'use') return 'means';
  if (kind === 'gear') return 'gear';
  if (kind === 'tool') return 'items';
  return 'stuff';
}

const lower = (s: string) => s.toLocaleLowerCase('uk');

/** How much of each thing has come in since this list was first seen; a mark fades while the page is in sight. */
function useFresh(items: { id: string; n: number }[]) {
  const seen = useRef<Map<string, number> | null>(null);
  const [fresh, setFresh] = useState<Map<string, { d: number; left: number }>>(new Map());
  useEffect(() => {
    const prev = seen.current;
    seen.current = new Map(items.map((x) => [x.id, x.n]));
    if (!prev) return;
    const add = items.filter((x) => x.n > (prev.get(x.id) ?? 0));
    if (!add.length) return;
    setFresh((f) => {
      const m = new Map(f);
      for (const x of add) m.set(x.id, { d: (m.get(x.id)?.d ?? 0) + x.n - (prev.get(x.id) ?? 0), left: FRESH_S });
      return m;
    });
  });
  const any = fresh.size > 0;
  useEffect(() => {
    if (!any) return;
    const t = setInterval(() => {
      if (document.hidden) return;
      setFresh((f) => {
        const m = new Map<string, { d: number; left: number }>();
        for (const [id, e] of f) if (e.left > 1) m.set(id, { d: e.d, left: e.left - 1 });
        return m;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [any]);
  const seenOne = (id: string) =>
    setFresh((f) => {
      if (!f.has(id)) return f;
      const m = new Map(f);
      m.delete(id);
      return m;
    });
  return { fresh, seenOne };
}

/**
 * The things shelf by shelf, each with a small heading that folds it; within a shelf what is there comes first,
 * and the empty ones (store only) fold under a button. A single shelf, or a handful of things, needs no headings.
 * `cell` gets how much of the thing has just come in, to mark it.
 */
export function Shelves<X extends { id: string; n: number; name: string }>({
  items,
  shelf,
  cell,
  label,
}: {
  items: X[];
  shelf: (x: X) => Shelf;
  cell: (x: X, fresh?: number) => ComponentChildren;
  label: string;
}) {
  const [open, setOpen] = useState<Set<Shelf>>(new Set());
  const foldKey = `bezgomin.shelves.${label}`;
  const [folded, setFolded] = useState<Set<Shelf>>(() => new Set((load(foldKey) ?? '').split(',').filter(Boolean) as Shelf[]));
  const [q, setQ] = useState('');
  const { fresh, seenOne } = useFresh(items);
  const byShelf = ORDER.map((s) => ({ s, xs: items.filter((x) => shelf(x) === s) })).filter((g) => g.xs.length);
  // a handful of things reads at a glance: one grid, still in shelf order
  const many = byShelf.length > 1 && items.length > FEW;
  const find = many ? lower(q.trim()) : '';
  const groups = find
    ? [{ s: byShelf[0]!.s, xs: items.filter((x) => lower(x.name).includes(find)) }]
    : many
      ? byShelf
      : byShelf.length
        ? [{ s: byShelf[0]!.s, xs: byShelf.flatMap((g) => g.xs) }]
        : [];
  const draw = (x: X) => cell(x, fresh.get(x.id)?.d);
  // looking at a marked thing is enough to take the mark off
  const look = (e: Event) => {
    const id = (e.target as HTMLElement).closest<HTMLElement>('[data-fresh]')?.dataset.fresh;
    if (id) seenOne(id);
  };
  const fold = (s: Shelf) => {
    const next = new Set(folded);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    store(foldKey, [...next].join(','));
    setFolded(next);
  };
  return (
    <div class="shelves" onPointerOver={look} onFocusIn={look}>
      {many && (
        <input
          type="search"
          class="shelf-find"
          value={q}
          placeholder={T.shelfFind}
          aria-label={`${T.shelfFind} ${label}`}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Escape' && setQ('')}
        />
      )}
      {find && !groups[0]!.xs.length && <p class="shelf-none">{T.shelfNone}</p>}
      {groups.map(({ s, xs }) => {
        if (find)
          return (
            <div class="shelf" key="find">
              {xs.length > 0 && (
                <ul class="cells" aria-label={label}>
                  {[...xs.filter((x) => x.n > 0), ...xs.filter((x) => x.n <= 0)].map(draw)}
                </ul>
              )}
            </div>
          );
        const full = xs.filter((x) => x.n > 0);
        const empty = xs.filter((x) => x.n <= 0);
        const shut = many && folded.has(s);
        const shown = open.has(s) ? [...full, ...empty] : full;
        const news = full.filter((x) => fresh.has(x.id)).length;
        const toggle = () => {
          const next = new Set(open);
          if (next.has(s)) next.delete(s);
          else next.add(s);
          setOpen(next);
        };
        return (
          <div class={`shelf ${shut ? 'shut' : ''}`} key={s}>
            {many && (
              <button type="button" class="cells-head shelf-head" aria-expanded={!shut} onClick={() => fold(s)}>
                {NAME[s]}
                <span class="shelf-count">{full.length}</span>
                {shut && news > 0 && <span class="shelf-new">+{news}</span>}
                <span class="shelf-chev" aria-hidden="true" />
              </button>
            )}
            {!shut && shown.length > 0 && (
              <ul class="cells" aria-label={many ? NAME[s] : label}>
                {shown.map(draw)}
              </ul>
            )}
            {!shut && empty.length > 0 && (
              <button type="button" class="shelf-more" aria-expanded={open.has(s)} onClick={toggle}>
                {open.has(s) ? T.shelfHideEmpty : `${T.shelfEmpty} ${empty.length}`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
