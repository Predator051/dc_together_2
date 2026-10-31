// The past the two share, day to day: late autumn on the road north, hunger and cold (light: the fire
// under the oak is theirs and they keep it), a hot dish, and small happenings between the story's beats.
import type { ActionDef, AmbientDef, Cond, EventSetDef, NeedsDef, ResourceDef, WeatherSetDef } from '../../../shared/src/content.js';
import { SA, SE, SL, SR } from './ids.js';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const met: Cond = { flag: 'ps_met' };
const sky = (...ids: string[]): Cond => ({ any: ids.map((weather) => ({ weather })) });

export const SU = { kulish: 'ps_u1' } as const;

export const lifeResourcesS: ResourceDef[] = [
  {
    id: SU.kulish,
    icon: 'porridge',
    name: 'Куліш',
    order: 1.5,
    kind: 'use',
    cap: 8,
    weight: 1,
    meal: { hp: 6, minutes: 18, warm: 40 },
    desc: 'Що є в торбах — у один казанок. Їсти з однієї ложки по черзі.',
    use: {
      anywhere: true,
      label: 'З\'їсти куліш',
      log: { self: ['Куліш гарячий. Ти їси й дивишся у вогонь, і на хвилину ніде не треба йти.', 'Ложка одна на двох. Ти їси свою половину.'], other: '{name} їсть куліш.' },
    },
  },
];

export const lifeActionsS: ActionDef[] = [
  {
    id: 'ps_x20',
    group: SL.oak,
    spot: 'oak',
    label: 'Зварити куліш',
    visible: met,
    enabled: { stove: 'warm' },
    disabledHint: 'Варять на вогні.',
    cost: { [SR.food]: 2 },
    yield: { [SU.kulish]: 2 },
    cooldown: 12 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Гаряче ситніше за сухий хліб і гріє.',
    busy: 'варить куліш',
    log: { self: 'Казанок висить над вогнем на гілці. Ти кидаєш усе, що є, і мішаєш.', other: '{name} варить куліш.' },
  },
  {
    id: 'ps_x21',
    icon: 'spot:bed',
    group: SL.oak,
    spot: 'oak',
    label: 'Поставити курінь під дубом',
    visible: met,
    cost: { [SR.wood]: 6, [SR.hide]: 2 },
    cooldown: 14 * SEC,
    kind: 'build',
    once: true,
    why: 'Під дубом сухо, поки нема вітру. Курінь — щоб і з вітром.',
    busy: 'ставить курінь',
    log: { self: 'Жердини до дуба, гілля зверху, шкурки на вхід. Тісно на двох. Тепло.', other: '{name} ставить курінь під дубом.' },
  },
];

export const needsS: NeedsDef = {
  from: met,
  snack: SR.food,
  campWood: SR.wood,
  comfort: [
    { if: { stove: 'warm' }, name: 'вогонь під дубом' },
    { if: { flag: 'built:ps_x21' }, name: 'курінь' },
  ],
};

export const weatherS: WeatherSetDef = {
  from: met,
  seasons: [{ season: 'autumn' }],
  span: [15 * MIN, 25 * MIN],
  first: 'ps_w1',
  kinds: [
    {
      id: 'ps_w1',
      name: 'Ясно',
      weight: 4,
      log: ['Розвиднілося. Діброва жовта, небо високе.', 'Тихо й ясно. Далеко чути дзвін із монастиря.'],
    },
    {
      id: 'ps_w2',
      name: 'Вітер',
      weight: 3,
      sky: 'wind',
      log: ['Вітер зриває з дубів останнє листя.', 'Знявся вітер — холодний, з півночі.'],
      chill: 4,
      dry: 2,
      bonus: { fx: ['twigs'], p: 0.3, text: 'Вітер ламає сухе гілля: хмизу буває більше' },
    },
    {
      id: 'ps_w3',
      name: 'Мряка',
      weight: 3,
      sky: 'rain',
      log: ['Сіється мряка — дрібна, холодна, нескінченна.', 'Мокро. Дорога розкисла, листя липне до чобіт.'],
      travel: 1.1,
      ambush: 0.7,
      chill: 3,
      dry: 0,
    },
    {
      id: 'ps_w4',
      name: 'Туман',
      weight: 2,
      sky: 'fog',
      log: ['Туман ліг у діброву. Стовбури виходять з нього, як люди.', 'Ранок у молоці. Чути тільки ворон.'],
      travel: 1.1,
      ambush: 1.4,
      xp: 1.3,
      bonus: { fx: ['snare'], p: 0.35, text: 'У тумані звіра легше підкрасти' },
    },
    {
      id: 'ps_w5',
      name: 'Приморозок',
      weight: 3,
      sky: 'frost',
      log: ['Приморозок: листя під ногами хрустить, калюжі взялися кригою.', 'Холодно. На ковдрах уранці іній.'],
      chill: 6,
      frozen: true,
      travel: 0.9,
      bonus: { fx: ['twigs'], p: 0.3, text: 'Мерзле гілля ламається легко' },
    },
  ],
};

