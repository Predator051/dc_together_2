// The heroes' pasts (`.design/personal.md` §3): each hero has a world of their own, played alone, kept inside
// the main world (`state.past[pid]`). One goes into it from the fire at home and comes back to the fire.
// Nothing of the past world's numbers comes back; what does come back, comes through flags (step 5).
import type { Content, PlayerId, Role } from '../../shared/src/content.js';
import type { WorldState } from '../../shared/src/state.js';
import { ContentIndex, Game, newWorld } from './engine/index.js';
import { refreshHero } from './engine/hero.js';
import { migrateState } from './migrations.js';

/** The flag a past world reads to know how far the story has gone (chapter N opens with act N). */
export const MAIN_ACT = 'main_act';

export type Pasts = Partial<Record<Role, ContentIndex>>;

export function pastIndex(pasts: Partial<Record<Role, Content>> | undefined): Pasts {
  const out: Pasts = {};
  for (const [role, c] of Object.entries(pasts ?? {})) if (c) out[role as Role] = new ContentIndex(c);
  return out;
}

/** The past content of this hero, if there is one. */
export function pastOf(pasts: Pasts, main: WorldState, pid: PlayerId): ContentIndex | undefined {
  const role = main.players[pid].role;
  return role ? pasts[role] : undefined;
}

/** Why the hero cannot go into their memories now (null: can). A key of `ui`. */
export function rememberBlock(g: Game, pid: PlayerId, pasts: Pasts): string | null {
  const p = g.p(pid);
  if (!pastOf(pasts, g.s, pid)) return 'err_not_now';
  if (p.remembering) return 'err_not_now';
  if (p.at !== g.ix.homeArea || p.travel) return 'remember_home';
  if (p.fight !== null) return 'err_in_fight';
  if (g.s.scene) return 'err_in_scene';
  if (g.s.proposal) return 'err_proposal_pending';
  if (p.busy && p.busy.until > g.now) return 'remember_busy';
  return null;
}

/** Loaded worlds of the past are brought up to date like the main one. */
export function loadPasts(main: WorldState, pasts: Pasts, now: number): void {
  for (const [pid, raw] of Object.entries(main.past ?? {}) as Array<[PlayerId, WorldState]>) {
    const ix = pastOf(pasts, main, pid);
    if (!ix || !raw) {
      // a past whose content is gone stays as it was (it may come back); nobody stays inside it
      main.players[pid].remembering = false;
      continue;
    }
    main.past![pid] = migrateState(raw, ix.c, now).state;
  }
}

/** Into the past: the world is made the first time; time there stood still while the hero was away. */
export function enterPast(main: WorldState, pid: PlayerId, ix: ContentIndex, now: number, storyFlags: string[] = []): WorldState {
  const hero = main.players[pid];
  let s = main.past?.[pid];
  if (!s) {
    s = newWorld(ix.c, (main.meta.seed ^ (pid === 'p1' ? 0x51f15e : 0x2a17c3)) >>> 0, now);
    s.solo = true;
    const p = s.players[pid];
    p.joined = true;
    p.name = hero.name;
    p.gender = hero.gender;
    p.role = hero.role;
    p.stats = { ...ix.c.hero.base[hero.role!] };
    // what the hero said of home in part one colours the memory
    for (const [k, v] of Object.entries(hero.flags)) if (k.startsWith('bg_')) p.flags[k] = v;
    (main.past ??= {})[pid] = s;
    const g = new Game(ix, s, now);
    refreshHero(g, pid);
    p.hp = p.hpMax;
  }
  // what stood still while away stays where it was
  s.meta.lastTick = now;
  s.workAt = now;
  s.flags[MAIN_ACT] = main.meta.act;
  // what the past may reflect of the story so far (its own flags never come back the other way here)
  s.mainFlags = Object.fromEntries(Object.entries(main.flags).filter(([k]) => storyFlags.some((p) => k.startsWith(p))));
  hero.remembering = true;
  hero.busy = null;
  new Game(ix, s, now).setOnline(pid, true);
  // no "while you were away" there: the past did not go on without the hero
  s.players[pid].welcome = null;
  return s;
}

/** Back to the fire. The past keeps where it was (a scene waits; a fight cannot be left). */
export function leavePast(main: WorldState, pid: PlayerId, ix: ContentIndex | undefined, now: number): string | null {
  const s = main.past?.[pid];
  if (s && ix) {
    if (s.players[pid].fight !== null) return 'err_in_fight';
    new Game(ix, s, now).setOnline(pid, false);
  }
  main.players[pid].remembering = false;
  return null;
}
