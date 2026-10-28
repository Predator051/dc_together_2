import { describe, expect, it } from 'vitest';
import { seatItems, stageItems } from '../client/src/stage-place.js';

// A workplace's works stand on its painting: one medal per work while there is room, stacks of a kind
// when there is not, and a medal keeps its place when others come and go.
describe('works on a painting', () => {
  const order = ['pair', 'keep', 'sell', 'buy'];
  const works = (n: number, sort?: string) => Array.from({ length: n }, (_, i) => ({ id: `${sort ?? 'w'}${i}`, ...(sort ? { sort } : {}) }));

  it('gives every work its own medal while they fit', () => {
    expect(stageItems(works(8), 8, order).map((i) => i.ids)).toEqual(works(8).map((w) => [w.id]));
  });

  it('stacks works of a kind only as far as needed, the smallest opened again', () => {
    const items = stageItems([...works(2, 'keep'), ...works(3, 'sell'), ...works(8, 'buy')], 8, order);
    expect(items.length).toBeLessThanOrEqual(8);
    expect(items.map((i) => i.key)).toEqual(['keep0', 'keep1', 'sell0', 'sell1', 'sell2', '#buy']);
    expect(items.flatMap((i) => i.ids).length).toBe(13);
  });

  it('puts what does not fit even by kind into one more stack', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].flatMap((s) => works(2, s));
    const items = stageItems(many, 4, order);
    expect(items.length).toBe(4);
    expect(items.at(-1)!.key).toBe('#more');
    expect(items.flatMap((i) => i.ids).sort()).toEqual(many.map((w) => w.id).sort());
  });

  it('keeps every medal in its place when another goes or comes', () => {
    const first = seatItems(['a', 'b', 'c'], 8, {});
    expect(first).toEqual({ a: 0, b: 1, c: 2 });
    const gone = seatItems(['a', 'c'], 8, first);
    expect(gone).toEqual({ a: 0, c: 2 });
    // a newcomer does not take the place of the one gone, which finds it again on return
    const came = seatItems(['a', 'c', 'd'], 8, { ...first, ...gone });
    expect(came).toEqual({ a: 0, c: 2, d: 3 });
    expect(seatItems(['a', 'b', 'c', 'd'], 8, { ...first, ...came })).toEqual({ a: 0, b: 1, c: 2, d: 3 });
  });

  it('seats everyone even when the places run out', () => {
    const seats = seatItems(['x', 'y', 'z'], 3, { a: 0, b: 1, c: 2 });
    expect(Object.values(seats).sort()).toEqual([0, 1, 2]);
  });
});
