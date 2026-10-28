import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import { Rng } from '../shared/src/rng.js';
import { levelFromXp, xpForLevel } from '../shared/src/rules.js';
import { bagCap, bagLoad, gainXp } from '../server/src/engine/hero.js';
import { settleWork } from '../server/src/engine/travel.js';
import { pair, World } from './world.js';

/** After the hut: both at home. */
function home(seed = 2): { w: World; h: PlayerId; m: PlayerId } {
  const r = pair(seed);
  const s = r.w.state;
  s.flags.p2_hut = 1;
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_01';
    s.players[pid].busy = null;
  }
  return r;
}

/** Remove random attacks for a calm test. */
function calm(w: World): void {
  for (const a of w.g().ix.c.areas) a.ambush = 0;
}

describe('the hero', () => {
  it('levels follow the curve; each level gives a point, even levels offer perks', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelFromXp(xpForLevel(4))).toBe(4);
    expect(levelFromXp(xpForLevel(4) - 1)).toBe(3);
    const { w, h } = home();
    const p = w.state.players[h];
    gainXp(w.g(), h, xpForLevel(3));
    expect(p.level).toBe(3);
    expect(p.points).toBe(2);
    expect(p.perkChoice?.length).toBeGreaterThan(1);
    const agi = p.stats.agi;
    expect(w.cmd(h, { c: 'stat', id: 'agi' }).ok).toBe(true);
    expect(p.stats.agi).toBe(agi + 1);
    expect(w.cmd(h, { c: 'stat', id: 'luck' }).ok).toBe(false);
    const perk = p.perkChoice![0]!;
    expect(w.cmd(h, { c: 'perk', id: perk }).ok).toBe(true);
    expect(p.perks).toContain(perk);
    expect(p.perkChoice).toBeNull();
  });

  it('gear goes on at home only, comes from the shared store, and changes the numbers', () => {
    const { w, h } = home();
    w.state.res['g_08'] = 1;
    const hp0 = w.view(h).hero.derived.hpMax;
    expect(w.cmd(h, { c: 'equip', slot: 'body', id: 'g_08' }).ok).toBe(true);
    expect(w.state.res['g_08']).toBe(0);
    expect(w.view(h).hero.derived.armor).toBe(1);
    expect(w.view(h).hero.derived.hpMax).toBeGreaterThan(hp0);
    expect(w.cmd(h, { c: 'equip', slot: 'legs', id: 'g_08' }).ok).toBe(false); // wrong slot
    w.state.players[h].at = 'a_02';
    expect(w.cmd(h, { c: 'equip', slot: 'body', id: null }).ok).toBe(false); // not at home
    w.state.players[h].at = 'a_01';
    expect(w.cmd(h, { c: 'equip', slot: 'body', id: null }).ok).toBe(true);
    expect(w.state.res['g_08']).toBe(1);
  });

  it('outfits: remember, then change in one go (skipping what the partner wears)', () => {
    const { w, h, m } = home();
    Object.assign(w.state.res, { g_02: 1, g_05: 1, g_01: 1 });
    w.cmd(h, { c: 'equip', slot: 'weapon', id: 'g_02' });
    w.cmd(h, { c: 'equip', slot: 'body', id: 'g_05' });
    w.cmd(h, { c: 'outfit', name: 'fight', save: true });
    w.cmd(h, { c: 'equip', slot: 'weapon', id: 'g_01' });
    w.cmd(h, { c: 'equip', slot: 'body', id: null });
    w.cmd(h, { c: 'outfit', name: 'work', save: true });
    expect(w.cmd(h, { c: 'outfit', name: 'fight', save: false }).ok).toBe(true);
    expect(w.state.players[h].equip).toEqual({ weapon: 'g_02', body: 'g_05' });
    // the partner takes the knife: putting on «work» skips it
    w.cmd(m, { c: 'equip', slot: 'weapon', id: 'g_01' });
    w.cmd(h, { c: 'outfit', name: 'work', save: false });
    expect(w.state.players[h].equip.weapon).toBeUndefined();
  });

  it('the bag has a weight limit; things that do not fit stay behind, and a bigger basket becomes worth making', () => {
    const { w, m } = home();
    calm(w);
    w.state.players[m].equip = { weapon: 'g_01' };
    w.state.players[m].at = 'a_03';
    const cap = bagCap(w.g(), m);
    for (let i = 0; i < 40; i++) {
      w.cmd(m, { c: 'act', id: 'x_06' });
      w.rest(m);
    }
    expect(bagLoad(w.g(), m)).toBeLessThanOrEqual(cap);
    expect(w.state.flags.bag_full).toBe(1);
    // home: the bag is emptied into the store
    w.cmd(m, { c: 'go', to: 'a_01' });
    w.rest(m);
    expect(w.state.res['r_02']).toBeGreaterThan(0);
    expect(w.state.players[m].bag['r_02'] ?? 0).toBe(0);
  });

  it('things to take along are packed at home and stay packed', () => {
    const { w, h } = home();
    w.state.res['u_02'] = 3;
    expect(w.cmd(h, { c: 'pack', id: 'u_02', n: 2 }).ok).toBe(true);
    expect(w.state.players[h].bag['u_02']).toBe(2);
    expect(w.state.res['u_02']).toBe(1);
    w.cmd(h, { c: 'go', to: 'a_02' });
    w.rest(h);
    w.cmd(h, { c: 'go', to: 'a_01' });
    w.rest(h);
    expect(w.state.players[h].bag['u_02']).toBe(2);
    expect(w.cmd(h, { c: 'pack', id: 'u_02', n: -2 }).ok).toBe(true);
    expect(w.state.res['u_02']).toBe(3);
  });

  it("a work shows the mark of what it yields, so its medal can show it", () => {
    const { w, h } = home();
    const entries = w.view(h).groups.flatMap((g) => g.entries).filter((e) => e.kind === 'act');
    const withIcon = entries.filter((e) => e.icon);
    expect(withIcon.length).toBeGreaterThan(0);
    const icons = new Set<string>(w.g().ix.c.resources.flatMap((r) => (r.icon ? [r.icon] : [])));
    for (const e of withIcon) expect(icons.has(e.icon!), e.id).toBe(true);
  });

  it('a way out shows the mark of the place it leads to, as the map does', () => {
    const { w, h } = home();
    const ways = w.view(h).groups.flatMap((g) => g.entries).filter((e) => e.kind === 'go');
    expect(ways.length).toBeGreaterThan(0);
    for (const e of ways) expect(e.icon, e.id).toBe(`@${w.g().ix.c.areas.find((a) => `go:${a.id}` === e.id)!.scene}`);
  });

  it('a recipe nobody needs any more disappears; one that needs a tool says which', () => {
    const { w, h } = home();
    w.state.flags['built:x_16'] = 1;
    const ids = () => w.view(h).groups.flatMap((g) => g.entries).map((e) => e.id);
    expect(ids()).toContain('x_19');
    w.state.res['g_05'] = 2;
    expect(ids()).not.toContain('x_19');
    w.state.players[h].at = 'a_03';
    const reed = w.view(h).groups.flatMap((g) => g.entries).find((e) => e.id === 'x_06')!;
    expect(reed.enabled).toBe(false);
    expect(reed.reason).toContain('ніж');
  });

  it('rest heals: faster by the fire at home', () => {
    const { w, h, m } = home();
    w.state.players[h].hp = 5;
    w.state.players[m].hp = 5;
    w.state.players[m].at = 'a_02';
    w.advance(1);
    w.advance(60_000);
    expect(w.state.players[h].hp).toBeGreaterThan(w.state.players[m].hp);
    expect(w.state.players[m].hp).toBeGreaterThan(5);
  });
});

