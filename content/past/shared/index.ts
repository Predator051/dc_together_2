// The past the two share (`.design/pasts-later.md` §2, §5): from where their roads met. Played together, joint
// scenes as at home; each hero comes in from the fire with what their own past left them.
import type { Content } from '../../../shared/src/content.js';
import { hero, perks, roleTitles, traits } from '../../core.js';
import { ui } from '../../ui.js';
import { resourcesH } from '../hunter/base.js';
import { resourcesM } from '../maker/base.js';
import { actionsS5, areasS5, cluesS5, enemiesS5, goalsS5, locationsS5, mysteriesS5, resourcesS5, scenesS5 } from './ch5.js';
import { actionsS6, areasS6, cluesS6, enemiesS6, goalsS6, locationsS6, mysteriesS6, resourcesS6, scenesS6 } from './ch6.js';
import { actionsS7, goalsS7, scenesS7 } from './ch7.js';
import { SA, SR } from './ids.js';
import { ambientS, eventsS, lifeActionsS, lifeResourcesS, needsS, weatherS } from './life.js';

/** What each brings from their own past: what they fight and shoot with, and what they wear. */
const carried = [...resourcesH, ...resourcesM].filter((r) => r.kind === 'gear' || r.kind === 'use');

export const sharedPast: Content = {
  pastTitle: 'Спогади: удвох',
  sharedOpens: [
    { role: 'maker', flag: 'pm_ch4_done' },
    { role: 'hunter', flag: 'ph_ch4_done' },
  ],
  areas: [...areasS5, ...areasS6],
  resources: [...resourcesS5, ...resourcesS6, ...lifeResourcesS, ...carried],
  actions: [...actionsS5, ...actionsS6, ...actionsS7, ...lifeActionsS],
  pools: [],
  locations: [...locationsS5, ...locationsS6],
  scenes: [...scenesS5, ...scenesS6, ...scenesS7],
  encounters: [],
  clues: [...cluesS5, ...cluesS6],
  mysteries: [...mysteriesS5, ...mysteriesS6],
  goals: [...goalsS7, ...goalsS6, ...goalsS5, { id: 'ps_goal0', text: 'Дорога йде на північ.' }],
  npcs: [],
  enemies: [...enemiesS5, ...enemiesS6],
  residents: [],
  trades: [],
  perks,
  traits,
  hero: { ...hero, caps: { 5: 12, 6: 14, 7: 15 }, temperGift: { 5: { [SR.food]: 4, [SR.coin]: 3 }, 6: { [SR.food]: 4, [SR.coin]: 3 }, 7: { [SR.food]: 4 } } },
  food: SR.food,
  // the fire under the oak: the two keep it between them
  stove: { kept: { flag: 'ps_met' }, perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  needs: needsS,
  weather: weatherS,
  events: eventsS,
  ambient: ambientS,
  start: { resources: {}, hp: 20, area: SA.oak },
  storyFlags: ['ps_', 'done:ps_'],
  actEnd: {
    5: 'Кінець п\'ятого розділу спогадів. Далі — село за бродом.',
    6: 'Кінець шостого розділу спогадів. Далі — зима. Коли прийде час.',
    7: 'Кінець спогадів.',
  },
  roleTitles,
  ui: {
    ...ui,
    defeat_self: 'Тебе збито з ніг. Отямлюєшся там, де ночуєш.',
    defeat_other: '{name} {повернувся|повернулася} {побитий|побита}.',
  },
};
