// Part two of the game: everything the engine runs. Act one is in ./a1.
import type { Content } from '../shared/src/content.js';
import { actions, pools } from './a1/actions.js';
import { actions2 } from './a1/actions2.js';
import { residents } from './a1/residents.js';
import { scenes2 } from './a1/scenes2.js';
import { enemies } from './a1/enemies.js';
import { A, R } from './a1/ids.js';
import { clues, goalFallback, goals1, mysteries, npcs } from './a1/journal.js';
import { areas, locations } from './a1/places.js';
import { resources } from './a1/resources.js';
import { scenes1 } from './a1/scenes.js';
import { ambient } from './ambient.js';
import { hero, perks, roleTitles, traits } from './core.js';
import { ui } from './ui.js';
import { needs, needs1Actions, needs1Fx, needs1Resources } from './a1/needs.js';
import { needs2Actions, needs2Fx, needs2Resources } from './a2/needs.js';
import { actions2 as actionsA2, fx2 } from './a2/actions.js';
import { enemies2 } from './a2/enemies.js';
import { clues2, goals2, mysteries2, npcs2 } from './a2/journal.js';
import { areas2, locations2 } from './a2/places.js';
import { residents2 } from './a2/residents.js';
import { resources2 } from './a2/resources.js';
import { scenesA2, suppersA2 } from './a2/scenes.js';
import { scenesA2b } from './a2/scenes2.js';

export const content: Content = {
  areas: [...areas, ...areas2],
  resources: [...resources, ...resources2, ...needs1Resources, ...needs2Resources],
  actions: [...actions, ...actions2, ...actionsA2, ...needs1Actions, ...needs2Actions],
  pools,
  locations: [...locations, ...locations2],
  scenes: [...scenes1, ...scenes2, ...scenesA2, ...scenesA2b, ...suppersA2],
  encounters: [],
  clues: [...clues, ...clues2],
  mysteries: [...mysteries, ...mysteries2],
  goals: [...goals2, ...goals1, goalFallback],
  npcs: [...npcs, ...npcs2],
  enemies: [...enemies, ...enemies2],
  residents: [...residents, ...residents2],
  perks,
  traits,
  hero,
  dog: { flag: 'p2_dog_back', name: 'Сірко' },
  food: R.food,
  stove: { perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  needs,
  ambient: { ...ambient, areas: { ...ambient.areas, a_10: 'hill', a_11: 'river', a_12: 'marsh' }, actions: { ...ambient.actions, ...fx2, ...needs1Fx, ...needs2Fx } },
  maps: [],
  start: { resources: {}, hp: 22, area: A.shore },
  storyFlags: ['p2_', 'done:s_', 'legacy'],
  actEnd: {
    1: 'Кінець першої дії. Варниця ваша — працюйте, ходіть плавнями, готуйтеся. Далі буде.',
    2: 'Кінець другої дії. Варниця тепер — дім для багатьох. А шлях кличе далі. Далі буде.',
  },
  roleTitles,
  ui,
};