describe('the map', () => {
  it('a new place must be scouted together; then anyone may walk there alone', () => {
    const { w, h, m } = home();
    calm(w);
    expect(w.cmd(h, { c: 'go', to: 'a_04' }).ok).toBe(false);
    const node = w.view(h).map.nodes.find((n) => n.id === 'a_04')!;
    expect(node.known).toBe(false);
    expect(node.scout?.id).toBe('s_04');
    w.state.players[m].online = false;
    expect(w.view(h).map.nodes.find((n) => n.id === 'a_04')!.scout!.enabled).toBe(false);
    w.state.players[m].online = true;
    expect(w.cmd(h, { c: 'act', id: 's_04' }).ok).toBe(true);
    w.cmd(m, { c: 'accept' });
    // the scene is pictured by the place it scouts
    expect(w.view(h).scene?.place).toBe(w.g().ix.c.areas.find((a) => a.id === 'a_04')!.scene);
    for (let i = 0; i < 6 && w.state.scene; i++) for (const pid of [h, m]) w.cmd(pid, { c: 'next' });
    expect(w.state.players[h].at).toBe('a_04');
    w.cmd(h, { c: 'go', to: 'a_01' });
    w.rest(h);
    expect(w.cmd(h, { c: 'go', to: 'a_04' }).ok).toBe(true);
  });

  it('walking takes time, a heavy bag makes it longer, and walking is locked during a scene', () => {
    const { w, h } = home();
    calm(w);
    const v0 = w.view(h).map.nodes.find((n) => n.id === 'a_02')!.go!.time;
    w.state.players[h].bag = { r_14: 6 };
    const v1 = w.view(h).map.nodes.find((n) => n.id === 'a_02')!.go!.time;
    expect(v1).toBeGreaterThan(v0);
    w.state.players[h].bag = {};
    expect(w.cmd(h, { c: 'go', to: 'a_02' }).ok).toBe(true);
    expect(w.view(h).map.travel?.to).toBe('a_02');
    expect(w.cmd(h, { c: 'act', id: 'x_02' }).ok).toBe(false);
    w.rest(h);
    expect(w.state.players[h].at).toBe('a_02');
  });

  it('a far place is reached through the near ones: the walks add up, the bag stays packed on the way', () => {
    const { w, h, m } = home();
    calm(w);
    for (const f of ['seen:a_04', 'seen:a_07']) w.state.flags[f] = 1;
    w.state.players[h].at = 'a_02';
    w.state.players[h].bag = { u_03: 1 };
    const node = w.view(h).map.nodes.find((n) => n.id === 'a_07')!;
    expect(node.go?.via).toEqual(['a_01', 'a_04']);
    const legs = ['a_01', 'a_04'].map((id) => w.view(h).map.nodes.find((n) => n.id === id)!.go!.time);
    expect(legs[0]).toBeLessThan(node.go!.time);
    const t0 = w.now;
    expect(w.cmd(h, { c: 'go', to: 'a_07' }).ok).toBe(true);
    const v = w.view(h);
    expect(v.map.travel?.to).toBe('a_07');
    // the map draws the walk leg by leg: the stretch walked now, the stops still ahead
    expect(v.map.legs.me).toMatchObject({ from: 'a_02', to: 'a_01', since: t0, next: ['a_04', 'a_07'] });
    expect(w.view(m).map.legs.mate).toMatchObject({ from: 'a_02', to: 'a_01' });
    expect(w.view(m).map.legs.me).toBeNull();
    expect(v.busyUntil).toBe(t0 + node.go!.time);
    expect(w.view(m).partner.busy?.until).toBe(t0 + node.go!.time);
    // halfway: at home, but just passing by
    w.advance(legs[0]! + 1);
    expect(w.state.players[h].at).toBe('a_01');
    expect(w.state.players[h].travel?.to).toBe('a_04');
    expect(w.view(h).map.legs.me).toMatchObject({ from: 'a_01', to: 'a_04', next: ['a_07'] });
    expect(w.state.players[h].bag).toEqual({ u_03: 1 });
    w.rest(h);
    expect(w.state.players[h].at).toBe('a_07');
    expect(w.state.players[h].travel).toBeNull();
    expect(w.now).toBeGreaterThanOrEqual(t0 + node.go!.time);
  });

  it('an attack on the way ends the walk where it happened', () => {
    const { w, h } = home();
    calm(w);
    for (const f of ['seen:a_04', 'seen:a_07']) w.state.flags[f] = 1;
    const flat = w.g().ix.c.areas.find((a) => a.id === 'a_04')!;
    const was = { ambush: flat.ambush, foes: flat.foes };
    flat.ambush = 100;
    flat.foes = [{ enemy: flat.foes?.[0]?.enemy ?? 'e_01', w: 1 }];
    expect(w.cmd(h, { c: 'go', to: 'a_07' }).ok).toBe(true);
    const chance = Rng.prototype.chance;
    Rng.prototype.chance = () => true;
    try {
      w.advance(30_000);
    } finally {
      Rng.prototype.chance = chance;
      Object.assign(flat, was);
    }
    const p = w.state.players[h];
    expect(p.at).toBe('a_04');
    expect(p.travel).toBeNull();
    expect(p.fight).not.toBeNull();
    expect(p.busy).toBeNull();
  });

  it('a finished action does not keep the paths locked (nothing is sent when it ends)', () => {
    const { w, h } = home();
    calm(w);
    const act = w.view(h).groups.flatMap((g) => g.entries).find((e) => e.enabled && e.kind === 'act')!;
    expect(w.cmd(h, { c: 'act', id: act.id }).ok).toBe(true);
    const v = w.view(h);
    expect(v.busyUntil).toBeGreaterThan(w.now);
    // the client sees the walk as open and waits out the busy time by its own clock
    expect(v.map.nodes.find((n) => n.id === 'a_02')!.go!.enabled).toBe(true);
    expect(v.groups.flatMap((g) => g.entries).find((e) => e.id === 'go:a_02')?.enabled).toBe(true);
    expect(w.cmd(h, { c: 'go', to: 'a_02' }).ok).toBe(false);
    w.now = v.busyUntil + 1;
    expect(w.cmd(h, { c: 'go', to: 'a_02' }).ok).toBe(true);
  });

  it('places bite back: without salt-proof boots the salt flat hurts', () => {
    const { w, m } = home();
    calm(w);
    w.state.flags['done:s_04'] = 1;
    w.state.players[m].at = 'a_04';
    const hp = w.state.players[m].hp;
    w.cmd(m, { c: 'act', id: 'x_33' });
    expect(w.state.players[m].hp).toBe(hp - 2);
    w.rest(m);
    w.state.players[m].equip.legs = 'g_06';
    const hp2 = w.state.players[m].hp;
    w.cmd(m, { c: 'act', id: 'x_33' });
    expect(w.state.players[m].hp).toBe(hp2);
  });
});

