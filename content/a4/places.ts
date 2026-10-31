import type { AreaDef, LocationDef } from '../../shared/src/content.js';
import { E } from '../a1/ids.js';
import { A3, E3 } from '../a3/ids.js';
import { A4, E4, L4 } from './ids.js';

const SEC = 1000;
const south = { flag: 'p2_brid' };

/**
 * The south (the second map sheet): a hiding place in the reeds by the ford, the ford itself, the ashes of
 * the maker's town and of the hunter's island. Reached by the long road with a cart the first time; then a
 * day's walk from the camp in the quarry (the edge of both sheets).
 */
export const areas4: AreaDef[] = [
  {
    id: A4.hide,
    name: 'Схованка в плавнях',
    where: 'у схованці',
    scene: 'reeds',
    pos: [7, 6],
    visible: south,
    danger: 10,
    ambush: 0.04,
    foes: [{ enemy: E.catfish, w: 1 }],
    desc: [
      { if: { flag: 'p2_hide_walled' }, text: 'Острівець серед протоки, курінь, засіки з очерету. Вогонь — тільки вночі, бо з того берега дивляться.' },
      { text: 'Острівець серед протоки, курінь, вісім душ. Вогонь — тільки вночі, бо з того берега дивляться.' },
    ],
    links: [
      { to: A3.camp, time: 60 * SEC },
      { to: A4.ford, time: 10 * SEC },
      { to: A4.isle, time: 8 * SEC },
      { to: A4.town, time: 14 * SEC },
    ],
  },
  {
    id: A4.ford,
    name: 'Брід',
    where: 'на Броді',
    scene: 'brid',
    pos: [8, 6],
    visible: south,
    danger: 12,
    ambush: 0.1,
    foes: [
      { enemy: E3.rider, n: [1, 2], w: 2 },
      { enemy: E4.looter, n: [1, 2], w: 1 },
    ],
    desc: 'Згорілий пором, корчма без даху. На тому березі — табір полку: рівні ряди, і ні звуку.',
    links: [{ to: A4.town, time: 12 * SEC }],
  },
  {
    id: A4.town,
    name: 'Кривець',
    where: 'у Кривці',
    scene: 'ashtown',
    pos: [6, 6],
    visible: south,
    danger: 11,
    ambush: 0.08,
    foes: [
      { enemy: E4.strays, n: [2, 3], w: 2 },
      { enemy: E4.looter, n: [1, 1], w: 1 },
    ],
    desc: 'Церква без бані, торг — чорні кілки. Городок, якого більше нема.',
  },
  {
    id: A4.isle,
    name: 'Острів',
    where: 'на острові',
    scene: 'ashisle',
    pos: [7, 7],
    visible: south,
    danger: 10,
    ambush: 0.05,
    foes: [{ enemy: E4.strays, n: [2, 2], w: 1 }],
    desc: 'Гряда серед плавнів: чорні кілки сітей, обвалена коптильня. Видно Брід і табір за ним.',
  },
];

export const locations4: LocationDef[] = [
  {
    id: L4.hide,
    name: 'Схованка',
    area: A4.hide,
    order: 1,
    visible: south,
    progress: { flag: 'p2_rep_hide', max: 6, label: 'Довіра схованки' },
    desc: [
      { if: { flag: 'p2_rep_hide', gte: 4 }, text: 'Килина вже ставить вашу миску поруч зі своєю. Хлопчик з вудкою показує, де клює.' },
      { text: 'Курінь, вогнище в ямі, вісім душ. На вас дивляться так, як дивляться на тих, хто може привести полк.' },
    ],
    spots: [
      { id: 'reeds', name: 'Очерет', x: 14, y: 22, icon: 'reed' },
      { id: 'fire', name: 'Курінь', x: 50, y: 24, icon: 'hearth' },
      { id: 'water', name: 'Протока', x: 86, y: 22, icon: 'fish' },
    ],
  },
  {
    id: L4.ford,
    name: 'Брід',
    area: A4.ford,
    order: 1,
    visible: south,
    desc: 'Пором згорів по самі поручні. У корчмі — ні даху, ні дверей, тільки піч. За водою — табір.',
    spots: [
      { id: 'carts', name: 'Розбиті вози', x: 14, y: 24, icon: 'cart' },
      { id: 'tavern', name: 'Корчма', x: 50, y: 20, icon: 'mug' },
      { id: 'pier', name: 'Пором', x: 86, y: 26, icon: 'pier' },
    ],
  },
  {
    id: L4.town,
    name: 'Кривець',
    area: A4.town,
    order: 1,
    visible: south,
    desc: 'Вугілля під ногами, обгорілі одвірки, криниця з журавлем — ціла. Тут жили сотні. Тепер — пси.',
    spots: [
      { id: 'ashes', name: 'Згарища', x: 12, y: 44, icon: 'driftwood' },
      { id: 'smith', name: 'Залізний ряд', x: 55, y: 15, icon: 'iron' },
      { id: 'church', name: 'Біля церкви', x: 83, y: 16, icon: 'hall' },
    ],
  },
  {
    id: L4.isle,
    name: 'Острів',
    area: A4.isle,
    order: 1,
    visible: south,
    desc: 'Гряда, чорні кілки, яблунька без листя. Звідси видно табір за Бродом — рівні ряди сірих сорочок.',
    spots: [
      { id: 'yard', name: 'Подвір\'я', x: 20, y: 20, icon: 'footprints' },
      { id: 'smoke', name: 'Коптильня', x: 47, y: 18, icon: 'kiln' },
      { id: 'nets', name: 'Кілки сітей', x: 80, y: 20, icon: 'stakes' },
    ],
  },
];
