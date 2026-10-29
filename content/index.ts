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

/** Barrels at home keep more food and salted meat. */
const withBarrels = (list: ResourceDef[]): ResourceDef[] =>
  list.map((r) => (r.id === R.food || r.id === R2.meat ? { ...r, capBonus: [...(r.capBonus ?? []), barrels] } : r));

export const content: Content = {
  areas: [...areas, ...areas2, ...sideAreas1],
  resources: withBarrels([...resources, ...resources2, ...needs1Resources, ...needs2Resources, ...sideResources1, ...sideResources2, ...gardenResources, ...folkResources]),
  actions: [...actions, ...actions2, ...actionsA2, ...needs1Actions, ...needs2Actions, ...sideActions1, ...sideActions2, ...gardenActions, ...folkActions],
  pools,
  locations: [...locations, ...locations2, ...sideLocations1, ...sideLocations2, ...gardenLocations],
  scenes: [...scenes1, ...scenes2, ...scenesA2, ...scenesA2b, ...suppersA2, ...sideScenes1, ...sideScenes2],
  encounters: [],
  clues: [...clues, ...clues2, ...sideClues1, ...sideClues2],
  mysteries: [...mysteries, ...mysteries2, ...sideMysteries],
  goals: [...goals2, ...goals1, goalFallback],
  npcs: [...npcs, ...npcs2, ...sideNpcs1, ...sideNpcs2],
  enemies: [...enemies, ...enemies2, ...sideEnemies1, ...sideEnemies2],
  residents: [...residents, ...residents2, ...sideResidents2],
  trades,
  perks,
  traits,
  hero,
  dog: { flag: 'p2_dog_back', name: 'Сірко', trained: { flag: 'p2_dog_trained' }, collar: { flag: 'q20_collar' } },
  quests: [...quests1, ...quests2],
  daily: [...sideDaily1, ...sideDaily2],
  workBonus: [...sideWorkBonus2],
  food: R.food,
  stove: { perWood: 4 * 60 * 1000, maxWood: 8, coldPenalty: 1.3, low: 60 * 1000 },
  needs: { ...needs, comfort: [...needs.comfort, ...sideComfort1, ...sideComfort2] },
  weather,
  events,
  garden,
  ambient: { ...ambient, areas: { ...ambient.areas, a_10: 'hill', a_11: 'river', a_12: 'marsh', a_13: 'river', a_14: 'grove' }, actions: { ...ambient.actions, ...fx2, ...needs1Fx, ...needs2Fx, ...sideFx1, ...sideFx2, ...gardenFx } },
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
