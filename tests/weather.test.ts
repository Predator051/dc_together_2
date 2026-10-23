import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { chillRate, dryOf, soakByPlace } from '../server/src/engine/needs.js';
import { travelTime } from '../server/src/engine/travel.js';
import { pair, World } from './world.js';

const MIN = 60_000;

/** After the hut, needs counting: both at home, the sky calm. */
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

function setSky(w: World, id: string): void {
  w.state.weather = { id, until: w.now + 60 * MIN, next: 'w_clear' };
}

describe('the weather', () => {
  it('begins with the hut, clear; the forecast comes true when its time is up', () => {
    const r = pair(3);
    r.w.advance(1000);
    expect(r.w.state.weather).toBeUndefined();
    expect(r.w.view(r.h).weather).toBeNull();
    r.w.state.flags.p2_hut = 1;
    r.w.advance(1000);
    const st = r.w.state.weather!;
    expect(st.id).toBe('w_clear');
    expect(st.next).not.toBe('w_clear');
    expect(st.until - r.w.now).toBeGreaterThanOrEqual(14 * MIN);
    const next = st.next;
    r.w.now = st.until;
    r.w.advance(1000);
    expect(r.w.state.weather!.id).toBe(next);
    expect(r.w.state.log.some((l) => l.kind === 'system' && Object.values(l.text).some((t) => t && t.length > 10))).toBe(true);
  });

  it('waits while nobody plays and during a joint scene, then turns once', () => {
    const { w, h, m } = home();
    const st = w.state.weather!;
    const was = st.id;
    w.online(h, false);
    w.online(m, false);
    w.now = st.until + 10 * 60 * MIN;
    w.advance(1000);
    expect(w.state.weather!.id).toBe(was);
    w.online(h);
    w.advance(1000);
    expect(w.state.weather!.id).not.toBe(was);
    expect(w.state.weather!.until).toBeGreaterThan(w.now);
  });

  it('a supper brings a new day and new weather', () => {
    const { w } = home();
    const st = w.state.weather!;
    const next = st.next;
    w.g().apply([{ advanceDay: true }]);
    expect(w.state.weather!.id).toBe(next);
  });

  it('counts only outside: at home and under a roof the sky does not reach', () => {
    const { w, h, m } = home();
    w.state.players[m].at = 'a_02';
    setSky(w, 'w_clear');
    const calm = chillRate(w.g(), m);
    setSky(w, 'w_frost');
    expect(chillRate(w.g(), m)).toBeGreaterThan(calm);
    const atHome = chillRate(w.g(), h);
    setSky(w, 'w_clear');
    expect(chillRate(w.g(), h)).toBe(atHome);
    // a warm day warms even without a fire
    setSky(w, 'w_warm');
    expect(chillRate(w.g(), m)).toBeLessThan(0);
    // under a roof nothing counts
    const shore = w.g().ix.c.areas.find((a) => a.id === 'a_02')!;
    shore.roof = true;
    setSky(w, 'w_frost');
    expect(chillRate(w.g(), m)).toBe(calm);
    expect(w.view(m).ambient.sky).toBeNull();
    expect(w.view(m).weather!.outside).toBe(false);
    delete shore.roof;
    expect(w.view(m).ambient.sky).toBe('frost');
    expect(w.view(m).weather!.outside).toBe(true);
  });

  it('rain keeps wet clothes wet without a fire; frost keeps wet ground dry', () => {
    const { w, m } = home();
    w.state.players[m].at = 'a_02';
    setSky(w, 'w_rain');
    expect(dryOf(w.g(), m)).toBe(0);
    setSky(w, 'w_wind');
    expect(dryOf(w.g(), m)).toBe(2);
    const wetArea = w.g().ix.c.areas.find((a) => a.wet)!;
    setSky(w, 'w_frost');
    w.state.players[m].needs!.wet = 0;
    soakByPlace(w.g(), m, wetArea.id);
    expect(w.state.players[m].needs!.wet).toBe(0);
    setSky(w, 'w_clear');
    soakByPlace(w.g(), m, wetArea.id);
    expect(w.state.players[m].needs!.wet).toBeGreaterThan(0);
  });

  it('walking takes longer in a storm, shorter over frozen ground', () => {
    const { w, h } = home();
    setSky(w, 'w_clear');
    const t = travelTime(w.g(), h, 'a_01', 'a_02');
    setSky(w, 'w_storm');
    expect(travelTime(w.g(), h, 'a_01', 'a_02')).toBeGreaterThan(t);
    setSky(w, 'w_frost');
    expect(travelTime(w.g(), h, 'a_01', 'a_02')).toBeLessThan(t);
  });

  it('some weather favours some work: in the rain the crayfish come one more', () => {
    const { w, h } = home();
    const rain = w.g().ix.c.weather!.kinds.find((k) => k.id === 'w_rain')!;
    const p = rain.bonus!.p;
    rain.bonus!.p = 0.999999;
    try {
      setSky(w, 'w_rain');
      w.state.players[h].at = 'a_02';
      for (let i = 0; i < 6; i++) {
        const before = Object.values(w.state.players[h].bag).reduce((s, n) => s + n, 0);
        expect(w.cmd(h, { c: 'act', id: 'x_03' }).ok).toBe(true);
        const after = Object.values(w.state.players[h].bag).reduce((s, n) => s + n, 0);
        expect(after - before).toBeGreaterThanOrEqual(2);
        w.rest(h);
        w.state.players[h].hp = w.state.players[h].hpMax;
      }
    } finally {
      rain.bonus!.p = p;
    }
  });

  it('the view tells what it does and what comes next', () => {
    const { w, h } = home();
    setSky(w, 'w_rain');
    const v = w.view(h).weather!;
    expect(v.name).toBe('Дощ');
    expect(v.next).toBe('Ясно');
    expect(v.effects.some((e) => e.good)).toBe(true);
    expect(v.effects.some((e) => !e.good)).toBe(true);
    expect(v.effects.every((e) => !e.text.includes('{n}'))).toBe(true);
    // the home yard shows the sky, but the hero is under the roof
    expect(w.view(h).ambient.sky).toBe('rain');
    expect(v.outside).toBe(false);
    setSky(w, 'w_clear');
    expect(w.view(h).weather!.effects).toEqual([]);
  });
});
