// The past the two share, day to day: late autumn on the road north, hunger and cold (light: the fire
// under the oak is theirs and they keep it), a hot dish, and small happenings between the story's beats.
import type { ActionDef, AmbientDef, Cond, EventSetDef, NeedsDef, ResourceDef, WeatherSetDef } from '../../../shared/src/content.js';
import { SA, SE, SL, SR } from './ids.js';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const met: Cond = { flag: 'ps_met' };
const road: Cond = { all: [met, { noFlag: 'ps_hanna' }] };
const village: Cond = { flag: 'ps_hanna' };
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
    visible: road,
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
    visible: road,
    cost: { [SR.wood]: 6, [SR.hide]: 2 },
    cooldown: 14 * SEC,
    kind: 'build',
    once: true,
    why: 'Під дубом сухо, поки нема вітру. Курінь — щоб і з вітром.',
    busy: 'ставить курінь',
    log: { self: 'Жердини до дуба, гілля зверху, шкурки на вхід. Тісно на двох. Тепло.', other: '{name} ставить курінь під дубом.' },
  },
];

const hearth: ActionDef = {
  id: 'ps_x22',
  group: SL.house,
  spot: 'hearth',
  label: 'Зварити куліш у Ганниній печі',
  visible: village,
  enabled: { stove: 'warm' },
  disabledHint: 'Варять у теплій печі.',
  cost: { [SR.food]: 2 },
  yield: { [SU.kulish]: 2 },
  cooldown: 12 * SEC,
  skill: 'craft',
  kind: 'craft',
  why: 'Гаряче ситніше за сухий хліб і гріє.',
  busy: 'варить куліш',
  log: { self: ['Ганна відсуває тебе від печі: «Не так». Потім дивиться й дозволяє: «Ну, хай так».', 'Казанок у печі, пшоно, сало, цибуля. Пахне на всю хату, і Ганна каже: «От тепер — хата».'], other: '{name} варить куліш у Ганниній печі.' },
};
lifeActionsS.push(hearth);

