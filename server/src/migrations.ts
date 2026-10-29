import type { Content } from '../../shared/src/content.js';
import type { WorldState } from '../../shared/src/state.js';
import { STATE_VERSION } from '../../shared/src/state.js';
import { normalizeWorld } from './engine/index.js';
import { ui } from '../../content/ui.js';

/**
 * World-state migrations. Key N upgrades a state of version N to N+1.
 * Rules (see content/secret/STATUS.md):
 *  - never delete player-visible history (log, clues) unless it is broken;
 *  - content IDs are stable; if a scene node is renamed, map the old id here;
 *  - an active scene that no longer exists is dropped (the world stays playable).
 */
export type Migration = (s: any) => any;

export const migrations: Record<number, Migration> = {
  // Part two starts at version 10. Part-one worlds (≤ 3) are never migrated: they are read once
  // as the legacy (see legacy.ts) and a new world begins.
  // 10 -> 11: the journal tells new days and goals apart from other notes; old entries learn it too.
  10: (s) => {
    const starts = (e: { text: Record<string, string> }, p: string | undefined) =>
      !!p && Object.values(e.text ?? {}).some((t) => typeof t === 'string' && t.startsWith(p));
    for (const e of s.log ?? []) {
      if (e.kind !== 'system') continue;
      if (starts(e, ui.new_day)) e.kind = 'day';
      else if (starts(e, ui.goal_prefix)) e.kind = 'goal';
    }
    return { ...s, version: 11 };
  },
  // 11 -> 12: fights move onto a field of cells; a fight begun the old way is dropped (a story fight
  // starts again on the field, see Game.settle).
  11: (s) => {
    for (const p of Object.values(s.players ?? {}) as Array<{ fight: number | null }>) p.fight = null;
    return { ...s, fights: [], afterFight: {}, version: 12 };
  },
};

export class MigrationError extends Error {}

export function migrateState(
  raw: unknown,
  content: Content,
  now: number,
  registry: Record<number, Migration> = migrations,
  target: number = STATE_VERSION,
): { state: WorldState; from: number; migrated: boolean } {
  if (!raw || typeof raw !== 'object') throw new MigrationError('World state is not an object');
  let s = raw as any;
  const from = Number(s.version ?? 0);
  if (from > target) throw new MigrationError(`World version ${from} is newer than this server (${target})`);
  while (Number(s.version ?? 0) < target) {
    const v = Number(s.version ?? 0);
    const step = registry[v];
    if (!step) throw new MigrationError(`No migration from version ${v}`);
    s = step(s);
    if (Number(s.version) !== v + 1) throw new MigrationError(`Migration ${v} did not bump version`);
  }
  const state = sanitize(s as WorldState, content);
  state.part ??= 2;
  return { state: normalizeWorld(content, state, now), from, migrated: from !== target };
}

/** Drop references to content that no longer exists so an update can never brick a world. */
function sanitize(s: WorldState, content: Content): WorldState {
  if (s.scene) {
    const def = content.scenes.find((x) => x.id === s.scene!.id);
    if (!def || !def.nodes[s.scene.node]) s.scene = null;
    else s.scene.trail = s.scene.trail.filter((t) => def.nodes[t.node]);
  }
  if (s.proposal && !content.scenes.find((x) => x.id === s.proposal!.scene)) s.proposal = null;
  return s;
}
