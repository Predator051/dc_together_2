import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { NEED } from '../shared/src/rules.js';
import { heroOf } from '../server/src/engine/hero.js';
import { pair, World } from './world.js';

const MIN = 60_000;
const SOUP = 'u_08';
const FISH = 'u_09';
const TEA = 'u_10';
const FOOD = 'r_05';
const WOOD = 'r_01';
const FLINT = 'r_21';

/** After the hut: both at home by a burning fire, the needs counting. */
function home(seed = 3): { w: World; h: PlayerId; m: PlayerId } {
  const r = pair(seed);
  const s = r.w.state;
  s.flags.p2_hut = 1;
  s.stove = { lit: true, fuel: 60 * MIN };
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_01';
    s.players[pid].busy = null;
  }
  r.w.advance(10);
  return r;
}

function calm(w: World): void {
  for (const a of w.g().ix.c.areas) a.ambush = 0;
}

describe('needs', () => {
  it('begin with the hut, with a snack just eaten', () => {
    const { w, h } = pair(3);
    w.advance(10);
    expect(w.state.players[h].needs).toBeNull();
    expect(w.view(h).needs).toBeNull();
    w.state.flags.p2_hut = 1;
    w.advance(10);
    const n = w.view(h).needs!;
    expect(n.meals.map((m) => m.id)).toEqual([FOOD]);
    expect(n.effects.some((e) => e.id === 'fed')).toBe(true);
  });

  it('dishes fill slots and give health; hunger takes it away and slows healing', () => {
    const { w, h } = home();
    const p = w.state.players[h];
    const base = p.hpMax;
    w.advance(9 * MIN); // the snack is gone
    expect(w.view(h).needs!.effects.some((e) => e.id === 'hungry')).toBe(true);
    expect(p.hpMax).toBe(base - 2 + NEED.hunger.hp);
    // hungry: wounds close slower (warm by the home fire: ×1.5, hungry: ×0.5 → a point in 20 s)
    p.hp = 5;
    w.advance(60_000);
    expect(p.hp).toBe(8);
    w.state.res[SOUP] = 2;
    w.state.res[FISH] = 2;
    expect(w.cmd(h, { c: 'eat', id: SOUP }).ok).toBe(true);
    expect(w.state.res[SOUP]).toBe(1);
    // the same dish again: not until it fades
    expect(w.cmd(h, { c: 'eat', id: SOUP }).ok).toBe(false);
    expect(w.cmd(h, { c: 'eat', id: FISH }).ok).toBe(true);
    expect(p.hpMax).toBe(base - 2 + 4 + 3);
    // a fading dish gives half and may be eaten again
    w.advance(10 * MIN);
    const soup = w.view(h).needs!.meals.find((m) => m.id === SOUP)!;
    expect(soup.left).toBeLessThan(soup.fadeAt);
    expect(p.hpMax).toBe(base - 2 + 2 + 3);
    expect(w.cmd(h, { c: 'eat', id: SOUP }).ok).toBe(true);
    expect(p.hpMax).toBe(base - 2 + 4 + 3);
  });

  it('three slots at most', () => {
    const { w, h } = home();
    w.state.res[SOUP] = 1;
    w.state.res[FISH] = 1;
    w.state.res['r_29'] = 1;
    w.state.flags.p2_act2 = 1;
    expect(w.cmd(h, { c: 'eat', id: SOUP }).ok).toBe(true);
    expect(w.cmd(h, { c: 'eat', id: FISH }).ok).toBe(true);
    expect(w.state.players[h].needs!.meals.length).toBe(3);
    expect(w.cmd(h, { c: 'eat', id: 'r_29' }).ok).toBe(false);
  });

  it('wet and evening make cold; cold hurts aim; a fire and warm clothes help', () => {
    const { w, h } = home();
    calm(w);
    const p = w.state.players[h];
    p.at = 'a_02';
    w.state.meta.dayAt = w.now - 30 * MIN; // evening
    w.state.players[h].needs!.wet = NEED.wetFor;
    const hit = heroOf(w.g(), h).hit;
    w.advance(3 * MIN); // (8 + 15) a minute
    expect(w.view(h).needs!.level).toBe('cold');
    expect(heroOf(w.g(), h).hit).toBeCloseTo(hit + NEED.cold.hit);
    // a campfire: wood from the bag, the flint at home
    expect(w.cmd(h, { c: 'camp' }).ok).toBe(false);
    p.bag[WOOD] = 2;
    w.state.res[FLINT] = 1;
    expect(w.cmd(h, { c: 'camp' }).ok).toBe(true);
    expect(p.bag[WOOD] ?? 0).toBe(0);
    w.advance(2 * MIN);
    const v = w.view(h).needs!;
    expect(v.fire).toBe('camp');
    expect(v.level).not.toBe('cold');
    // the partner warms by the same fire
    const m = w.state.players[w.g().other(h)];
    m.at = 'a_02';
    expect(w.view(w.g().other(h)).needs!.fire).toBe('camp');
    // warm clothes: half the chill
    w.advance(NEED.campFor);
    p.equip.head = 'g_09';
    const r1 = w.view(h).needs!.rate;
    delete p.equip.head;
    const r0 = w.view(h).needs!.rate;
    expect(r1).toBeCloseTo(r0 * NEED.chill.resist);
  });

  it('under the home roof a cold hearth chills, but nobody freezes stiff', () => {
    const { w, h } = home();
    w.state.stove.fuel = 0;
    w.state.meta.dayAt = w.now - 30 * MIN;
    for (let i = 0; i < 40; i++) w.advance(MIN);
    expect(w.state.players[h].needs!.chill).toBe(NEED.homeMaxChill);
    expect(w.view(h).needs!.level).toBe('cold');
    // coming home frozen stiff: out of the wind, merely cold
    const p = w.state.players[h];
    p.at = 'a_02';
    p.needs!.chill = NEED.freezeAt;
    p.at = 'a_01';
    w.advance(1000);
    expect(p.needs!.chill).toBeLessThanOrEqual(NEED.homeMaxChill);
  });

  it('a hot drink warms and keeps the cold off', () => {
    const { w, h } = home();
    const p = w.state.players[h];
    p.at = 'a_02';
    p.needs!.chill = 70;
    w.state.meta.dayAt = w.now - 30 * MIN;
    p.bag[TEA] = 1;
    // a hot drink is for the cold, not for wounds: full health does not stop it
    p.hp = p.hpMax;
    const r0 = w.view(h).needs!.rate;
    expect(w.cmd(h, { c: 'use', id: TEA }).ok).toBe(true);
    expect(p.needs!.chill).toBe(20);
    expect(w.view(h).needs!.rate).toBeCloseTo(r0 * NEED.chill.drink);
  });

  it('getting wet: wading, and wet places unless the boots keep feet dry', () => {
    const { w, h } = home();
    calm(w);
    const p = w.state.players[h];
    p.at = 'a_02';
    p.equip.weapon = 'g_03';
    expect(w.cmd(h, { c: 'act', id: 'x_05' }).ok).toBe(true);
    expect(p.needs!.wet).toBe(NEED.wetFor);
    w.rest(h);
    p.needs!.wet = 0;
    w.state.flags['done:s_09'] = 1;
    w.state.flags['seen:a_08'] = 1;
    p.at = 'a_07';
    expect(w.cmd(h, { c: 'go', to: 'a_08' }).ok).toBe(true);
    w.rest(h);
    expect(p.at).toBe('a_08');
    expect(p.needs!.wet).toBeGreaterThan(0);
    expect(w.state.flags.wet_feet).toBe(1);
    p.needs!.wet = 0;
    p.equip.legs = 'g_27';
    expect(w.cmd(h, { c: 'go', to: 'a_07' }).ok).toBe(true);
    w.rest(h);
    expect(w.cmd(h, { c: 'go', to: 'a_08' }).ok).toBe(true);
    w.rest(h);
    expect(p.needs!.wet).toBe(0);
  });

  it('rest by the home fire: longer the cosier; rested works faster, tired slower', () => {
    const { w, h } = home();
    const p = w.state.players[h];
    const a = w.g().ix.actions.get('x_11')!;
    const t0 = w.g().actionTime(a, h);
    expect(w.view(h).needs!.rest.minutes).toBe(NEED.restBase + 2 * NEED.restPer);
    w.state.flags['built:x_111'] = 1;
    expect(w.view(h).needs!.rest.minutes).toBe(NEED.restBase + 3 * NEED.restPer);
    expect(w.cmd(h, { c: 'rest' }).ok).toBe(true);
    expect(p.needs!.rested).toBe((NEED.restBase + 3 * NEED.restPer) * MIN);
    expect(w.g().actionTime(a, h)).toBe(Math.round(t0 * NEED.rested.pace));
    // skills grow faster
    const xp = p.skills.craft;
    w.rest(h);
    w.state.res['r_02'] = 10;
    expect(w.cmd(h, { c: 'act', id: 'x_11' }).ok).toBe(true);
    expect(p.skills.craft - xp).toBeCloseTo(NEED.rested.skill);
    // long without rest: tired
    p.needs!.rested = 0;
    p.needs!.awake = NEED.tiredAfter - 1000;
    w.advance(2000);
    expect(w.view(h).needs!.effects.some((e) => e.id === 'tired')).toBe(true);
    expect(w.g().actionTime(a, h)).toBe(Math.round(t0 * NEED.tired.pace));
    // a cold hearth is no place to rest
    w.state.stove.fuel = 0;
    expect(w.cmd(h, { c: 'rest' }).ok).toBe(false);
  });

  it('time stands still while away from the game', () => {
    const { w, h } = home();
    const left = w.state.players[h].needs!.meals[0]!.left;
    w.online(h, false);
    w.advance(30 * MIN);
    w.online(h, true);
    w.advance(10);
    expect(w.state.players[h].needs!.meals[0]?.left).toBeGreaterThan(left - 1000);
  });

  it('a supper and a night: rested, warm and dry', () => {
    const { w, h } = home();
    const n = w.state.players[h].needs!;
    n.chill = 80;
    n.wet = MIN;
    n.awake = NEED.tiredAfter;
    w.g().apply([{ advanceDay: true }]);
    expect(n.chill).toBe(0);
    expect(n.wet).toBe(0);
    expect(n.rested).toBeGreaterThan(0);
    expect(n.awake).toBe(0);
  });
});