describe('the household', () => {
  it('a resident works while everyone is away, eats, and the store caps the work', () => {
    const { w, h } = home();
    w.state.flags['done:s_04'] = 1;
    w.g().apply([{ resident: 'h_01' }]);
    w.state.res['r_05'] = 10;
    const jobs = w.view(h).residents[0]!.jobs;
    expect(jobs.map((j) => j.id)).not.toContain('x_34'); // she is afraid of water
    // a work to set her to shows the mark of what it brings
    expect(jobs.some((j) => j.icon)).toBe(true);
    // cutting reeds needs a blade lying in the store
    expect(jobs.find((j) => j.id === 'x_06')?.reason).toContain('ніж');
    expect(w.cmd(h, { c: 'job', who: 'h_01', id: 'x_06' }).ok).toBe(false);
    w.state.res['g_18'] = 1;
    expect(w.cmd(h, { c: 'job', who: 'h_01', id: 'x_06' }).ok).toBe(true);
    for (const pid of ['p1', 'p2'] as PlayerId[]) w.online(pid, false);
    w.now += 2 * 3_600_000;
    settleWork(w.g());
    expect(w.state.res['r_02']).toBeGreaterThan(20);
    expect(w.state.res['r_05']).toBe(8);
    // a long absence: capped by the store, and hungry when the food runs out
    w.now += 24 * 3_600_000;
    settleWork(w.g());
    expect(w.state.res['r_02']).toBeLessThanOrEqual(w.g().cap('r_02'));
    expect(w.state.residents['h_01']!.hungry).toBe(true);
  });
});

