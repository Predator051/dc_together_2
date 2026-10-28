import type { ResourceDef } from '../../shared/src/content.js';
import { U } from '../a1/ids.js';
import { G3, R3, T3 } from './ids.js';

const shelves = (add: number) => [
  { if: { flag: 'built:x_31' }, add },
  { if: { flag: 'built:x_32' }, add },
];

export const resources3: ResourceDef[] = [
  // ----- materials -----
  { id: R3.hay, icon: 'hay', name: 'Сіно', order: 30, cap: 30, capBonus: shelves(10), weight: 1, desc: 'Степова трава, скошена й висушена на вітрі. Волам у дорогу.' },
  { id: R3.tar, icon: 'tar', name: 'Дьоготь', order: 30.5, cap: 10, weight: 0.5, desc: 'Чорний, липкий, пахне березою й димом. Без нього колеса скриплять і горять.' },

  { id: R3.tarpanhide, icon: 'hide', name: 'Тарпанова шкура', order: 30.7, cap: 6, weight: 1.5, desc: 'Мишаста, тонка й туга — не те, що кабаняча. На бубон кращої нема.' },

  // ----- things kept for a purpose -----
  { id: T3.cart, icon: 'wagon', name: 'Віз', order: 43, kind: 'tool', weight: 0, desc: 'Ваш власний віз: дубові полудрабки, окуті колеса, мазниця з дьогтем. У степ без нього не ходять.' },
  { id: T3.oxen, icon: 'oxen', name: 'Пара волів', order: 44, kind: 'tool', weight: 0, desc: 'Старі, сиві, повільні. Явтухові. Ідуть, поки є сіно.' },
  { id: T3.keg, icon: 'keg', name: 'Барило для води', order: 45, kind: 'tool', weight: 0, desc: 'Дубове барило на ремені під возом. У степу вода — те саме, що дорога.' },
  { id: T3.wheel, icon: 'wheel', name: 'Запасне колесо', order: 46, kind: 'tool', weight: 0, desc: 'Прив\'язане ззаду до воза. Коли тріснуть шини на камені — не стоятимете.' },
  {
    id: T3.drum,
    icon: 'drum',
    name: 'Тулумбас',
    order: 47,
    kind: 'use',
    cap: 1,
    weight: 1,
    desc: 'Великий бубон на шкіряній основі. Б\'єш — і в грудях відгукується.',
    use: {
      scare: { trait: 'fearNoise', fear: 14 },
      reusable: true,
      label: 'Бити в тулумбас',
      log: { self: 'Ти б\'єш у тулумбас: двічі, важко, на всю силу. Гул іде по землі.', other: '{name} б\'є в тулумбас.' },
    },
  },
  { id: T3.knife, icon: 'knife', name: 'Ножик з «Д»', order: 48, kind: 'tool', weight: 0, desc: 'Маленький, сточений, з вирізаною на колодочці «Д». Тим самим нахилом, що на одвірку.' },

  // ----- gear -----
  {
    id: G3.scythe,
    icon: 'scythe',
    name: 'Коса',
    order: 80,
    kind: 'gear',
    weight: 1.5,
    gear: { slot: 'weapon', dmg: [2, 5], tags: ['reach'], tools: ['scythe'] },
  },
  {
    id: G3.lamellar,
    icon: 'lamellar',
    name: 'Лати з бляхи',
    order: 81,
    kind: 'gear',
    weight: 3,
    gear: { slot: 'body', armor: 3, hp: 3, tags: ['heavy'] },
  },
  {
    id: G3.mace,
    icon: 'mace',
    name: 'Чекан',
    order: 82,
    kind: 'gear',
    weight: 1.5,
    gear: { slot: 'weapon', dmg: [4, 7], acc: 0.04, tags: ['pierce'], tools: ['pick'] },
  },
  {
    id: G3.longbow,
    icon: 'longbow',
    name: 'Степовий лук',
    order: 83,
    kind: 'gear',
    weight: 1,
    gear: { slot: 'weapon', dmg: [4, 7], acc: 0.08, tags: ['ranged'], ammo: U.arrow },
  },
  { id: G3.cap, icon: 'helm', name: 'Мисюрка', order: 84, kind: 'gear', weight: 1, gear: { slot: 'head', armor: 2, hp: 2 } },
];
