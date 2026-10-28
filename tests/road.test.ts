import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { pair, type World } from './world.js';

/** Both heroes in the quarry camp, ready for the road south (cart, oxen, the price of the trip). */
function atCamp(): { w: World; h: PlayerId; m: PlayerId } {
  const r = pair(3);
  const s = r.w.state;
  for (const f of ['p2_hut', 'p2_act3', 'p2_need_cart', 'done:s_101', 'done:s_102', 'done:s_103', 'done:s_104', 'p2_tarpans_driven', 'p2_robbers_beaten'])
    s.flags[f] = 1;
  Object.assign(s.res, { t_40: 1, t_41: 1, r_57: 30, r_05: 30, r_04: 20 });
  for (const pid of [r.h, r.m]) {
    const p = s.players[pid];
    p.at = 'a_16';
    p.busy = null;
    p.level = 12;
  }
  return r;
}

function both(w: World, h: PlayerId, m: PlayerId, id: string): void {
  expect(w.cmd(h, { c: 'choose', id }).ok, id).toBe(true);
  expect(w.cmd(m, { c: 'choose', id }).ok, id).toBe(true);
}

function startTrip(w: World, h: PlayerId, m: PlayerId): void {
  expect(w.cmd(h, { c: 'act', id: 's_107' }).ok).toBe(true);
  expect(w.cmd(m, { c: 'accept' }).ok).toBe(true);
  for (let i = 0; i < 5 && w.state.scene?.node !== 'road'; i++) {
    w.cmd(h, { c: 'next' });
    w.cmd(m, { c: 'next' });
  }
  expect(w.state.scene?.node).toBe('road');
}

describe('the road south', () => {
  it('shows its bar as supplies, and a well gives once a trip', () => {
    const { w, h, m } = atCamp();
    startTrip(w, h, m);
    const d = w.view(h).scene!.delve!;
    expect(d.meter).toBe('Запас');
    expect(d.road).toBe(true);
    expect(d.light).toBe(6);
    both(w, h, m, 'go:gully');
    expect(w.state.scene!.delve!.light).toBe(5);
    expect(w.cmd(h, { c: 'choose', id: 'act:mow' }).ok).toBe(true);
    expect(w.state.scene!.delve!.light).toBe(6);
    // mown once this trip: the deed is gone until the next one
    expect(w.view(m).scene!.delve!.acts.find((a) => a.id === 'act:mow')).toBeUndefined();
  });

  it('runs dry: the oxen lie down, the trip is not done, but the way is remembered', () => {
    const { w, h, m } = atCamp();
    startTrip(w, h, m);
    // back and forth until the supplies are gone
    for (let i = 0; i < 6 && w.state.scene?.node === 'road'; i++) both(w, h, m, w.state.scene!.delve!.room === 'quarry' ? 'go:gully' : 'go:quarry');
    while (w.state.scene && w.state.scene.node !== 'road') {
      w.cmd(h, { c: 'next' });
      w.cmd(m, { c: 'next' });
    }
    expect(w.state.flags['done:s_107']).toBeUndefined();
    expect(w.state.flags['known:j_01:gully']).toBe(1);
  });

  it('two ways to one place: the one that shows counts (a spare wheel spares the risk)', () => {
    const { w, h, m } = atCamp();
    w.state.res['t_43'] = 1;
    startTrip(w, h, m);
    for (const way of ['go:gully', 'go:baba', 'go:lake', 'go:fork', 'go:dry']) both(w, h, m, way);
    const exits = w.view(m).scene!.delve!.exits.filter((e) => e.to === 'camp');
    expect(exits.length).toBe(1);
    const before = w.state.scene!.delve!.light;
    both(w, h, m, 'go:camp');
    expect(w.state.scene!.delve!.room).toBe('camp');
    expect(w.state.scene!.delve!.light).toBe(before - 1);
  });
});
