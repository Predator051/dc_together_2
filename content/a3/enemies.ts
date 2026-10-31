import type { EnemyDef } from '../../shared/src/content.js';
import { R } from '../a1/ids.js';
import { R2 } from '../a2/ids.js';
import { E3, G3 } from './ids.js';

export const enemies3: EnemyDef[] = [
  {
    id: E3.rider,
    name: 'Вершник',
    acc: 'вершника',
    gen: 'вершника',
    verb: 'б\'є з коня',
    icon: 'rider',
    level: 9,
    hp: 50,
    dmg: [8, 12],
    armor: 3,
    evade: 1,
    morale: 14,
    humane: true,
    traits: ['fast', 'charge'],
    hidden: ['fearNoise'],
    ai: [
      { move: 'charge', w: 2 },
      { move: 'attack', w: 3 },
    ],
    loot: { [R2.coin]: [2, 4], [R.leather]: [0, 1] },
    rare: { p: 0.15, loot: { [G3.pike]: 1 } },
    desc: 'Людина вербувальника на низькому степовому коні. Довга піка, кобура, свисток. Їздить по шляху й рахує, хто йде пішки.',
  },
  {
    id: E3.captain,
    name: 'Сотник Ярема',
    acc: 'Ярему',
    gen: 'Яреми',
    verb: 'рубає',
    icon: 'captain',
    level: 11,
    hp: 135,
    dmg: [16, 21],
    armor: 4,
    evade: 1,
    humane: true,
    traits: ['shield', 'caller'],
    ai: [
      { move: 'attack', w: 4 },
      { move: 'guard', w: 1 },
      { move: 'sweep' },
    ],
    calls: E3.rider,
    phases: [
      {
        below: 0.6,
        text: 'Ярема відступає до стовпа з ліхтарем і свистить коротко, двічі. З темряви — тупіт.',
        ai: [{ move: 'guard', w: 2 }, { move: 'attack', w: 3 }, { move: 'sweep' }],
        add: [{ enemy: E3.rider, n: 1 }],
      },
      {
        below: 0.3,
        text: 'Ярема скидає жупан і бере шаблю обіруч. — Сотню мені віддасте, — каже рівно, як на плацу. — Або ляжете тут.',
        ai: [{ move: 'call', once: true, every: 1 }, { move: 'attack', w: 3 }, { move: 'sweep' }],
        armor: 3,
      },
    ],
    loot: { [R2.coin]: [10, 14], [G3.pike]: [0, 1] },
    desc: 'Сотник вербувальника. Чисто поголений, у синьому жупані, з паперами за пазухою. Рахує людей так само, як Касіян — міри.',
  },
];
