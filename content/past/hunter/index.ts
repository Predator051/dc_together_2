// The hunter's past (`.design/past-hunter.md`): an island in the marshes below the ford, before the war. Played alone.
import type { Content } from '../../../shared/src/content.js';
import { hero, perks, roleTitles, traits } from '../../core.js';
import { ui } from '../../ui.js';
import { areasH, enemiesH, locationsH, resourcesH } from './base.js';
import { actionsH1, cluesH1, goalsH1, mysteriesH, npcsH, scenesH1 } from './ch1.js';
import { actionsH2, actionsH3, cluesH23, goalsH23, residentsH, scenesH23 } from './ch23.js';
import { actionsH4, areasH4, cluesH4, enemiesH4, goalsH4, locationsH4, npcsH4, scenesH4 } from './ch4.js';
import { HA, HR } from './ids.js';
import { ambientH, eventsH, lifeActionsH, lifeResourcesH, needsH, weatherH } from './life.js';

export const hunterPast: Content = {
  pastTitle: 'Спогади: плавні',
  areas: [...areasH, ...areasH4],
  resources: [...resourcesH, ...lifeResourcesH],
  actions: [...actionsH1, ...actionsH2, ...actionsH3, ...actionsH4, ...lifeActionsH],
  pools: [],
  locations: [...locationsH, ...locationsH4],
  scenes: [...scenesH1, ...scenesH23, ...scenesH4],
  encounters: [],
  clues: [...cluesH1, ...cluesH23, ...cluesH4],
  mysteries: mysteriesH,
  goals: [...goalsH4, ...goalsH23, ...goalsH1, { id: 'ph_goal0', text: 'Плавні чекають.' }],
  npcs: [...npcsH, ...npcsH4],
  enemies: [...enemiesH, ...enemiesH4],
  residents: residentsH,
  trades: [
    { id: 'ph_reeds', name: 'Лоза й верші', teach: ['hunter'], jobs: ['ph_x01', 'ph_x02'] },
    { id: 'ph_woods', name: 'Ясен', teach: ['hunter'], jobs: ['ph_x04'] },
  ],
  perks,
  traits,
  hero: { ...hero, caps: { 1: 5, 2: 7, 3: 9, 4: 11 }, temperGift: { 1: { [HR.coin]: 4, [HR.osier]: 4 }, 2: { [HR.coin]: 5, [HR.hide]: 2 }, 3: { [HR.coin]: 6, [HR.hide]: 2 }, 4: { [HR.food]: 4, [HR.hide]: 2 } } },
  food: HR.food,
  // Сидір keeps the fire while the island stands
  stove: { kept: { all: [{ flag: 'ph_in' }, { noFlag: 'ph_ch3_done' }] }, perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  needs: needsH,
  weather: weatherH,
  events: eventsH,
  ambient: ambientH,
  start: { resources: {}, hp: 20, area: HA.isle },
  storyFlags: ['ph_', 'done:ph_'],
  actEnd: {
    1: 'Кінець першого розділу спогадів. Далі буде — коли ви з напарником пройдете далі разом.',
    2: 'Кінець другого розділу спогадів. Далі буде — коли ви з напарником пройдете далі разом.',
    3: 'Кінець третього розділу спогадів. Дорога на північ — далі. Коли прийде час.',
    4: 'Кінець четвертого розділу спогадів. Далі — зустріч. Коли ви з напарником дійдете до неї обоє.',
  },
  roleTitles,
  ui: {
    ...ui,
    defeat_self: 'Тебе збито з ніг. Отямлюєшся на острові, біля Сидорової хати, — торба порожня.',
    defeat_other: '{name} {повернувся|повернулася} на острів {побитий|побита} — з порожньою торбою.',
  },
};
