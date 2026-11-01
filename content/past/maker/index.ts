// The maker's past (`.design/past-maker.md`): a workshop in a southern town before the war. Played alone.
import type { Content } from '../../../shared/src/content.js';
import { hero, perks, roleTitles, traits } from '../../core.js';
import { ui } from '../../ui.js';
import { areasM, enemiesM, locationsM, resourcesM } from './base.js';
import { actionsM1, cluesM1, goalsM1, mysteriesM, npcsM, scenesM1, tagsM1 } from './ch1.js';
import { actionsM2, cluesM2, goalsM2, residentsM, scenesM2 } from './ch2.js';
import { actionsM3, cluesM3, goalsM3, scenesM3 } from './ch3.js';
import { actionsM4, areasM4, cluesM4, enemiesM4, goalsM4, locationsM4, resourcesM4, scenesM4 } from './ch4.js';
import { PA, PR } from './ids.js';
import { ambientM, bedM, eventsM, lifeActionsM, lifeResourcesM, needsM, weatherM } from './life.js';

export const makerPast: Content = {
  pastTitle: 'Спогади: Кривець',
  areas: [...areasM, ...areasM4],
  resources: [...resourcesM, ...resourcesM4, ...lifeResourcesM],
  actions: [...actionsM1, ...tagsM1, ...actionsM2, ...actionsM3, ...actionsM4, ...lifeActionsM, bedM],
  pools: [],
  locations: [...locationsM, ...locationsM4],
  scenes: [...scenesM1, ...scenesM2, ...scenesM3, ...scenesM4],
  encounters: [],
  clues: [...cluesM1, ...cluesM2, ...cluesM3, ...cluesM4],
  mysteries: mysteriesM,
  goals: [...goalsM4, ...goalsM3, ...goalsM2, ...goalsM1, { id: 'pm_goal_wait', text: 'Спогади тут уриваються. Далі — коли ви з напарником пройдете далі разом.', when: { any: [{ all: [{ flag: 'pm_ch1_done' }, { flag: 'main_act', lt: 2 }] }, { all: [{ flag: 'pm_ch2_done' }, { flag: 'main_act', lt: 3 }] }, { all: [{ flag: 'pm_ch3_done' }, { flag: 'main_act', lt: 4 }] }] } }, { id: 'pm_goal0', text: 'Майстерня жде роботи.' }],
  npcs: npcsM,
  enemies: [...enemiesM, ...enemiesM4],
  residents: residentsM,
  trades: [
    { id: 'pm_wood', name: 'Лоза й дерево', teach: ['maker'], jobs: ['pm_x01', 'pm_x04'] },
    { id: 'pm_earth', name: 'Глина й ягоди', teach: ['maker'], jobs: ['pm_x02', 'pm_x05'] },
  ],
  perks,
  traits,
  // younger: the past has its own ceilings, by chapter
  hero: { ...hero, caps: { 1: 5, 2: 7, 3: 9, 4: 11 }, temperGift: { 1: { [PR.coin]: 4, [PR.oak]: 2 }, 2: { [PR.coin]: 5, [PR.iron]: 2 }, 3: { [PR.coin]: 6, [PR.iron]: 2 }, 4: { [PR.food]: 4, [PR.iron]: 2 } } },
  food: PR.food,
  // Явдоха keeps the fire while the workshop stands
  stove: { kept: { all: [{ flag: 'pm_in' }, { noFlag: 'pm_ch3_done' }] }, perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  needs: needsM,
  weather: weatherM,
  events: eventsM,
  ambient: ambientM,
  start: { resources: {}, hp: 20, area: PA.shop },
  storyFlags: ['pm_', 'done:pm_'],
  actEnd: {
    1: 'Кінець першого розділу спогадів. Далі буде — коли ви з напарником пройдете далі разом.',
    2: 'Кінець другого розділу спогадів. Далі буде — коли ви з напарником пройдете далі разом.',
    3: 'Кінець третього розділу спогадів. Дорога на північ — далі. Коли прийде час.',
    4: 'Кінець четвертого розділу спогадів. Далі — зустріч. Коли ви з напарником дійдете до неї обоє.',
  },
  roleTitles,
  ui: {
    ...ui,
    defeat_self: 'Тебе збито з ніг. Отямлюєшся в дворі майстерні — торба порожня.',
    defeat_other: '{name} {повернувся|повернулася} до майстерні {побитий|побита} — з порожньою торбою.',
  },
};
