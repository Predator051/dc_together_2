// Two bots play the game: they see only their views (and plan with what the world offers).

import { content } from '../content/index.js';
import type { Content, PlayerId, Role } from '../shared/src/content.js';
import { Bot, type BotOptions } from './bot.js';
import { World } from './world.js';

export interface AutoplayResult {
  done: boolean;
  steps: number;
  world: World;
  rejected: number;
  scenes: string[];
  /** Game time the bots spent (busy time, walks, fights), ms. */
  gameTimeMs: number;
  defeats: number;
  fights: number;
  reason?: string;
  /** When each scene was finished (game ms since the start). */
  timeline: Array<{ scene: string; at: number }>;
}

export function autoplay(
  a: BotOptions,
  b: BotOptions,
  opts: { seed?: number; maxSteps?: number; until?: (w: World) => boolean; stallLimit?: number; from?: World; solo?: { content: Content; role: Role }; content?: Content } = {},
): AutoplayResult {
  // alone in a past: one hero of that role, nobody to wait for
  const w = opts.from ?? new World(opts.seed ?? 7, opts.solo?.content);
  if (!opts.from) {
    if (opts.solo) {
      w.state.solo = true;
      w.join('Оксана', 'f', opts.solo.role);
    } else {
      w.join('Марко', 'm', 'hunter');
      w.join('Оксана', 'f', 'maker');
    }
  }
  const players = (['p1', 'p2'] as PlayerId[]).filter((pid) => w.state.players[pid].joined);
  for (const pid of players) w.online(pid);
  const c = opts.solo?.content ?? opts.content ?? content;
  const bots: Record<PlayerId, Bot> = { p1: new Bot('p1', c, a), p2: new Bot('p2', c, b) };
  const until = opts.until ?? ((x: World) => !!x.state.flags['p2_act1_done'] && !x.state.scene);
  const maxSteps = opts.maxSteps ?? 60000;
  const stallLimit = opts.stallLimit ?? 6000;
  const start = w.now;
  let rejected = 0;
  let defeats = 0;
  const scenes: string[] = [];
  const timeline: AutoplayResult['timeline'] = [];
  let lastProgress = w.progress();
  let lastProgressStep = 0;
  const seenDone = new Set<string>();
  let fights = 0;
  let lastFight = 0;

  for (let step = 0; step < maxSteps; step++) {
    if (until(w)) return { done: true, steps: step, world: w, rejected, scenes, gameTimeMs: w.now - start, defeats, fights, timeline };
    let acted = false;
    for (const pid of players) {
      const g = w.g();
      const v = w.view(pid);
      const cmd = bots[pid].decide(v, g);
      if (!cmd) continue;
      const before = w.state.players[pid].busy?.action;
      const r = w.cmd(pid, cmd);
      if (r.ok) acted = true;
      else rejected++;
      if (w.state.players[pid].busy?.action === 'rest:defeat' && before !== 'rest:defeat') defeats++;
    }
    if (w.state.nextFightId !== lastFight) {
      fights += w.state.nextFightId - lastFight - (lastFight === 0 ? 1 : 0);
      lastFight = w.state.nextFightId;
    }
    for (const k of Object.keys(w.state.flags)) {
      if (!k.startsWith('done:') || seenDone.has(k)) continue;
      seenDone.add(k);
      scenes.push(k.slice(5));
      timeline.push({ scene: k.slice(5), at: w.now - start });
    }
    const p = w.progress();
    if (p !== lastProgress) {
      lastProgress = p;
      lastProgressStep = step;
    } else if (step - lastProgressStep > stallLimit) {
      return { done: false, steps: step, world: w, rejected, scenes, gameTimeMs: w.now - start, defeats, fights, timeline, reason: 'stalled' };
    }
    if (!acted) {
      const next = w.nextReady(['p1', 'p2']);
      w.advance(next && next > w.now ? next - w.now + 1 : 1000);
    }
  }
  return { done: until(w), steps: maxSteps, world: w, rejected, scenes, gameTimeMs: w.now - start, defeats, fights, timeline, reason: 'max steps' };
}

export function describe(w: World): string {
  const s = w.state;
  const p = (pid: PlayerId) => {
    const x = s.players[pid];
    return `${pid} ${x.role} lvl ${x.level} hp ${x.hp}/${x.hpMax} at ${x.at} bag ${JSON.stringify(x.bag)} eq ${JSON.stringify(x.equip)} busy ${x.busy?.action ?? '-'} fight ${x.fight}`;
  };
  const flags = Object.keys(s.flags).filter((k) => k.startsWith('p2_') || k.startsWith('done:')).join(' ');
  const res = Object.entries(s.res).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(' ');
  return [p('p1'), p('p2'), `flags: ${flags}`, `res: ${res}`, `goal: ${s.goal}`, `scene: ${s.scene?.id ?? '-'}:${s.scene?.node ?? ''}`].join('\n');
}
