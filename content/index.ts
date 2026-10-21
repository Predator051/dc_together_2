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

export const content: Content = {
  areas,
  resources,
  actions: [...actions, ...actions2],
  pools,
  locations,
  scenes: [...scenes1, ...scenes2],
  encounters: [],
  clues,
  mysteries,
  goals: [...goals1, goalFallback],
  npcs,
  enemies,
  residents,
  perks,
  traits,
  hero,
  dog: { flag: 'p2_dog_back', name: 'Сірко' },
  food: R.food,
  stove: { perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  ambient,
  maps: [],
  start: { resources: {}, hp: 22, area: A.shore },
  storyFlags: ['p2_', 'done:s_', 'legacy'],
  actEnd: { 1: 'Кінець першої дії. Варниця ваша — працюйте, ходіть плавнями, готуйтеся. Далі буде.' },
  roleTitles,
  ui,
};
