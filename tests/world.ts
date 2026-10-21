// Engine-level world for tests: two heroes, a clock, views and commands.

import { content } from '../content/index.js';
import type { PlayerId } from '../shared/src/content.js';
import type { Command, PlayerView } from '../shared/src/protocol.js';
import type { WorldState } from '../shared/src/state.js';
import { ContentIndex, Game, newWorld } from '../server/src/engine/index.js';
import { buildView } from '../server/src/engine/view.js';

export const ix = new ContentIndex(content);

export class World {
  now = 1_700_000_000_000;
  state: WorldState;

  constructor(seed = 1) {
    this.state = newWorld(content, seed, this.now);
  }

  g(): Game {
    return new Game(ix, this.state, this.now);
  }

  join(name: string, gender: 'm' | 'f', role: 'hunter' | 'maker'): PlayerId {
    const r = this.g().join(name, gender, role);
    if ('err' in r) throw new Error(r.err);
    return r.pid;
  }

  online(pid: PlayerId, on = true): void {
    this.g().setOnline(pid, on);
  }

  view(pid: PlayerId): PlayerView {
    return buildView(this.g(), pid);
  }

  cmd(pid: PlayerId, c: Command) {
    return this.g().command(pid, c);
  }

  advance(ms: number): void {
    this.now += ms;
    this.g().tick();
  }

  /** Jump past this hero's busy time (and settle walks). */
  rest(pid: PlayerId): void {
    const p = this.state.players[pid];
    const until = Math.max(p.busy?.until ?? 0, p.travel?.until ?? 0);
    if (until > this.now) this.advance(until - this.now + 1);
  }

  /** Earliest moment when anything of these heroes becomes ready. */
  nextReady(pids: PlayerId[]): number | null {
    let best: number | null = null;
    for (const pid of pids) {
      const v = this.view(pid);
      const times = v.groups.flatMap((g) => g.entries.map((e) => e.readyAt ?? 0));
      times.push(v.busyUntil);
      if (v.map.travel) times.push(v.map.travel.until + 1);
      for (const t of times) if (t > this.now) best = best === null ? t : Math.min(best, t);
    }
    return best;
  }

  progress(): number {
    return (
      Object.keys(this.state.flags).filter((k) => !k.startsWith('beat:') && !k.startsWith('flint_used')).length * 10 +
      Object.keys(this.state.clues).length +
      this.state.meta.day * 3 +
      this.state.players.p1.xp +
      this.state.players.p2.xp
    );
  }
}

/** Two heroes, both online, standing on the shore. */
export function pair(seed = 1): { w: World; h: PlayerId; m: PlayerId } {
  const w = new World(seed);
  const h = w.join('Марко', 'm', 'hunter');
  const m = w.join('Оксана', 'f', 'maker');
  w.online(h);
  w.online(m);
  return { w, h, m };
}
