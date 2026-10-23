import { afterEach, describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import type { PlayerId } from '../shared/src/content.js';
import { ContentIndex, Game } from '../server/src/engine/index.js';
import { startServer, type Running } from '../server/src/main.js';
import { Bot } from './bot.js';
import { TestClient } from './wsclient.js';

const CODE = 'ABCD-EFGH';
const ix = new ContentIndex(content);

let running: Running | null = null;
let clock = 1_700_000_000_000;
const clients: TestClient[] = [];

async function boot(): Promise<Running> {
  clock = 1_700_000_000_000;
  running = await startServer({
    content,
    dbPath: ':memory:',
    port: 0,
    host: '127.0.0.1',
    clientDir: '/nonexistent',
    inviteCode: CODE,
    clock: () => clock,
    seed: 12345,
    autoTick: false,
  });
  return running;
}

async function client(): Promise<TestClient> {
  const c = new TestClient(`ws://127.0.0.1:${running!.port}/ws`);
  await c.open();
  clients.push(c);
  return c;
}

async function pair(): Promise<[TestClient, TestClient]> {
  const a = await client();
  await a.join(CODE, 'Марко', 'm', 'hunter');
  const b = await client();
  await b.join('abcdefgh', 'Оксана', 'f', 'maker');
  await a.waitRev(running!.game.rev);
  return [a, b];
}

async function settle(...cs: TestClient[]): Promise<void> {
  const rev = running!.game.rev;
  await Promise.all(cs.map((c) => c.waitRev(rev)));
}

function advance(ms: number): void {
  clock += ms;
  running!.game.tick();
}

/** Fresh views for everyone (time moved on without anything to broadcast). */
async function refresh(...cs: TestClient[]): Promise<void> {
  await Promise.all(
    cs.map((c) => {
      const v = c.wait('view');
      c.send({ t: 'sync' });
      return v;
    }),
  );
}

afterEach(async () => {
  for (const c of clients.splice(0)) await c.close().catch(() => {});
  if (running) await running.stop();
  running = null;
});

/** Both come to on the shore. */
async function wake(a: TestClient, b: TestClient): Promise<void> {
  for (const c of [a, b]) {
    expect((await c.cmd({ c: 'act', id: 'x_01' })).ok).toBe(true);
    advance(4000);
  }
  await settle(a, b);
}

/** The shore scene, all the way to the hut. */
async function toHut(a: TestClient, b: TestClient, pick = (o: string[]) => o[0]!): Promise<void> {
  await wake(a, b);
  expect((await a.cmd({ c: 'act', id: 's_01' })).ok).toBe(true);
  await settle(b);
  await b.cmd({ c: 'accept' });
  for (let i = 0; i < 20; i++) {
    await settle(a, b);
    const sc = a.view!.scene;
    if (!sc) break;
    if (sc.kind === 'choice') {
      await Promise.all(
        [a, b].map((c) => {
          const opts = c.view!.scene!.options!.filter((o) => o.enabled).map((o) => o.id);
          return c.cmd({ c: 'choose', id: pick(opts) });
        }),
      );
    } else await Promise.all([a.cmd({ c: 'next' }), b.cmd({ c: 'next' })]);
  }
  await settle(a, b);
}

describe('connection and access', () => {
  it('rejects wrong invite codes and a third player', async () => {
    await boot();
    const x = await client();
    const err = x.wait('err');
    x.send({ t: 'lobby', code: 'WRONG' });
    expect((await err).code).toBe('bad_code');
    await pair();
    const z = await client();
    const e2 = z.wait('err');
    z.send({ t: 'join', code: CODE, name: 'Третій', gender: 'm', role: 'hunter' });
    expect((await e2).code).toBe('slots_full');
  });

  it('rejects a taken role and bad names', async () => {
    await boot();
    const a = await client();
    await a.join(CODE, 'Марко', 'm', 'hunter');
    const b = await client();
    const e1 = b.wait('err');
    b.send({ t: 'join', code: CODE, name: 'Оксана', gender: 'f', role: 'hunter' });
    expect((await e1).code).toBe('role_taken');
    const e2 = b.wait('err');
    b.send({ t: 'join', code: CODE, name: '   ', gender: 'f', role: 'maker' });
    expect((await e2).code).toBe('bad_input');
  });

  it('rate-limits guessing', async () => {
    await boot();
    const x = await client();
    for (let i = 0; i < 20; i++) {
      const e = x.wait('err');
      x.send({ t: 'lobby', code: `NOPE${i}` });
      await e;
    }
    const e = x.wait('err');
    x.send({ t: 'lobby', code: CODE });
    expect((await e).code).toBe('rate_limited');
  });

  it('commands require authentication, and malformed commands are ignored', async () => {
    await boot();
    const x = await client();
    const e = x.wait('err');
    x.send({ t: 'cmd', cmd: { c: 'act', id: 'x_01' } });
    expect((await e).code).toBe('not_authed');
    const [a] = await pair();
    const before = running!.game.rev;
    for (const bad of [{ c: 'go' }, { c: 'equip', slot: 1, id: 'x' }, { c: 'pack', id: 'r_01', n: 1.5 }, { c: 'job', who: 'h_01', id: 5 }, { c: 'nope' }]) {
      a.send({ t: 'cmd', cmd: bad as never });
    }
    await new Promise((r) => setTimeout(r, 60));
    expect(running!.game.rev).toBe(before);
  });

  it('reconnects with a token, from another device by code, and keeps state', async () => {
    await boot();
    const [a, b] = await pair();
    await a.cmd({ c: 'act', id: 'x_01' });
    const token = a.token!;
    await a.close();
    await b.until((v) => !v.partner.online);

    const a2 = await client();
    const m = await a2.hello(token);
    expect(m.t).toBe('welcome');
    await settle(a2, b);
    expect(a2.view!.me.name).toBe('Марко');
    expect(a2.view!.log.some((l) => l.text.includes('Пісок під щокою'))).toBe(true);
    await b.until((v) => v.partner.online);

    const phone = await client();
    const lob = phone.wait('lobby');
    phone.send({ t: 'lobby', code: CODE });
    const l = await lob;
    expect(l.slots.every((s) => s.joined)).toBe(true);
    const w = phone.wait('welcome');
    phone.send({ t: 'claim', code: CODE, pid: 'p1' });
    await w;
    await settle(phone);
    expect(phone.view!.me.pid).toBe('p1');

    const bad = await client();
    const r = await bad.hello('not-a-token');
    expect(r.t).toBe('err');
  });
});

describe('synchronisation', () => {
  it('closing a one-time panel (summary, return) goes through the socket', async () => {
    await boot();
    const [a, b] = await pair();
    running!.game.state.meta.actDone = 1;
    running!.game.state.players.p1.welcome = { at: 0, day: 0, res: {}, log: 0 };
    expect((await a.cmd({ c: 'ack', what: 'summary' })).ok).toBe(true);
    expect(running!.game.state.players.p1.seenSummary).toBe(1);
    expect(running!.game.state.players.p2.seenSummary).toBe(0);
    expect((await a.cmd({ c: 'ack', what: 'welcome' })).ok).toBe(true);
    expect(running!.game.state.players.p1.welcome).toBeNull();
    await settle(b);
  });

  it('simultaneous actions both apply and both players see them', async () => {
    await boot();
    const [a, b] = await pair();
    await wake(a, b);
    const [r1, r2] = await Promise.all([a.cmd({ c: 'act', id: 'x_02' }), b.cmd({ c: 'act', id: 'x_02' })]);
    expect(r1.ok && r2.ok).toBe(true);
    await settle(a, b);
    expect(running!.game.state.players.p1.bag['r_01']).toBe(2);
    expect(running!.game.state.players.p2.bag['r_01']).toBe(2);
    expect(a.view!.bag.items.find((i) => i.id === 'r_01')?.n).toBe(2);
    expect(a.view!.partner.busy?.text).toContain('плавник');
  });

  it('conflicting proposals: only one wins, the other is told why', async () => {
    await boot();
    const [a, b] = await pair();
    await wake(a, b);
    const [r1, r2] = await Promise.all([a.cmd({ c: 'act', id: 's_01' }), b.cmd({ c: 'act', id: 's_01' })]);
    expect([r1.ok, r2.ok].filter(Boolean).length).toBe(1);
    const loser = r1.ok ? r2 : r1;
    expect(loser.text).toBe(content.ui.err_proposal_pending);
  });

  it('a disconnect mid-scene pauses it; it resumes at the same place', async () => {
    await boot();
    const [a, b] = await pair();
    await wake(a, b);
    await a.cmd({ c: 'act', id: 's_01' });
    await b.cmd({ c: 'accept' });
    await Promise.all([a.cmd({ c: 'next' }), b.cmd({ c: 'next' })]);
    await settle(a, b);
    const node = running!.game.state.scene!.node;
    const token = b.token!;
    await b.close();
    await a.until((v) => !!v.scene?.paused);
    expect(a.view!.scene!.pausedText).toContain('Оксана');
    // routine is allowed while paused, scene commands are not
    expect((await a.cmd({ c: 'choose', id: 'strike' })).ok).toBe(false);
    expect((await a.cmd({ c: 'act', id: 'x_02' })).ok).toBe(true);

    running!.game.flush();
    const b2 = await client();
    await b2.hello(token);
    await a.until((v) => v.scene?.paused === false);
    expect(running!.game.state.scene!.node).toBe(node);
    expect(b2.view!.scene!.blocks.length).toBeGreaterThan(0);
  });

  it('two sockets of one player: presence stays online until the last one closes', async () => {
    await boot();
    const [a, b] = await pair();
    const a2 = await client();
    await a2.hello(a.token!);
    await a.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(running!.game.state.players.p1.online).toBe(true);
    expect(b.view!.partner.online).toBe(true);
    await a2.close();
    await b.until((v) => !v.partner.online);
  });

  it("views never leak the partner's private clues", async () => {
    await boot();
    const [a, b] = await pair();
    await toHut(a, b);
    const hunterRaw = JSON.stringify(a.view);
    const makerRaw = JSON.stringify(b.view);
    expect(hunterRaw).toContain('Зарубки на стіні');
    expect(hunterRaw).not.toContain('Гірка кірка');
    expect(makerRaw).toContain('Гірка кірка');
    expect(makerRaw).not.toContain('Зарубки на стіні');
  });

  it('a fight goes on when one of the two drops out, and the other can come to help', async () => {
    await boot();
    const [a, b] = await pair();
    await toHut(a, b);
    const g = running!.game;
    // both walk to the shore; the hunter is attacked there
    for (const c of [a, b]) expect((await c.cmd({ c: 'go', to: 'a_02' })).ok).toBe(true);
    advance(20_000);
    await settle(a, b);
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      g.state.players[pid].fight = null;
      g.state.players[pid].busy = null;
    }
    g.state.fights = [];
    g.state.players.p2.online = false; // the maker is busy elsewhere for a moment
    const game = new Game(ix, g.state, clock);
    const { startFight } = await import('../server/src/engine/fight.js');
    startFight(game, 'a_02', [{ enemy: 'e_01', n: 2 }], { party: ['p1'] });
    g.state.players.p2.online = true;
    g.broadcast();
    await settle(a, b);
    expect(a.view!.fight).not.toBeNull();
    expect(b.view!.nearFight).not.toBeNull();
    expect((await b.cmd({ c: 'help' })).ok).toBe(true);
    await settle(a, b);
    expect(b.view!.fight?.party.length).toBe(2);
    // the maker leaves: the round still resolves on the hunter's move
    await b.close();
    await a.until((v) => v.partner.online === false);
    const round = a.view!.fight!.round;
    const hit = a.view!.fight!.moves.find((m) => m.group === 'hit')!;
    expect((await a.cmd({ c: 'fight', id: hit.id })).ok).toBe(true);
    await settle(a);
    expect(a.view!.fight === null || a.view!.fight.round > round).toBe(true);
  });
});