export const needsS: NeedsDef = {
  from: met,
  snack: SR.food,
  campWood: SR.wood,
  comfort: [
    { if: { all: [{ stove: 'warm' }, village] }, name: 'Ганнина піч' },
    { if: { stove: 'warm' }, name: 'вогонь під дубом' },
    { if: { flag: 'ps_loom' }, name: 'Ганна співає за кроснами' },
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
      log: ['Розвиднілося. Ліс жовтий, небо високе.', 'Тихо й ясно. Далеко-далеко чути дзвін.'],
    },
    {
      id: 'ps_w2',
      name: 'Вітер',
      weight: 3,
      sky: 'wind',
      log: ['Вітер зриває з дерев останнє листя.', 'Знявся вітер — холодний, з півночі.'],
      chill: 4,
      dry: 2,
      bonus: { fx: ['twigs'], p: 0.3, text: 'Вітер ламає сухе гілля: хмизу буває більше' },
    },
    {
      id: 'ps_w3',
      name: 'Мряка',
      weight: 3,
      sky: 'rain',
      log: ['Сіється мряка — дрібна, холодна, нескінченна.', 'Мокро. Стежки розкисли, листя липне до чобіт.'],
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
      log: ['Туман ліг на ліс. Стовбури виходять з нього, як люди.', 'Ранок у молоці. Чути тільки ворон.'],
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
  areas: {
    [SA.oak]: 'grove',
    [SA.abbey]: 'hill',
    [SA.ford]: 'river',
    [SA.house]: 'hill',
    [SA.square]: 'hill',
    [SA.mill]: 'river',
    [SA.apiary]: 'grove',
    [SA.wood]: 'grove',
    [SA.hill]: 'hill',
  },
  actions: {
    ps_x01: 'snare',
    ps_x02: 'twigs',
    ps_x20: 'steam',
    ps_x21: 'build',
    ps_x22: 'steam',
    ps_x30: 'water',
    ps_x31: 'chop',
    ps_x32: 'build',
    ps_x33: 'twigs',
    ps_x34: 'arrow',
    ps_x35: 'twigs',
    ps_x38: 'build',
    ps_x39: 'build',
    ps_x42: 'arrow',
    ps_x43: 'build',
    ps_x45: 'build',
    ps_x46: 'forge',
    ps_x49: 'chop',
    ps_x50: 'build',
    ps_x55: 'build',
    ps_x58: 'build',
    ps_x63: 'build',
    ps_x69: 'snare',
    ps_x80: 'build',
    ps_x81: 'steam',
    ps_x82: 'fire',
    ps_x84: 'build',
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
      when: road,
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
      when: { all: [road, sky('ps_w3')] },
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
      when: road,
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
      when: { all: [road, sky('ps_w2', 'ps_w5')] },
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
    {
      id: 'ps_ev07',
      where: 'home',
      when: village,
      weight: 2,
      again: 2 * HOUR,
      text: 'Уночі в Ганниному курнику щось шкребеться й квокче.',
      choices: [
        { label: 'Вийти з каганцем', outcomes: [{ log: 'Тхір. Ти виганяєш його за тин, а курку вже не врятуєш. Ганна вранці каже: «Добре, що одна». (Харчі +1)', effects: [{ add: { [SR.food]: 1 } }] }] },
        { label: 'Спати далі', outcomes: [{ log: 'Уранці Ганна мовчки показує на пір\'я біля курника. (Харчі −1)', effects: [{ take: { [SR.food]: 1 } }] }] },
      ],
    },
    {
      id: 'ps_ev08',
      where: 'home',
      when: { all: [village, sky('ps_w3')] },
      weight: 4,
      again: 2 * HOUR,
      text: 'Мряка тече крізь стріху просто над кроснами. Ганна мовчки підставляє миску.',
      choices: [
        { label: 'Полізти на дах з очеретом', cost: { [SR.reed]: 2 }, outcomes: [{ log: 'Мокро, слизько, холодно. Але над кроснами тепер сухо, і Ганна ввечері співає довше, ніж звичайно.' }] },
        { label: 'Перечекати', outcomes: [{ log: 'Основа на кроснах мокне. Ганна перемотує її до ночі й нічого не каже. (Харчі −1)', effects: [{ take: { [SR.food]: 1 } }] }] },
      ],
    },
    {
      id: 'ps_ev09',
      where: 'place',
      areas: [SA.square],
      when: village,
      weight: 2,
      again: 3 * HOUR,
      tone: 'good',
      text: 'Марійка біжить за тобою через увесь майдан. — А правда, що на півдні зима без снігу? — питає вона. — І що там їдять ящірок?',
      choices: [
        { label: 'Сказати правду', outcomes: [{ log: '— Зима там коротка, — кажеш ти. — А ящірок не їдять. — Марійка розчарована. Але йде поруч до самих Ганниних воріт.' }] },
        { label: 'Розсмішити', outcomes: [{ log: '— Їдять, — кажеш ти. — Смаженими. З медом. — Марійка регоче так, що Палажка визирає з вікна. Наступного дня вона приносить тобі яблуко. (Харчі +1)', effects: [{ add: { [SR.food]: 1 } }] }] },
      ],
    },
    {
      id: 'ps_ev10',
      where: 'place',
      areas: [SA.wood],
      when: village,
      weight: 2,
      again: 2 * HOUR,
      text: 'На узліссі, за двадцять кроків, — два вовки. Не тікають і не підходять. Сидять і дивляться, як пси на чужого.',
      choices: [
        { label: 'Відступити повільно', outcomes: [{ log: 'Вони не йдуть за тобою. Дивляться, доки ти не зникаєш за соснами. Жоден не гарчить.' }] },
        { label: 'Підняти зброю', outcomes: [{ w: 1, log: 'Вовки встають обидва разом — без звуку.', effects: [{ fight: [{ enemy: SE.wolf, n: 2 }] }] }, { w: 1, log: 'Вовки встають обидва разом, без звуку, і йдуть у бір. Не тікають — ідуть.' }] },
      ],
    },
    {
      id: 'ps_ev11',
      where: 'home',
      when: { flag: 'ps_feast_done' },
      weight: 2,
      once: true,
      text: 'Уночі по вулиці їде віз. Тихо: коліс майже не чути, коні не форкають. Біля Ганниних воріт віз на хвилину зупиняється.',
      choices: [
        { label: 'Підійти до вікна', outcomes: [{ log: 'На передку — хтось у сірому. Він дивиться на Ганнину хату довго, ніби рахує вікна. Потім віз рушає. Ти не спиш до ранку.' }] },
        { label: 'Не ворушитися', outcomes: [{ log: 'Ти лежиш і слухаєш, як віз стоїть. Потім — як рушає. Ганна на печі не спить теж: ти чуєш, як вона не дихає.' }] },
      ],
    },
  ],
};
