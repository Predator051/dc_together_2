// What the happenings share: times, the acts they belong to, the sky.
import type { Cond } from '../../shared/src/content.js';

export const MIN = 60_000;
export const HOUR = 60 * MIN;

/** The parts of the story (a happening of one never comes before it; most go on after it). */
export const act1: Cond = { noFlag: 'p2_act2' };
export const act2: Cond = { flag: 'p2_act2' };
export const act3: Cond = { flag: 'p2_act3' };
export const act4: Cond = { flag: 'p2_act4' };
export const south: Cond = { flag: 'p2_brid' };

export const dog: Cond = { flag: 'p2_dog_back' };
export const evening: Cond = { evening: true };
export const sky = (...ids: string[]): Cond => ({ any: ids.map((weather) => ({ weather })) });
export const seen = (scene: string): Cond => ({ flag: `done:${scene}` });
export const not = (c: Cond): Cond => ({ not: c });
export const all = (...cs: Cond[]): Cond => ({ all: cs });
export const hunter: Cond = { role: 'hunter' };
export const maker: Cond = { role: 'maker' };