describe('two bot clients over WebSocket', () => {
  it('play act one to its end', async () => {
    await boot();
    const [a, b] = await pair();
    const cs: Record<PlayerId, TestClient> = { p1: a, p2: b };
    const bots: Record<PlayerId, Bot> = { p1: new Bot('p1', content), p2: new Bot('p2', content) };
    let steps = 0;
    const finished = () => !!running!.game.state.flags['p2_act1_done'] && !running!.game.state.scene;
    while (!finished() && steps < 30000) {
      steps++;
      let acted = false;
      for (const pid of (steps % 2 ? ['p1', 'p2'] : ['p2', 'p1']) as PlayerId[]) {
        await settle(cs.p1, cs.p2);
        const g = new Game(ix, running!.game.state, clock);
        const cmd = bots[pid].decide(cs[pid].view!, g);
        if (!cmd) continue;
        const r = await cs[pid].cmd(cmd);
        if (r.ok) acted = true;
      }
      if (!acted) {
        let next = Infinity;
        for (const v of [cs.p1.view!, cs.p2.view!]) {
          if (v.busyUntil > clock) next = Math.min(next, v.busyUntil);
          if (v.map.travel && v.map.travel.until > clock) next = Math.min(next, v.map.travel.until);
          for (const gr of v.groups) for (const e of gr.entries) if (e.readyAt && e.readyAt > clock) next = Math.min(next, e.readyAt);
        }
        advance(Number.isFinite(next) ? next - clock + 1 : 1000);
        await refresh(cs.p1, cs.p2);
      }
    }
    if (!finished()) console.log('WS autoplay stopped', steps, JSON.stringify(running!.game.state.flags));
    expect(finished()).toBe(true);
    await settle(a, b);
    // the act is over (its banner waits for the last act of the build; a summary shows instead)
    expect(running!.game.state.meta.actDone).toBe(1);
    expect(a.view!.summary?.act ?? 1).toBe(1);
  }, 240_000);
});

