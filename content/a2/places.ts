import type { AreaDef, LocationDef } from '../../shared/src/content.js';
import { A, E } from '../a1/ids.js';
import { A2, E2, L2, S2 } from './ids.js';

const SEC = 1000;
const act2 = { flag: 'p2_act2' };

export const areas2: AreaDef[] = [
  {
    id: A2.road,
    name: 'Чумацький шлях',
    where: 'на шляху',
    scene: 'road',
    pos: [7, 4],
    danger: 6,
    ambush: 0.1,
    scout: S2.tracks,
    visible: act2,
    foes: [
      { enemy: E2.wolf, n: [2, 3], w: 2 },
      { enemy: E2.snatcher, w: 2 },
      { enemy: E2.wolf, n: [2, 4], w: 3, night: true },
    ],
    desc: 'Битий шлях на схід, колії по коліно. Тут ходять чумацькі обози — і ті, хто на них полює.',
    links: [
      { to: A.well, time: 12 * SEC },
      { to: A.flat, time: 14 * SEC },
      { to: A2.town, time: 12 * SEC },
    ],
  },
  {
    id: A2.town,
    name: 'Солониця',
    where: 'у Солониці',
    scene: 'town',
    pos: [8, 3],
    ambush: 0.12,
    scout: S2.gate,
    visible: act2,
    foes: [{ enemy: E2.snatcher, n: [1, 2], w: 1, if: { all: [{ flag: 'p2_bounty' }, { not: { tool: 'disguise' } }] } }],
    desc: [
      { if: { flag: 'p2_bounty' }, text: 'Місто цеху. На воротах — біла грамота з вашими прикметами.' },
      { text: 'Місто цеху над гирлом. Гори солі під навісами, управа зі знаком, торг, пристань.' },
    ],
  },
  {
    id: A2.bog,
    wet: true,
    name: 'Іржаві мочари',
    where: 'на мочарах',
    scene: 'bog',
    pos: [4, 1],
    danger: 7,
    ambush: 0.12,
    scout: S2.bog,
    visible: { flag: 'done:s_34' },
    foes: [
      { enemy: E2.wolf, n: [2, 3], w: 3 },
      { enemy: E.oldviper, w: 1 },
    ],
    desc: 'Руді калюжі з райдужною плівкою, купини, торф під ногами. Вода тут пахне залізом.',
    links: [
      { to: A.dyke, time: 14 * SEC },
      { to: A.flat, time: 14 * SEC },
    ],
  },
];

export const locations2: LocationDef[] = [
  {
    id: L2.camp,
    name: 'Чумацький стан',
    area: A2.road,
    order: 1,
    visible: act2,
    desc: [
      { if: { flag: 'p2_bounty' }, text: 'Вози Явтуха стоять колом біля броду. Погоничі вдають, що вас не знають, — і вдають погано.' },
      { text: 'Вози Явтуха стоять колом біля броду. Воли ремигають, над вогнем — казан, погоничі співають.' },
    ],
    progress: { flag: 'p2_rep_chumak', max: 6, label: 'Довіра чумаків' },
    spots: [
      { id: 'carts', name: 'Вози', x: 14, y: 24, icon: 'cart' },
      { id: 'ford', name: 'Брід', x: 86, y: 26, icon: 'ford' },
      { id: 'verge', name: 'Узбіччя', x: 12, y: 62, icon: 'grass' },
    ],
  },
  {
    id: L2.market,
    name: 'Торг',
    area: A2.town,
    order: 1,
    visible: act2,
    plan: { x: 50, y: 30, icon: 'scales' },
    progress: { flag: 'p2_rep_town', max: 4, label: 'Знають на торгу' },
    desc: 'Ряди під рогожами: шкури, риба, залізо, віск, полотно. Солі на торгу нема — сіль продає тільки цех.',
  },
  {
    id: L2.hall,
    name: 'Управа',
    area: A2.town,
    order: 2,
    visible: act2,
    plan: { x: 14, y: 22, icon: 'hall' },
    desc: [
      { if: { flag: 'p2_bounty' }, text: 'Кам\'яна управа цеху. На дверях — біла грамота. Ваші прикмети там описано точніше, ніж хотілося б.' },
      { text: 'Кам\'яна управа цеху, над дверима — коло з трьома крапками. Біля ганку — ваги й писар із книгою.' },
    ],
  },
  {
    id: L2.tavern,
    name: 'Корчма',
    area: A2.town,
    order: 3,
    visible: act2,
    plan: { x: 86, y: 22, icon: 'mug' },
    desc: 'Низька корчма над водою. Тут п\'ють чумаки, погоничі, барочники — і говорять те, чого не скажуть на торгу.',
  },
  {
    id: L2.pier,
    name: 'Пристань',
    area: A2.town,
    order: 4,
    visible: act2,
    plan: { x: 12, y: 62, icon: 'pier' },
    desc: 'Барки під сіль. Мішки по три пуди, трап, прикажчик із паличкою для рахунку.',
  },
  {
    id: L2.bog,
    name: 'Іржаві мочари',
    area: A2.bog,
    order: 1,
    visible: { flag: 'done:s_34' },
    desc: 'Під торфом — руда, бура й важка. Тут колись копали: видно старі ями, заплилі водою.',
    spots: [
      { id: 'ore', name: 'Руда', x: 14, y: 24, icon: 'ore' },
      { id: 'peat', name: 'Торфовище', x: 50, y: 22, icon: 'peat' },
      { id: 'berry', name: 'Журавлина', x: 86, y: 26, icon: 'berry' },
    ],
  },
];
