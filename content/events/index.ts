import type { EventSetDef } from '../../shared/src/content.js';
import { away1, home1 } from './a1.js';
import { away2, home2 } from './a2.js';
import { away3, home3 } from './a3.js';
import { anytime, away4, home4 } from './a4.js';
import { MIN } from './kit.js';

// Small happenings between the story's beats. Each is a short scene: something goes wrong or turns up,
// and the choice costs something — a thing, a scratch, a risk, a piece of conscience. Never a loss that takes
// more than a few minutes of work to make good, never a step of the story itself. Most come once; those that
// can come again wait hours. Home ones are told plainly (both may read and answer them); away ones speak to
// the one who is there. Each has its picture (client/src/art/events/<id>.webp).
export const events: EventSetDef = {
  from: { flag: 'p2_hut' },
  gap: [9 * MIN, 15 * MIN],
  road: 0.5,
  place: 0.3,
  kinds: [...home1, ...away1, ...home2, ...away2, ...home3, ...away3, ...home4, ...away4, ...anytime],
};