describe('fresh state on request', () => {
  it('sync returns the current view so a returning tab never shows stale buttons', async () => {
    await boot();
    const [a] = await pair();
    const before = a.rev;
    const v = a.wait('view');
    a.send({ t: 'sync' });
    const m = await v;
    expect(m.rev).toBeGreaterThanOrEqual(before);
    expect(m.v.me.name).toBe('Марко');
  });
});

describe('stock change popups', () => {
  it('both see what the store lost; only the actor sees their own bag', async () => {
    await boot();
    const [a, b] = await pair();
    await toHut(a, b);
    const da = a.wait('delta');
    const db = b.wait('delta');
    expect((await b.cmd({ c: 'act', id: 'x_13' })).ok).toBe(true);
    const [ma, mb] = await Promise.all([da, db]);
    expect(ma.by).toBe('p2');
    expect(mb.items).toEqual([{ id: 'r_05', name: 'Харчі', n: -1, icon: 'food' }]);
    expect(ma.together).toBe(false);
    // the bag: gathering on the shore is the gatherer's own business
    advance(10_000);
    for (const c of [a, b]) expect((await c.cmd({ c: 'go', to: 'a_02' })).ok).toBe(true);
    advance(20_000);
    await settle(a, b);
    for (const pid of ['p1', 'p2'] as PlayerId[]) running!.game.state.players[pid].fight = null;
    running!.game.state.fights = [];
    const mine = b.wait('delta');
    const r = await b.cmd({ c: 'act', id: 'x_02' });
    expect(r.text ?? 'ok').toBe('ok');
    const m = await mine;
    expect(m.by).toBe('p2');
    expect(m.items.some((i) => i.id === 'r_01' && i.n > 0)).toBe(true);
  });
});