describe('playing alone', () => {
  it('one hero alone can do the routine, but no story moves without the other', () => {
    const { w, h, m } = home(4);
    calm(w);
    w.online(m, false);
    const before = Object.keys(w.state.flags).filter((k) => k.startsWith('done:'));
    for (let i = 0; i < 60; i++) {
      const v = w.view(h);
      const e = v.groups.flatMap((g) => g.entries).find((x) => x.enabled && (x.kind === 'scene' || x.kind === 'pool'));
      expect(e).toBeUndefined();
      const act = v.groups.flatMap((g) => g.entries).find((x) => x.enabled && x.kind === 'act');
      if (act) w.cmd(h, { c: 'act', id: act.id });
      w.rest(h);
    }
    const after = Object.keys(w.state.flags).filter((k) => k.startsWith('done:'));
    expect(after).toEqual(before);
  });
});

describe('raising a capped counter', () => {
  it('a capped rise never pulls down what was raised higher', () => {
    const { w, h } = pair(3);
    const g = w.g();
    g.s.flags.trust = 5;
    g.apply([{ inc: 'trust', max: 4 }], h);
    expect(g.s.flags.trust).toBe(5);
    g.s.flags.trust = 3;
    g.apply([{ inc: 'trust', max: 4 }], h);
    g.apply([{ inc: 'trust', max: 4 }], h);
    expect(g.s.flags.trust).toBe(4);
  });
});
