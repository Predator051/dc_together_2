// Part two of the game: everything the engine runs. Act one is in ./a1.
import { yard } from './yard.js';
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
import { hero, perks, roleTitles, trades, traits } from './core.js';
import { ui } from './ui.js';
import { weather } from './weather.js';
import { events } from './events.js';
import { garden, gardenActions, gardenFx, gardenLocations, gardenResources } from './garden.js';
import { folkActions, folkResources } from './folk.js';
import { needs, needs1Actions, needs1Fx, needs1Resources } from './a1/needs.js';
import { needs2Actions, needs2Fx, needs2Resources } from './a2/needs.js';
import { quests1, sideAreas1, sideClues1, sideComfort1, sideDaily1, sideEnemies1, sideLocations1, sideMysteries, sideNpcs1, sideResources1 } from './side/a1base.js';
import { sideActions1, sideFx1 } from './side/a1acts.js';
import { sideScenes1 } from './side/a1scenes.js';
import { barrels, quests2, sideClues2, sideComfort2, sideDaily2, sideEnemies2, sideLocations2, sideNpcs2, sideResidents2, sideResources2, sideWorkBonus2 } from './side/a2base.js';
import { sideActions2, sideFx2 } from './side/a2acts.js';
import { sideScenes2 } from './side/a2scenes.js';
import { R2 } from './a2/ids.js';
import type { ResourceDef } from '../shared/src/content.js';
import { actions2 as actionsA2, fx2 } from './a2/actions.js';
import { enemies2 } from './a2/enemies.js';
import { clues2, goals2, mysteries2, npcs2 } from './a2/journal.js';
import { areas2, locations2 } from './a2/places.js';
import { residents2 } from './a2/residents.js';
import { resources2 } from './a2/resources.js';
import { scenesA2, suppersA2 } from './a2/scenes.js';
import { scenesA2b } from './a2/scenes2.js';
import { actions3, fx3 } from './a3/actions.js';
import { prepActions3, prepFx3, preps3 } from './a3/preps.js';
import { enemies3 } from './a3/enemies.js';
import { clues3, goals3, mysteries3, npcs3 } from './a3/journal.js';
import { areas3, locations3 } from './a3/places.js';
import { residents3 } from './a3/residents.js';
import { resources3 } from './a3/resources.js';
import { scenesA3 } from './a3/scenes.js';
import { treks3 } from './a3/treks.js';
import { actions4 } from './a4/actions.js';
import { enemies4 } from './a4/enemies.js';
import { clues4, goals4, mysteries4, npcs4 } from './a4/journal.js';
import { areas4, locations4 } from './a4/places.js';
import { resources4 } from './a4/resources.js';
import { scenesA4 } from './a4/scenes.js';
import { treks4 } from './a4/treks.js';

/** Barrels at home keep more food and salted meat. */
const withBarrels = (list: ResourceDef[]): ResourceDef[] =>
  list.map((r) => (r.id === R.food || r.id === R2.meat ? { ...r, capBonus: [...(r.capBonus ?? []), barrels] } : r));

export const content: Content = {
  areas: [...areas, ...areas2, ...areas3, ...areas4, ...sideAreas1],
  resources: withBarrels([...resources, ...resources2, ...needs1Resources, ...needs2Resources, ...sideResources1, ...sideResources2, ...gardenResources, ...folkResources, ...resources3, ...resources4]),
  actions: [...actions, ...actions2, ...actionsA2, ...needs1Actions, ...needs2Actions, ...sideActions1, ...sideActions2, ...gardenActions, ...folkActions, ...actions3, ...prepActions3, ...actions4],
  pools,
  locations: [...locations, ...locations2, ...locations3, ...locations4, ...sideLocations1, ...sideLocations2, ...gardenLocations],
  scenes: [...scenes1, ...scenes2, ...scenesA2, ...scenesA2b, ...suppersA2, ...sideScenes1, ...sideScenes2, ...scenesA3, ...scenesA4],
  encounters: [],
  clues: [...clues, ...clues2, ...clues3, ...clues4, ...sideClues1, ...sideClues2],
  mysteries: [...mysteries, ...mysteries2, ...mysteries3, ...mysteries4, ...sideMysteries],
  goals: [...goals4, ...goals3, ...goals2, ...goals1, goalFallback],
  npcs: [...npcs, ...npcs2, ...npcs3, ...npcs4, ...sideNpcs1, ...sideNpcs2],
  enemies: [...enemies, ...enemies2, ...enemies3, ...enemies4, ...sideEnemies1, ...sideEnemies2],
  residents: [...residents, ...residents2, ...residents3, ...sideResidents2],
  trades,
  perks,
  traits,
  hero,
  dog: { flag: 'p2_dog_back', name: 'Сірко', trained: { flag: 'p2_dog_trained' }, collar: { flag: 'q20_collar' } },
  quests: [...quests1, ...quests2],
  preps: [...preps3],
  daily: [...sideDaily1, ...sideDaily2],
  workBonus: [...sideWorkBonus2],
  food: R.food,
  stove: { perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  needs: { ...needs, comfort: [...needs.comfort, ...sideComfort1, ...sideComfort2] },
  weather,
  events,
  garden,
  yard,
  ambient: { ...ambient, areas: { ...ambient.areas, a_10: 'hill', a_11: 'river', a_12: 'marsh', a_13: 'river', a_14: 'grove', a_15: 'hill', a_16: 'marsh', a_17: 'river', a_18: 'hill', a_19: 'marsh' }, actions: { ...ambient.actions, ...fx2, ...fx3, ...prepFx3, ...needs1Fx, ...needs2Fx, ...sideFx1, ...sideFx2, ...gardenFx } },
  maps: [...treks3, ...treks4],
  start: { resources: {}, hp: 22, area: A.shore },
  storyFlags: ['p2_', 'done:s_', 'legacy'],
  actEnd: {
    1: 'Кінець першої дії. Варниця ваша — працюйте, ходіть плавнями, готуйтеся. Далі буде.',
    2: 'Кінець другої дії. Варниця тепер — дім для багатьох. А шлях кличе далі. Далі буде.',
    3: 'Кінець третьої дії. Сотню виведено, табір у кар\'єрі став більшим. А з півдня йде колона. Далі буде.',
  },
  roleTitles,
  ui,
};
