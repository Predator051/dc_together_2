import { afterEach, describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { placeEvent, roadEvent } from '../server/src/engine/events.js';
import { ix, pair, World } from './world.js';

const MIN = 60_000;
const all = ix.c.events!.kinds;

/** Only these happenings may come (the rest wait). */
function only(...ids: string[]): void {
  ix.c.events!.kinds = all.filter((e) => ids.includes(e.id));
}
afterEach(() => {
  ix.c.events!.kinds = all;
});

/** After the hut, both at home, the sky calm, no beasts. */
function home(seed = 3): { w: World; h: PlayerId; m: PlayerId } {
  const r = pair(seed);
  const s = r.w.state;
  s.flags.p2_hut = 1;
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_01';
    s.players[pid].busy = null;
  }
  for (const a of r.w.g().ix.c.areas) a.ambush = 0;
  r.w.advance(1000);
  return r;
}

/** Make every timer due now. */
function due(w: World): void {
  const s = w.state.events!;
  for (const k of ['home', 'p1', 'p2']) s.next[k] = w.now - 1;
}

/** Let an away happening come for sure. */
function surely<T>(f: () => T): T {
  const { road, place } = ix.c.events!;
  ix.c.events!.road = 1;
  ix.c.events!.place = 1;
  try {
    return f();
  } finally {
    ix.c.events!.road = road;
    ix.c.events!.place = place;
  }
}

