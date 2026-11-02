// What a running work looks like on screen: a small animated vignette while the hero is busy.
import type { ActionDef, FxKind } from './content.js';
import type { EntrySort } from './protocol.js';

/**
 * A kind of motion. Every accent (`FxKind`) is one; a few more cover works without an accent
 * and the garden's instant commands.
 */
export type WorkVerb = FxKind | 'sew' | 'make' | 'pick' | 'plant' | 'harvest';

/** The motions beyond the accents (the client draws each; its table is complete by type). */
export const EXTRA_VERBS = ['sew', 'make', 'pick', 'plant', 'harvest'] as const satisfies readonly WorkVerb[];

/** Shown while the hero is busy with a work: the motion and the thing that comes of it. */
export interface WorkLook {
  verb: WorkVerb;
  /** The mark of what the work yields (ITEM_ICONS), when it yields a marked thing. */
  icon?: string;
}

/** Accents that already say how clothes are made are kept; the rest of the clothes are sewn. */
const NOT_SEWN = new Set<FxKind>(['forge', 'wax', 'salt', 'whet', 'string']);

/** The motion of a work: its accent first; works without one by their kind and what they give. */
export function workVerb(fx: FxKind | undefined, kind: ActionDef['kind'], sort: EntrySort): WorkVerb {
  if (sort === 'wear' && (!fx || !NOT_SEWN.has(fx))) return 'sew';
  if (fx) return fx;
  if (kind === 'gather') return 'pick';
  if (kind === 'build') return 'build';
  if (kind === 'trade') return 'trade';
  if (kind === 'home') return 'care';
  if (kind === 'train') return 'breath';
  if (sort === 'food') return 'steam';
  return 'make';
}
