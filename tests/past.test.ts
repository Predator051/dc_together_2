import { describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import type { PlayerId } from '../shared/src/content.js';
import type { PlayerView, ServerMsg } from '../shared/src/protocol.js';
import { GameServer, type Conn } from '../server/src/game-server.js';
import { Storage } from '../server/src/storage.js';
import { World } from './world.js';

// The main story stands in for both pasts: what is tested is the way in and out, not what is remembered.
const pasts = { hunter: { ...content, pastTitle: 'Минуле' }, maker: { ...content, pastTitle: 'Минуле' } };

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

function server(st = new Storage(':memory:')) {
  let now = 1_800_000_000_000;
  const gs = new GameServer({ content, storage: st, clock: () => now, inviteCode: 'TEST-1234', seed: 9, pasts });
  const h = new FakeConn();
  const m = new FakeConn();
  for (const [c, name, gender, role] of [
    [h, 'Марко', 'm', 'hunter'],
    [m, 'Оксана', 'f', 'maker'],
  ] as const) {
    gs.connect(c);
    gs.handle(c, JSON.stringify({ t: 'join', code: 'TEST-1234', name, gender, role }));
  }
  // both at home, free
  for (const p of Object.values(gs.state.players)) {
    p.at = gs.ix.homeArea;
    p.busy = null;
  }
  gs.state.scene = null;
  gs.broadcast();
  const cmd = (c: FakeConn, cmd: object) => gs.handle(c, JSON.stringify({ t: 'cmd', cmd, seq: 1 }));
  return { gs, h, m, cmd, st, tick: (ms: number) => ((now += ms), gs.tick()) };
}

describe('memories: a world of one\'s own', () => {
  it('one goes in from the fire at home; the partner sees it; commands act there, not here', () => {
    const { gs, h, m, cmd } = server();
    expect(h.view().memories).toEqual({ can: true });
    cmd(h, { c: 'remember', on: true });
    expect(h.ack().ok).toBe(true);
    const pid = h.pid!;
    expect(gs.state.players[pid].remembering).toBe(true);
    const past = gs.state.past![pid]!;
    expect(past.solo).toBe(true);
    expect(past.players[pid]).toMatchObject({ joined: true, name: 'Марко', role: 'hunter' });
    expect(h.view().past).toEqual({ title: 'Минуле' });
    expect(m.view().partner.remembering).toBe(true);
    expect(m.view().log.some((l) => l.text.includes('Згадує'))).toBe(true);

    // a work there: the past changes, the main world does not
    const first = h.view().groups.flatMap((g) => g.entries).find((e) => e.kind === 'act' && e.enabled)!;
    const mainBefore = JSON.stringify(gs.state.players[pid].cooldowns);
    cmd(h, { c: 'act', id: first.id });
    expect(h.ack().ok).toBe(true);
    expect(past.players[pid].busy).not.toBeNull();
    expect(JSON.stringify(gs.state.players[pid].cooldowns)).toBe(mainBefore);
  });

  it('not away from home, not twice; back to the fire keeps the past as it was', () => {
    const { gs, h, cmd } = server();
    const pid = h.pid!;
    gs.state.players[pid].at = 'a_02';
    gs.broadcast();
    expect(h.view().memories?.can).toBe(false);
    cmd(h, { c: 'remember', on: true });
    expect(h.ack().ok).toBe(false);
    gs.state.players[pid].at = gs.ix.homeArea;
    cmd(h, { c: 'remember', on: true });
    gs.state.past![pid]!.flags.marked = 1;
    cmd(h, { c: 'remember', on: false });
    expect(h.ack().ok).toBe(true);
    expect(gs.state.players[pid].remembering).toBe(false);
    expect(h.view().past).toBeUndefined();
    cmd(h, { c: 'remember', on: true });
    expect(gs.state.past![pid]!.flags.marked).toBe(1);
    // the past knows how far the story has gone
    expect(gs.state.past![pid]!.flags.main_act).toBe(gs.state.meta.act);
  });

  it('a together scene cannot be begun while the other remembers', () => {
    const { gs, h, m, cmd } = server();
    cmd(h, { c: 'remember', on: true });
    const g = (gs as unknown as { game(): import('../server/src/engine/index.js').Game }).game();
    const pool = gs.ix.c.pools[0]!;
    expect(g.proposalBlock(pool, m.pid!)).toContain('у спогадах');
  });

  it('the pasts are saved with the world and come back loaded', () => {
    const st = new Storage(':memory:');
    const a = server(st);
    a.cmd(a.h, { c: 'remember', on: true });
    a.gs.save();
    const b = new GameServer({ content, storage: st, clock: () => 1_800_000_100_000, pasts });
    expect(b.state.past?.[a.h.pid!]?.players[a.h.pid!].name).toBe('Марко');
  });
});

describe('a world for one', () => {
  it('a scene begins and goes on with one hero, nobody to wait for', () => {
    const w = new World(1);
    const h = w.join('Марко', 'm', 'hunter');
    w.online(h);
    w.state.solo = true;
    const g = w.g();
    g.startScene('s_01');
    g.commit();
    const sc = w.state.scene;
    expect(sc).toBeTruthy();
    expect(sc!.paused).toBe(false);
    const node = sc!.node;
    expect(w.cmd(h, { c: 'next' }).ok).toBe(true);
    expect(w.state.scene?.node !== node || !w.state.scene).toBe(true);
  });
});