export const ambientS: AmbientDef = {
  areas: { [SA.oak]: 'grove', [SA.abbey]: 'hill', [SA.ford]: 'river' },
  actions: {
    ps_x01: 'snare',
    ps_x02: 'twigs',
    ps_x20: 'steam',
    ps_x21: 'build',
  },
};

export const eventsS: EventSetDef = {
  from: met,
  gap: [15 * MIN, 25 * MIN],
  road: 0.4,
  place: 0.15,
  kinds: [
    {
      id: 'ps_ev01',
      where: 'home',
      weight: 2,
      again: 3 * HOUR,
      text: 'Уночі за дубом хтось ходить — тихо, обережно, по колу.',
      choices: [
        {
          label: 'Встати й чекати',
          outcomes: [
            { w: 2, log: 'З темряви світять двоє очей. Вовк довго дивиться на вогонь — і йде.' },
            { w: 1, log: 'Вовк виходить на світло. Голодний, і не сам.', effects: [{ fight: [{ enemy: SE.wolf, n: 1 }] }] },
          ],
        },
        { label: 'Підкинути у вогонь', cost: { [SR.wood]: 2 }, outcomes: [{ log: 'Вогонь спалахує під саму крону. Кроки відходять у темряву.' }] },
      ],
    },
    {
      id: 'ps_ev02',
      where: 'home',
      when: sky('ps_w3'),
      weight: 4,
      text: 'Мряка пробиває крону: вогонь шипить, ковдри відсиріли.',
      choices: [
        { label: 'Натягнути шкурку над вогнем', cost: { [SR.hide]: 1 }, outcomes: [{ log: 'Шкурка парує, але вогонь живий. Ковдри сохнуть.' }] },
        { label: 'Перечекати', outcomes: [{ log: 'Хліб у торбі розмок на кашу. (Харчі −2)', effects: [{ take: { [SR.food]: 2 } }] }] },
      ],
    },
    {
      id: 'ps_ev03',
      where: 'home',
      weight: 2,
      once: true,
      tone: 'good',
      text: 'Під корінням дуба, де вітер видув листя, — старий казанок, закопаний догори дном. Під ним — жменя пшона в ганчірці. Хтось тут теж зимував. (Харчі +2)',
      effects: [{ add: { [SR.food]: 2 } }],
    },
    {
      id: 'ps_ev04',
      where: 'road',
      areas: [SA.abbey],
      weight: 3,
      again: 2 * HOUR,
      text: 'На дорозі до монастиря — старий чернець із возиком. Колесо в ямі, і він не лається: молиться.',
      choices: [
        { label: 'Допомогти', outcomes: [{ log: 'Ви вдвох виносите колесо з ями. Чернець дає по коржу з медом і хрестить услід. (Харчі +2)', effects: [{ give: { [SR.food]: 2 } }] }] },
        { label: 'Пройти', outcomes: [{ log: 'Чернець дивиться вам услід, не просить нічого.' }] },
      ],
    },
    {
      id: 'ps_ev05',
      where: 'place',
      areas: [SA.oak],
      when: sky('ps_w2', 'ps_w5'),
      weight: 3,
      tone: 'good',
      text: 'Вітер наламав сухого гілля просто під ноги. (Хмиз +2)',
      effects: [{ give: { [SR.wood]: 2 } }],
    },
    {
      id: 'ps_ev06',
      where: 'road',
      areas: [SA.abbey, SA.ford],
      when: { flag: 'ps_trail', gte: 2 },
      weight: 2,
      again: 2 * HOUR,
      text: 'Обабіч дороги в кущах щось блищить. Схоже на пряжку — і на людину при ній.',
      choices: [
        {
          label: 'Обійти тихо',
          outcomes: [{ log: 'Ви обходите кущі по полю. Пряжка лишається блищати.' }],
        },
        { label: 'Підійти', outcomes: [{ log: 'Людина при пряжці — з кийком, і чекала саме на вас.', effects: [{ fight: [{ enemy: SE.robber, n: 1 }] }] }] },
      ],
    },
  ],
};
