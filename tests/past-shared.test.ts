import { describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import { pasts, sharedPast } from '../content/past/index.js';
import type { PlayerId } from '../shared/src/content.js';
import type { PlayerView, ServerMsg } from '../shared/src/protocol.js';
import type { WorldState } from '../shared/src/state.js';
import { GameServer, type Conn } from '../server/src/game-server.js';
import { ContentIndex, Game, newWorld } from '../server/src/engine/index.js';
import { enterShared } from '../server/src/past.js';
import { Storage } from '../server/src/storage.js';
import { validateContent } from '../server/src/validate.js';
import { autoplay, describe as show } from './harness.js';
import { World } from './world.js';

// The past the two share (`.design/pasts-later.md` §2): it opens once both have walked their own road to its end;
// each comes in from the fire with the strength their own past left them; joint scenes wait for both, as at home.

class FakeConn implements Conn {
  pid: PlayerId | null = null;
  ip = '127.0.0.1';
  got: ServerMsg[] = [];
  send(m: ServerMsg) {
    this.got.push(m);
  }
  close() {}
  view(): PlayerView {
    const v = [...this.got].reverse().find((m) => m.t === 'view');
    return (v as { v: PlayerView }).v;
  }
  ack() {
    return [...this.got].reverse().find((m) => m.t === 'ack') as { ok: boolean; text?: string };
  }
}

/** A personal past walked to the end of chapter four, the hero grown in it. */
function walked(role: 'hunter' | 'maker', pid: PlayerId, level: number): WorldState {
  const c = pasts[role]!;
  const s = newWorld(c, 5, 1_800_000_000_000);
  s.solo = true;
  const p = s.players[pid];
  Object.assign(p, { joined: true, name: role, gender: role === 'hunter' ? 'f' : 'm', role, level, xp: 2000 });
  s.flags[role === 'hunter' ? 'ph_ch4_done' : 'pm_ch4_done'] = 1;
  if (role === 'maker') s.flags.pm_tags = 1;
  p.equip = role === 'hunter' ? { weapon: 'ph_g2', body: 'ph_g3' } : { weapon: 'pm_g1', body: 'pm_g3' };
  return s;
}

function server() {
  let now = 1_800_000_000_000;
  const gs = new GameServer({ content, storage: new Storage(':memory:'), clock: () => now, inviteCode: 'TEST-1234', seed: 9, pasts, pastShared: sharedPast });
  const h = new FakeConn();
  const m = new FakeConn();
  for (const [c, name, gender, role] of [
    [h, 'Марко', 'm', 'hunter'],
    [m, 'Оксана', 'f', 'maker'],
  ] as const) {
    gs.connect(c);
    gs.handle(c, JSON.stringify({ t: 'join', code: 'TEST-1234', name, gender, role }));
  }
  for (const p of Object.values(gs.state.players)) {
    p.at = gs.ix.homeArea;
    p.busy = null;
  }
  gs.state.scene = null;
  gs.broadcast();
  const cmd = (c: FakeConn, cmd: object) => gs.handle(c, JSON.stringify({ t: 'cmd', cmd, seq: 1 }));
  return { gs, h, m, cmd, tick: (ms: number) => ((now += ms), gs.tick()) };
}

describe('the shared past', () => {
  it('is whole by the validator', () => {
    expect(validateContent(sharedPast).errors).toEqual([]);
  });

  it('opens only when both have walked their own road; both come in with what they had', () => {
    const { gs, h, m, cmd } = server();
    expect(h.view().together).toBeUndefined();
    gs.state.past = { [h.pid!]: walked('hunter', h.pid!, 9) };
    gs.broadcast();
    expect(h.view().together).toBeUndefined(); // the maker's road is not walked yet
    gs.state.past[m.pid!] = walked('maker', m.pid!, 10);
    gs.state.flags.p2_act4_done = 1;
    gs.broadcast();
    expect(h.view().together).toEqual({ can: true, mateIn: false });

    cmd(h, { c: 'remember', on: true, together: true });
    expect(h.ack().ok).toBe(true);
    const s = gs.state.pastShared!;
    expect(s.players[h.pid!]).toMatchObject({ name: 'Марко', role: 'hunter', level: 9 });
    expect(s.players[m.pid!]).toMatchObject({ name: 'Оксана', role: 'maker', level: 10 });
    expect(s.players[h.pid!].equip.weapon).toBe('ph_g2');
    expect(s.flags.pm_tags).toBe(1); // what the maker lived through alone is known here
    expect(h.view().past).toEqual({ title: sharedPast.pastTitle, shared: true });
    expect(m.view().together).toEqual({ can: true, mateIn: true });

    // the meeting is a joint scene: alone, it waits
    const meet = h.view().groups.flatMap((g) => g.entries).find((e) => e.id === 'ps_s01')!;
    expect(meet).toBeDefined();
    cmd(h, { c: 'act', id: 'ps_s01' });
    expect(s.scene).toBeFalsy();

    cmd(m, { c: 'remember', on: true, together: true });
    expect(m.ack().ok).toBe(true);
    expect(gs.state.pastShared).toBe(s);
    s.proposal = null;
    cmd(h, { c: 'act', id: 'ps_s01' });
    cmd(m, { c: 'accept' });
    expect(s.scene?.id).toBe('ps_s01');
    expect(gs.state.scene).toBeNull();

    // back to the fire: the shared world keeps where it was
    cmd(h, { c: 'remember', on: false });
    expect(h.ack().ok).toBe(true);
    expect(gs.state.players[h.pid!].together).toBe(false);
    expect(s.scene?.id).toBe('ps_s01');
  });

  it('what the two lived through together is read by the main story', () => {
    const w = new World(1);
    w.join('Марко', 'm', 'hunter');
    w.join('Оксана', 'f', 'maker');
    w.state.pastShared = newWorld(sharedPast, 3, w.now);
    w.state.pastShared.flags.ps_carts_followed = 1;
    const g = w.g();
    expect(g.test({ past: 'ps_carts_followed' }, 'p1')).toBe(true);
    expect(g.test({ past: 'ps_carts_followed', who: 'both' })).toBe(true);
    expect(g.test({ past: 'ps_carts_left' }, 'p1')).toBe(false);
  });
});

describe('chapter five, played by two bots', () => {
  it('the meeting, the grey carts, the ford: about an hour and a half for two people', { timeout: 600_000 }, () => {
    const main = new World(1);
    main.join('Марко', 'm', 'hunter');
    main.join('Оксана', 'f', 'maker');
    main.state.past = { p1: walked('hunter', 'p1', 9), p2: walked('maker', 'p2', 9) };
    main.state.flags.p2_act4_done = 1;
    const ix = new ContentIndex(sharedPast);
    enterShared(main.state, 'p1', ix, main.now, content.storyFlags);
    enterShared(main.state, 'p2', ix, main.now, content.storyFlags);
    const w = new World(1, sharedPast);
    w.state = main.state.pastShared!;
    w.now = main.now;
    new Game(ix, w.state, w.now).setOnline('p1', true);
    const r = autoplay({}, {}, { from: w, content: sharedPast, until: (x) => !!x.state.flags.ps_ch5_done && !x.state.scene, maxSteps: 120000, stallLimit: 15000 });
    if (!r.done) console.log(r.reason, show(r.world));
    expect(r.done).toBe(true);
    const minutes = r.gameTimeMs / 60000;
    console.log('shared chapter five', Math.round(minutes), 'defeats', r.defeats, 'level', r.world.state.players.p1.level, r.world.state.players.p2.level);
    for (const sc of ['ps_s01', 'ps_s02', 'ps_s03']) expect(r.world.state.flags[`done:${sc}`], sc).toBe(1);
    expect(minutes).toBeGreaterThan(12);
    expect(minutes).toBeLessThan(60);
  });
});

/** The shared past from the ford on (chapter five behind), both heroes in it. */
function atFord(level = 10): World {
  const main = new World(1);
  main.join('Марко', 'm', 'hunter');
  main.join('Оксана', 'f', 'maker');
  main.state.past = { p1: walked('hunter', 'p1', level), p2: walked('maker', 'p2', level) };
  main.state.flags.p2_act4_done = 1;
  const ix = new ContentIndex(sharedPast);
  enterShared(main.state, 'p1', ix, main.now, content.storyFlags);
  enterShared(main.state, 'p2', ix, main.now, content.storyFlags);
  const w = new World(1, sharedPast);
  w.state = main.state.pastShared!;
  w.now = main.now;
  for (const f of ['ps_met', 'ps_carts_done', 'ps_carts_left', 'ps_ch5_done', 'done:ps_s01', 'done:ps_s02', 'done:ps_s03']) w.state.flags[f] = 1;
  w.state.flags.main_act = 5;
  for (const pid of ['p1', 'p2'] as const) w.state.players[pid].at = 'ps_a3';
  new Game(ix, w.state, w.now).setOnline('p1', true);
  return w;
}

describe('chapters six and seven, played by two bots', () => {
  it('the village: home moves to the widow, five households, the gathering', { timeout: 900_000 }, () => {
    const w = atFord();
    const r = autoplay({}, {}, { from: w, content: sharedPast, until: (x) => !!x.state.flags.ps_ch6_done && !x.state.scene, maxSteps: 300000, stallLimit: 20000 });
    if (!r.done) console.log(r.reason, show(r.world));
    expect(r.done).toBe(true);
    const s = r.world.state;
    const minutes = r.gameTimeMs / 60000;
    console.log('shared chapter six', Math.round(minutes), 'defeats', r.defeats, 'voices', s.flags.ps_voices, 'level', s.players.p1.level, s.players.p2.level);
    for (const sc of ['ps_s04', 'ps_s05', 'ps_s06', 'ps_s07', 'ps_s09', 'ps_s10']) expect(s.flags[`done:${sc}`], sc).toBe(1);
    expect(new Game(new ContentIndex(sharedPast), s, r.world.now).homeArea).toBe('ps_a4');
    expect(minutes).toBeGreaterThan(15);
    expect(minutes).toBeLessThan(60);
  });

  it('the first snow waits for the main story, then ends where the first part begins', { timeout: 600_000 }, () => {
    const w = atFord();
    for (const f of ['ps_hanna', 'ps_elder_met', 'ps_feast_done', 'ps_bells_done', 'ps_gathering_done', 'ps_ch6_done', 'ps_bow_asked', 'ps_bow_strung']) w.state.flags[f] = 1;
    for (const sc of ['ps_s04', 'ps_s05', 'ps_s06', 'ps_s07', 'ps_s08', 'ps_s09', 'ps_s10']) w.state.flags[`done:${sc}`] = 1;
    for (const pid of ['p1', 'p2'] as const) w.state.players[pid].at = 'ps_a4';
    const g = new Game(new ContentIndex(sharedPast), w.state, w.now);
    expect(g.test({ all: [{ flag: 'ps_ch6_done' }, { mainFlag: 'p2_act6_done' }] })).toBe(false);
    w.state.mainFlags = { ...(w.state.mainFlags ?? {}), p2_act6_done: 1 };
    const r = autoplay({}, {}, { from: w, content: sharedPast, until: (x) => !!x.state.flags.ps_ch7_done && !x.state.scene, maxSteps: 120000, stallLimit: 15000 });
    if (!r.done) console.log(r.reason, show(r.world));
    expect(r.done).toBe(true);
    const minutes = r.gameTimeMs / 60000;
    console.log('shared chapter seven', Math.round(minutes));
    expect(r.world.state.flags.ps_latch).toBe(1);
    expect(minutes).toBeGreaterThan(6);
  });
});
