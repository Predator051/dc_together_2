// The past the two share (`.design/pasts-later.md` §2, §5): from where their roads met. Played together, joint
// scenes as at home; each hero comes in from the fire with what their own past left them.
import type { Content } from '../../../shared/src/content.js';
import { hero, perks, roleTitles, traits } from '../../core.js';
import { ui } from '../../ui.js';
import { resourcesH } from '../hunter/base.js';
import { resourcesM } from '../maker/base.js';
import { actionsS5, areasS5, cluesS5, enemiesS5, goalsS5, locationsS5, mysteriesS5, resourcesS5, scenesS5 } from './ch5.js';
import { SA, SR } from './ids.js';

/** What each brings from their own past: what they fight and shoot with, and what they wear. */
const carried = [...resourcesH, ...resourcesM].filter((r) => r.kind === 'gear' || r.kind === 'use');

export const sharedPast: Content = {
  pastTitle: 'Спогади: удвох',
  sharedOpens: [
    { role: 'maker', flag: 'pm_ch4_done' },
    { role: 'hunter', flag: 'ph_ch4_done' },
  ],
  areas: areasS5,
  resources: [...resourcesS5, ...carried],
  actions: actionsS5,
  pools: [],
  locations: locationsS5,
  scenes: scenesS5,
  encounters: [],
  clues: cluesS5,
  mysteries: mysteriesS5,
  goals: [...goalsS5, { id: 'ps_goal0', text: 'Дорога йде на північ.' }],
  npcs: [],
  enemies: enemiesS5,
  residents: [],
  trades: [],
  perks,
  traits,
  hero: { ...hero, caps: { 5: 12 }, temperGift: { 5: { [SR.food]: 4, [SR.coin]: 3 } } },
  food: SR.food,
  stove: { perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  start: { resources: {}, hp: 20, area: SA.oak },
  storyFlags: ['ps_', 'done:ps_'],
  actEnd: {
    5: 'Кінець п\'ятого розділу спогадів. Далі — село за бродом. Коли прийде час.',
  },
  roleTitles,
  ui: {
    ...ui,
    defeat_self: 'Тебе збито з ніг. Отямлюєшся під старим дубом.',
    defeat_other: '{name} {повернувся|повернулася} під дуб {побитий|побита}.',
  },
};