describe('small happenings', () => {
  it('none before the hut; at home one comes when its time is up, either hero may answer, and what came of it waits to be closed', () => {
    const r = pair(3);
    r.w.advance(1000);
    expect(r.w.state.events).toBeUndefined();
    const { w, h, m } = home();
    only('ev_114');
    // the first look only starts the clock
    expect(w.view(h).events).toEqual([]);
    due(w);
    w.advance(1000);
    const card = w.view(h).events[0]!;
    expect(card.home).toBe(true);
    expect(card.done).toBe(false);
    expect(card.art).toBe('ev_114');
    expect(w.view(m).events[0]!.uid).toBe(card.uid);
    // the partner away from home does not see it
    w.state.players[m].at = 'a_02';
    expect(w.view(m).events).toEqual([]);
    expect(w.cmd(m, { c: 'event', uid: card.uid, choice: 1 }).ok).toBe(false);
    w.state.players[m].at = 'a_01';
    // the heron goes into the pot: food, and both read it in the log
    const food = w.state.res['r_05'] ?? 0;
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 1 }).ok).toBe(true);
    expect(w.state.res['r_05']).toBe(food + 3);
    const line = w.state.log[w.state.log.length - 1]!;
    expect(line.text.p1).toContain('чаплі');
    expect(line.text.p2).toBe(line.text.p1);
    // the one who answered reads what came of it and what it brought; the partner's window is gone
    const done = w.view(h).events[0]!;
    expect(done.done).toBe(true);
    expect(done.choices).toEqual([]);
    expect(done.text.join(' ')).toContain('чаплі');
    expect(done.gains).toEqual([{ name: 'Харчі', n: 3 }]);
    expect(w.view(m).events).toEqual([]);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(false);
    expect(w.cmd(m, { c: 'event', uid: card.uid, choice: -1 }).ok).toBe(false);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: -1 }).ok).toBe(true);
    expect(w.view(h).events).toEqual([]);
    // once only
    due(w);
    w.advance(1000);
    expect(w.view(h).events).toEqual([]);
  });

  it('a choice that cannot be paid for is locked and says why; what it costs is counted', () => {
    const { w, h } = home();
    only('ev_114');
    due(w);
    w.state.res['r_12'] = 0;
    w.state.res['r_05'] = 5;
    w.advance(1000);
    const card = w.view(h).events[0]!;
    expect(card.choices[0]!.enabled).toBe(false);
    expect(card.choices[0]!.cost?.some((c) => !c.ok)).toBe(true);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(false);
    w.state.res['r_12'] = 2;
    expect(w.view(h).events[0]!.choices[0]!.enabled).toBe(true);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(true);
    expect(w.state.res['r_12']).toBe(1);
    const gains = w.view(h).events[0]!.gains;
    expect(gains).toContainEqual({ name: 'Кістки', n: -1 });
    expect(gains).toContainEqual({ name: 'Харчі', n: -1 });
  });

  it('a scene of several steps: what came of the first is shown above the next', () => {
    const { w, h } = home();
    only('ev_108');
    due(w);
    w.advance(1000);
    const card = w.view(h).events[0]!;
    expect(card.lead).toEqual([]);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(true);
    const step = w.view(h).events[0]!;
    expect(step.done).toBe(false);
    expect(step.lead.join(' ')).toContain('ганчірка');
    expect(step.text.join(' ')).toContain('мисочка');
    const iron = w.state.res['r_18'] ?? 0;
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(true);
    expect(w.state.res['r_18']).toBe(iron + 2);
    expect(w.view(h).events[0]!.done).toBe(true);
  });

  it('a fight that breaks out is what came of it: the window goes away', () => {
    const { w, h } = home();
    only('ev_101');
    due(w);
    w.advance(1000);
    const card = w.view(h).events[0]!;
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(true);
    expect(w.state.players[h].fight).not.toBeNull();
    expect(w.state.events!.open).toEqual([]);
  });

  it('away: a window is for the one who is there and goes away when that hero walks off', () => {
    const { w, h, m } = home();
    only('ev_134');
    w.state.players[h].at = 'a_03';
    due(w);
    surely(() => placeEvent(w.g(), h));
    const card = w.view(h).events[0]!;
    expect(card.home).toBe(false);
    expect(w.view(m).events).toEqual([]);
    w.state.players[h].at = 'a_02';
    w.advance(1000);
    expect(w.view(h).events).toEqual([]);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 1 }).ok).toBe(false);
  });

  it('a once-only find never comes twice; road ones only where and when they belong', () => {
    const { w, h } = home();
    only('ev_145', 'ev_138');
    surely(() => {
      w.state.players[h].at = 'a_07';
      due(w);
      placeEvent(w.g(), h);
      const card = w.view(h).events[0]!;
      expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(true);
      expect(w.state.players[h].bag['r_18']).toBe(1);
      expect(w.cmd(h, { c: 'event', uid: card.uid, choice: -1 }).ok).toBe(true);
      due(w);
      placeEvent(w.g(), h);
      expect(w.view(h).events).toEqual([]);
      // the salt crust needs sun or wind on the salt flat
      w.state.weather = { id: 'w_rain', until: w.now + 60 * MIN, next: 'w_clear' };
      w.state.players[h].at = 'a_04';
      due(w);
      roadEvent(w.g(), h);
      expect(w.view(h).events).toEqual([]);
      w.state.weather = { id: 'w_wind', until: w.now + 60 * MIN, next: 'w_clear' };
      roadEvent(w.g(), h);
      expect(w.view(h).events[0]!.art).toBe('ev_138');
    });
  });

  it('nothing comes during a joint scene or a fight', () => {
    const { w, h } = home();
    only('ev_114');
    due(w);
    w.state.scene = { id: 's_x', node: 'n', mode: 'joint', paused: false } as never;
    w.advance(1000);
    expect(w.state.events!.open).toEqual([]);
    w.state.scene = null;
    w.state.players[h].fight = 1;
    w.state.players['p2'].fight = 1;
    w.advance(1000);
    expect(w.state.events!.open).toEqual([]);
  });

  it('a window of a happening no longer in the game goes away', () => {
    const { w, h } = home();
    w.state.events!.open.push({ uid: 99, id: 'ev_gone', pid: null, area: 'a_01', at: w.now });
    w.advance(1000);
    expect(w.state.events!.open).toEqual([]);
    expect(w.view(h).events).toEqual([]);
  });

  it('a scratch from a happening never knocks a hero down', () => {
    const { w, h } = home();
    w.state.players[h].hp = 2;
    w.g().apply([{ heal: -3, who: 'actor' }], h);
    expect(w.state.players[h].hp).toBe(1);
  });

  it('there are a hundred and more, each a choice with somewhere to go, spread over the story', () => {
    expect(all.length).toBeGreaterThanOrEqual(100);
    for (const e of all) {
      expect(e.choices?.length ?? 0).toBeGreaterThanOrEqual(2);
      for (const ch of [...e.choices!, ...Object.values(e.stages ?? {}).flatMap((s) => s.choices)]) expect(ch.outcomes.length).toBeGreaterThan(0);
    }
    expect(all.filter((e) => e.where === 'home').length).toBeGreaterThanOrEqual(30);
    expect(all.filter((e) => e.where !== 'home').length).toBeGreaterThanOrEqual(60);
  });
});
