import type { ActionDef, FxKind, PrepDef, ResidentDef } from '../../shared/src/content.js';
import { L, R } from '../a1/ids.js';
import { H4, L4, S4 } from './ids.js';

const SEC = 1000;

/**
 * What one hero can do alone before the together scenes of act four, part two (`.design/act4.md`): the night
 * across the ford (a landing without the first watch, the clerk's tent without sneaking, the watch's hours) and
 * the morning at the water (cleaner salt, guards who know your face).
 */
export const preps4: PrepDef[] = [
  // ------------------------------------------------------------------ the rows
  {
    id: 'prep_reeds_path',
    scene: S4.rows,
    role: 'hunter',
    text: 'Пошукати з хлопчиком зі схованки протоку під самий табір.',
    gives: 'човен пристане там, де не ходять вартові.',
  },
  {
    id: 'prep_uniform',
    scene: S4.rows,
    role: 'maker',
    text: 'Викувати пряжку, як у полку, — з тим самим знаком.',
    gives: 'до намету писаря можна буде пройти, не ховаючись.',
  },
  {
    id: 'prep_watch',
    scene: S4.rows,
    text: 'Простежити з горища корчми на Броді, коли в таборі міняється варта.',
    gives: 'ви знатимете, коли вартовий не дивиться.',
  },
  // ------------------------------------------------------------------ the water
  {
    id: 'prep_salt_fine',
    scene: S4.wake,
    role: 'maker',
    text: 'Виварити вдома найчистішу сіль — двічі, з відстоєм.',
    gives: 'сіль на язик будитиме сильніше.',
  },
  {
    id: 'prep_bucket',
    scene: S4.wake,
    text: 'Кілька днів носити воду вартовим біля водопою — як свій.',
    gives: 'вартові біля води знатимуть вас в обличчя.',
  },
];

export const prepActions4: ActionDef[] = [
  {
    id: 'x_259',
    icon: 'spot:fish',
    group: L4.hide,
    spot: 'water',
    role: 'hunter',
    prep: 'prep_reeds_path',
    label: 'Шукати з хлопчиком протоку під табір',
    effects: [{ set: 'prep_reeds_path' }],
    cooldown: 40 * SEC,
    ambush: 0.15,
    busy: 'шукає протоку в плавнях',
    log: {
      self: 'Хлопчик веде човен туди, де очерет вищий за людину. Двічі ви сідаєте на мілину, раз ледь не випливаєте просто під ліхтар. Утретє — тиха бічна протока, а в кінці — тінь возів обозу. — Тут, — шепоче хлопчик. — Тут ніхто не ходить: тут смердить.',
      other: '{name} шукає з хлопчиком протоку в плавнях.',
    },
  },
  {
    id: 'x_260',
    icon: 'iron',
    group: L.forge,
    role: 'maker',
    prep: 'prep_uniform',
    label: 'Викувати полкову пряжку',
    cost: { [R.iron]: 2, [R.coal]: 2 },
    effects: [{ set: 'prep_uniform' }],
    cooldown: 25 * SEC,
    kind: 'craft',
    busy: 'кує пряжку',
    log: {
      self: 'Коло з трьома крапками ти бачи{в|ла} на брамі в згарищах і на шиях у тихих — рука пам\'ятає. Пряжка виходить важка, рівна, чужа. Ти не хочеш її носити. Носитимеш.',
      other: '{name} кує пряжку з полковим знаком.',
    },
  },
  {
    id: 'x_261',
    icon: 'spot:tracks',
    group: L4.ford,
    spot: 'tavern',
    prep: 'prep_watch',
    label: 'Простежити зміну варти з горища корчми',
    effects: [{ set: 'prep_watch' }],
    cooldown: 40 * SEC,
    ambush: 0.15,
    busy: 'лежить на горищі корчми',
    log: {
      self: 'Від смерку до світанку ти лежиш на горищі без даху й рахуєш. Варта міняється о другій: старі йдуть, нові ще не дійшли. Між ними — сотня ударів серця, коли біля рядів нікого.',
      other: '{name} цілу ніч стежить за табором з горища корчми.',
    },
  },
  {
    id: 'x_262',
    icon: 'salt',
    group: L.pan,
    role: 'maker',
    prep: 'prep_salt_fine',
    label: 'Виварити найчистішу сіль',
    cost: { [R.salt]: 4, [R.water]: 2, [R.wood]: 3 },
    effects: [{ set: 'prep_salt_fine' }],
    cooldown: 30 * SEC,
    kind: 'craft',
    busy: 'виварює сіль удруге',
    log: {
      self: 'Готову сіль ти розчиняєш знову, даєш відстоятися, зливаєш верх і вариш на малому вогні. З чотирьох жмень лишається одна — біла, як сніг, без гіркоти. Таку не продають. Таку кладуть на язик.',
      other: '{name} виварює сіль удруге.',
    },
  },
  {
    id: 'x_263',
    icon: 'water',
    group: L4.ford,
    spot: 'pier',
    prep: 'prep_bucket',
    label: 'Носити воду вартовим біля водопою',
    cost: { [R.water]: 3 },
    effects: [{ set: 'prep_bucket' }],
    cooldown: 35 * SEC,
    ambush: 0.2,
    busy: 'носить воду до водопою',
    log: {
      self: 'Відро — вартовому, кухоль — другому. — Звідки ти? — З Бродових хуторів, що лишилися. — Вартовий п\'є й не питає далі. Завтра він кивне тобі першим.',
      other: '{name} носить воду вартовим біля водопою.',
    },
  },
];

