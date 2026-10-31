// The maker's past (`.design/past-maker.md`): a workshop in a southern town before the war. Played alone.
import type { Content } from '../../../shared/src/content.js';
import { hero, perks, roleTitles, traits } from '../../core.js';
import { ui } from '../../ui.js';
import { areasM, enemiesM, locationsM, resourcesM } from './base.js';
import { actionsM1, cluesM1, goalsM1, mysteriesM, npcsM, scenesM1, tagsM1 } from './ch1.js';
import { PA, PR } from './ids.js';

export const makerPast: Content = {
  pastTitle: 'Спогади: Кривець',
  areas: areasM,
  resources: resourcesM,
  actions: [...actionsM1, ...tagsM1],
  pools: [],
  locations: locationsM,
  scenes: [...scenesM1],
  encounters: [],
  clues: [...cluesM1],
  mysteries: mysteriesM,
  goals: [...goalsM1, { id: 'pm_goal0', text: 'Майстерня жде роботи.' }],
  npcs: npcsM,
  enemies: enemiesM,
  residents: [],
  trades: [],
  perks,
  traits,
  // younger: the past has its own ceilings, by chapter
  hero: { ...hero, caps: { 1: 5, 2: 7, 3: 9 }, temperGift: { 1: { [PR.coin]: 4, [PR.oak]: 2 }, 2: { [PR.coin]: 5, [PR.iron]: 2 }, 3: { [PR.coin]: 6, [PR.iron]: 2 } } },
  food: PR.food,
  stove: { perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  start: { resources: {}, hp: 20, area: PA.shop },
  storyFlags: ['pm_', 'done:pm_'],
  actEnd: {
    1: 'Кінець першого розділу спогадів. Далі буде — коли ви з напарником пройдете далі разом.',
  },
  roleTitles,
  ui,
};
