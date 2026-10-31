// The hunter's past (`.design/past-hunter.md`): an island in the marshes below the ford, before the war. Played alone.
import type { Content } from '../../../shared/src/content.js';
import { hero, perks, roleTitles, traits } from '../../core.js';
import { ui } from '../../ui.js';
import { areasH, enemiesH, locationsH, resourcesH } from './base.js';
import { actionsH1, cluesH1, goalsH1, mysteriesH, npcsH, scenesH1 } from './ch1.js';
import { actionsH2, actionsH3, cluesH23, goalsH23, residentsH, scenesH23 } from './ch23.js';
import { HA, HR } from './ids.js';

export const hunterPast: Content = {
  pastTitle: 'Спогади: плавні',
  areas: areasH,
  resources: resourcesH,
  actions: [...actionsH1, ...actionsH2, ...actionsH3],
  pools: [],
  locations: locationsH,
  scenes: [...scenesH1, ...scenesH23],
  encounters: [],
  clues: [...cluesH1, ...cluesH23],
  mysteries: mysteriesH,
  goals: [...goalsH23, ...goalsH1, { id: 'ph_goal0', text: 'Плавні чекають.' }],
  npcs: npcsH,
  enemies: enemiesH,
  residents: residentsH,
  trades: [
    { id: 'ph_reeds', name: 'Лоза й верші', teach: ['hunter'], jobs: ['ph_x01', 'ph_x02'] },
    { id: 'ph_woods', name: 'Ясен', teach: ['hunter'], jobs: ['ph_x04'] },
  ],
  perks,
  traits,
  hero: { ...hero, caps: { 1: 5, 2: 7, 3: 9 }, temperGift: { 1: { [HR.coin]: 4, [HR.osier]: 4 }, 2: { [HR.coin]: 5, [HR.hide]: 2 }, 3: { [HR.coin]: 6, [HR.hide]: 2 } } },
  food: HR.food,
  stove: { perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  start: { resources: {}, hp: 20, area: HA.isle },
  storyFlags: ['ph_', 'done:ph_'],
  actEnd: {
    1: 'Кінець першого розділу спогадів. Далі буде — коли ви з напарником пройдете далі разом.',
    2: 'Кінець другого розділу спогадів. Далі буде — коли ви з напарником пройдете далі разом.',
    3: 'Кінець третього розділу спогадів. Дорога на північ — далі. Коли прийде час.',
  },
  roleTitles,
  ui,
};