/** Two of the hiding place who would rather live at home, once the place trusts you. */
export const hideActions4: ActionDef[] = [
  {
    id: 'x_258',
    icon: 'spot:hearth',
    group: L4.hide,
    spot: 'fire',
    label: 'Спитати, хто хоче до варниці',
    visible: { all: [{ flag: 'p2_brid' }, { flag: 'p2_rep_hide', gte: 5 }, { noFlag: 'p2_hide_sent' }] },
    effects: [{ set: 'p2_hide_sent' }, { resident: H4.khariton }, { resident: H4.horpyna }],
    cooldown: 10 * SEC,
    kind: 'home',
    busy: 'говорить із Килиною',
    log: {
      self: 'Килина обводить поглядом курінь. — Старому тут не перезимувати, — каже вона. — А Горпина без верстата сохне. Беріть їх. Решта — зі мною: як підемо, то разом. Харитон уже зав\'язує свій клунок — давно був готовий.',
      other: '{name} забирає двох зі схованки до варниці.',
    },
  },
];

export const residents4: ResidentDef[] = [
  {
    id: H4.khariton,
    name: 'Харитон',
    desc: 'Бондар із Бродових хуторів. Старий; онук пішов у полк сам — його нагодували. У схованці ходив без шапки, вдома Горпина сплела йому бриль з очерету.',
    traits: [
      { name: 'Бондар', text: 'Дерево й кору на обручі бере вдвічі.', mult: { x_02: 2, x_37: 2 } },
      { name: 'Старий', text: 'Далеко від дому не ходить.', avoid: ['x_74', 'x_90'] },
    ],
  },
  {
    id: H4.horpyna,
    name: 'Горпина',
    desc: 'Ткаля з хутора під Бродом, вдова. Пальці кривуваті від верстата, а пам\'ять — ні: знає всі пісні Пониззя, крім тих, що співали тихі.',
    traits: [
      { name: 'Ткаля', text: 'Очерет — у півтора раза.', mult: { x_06: 1.5 } },
      { name: 'Боїться ропи', text: 'До солончака й ропи не підходить: бачила, що з неї варять.', avoid: ['x_33', 'x_34'] },
    ],
  },
];

export const prepFx4: Record<string, FxKind> = {
  x_258: 'care',
  x_259: 'care',
  x_260: 'build',
  x_261: 'care',
  x_262: 'build',
  x_263: 'care',
};
