import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { settleWork } from '../server/src/engine/household.js';
import { pair, World } from './world.js';

const MIN = 60_000;

/** After the hut and the salt pan, both at home, the store full enough to dig the garden. */
function home(seed = 3): { w: World; h: PlayerId; m: PlayerId } {
  const r = pair(seed);
  const s = r.w.state;
  Object.assign(s.flags, { p2_hut: 1, 'done:s_06': 1 });
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_01';
    s.players[pid].busy = null;
  }
  for (const a of r.w.g().ix.c.areas) a.ambush = 0;
  Object.assign(s.res, { r_04: 20, r_02: 10, r_01: 10 });
  r.w.advance(1000);
  return r;
}

function dig(w: World, pid: PlayerId): void {
  expect(w.cmd(pid, { c: 'act', id: 'x_201' }).ok).toBe(true);
  w.rest(pid);
}

function calm(w: World): void {
  w.state.weather = { id: 'w_clear', until: w.now + 600 * MIN, next: 'w_clear' };
}

describe('the garden', () => {
  it('digging the old garden makes two beds and turns up garlic to sow', () => {
    const { w, h, m } = home();
    expect(w.view(h).garden).toBeNull();
    dig(w, h);
    const gv = w.view(h).garden!;
    expect(gv.beds).toHaveLength(2);
    expect(w.state.res['r_50']).toBe(2);
    expect(gv.seeds.find((s) => s.crop === 'c_garlic')?.have).toBe(2);
    // only at home
    w.state.players[m].at = 'a_02';
    expect(w.view(m).garden).toBeNull();
    expect(w.cmd(m, { c: 'plant', bed: 0, crop: 'c_garlic' }).ok).toBe(false);
  });

  it('sowing takes a seed; a bed holds one crop; it ripens in time and gives more than was sown', () => {
    const { w, h } = home();
    calm(w);
    dig(w, h);
    expect(w.cmd(h, { c: 'plant', bed: 0, crop: 'c_garlic' }).ok).toBe(true);
    expect(w.state.res['r_50']).toBe(1);
    expect(w.cmd(h, { c: 'plant', bed: 0, crop: 'c_garlic' }).ok).toBe(false);
    expect(w.cmd(h, { c: 'plant', bed: 1, crop: 'c_beet' }).ok).toBe(false); // no seed
    expect(w.cmd(h, { c: 'harvest', bed: 0 }).ok).toBe(false); // not ripe
    w.advance(60 * MIN);
    expect(w.view(h).garden!.beds[0]!.ready).toBe(false);
    w.advance(31 * MIN);
    const v = w.view(h);
    expect(v.garden!.beds[0]!.ready).toBe(true);
    expect(w.state.log.some((l) => l.text.p1?.includes('дозріло'))).toBe(true);
    expect(w.cmd(h, { c: 'harvest', bed: 0 }).ok).toBe(true);
    expect(w.state.res['r_50']).toBeGreaterThanOrEqual(4);
    expect(w.view(h).garden!.beds[0]!.crop).toBeNull();
  });

  it('it grows while nobody plays; water and warm weather speed it up, frost slows it down', () => {
    const { w, h, m } = home();
    calm(w);
    dig(w, h);
    w.state.res['r_50'] = 4;
    w.cmd(h, { c: 'plant', bed: 0, crop: 'c_garlic' });
    w.online(h, false);
    w.online(m, false);
    w.advance(45 * MIN);
    expect(w.state.garden!.beds[0]!.grown).toBeCloseTo(45 * MIN, -4);
    w.online(h);
    // watered: one and a half times as fast
    expect(w.cmd(h, { c: 'act', id: 'x_204' }).ok).toBe(true);
    expect(w.view(h).garden!.rate).toBe(1.5);
    w.advance(30 * MIN);
    expect(w.view(h).garden!.beds[0]!.ready).toBe(true);
    // the weather
    w.cmd(h, { c: 'harvest', bed: 0 });
    w.cmd(h, { c: 'plant', bed: 0, crop: 'c_garlic' });
    w.state.garden!.wetUntil = 0;
    w.state.weather = { id: 'w_frost', until: w.now + 600 * MIN, next: 'w_clear' };
    expect(w.view(h).garden!.rate).toBe(0.5);
    w.state.weather = { id: 'w_rain', until: w.now + 600 * MIN, next: 'w_clear' };
    expect(w.view(h).garden!.rain).toBe(true);
    expect(w.view(h).garden!.rate).toBe(1.5);
    w.state.weather = { id: 'w_warm', until: w.now + 600 * MIN, next: 'w_clear' };
    expect(w.view(h).garden!.rate).toBe(1.25);
    expect(w.view(h).weather!.effects.some((e) => e.text.includes('Город'))).toBe(true);
  });

  it('a resident set to the garden keeps it watered from the store', () => {
    const { w, h } = home();
    calm(w);
    dig(w, h);
    w.g().apply([{ resident: 'h_01' }]);
    w.state.res['r_05'] = 20;
    const job = w.view(h).residents[0]!.jobs.find((j) => j.id === 'x_204');
    expect(job).toBeDefined();
    expect(w.cmd(h, { c: 'job', who: 'h_01', id: 'x_204' }).ok).toBe(true);
    const water = w.state.res['r_04']!;
    w.now += 2 * 60 * MIN;
    settleWork(w.g());
    expect(w.state.res['r_04']).toBeLessThan(water);
    expect(w.state.garden!.wetUntil).toBeGreaterThan(w.now);
  });

  it('a bed tells what grows, how it is drawn, what it gives and what speeds it; all ripe beds are gathered at once', () => {
    const { w, h, m } = home();
    calm(w);
    dig(w, h);
    w.state.res['r_50'] = 4;
    w.state.res['r_30'] = 2;
    expect(w.cmd(h, { c: 'plant', bed: 0, crop: 'c_garlic' }).ok).toBe(true);
    expect(w.cmd(h, { c: 'plant', bed: 1, crop: 'c_thyme' }).ok).toBe(true);
    let gv = w.view(h).garden!;
    const bed = gv.beds[0]!.crop!;
    expect(bed.look).toBe('garlic');
    expect(bed.stages).toHaveLength(4);
    expect(bed.gives).toMatch(/3–4/);
    expect(gv.seeds.every((s) => !!s.look)).toBe(true);
    expect(gv.why).toEqual([]);
    expect(w.cmd(h, { c: 'act', id: 'x_204' }).ok).toBe(true);
    expect(w.view(h).garden!.why.map((x) => x.x)).toEqual([1.5]);
    w.state.weather = { id: 'w_frost', until: w.now + 600 * MIN, next: 'w_clear' };
    expect(w.view(h).garden!.why.map((x) => x.x)).toEqual([1.5, 0.5]);
    calm(w);
    // nothing ripe yet: nothing to gather
    expect(w.cmd(h, { c: 'harvest', bed: -1 }).ok).toBe(false);
    w.advance(200 * MIN);
    gv = w.view(h).garden!;
    expect(gv.beds.every((b) => b.ready)).toBe(true);
    const garlic = w.state.res['r_50']!;
    const thyme = w.state.res['r_30'] ?? 0;
    expect(w.cmd(h, { c: 'harvest', bed: -1 }).ok).toBe(true);
    expect(w.view(h).garden!.beds.every((b) => !b.crop)).toBe(true);
    expect(w.state.res['r_50']!).toBeGreaterThanOrEqual(garlic + 3);
    expect(w.state.res['r_30']!).toBeGreaterThanOrEqual(thyme + 3);
    // away from home the beds cannot be reached
    w.state.players[m].at = 'a_02';
    expect(w.cmd(m, { c: 'harvest', bed: -1 }).ok).toBe(false);
  });

  it('what grows is good for something: the dishes show up once their crop has been seen', () => {
    const { w, h } = home();
    dig(w, h);
    w.state.flags['built:x_107'] = 1;
    const ids = () => w.view(h).groups.flatMap((g) => g.entries).map((e) => e.id);
    expect(ids()).toContain('x_205'); // garlic is in the store already
    expect(ids()).not.toContain('x_206');
    w.g().addRes('r_52', 2);
    expect(ids()).toContain('x_206');
  });
});
