// Where the works of a workplace stand on its painting: one medal per work while there is room,
// works of one kind stacked together when there is not, and every medal keeps its place.

/** A medal on the painting: one work, or a stack of works of one kind. */
export interface StageItem {
  key: string;
  ids: string[];
  /** What a stack holds (a section of the workplace); none for a single work. */
  sort?: string;
}

/**
 * The medals for these works on a painting with `room` places. Works of a kind go into a stack
 * only as far as needed: the smallest stacks are opened up again while they still fit.
 */
export function stageItems(works: Array<{ id: string; sort?: string }>, room: number, order: readonly string[]): StageItem[] {
  if (room < 1) return [];
  if (works.length <= room) return works.map((w) => ({ key: w.id, ids: [w.id] }));
  const by = new Map<string, string[]>();
  for (const w of works) {
    const s = w.sort ?? 'keep';
    by.set(s, [...(by.get(s) ?? []), w.id]);
  }
  const rank = (s: string) => (order.includes(s) ? order.indexOf(s) : order.length);
  let items: StageItem[] = [...by.entries()]
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([sort, ids]) => (ids.length === 1 ? { key: ids[0]!, ids } : { key: `#${sort}`, ids, sort }));
  for (;;) {
    const open = items
      .filter((i) => i.sort && items.length - 1 + i.ids.length <= room)
      .sort((a, b) => a.ids.length - b.ids.length)[0];
    if (!open) break;
    const at = items.indexOf(open);
    items = [...items.slice(0, at), ...open.ids.map((id) => ({ key: id, ids: [id] })), ...items.slice(at + 1)];
  }
  if (items.length > room) {
    const rest = items.slice(room - 1).flatMap((i) => i.ids);
    items = [...items.slice(0, room - 1), { key: '#more', ids: rest, sort: 'more' }];
  }
  return items;
}

/**
 * The place of every medal. A medal keeps the place it had (`was`); a new one takes the first
 * free place, before places that medals now gone once held, so that those find theirs on return.
 */
export function seatItems(keys: string[], room: number, was: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  const taken = new Set<number>();
  for (const k of keys) {
    const s = was[k];
    if (s !== undefined && s < room && !taken.has(s)) {
      out[k] = s;
      taken.add(s);
    }
  }
  const held = new Set(Object.values(was));
  for (const k of keys) {
    if (k in out) continue;
    let s = -1;
    for (let i = 0; i < room && s < 0; i++) if (!taken.has(i) && !held.has(i)) s = i;
    for (let i = 0; i < room && s < 0; i++) if (!taken.has(i)) s = i;
    if (s < 0) continue;
    out[k] = s;
    taken.add(s);
  }
  return out;
}
