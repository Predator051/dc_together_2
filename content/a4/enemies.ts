import type { EnemyDef } from '../../shared/src/content.js';
import { R } from '../a1/ids.js';
import { R2 } from '../a2/ids.js';
import { E4 } from './ids.js';

export const enemies4: EnemyDef[] = [
  {
    id: E4.looter,
    name: 'Мародер',
    acc: 'мародера',
    gen: 'мародера',
    verb: 'б\'є',
    icon: 'snatcher',
    level: 10,
    hp: 46,
    dmg: [7, 11],
    armor: 2,
    evade: 1,
    morale: 12,
    humane: true,
    traits: [],
    ai: [
      { move: 'attack', w: 3 },
      { move: 'grab', w: 1 },
    ],
    loot: { [R2.coin]: [2, 5], [R.iron]: [0, 1] },
    desc: 'Відстав від полку чи сам по собі — ходить згарищами й збирає те, що не догоріло. Чужого не шкодує, свого не має.',
  },
  {
    id: E4.strays,
    name: 'Пес зі згарища',
    acc: 'пса',
    gen: 'пса',
    verb: 'рве',
    icon: 'dog',
    level: 10,
    hp: 30,
    dmg: [6, 9],
    evade: 1,
    morale: 12,
    traits: ['pack'],
    ai: [
      { move: 'attack', w: 3 },
      { move: 'grab', w: 1 },
    ],
    loot: { [R.hide]: [1, 1], [R.bone]: [0, 1] },
    desc: 'Чийсь колись. Тепер — нічий, і зграєю. Людей боїться менше, ніж мав би.',
  },
];
