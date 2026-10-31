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
