// Things in the store and the bag laid out by what they are, not in one heap: what is there first,
// the empty places of the store folded under a small button.
import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { T } from './strings.js';

export type Shelf = 'stuff' | 'food' | 'means' | 'ware' | 'gear' | 'items';

/** Up to this many things go in one grid without headings. */
const FEW = 8;
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

/**
 * The things shelf by shelf, each with a small heading; within a shelf what is there comes first, and
 * the empty ones (store only) fold under a button. A single shelf, or a handful of things, needs no headings.
 */
export function Shelves<X extends { id: string; n: number }>({
  items,
  shelf,
  cell,
  label,
}: {
  items: X[];
  shelf: (x: X) => Shelf;
  cell: (x: X) => ComponentChildren;
  label: string;
}) {
  const [open, setOpen] = useState<Set<Shelf>>(new Set());
  const byShelf = ORDER.map((s) => ({ s, xs: items.filter((x) => shelf(x) === s) })).filter((g) => g.xs.length);
  // a handful of things reads at a glance: one grid, still in shelf order
  const many = byShelf.length > 1 && items.length > FEW;
  const groups = many ? byShelf : byShelf.length ? [{ s: byShelf[0]!.s, xs: byShelf.flatMap((g) => g.xs) }] : [];
  return (
    <>
      {groups.map(({ s, xs }) => {
        const full = xs.filter((x) => x.n > 0);
        const empty = xs.filter((x) => x.n <= 0);
        const shown = open.has(s) ? [...full, ...empty] : full;
        const toggle = () => {
          const next = new Set(open);
          if (next.has(s)) next.delete(s);
          else next.add(s);
          setOpen(next);
        };
        return (
          <div class="shelf" key={s}>
            {many && (
              <p class="cells-head shelf-head">
                {NAME[s]}
                <span class="shelf-count">{full.length}</span>
              </p>
            )}
            {shown.length > 0 && (
              <ul class="cells" aria-label={many ? NAME[s] : label}>
                {shown.map(cell)}
              </ul>
            )}
            {empty.length > 0 && (
              <button type="button" class="shelf-more" aria-expanded={open.has(s)} onClick={toggle}>
                {open.has(s) ? T.shelfHideEmpty : `${T.shelfEmpty} ${empty.length}`}
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
