import { afterEach, describe, expect, it } from 'vitest';
import type { EventDef, PlayerId } from '../shared/src/content.js';
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

describe('small happenings', () => {
  it('none before the hut; at home one comes when its time is up, and either hero may answer', () => {
    const r = pair(3);
    r.w.advance(1000);
    expect(r.w.state.events).toBeUndefined();
    const { w, h, m } = home();
    only('ev_04');
    // the first look only starts the clock
    expect(w.view(h).events).toEqual([]);
    due(w);
    w.advance(1000);
    const card = w.view(h).events[0]!;
    expect(card.home).toBe(true);
    expect(w.view(m).events[0]!.uid).toBe(card.uid);
    // the partner away from home does not see it
    w.state.players[m].at = 'a_02';
    expect(w.view(m).events).toEqual([]);
    expect(w.cmd(m, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(false);
    // feeding the stranger costs food and leaves rope; both read what happened
    w.state.res['r_05'] = 5;
    const rope = w.state.res['r_03'] ?? 0;
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(true);
    expect(w.state.res['r_05']).toBe(3);
    expect(w.state.res['r_03']).toBe(rope + 2);
    expect(w.view(h).events).toEqual([]);
    const line = w.state.log[w.state.log.length - 1]!;
    expect(line.text.p1).toContain('мотузки');
    expect(line.text.p2).toBe(line.text.p1);
    // not again soon
    due(w);
    w.advance(1000);
    expect(w.view(h).events).toEqual([]);
  });

  it('a choice that cannot be paid for is locked and says why', () => {
    const { w, h } = home();
    only('ev_04');
    due(w);
    w.state.res['r_05'] = 0;
    w.state.res['r_04'] = 0;
    w.advance(1000);
    const card = w.view(h).events[0]!;
    expect(card.choices[0]!.enabled).toBe(false);
    expect(card.choices[0]!.cost?.[0]!.ok).toBe(false);
    expect(card.choices[2]!.enabled).toBe(true);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 0 }).ok).toBe(false);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 2 }).ok).toBe(true);
  });

  it('one without choices simply happens: a line in the log and what it brings', () => {
    const { w, h } = home();
    w.g().apply([{ resident: 'h_01' }]);
    only('ev_07');
    due(w);
    const reed = w.state.res['r_02'] ?? 0;
    w.advance(1000);
    expect(w.view(h).events).toEqual([]);
    expect(w.state.res['r_02']).toBe(reed + 3);
    expect(w.state.log[w.state.log.length - 1]!.kind).toBe('find');
  });

  it('away: a card is for the one who is there and goes away when that hero walks off', () => {
    const { w, h, m } = home();
    only('ev_22');
    w.state.players[h].at = 'a_03';
    due(w);
    const p = ix.c.events!.place;
    ix.c.events!.place = 1;
    try {
      placeEvent(w.g(), h);
    } finally {
      ix.c.events!.place = p;
    }
    const card = w.view(h).events[0]!;
    expect(card.home).toBe(false);
    expect(w.view(m).events).toEqual([]);
    w.state.players[h].at = 'a_02';
    w.advance(1000);
    expect(w.view(h).events).toEqual([]);
    expect(w.cmd(h, { c: 'event', uid: card.uid, choice: 1 }).ok).toBe(false);
  });

  it('a once-only find never comes twice; road ones only where they belong', () => {
    const { w, h } = home();
    only('ev_26', 'ev_23');
    const road = ix.c.events!.road;
    const place = ix.c.events!.place;
    ix.c.events!.road = 1;
    ix.c.events!.place = 1;
    try {
      w.state.players[h].at = 'a_07';
      due(w);
      placeEvent(w.g(), h);
      expect(w.state.players[h].bag['r_18']).toBe(1);
      due(w);
      placeEvent(w.g(), h);
      expect(w.state.players[h].bag['r_18']).toBe(1);
      // the salt crust needs sun or wind on the salt flat
      w.state.weather = { id: 'w_rain', until: w.now + 60 * MIN, next: 'w_clear' };
      w.state.players[h].at = 'a_04';
      due(w);
      roadEvent(w.g(), h);
      expect(w.state.players[h].bag['r_07'] ?? 0).toBe(0);
      w.state.weather = { id: 'w_wind', until: w.now + 60 * MIN, next: 'w_clear' };
      roadEvent(w.g(), h);
      expect(w.state.players[h].bag['r_07']).toBe(2);
    } finally {
      ix.c.events!.road = road;
      ix.c.events!.place = place;
    }
  });

  it('nothing comes during a joint scene or a fight', () => {
    const { w, h } = home();
    only('ev_04');
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

  it('a scratch from a happening never knocks a hero down', () => {
    const { w, h } = home();
    w.state.players[h].hp = 2;
    w.g().apply([{ heal: -3, who: 'actor' }], h);
    expect(w.state.players[h].hp).toBe(1);
  });

  it('every kind of happening reads right and its choices lead somewhere', () => {
    for (const e of all as EventDef[]) {
      if (!e.choices) expect(e.effects?.length ?? 0).toBeGreaterThan(0);
      for (const ch of e.choices ?? []) expect(ch.outcomes.length).toBeGreaterThan(0);
    }
  });
});
