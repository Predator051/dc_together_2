// The maker's past, day to day: weather by the season of each chapter, hunger and cold (light: the
// household keeps the fire while the workshop stands, the column has its own on the road), a hot dish,
// and small happenings between the story's beats.
import type { ActionDef, AmbientDef, Cond, EventSetDef, NeedsDef, ResourceDef, WeatherSetDef } from '../../../shared/src/content.js';
import { PA4, PE4, PL4 } from './ch4.js';
import { PA, PE, PL, PR } from './ids.js';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const inside: Cond = { flag: 'pm_in' };
/** The workshop still stands (the household keeps its fire). */
const standing: Cond = { noFlag: 'pm_ch3_done' };
const road: Cond = { flag: 'pm_ch4' };
/** From the first chapter's end to the third chapter's start: spring and summer of the war. */
const spring: Cond = { all: [{ flag: 'pm_ch1_done' }, { noFlag: 'pm_ch3' }] };
const autumn: Cond = { not: spring };
const sky = (...ids: string[]): Cond => ({ any: ids.map((weather) => ({ weather })) });

export const PU = { kulish: 'pm_u1' } as const;

export const lifeResourcesM: ResourceDef[] = [
  {
    id: PU.kulish,
    icon: 'porridge',
    name: 'Куліш',
    order: 7.5,
    kind: 'use',
    cap: 8,
    weight: 1,
    meal: { hp: 5, minutes: 18, warm: 40 },
    desc: 'Пшоно, сало, цибуля — у Явдошиному горщику. Густий, гарячий, ложка стоїть.',
    use: {
      anywhere: true,
      label: 'З\'їсти куліш',
      log: { self: ['Куліш гарячий, аж пече. Тепло йде до самих п\'ят.', 'Ти їси куліш просто з горщика, дмухаючи на ложку.'], other: '{name} їсть куліш.' },
    },
  },
];

export const lifeActionsM: ActionDef[] = [
  {
    id: 'pm_x120',
    group: PL.shop,
    spot: 'hearth',
    label: 'Зварити куліш',
    visible: { all: [inside, standing] },
    enabled: { stove: 'warm' },
    disabledHint: 'Варять на вогні.',
    cost: { [PR.food]: 2 },
    yield: { [PU.kulish]: 2 },
    cooldown: 12 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Гаряче ситніше за сухий окраєць і гріє.',
    busy: 'варить куліш',
    log: { self: ['Явдоха дає горщик і пшоно: «Мішай, не відходь». Ти мішаєш.', 'Куліш булькає в печі. У хаті пахне салом і димом.'], other: '{name} варить куліш.' },
  },
  {
    id: 'pm_x121',
    group: PL4.camp,
    spot: 'fire',
    label: 'Зварити куліш на спільному вогні',
    visible: road,
    cost: { [PR.food]: 2 },
    yield: { [PU.kulish]: 2 },
    cooldown: 14 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Казанок на всіх, і ложка своя.',
    busy: 'варить куліш',
    log: { self: 'Хтось дає казанок, хтось — воду. Ти кидаєш свої харчі, і над вогнем пахне, як удома.', other: '{name} варить куліш на спільному вогні.' },
  },
];

export const needsM: NeedsDef = {
  from: inside,
  snack: PR.food,
  // dry osier burns well enough for a night by the road
  campWood: PR.osier,
  fires: { [PA4.camp]: road },
  comfort: [
    { if: standing, name: 'дах над головою' },
    { if: { stove: 'warm' }, name: 'у печі горить' },
    { if: { flag: 'built:pm_x122' }, name: 'своя лежанка' },
    { if: { flag: 'pm_tymko_kept' }, name: 'Тимко поруч' },
  ],
};

/** A bed of one's own in the workshop: a little more rest by the fire. */
export const bedM: ActionDef = {
  id: 'pm_x122',
  icon: 'spot:bed',
  group: PL.shop,
  spot: 'hearth',
  label: 'Збити собі лежанку',
  visible: { all: [inside, standing, { flag: 'pm_fame', gte: 1 }] },
  cost: { [PR.oak]: 3, [PR.osier]: 4 },
  cooldown: 12 * SEC,
  kind: 'build',
  once: true,
  why: 'Досі спиш на стружці під верстаком. Гордій каже: «Ти ж майстер. Зроби».',
  busy: 'збиває лежанку',
  log: { self: 'Чотири дошки, лозове плетиво, мішок соломи. Перша річ, яку ти зробив{|ла} для себе.', other: '{name} збиває собі лежанку.' },
};

export const weatherM: WeatherSetDef = {
  from: inside,
  span: [15 * MIN, 25 * MIN],
  first: 'pm_w1',
  kinds: [
    {
      id: 'pm_w1',
      name: 'Ясно',
      weight: 5,
      log: ['Небо чисте, над Глушею тихо.', 'Розвиднілося. Дахи Кривця блищать.'],
    },
    {
      id: 'pm_w2',
      name: 'Вітер',
      weight: 3,
      sky: 'wind',
      log: ['Вітер із-за річки гне верби й рве солому зі стріх.', 'Знявся вітер. На торгу ловлять полотно з ятер.'],
      chill: 3,
      dry: 2,
      bonus: { fx: ['twigs'], p: 0.3, text: 'Вітер обтрушує кущі: збирати буває щедріше' },
    },
    {
      id: 'pm_w3',
      name: 'Дощ',
      weight: 3,
      sky: 'rain',
      log: ['Сіється дощ — дрібний, довгий.', 'Задощило. По майдану течуть руді струмки.'],
      travel: 1.1,
      ambush: 0.7,
      chill: 2,
      dry: 0,
      bonus: { fx: ['fish'], p: 0.35, text: 'У дощ риба бере краще' },
    },
    {
      id: 'pm_w4',
      name: 'Туман',
      weight: 2,
      sky: 'fog',
      log: ['Туман з Глуші заліз у вулиці. Дзвіниці не видно.', 'Ранок у молоці. Чути тільки півнів.'],
      travel: 1.1,
      ambush: 1.4,
      xp: 1.3,
    },
    {
      id: 'pm_w5',
      name: 'Приморозок',
      weight: 2,
      when: autumn,
      sky: 'frost',
      log: ['Приморозок: калюжі взялися шклом, трава біла.', 'Холодно. Яблука в саду вкрилися інеєм.'],
      chill: 5,
      frozen: true,
      travel: 0.9,
      jobs: 0.9,
      bonus: { fx: ['chop'], p: 0.35, text: 'Мерзле дерево колеться легше' },
    },
    {
      id: 'pm_w6',
      name: 'Пригріває',
      weight: 3,
      when: spring,
      sky: 'heat',
      log: ['Сонце пригріває, у саду гудуть бджоли.', 'Тепло, як улітку. Від землі йде пара.'],
      pace: 1.1,
      chill: -3,
      dry: 2,
      bonus: { fx: ['rubble'], p: 0.3, text: 'Суха глина копається легше' },
    },
    {
      id: 'pm_w7',
      name: 'Гроза',
      weight: 1,
      when: spring,
      sky: 'storm',
      log: ['Над Глушею гримить. Злива — стіною.', 'Небо чорне, блискавка б\'є десь за річкою.'],
      pace: 1.1,
      travel: 1.25,
      ambush: 0.4,
      chill: 4,
      dry: 0,
      jobs: 0.6,
    },
  ],
};

export const ambientM: AmbientDef = {
  areas: {
    [PA.shop]: 'hill',
    [PA.market]: 'hill',
    [PA.bank]: 'river',
    [PA.oaks]: 'grove',
    [PA.road]: 'hill',
    [PA4.camp]: 'hill',
    [PA4.crossing]: 'river',
    [PA4.village]: 'salt',
    [PA4.bees]: 'grove',
    [PA4.wood]: 'grove',
  },
  fires: { [PA4.camp]: road },
  actions: {
    pm_x01: 'twigs',
    pm_x02: 'rubble',
    pm_x03: 'fish',
    pm_x04: 'chop',
    pm_x05: 'twigs',
    pm_x14: 'build',
    pm_x50: 'scrap',
    pm_x91: 'forge',
    pm_x93: 'water',
    pm_x94: 'scrap',
    pm_x95: 'hive',
    pm_x96: 'chop',
    pm_x97: 'build',
    pm_x98: 'fire',
    pm_x99: 'scrap',
    pm_x120: 'steam',
    pm_x121: 'steam',
    pm_x122: 'build',
  },
};

export const eventsM: EventSetDef = {
  from: inside,
  gap: [15 * MIN, 25 * MIN],
  road: 0.4,
  place: 0.15,
  kinds: [
    // ----- at the workshop -----
    {
      id: 'pm_ev01',
      where: 'home',
      when: { all: [standing, autumn] },
      weight: 3,
      once: true,
      text: 'Явдоха кличе з саду: яблука падають, а кошиків два — і рук теж дві.',
      choices: [
        { label: 'Допомогти', outcomes: [{ log: 'Ви носите кошики до льоху до самих сутінок. Явдоха дає тобі вузлик пиріжків. (Харчі +3)', effects: [{ add: { [PR.food]: 3 } }] }] },
        { label: 'Іншим разом', outcomes: [{ log: 'Явдоха махає рукою: «Біжи вже, майстре».' }] },
      ],
    },
    {
      id: 'pm_ev02',
      where: 'home',
      when: { all: [standing, sky('pm_w3', 'pm_w7')] },
      weight: 4,
      text: 'Дощ б\'є в повітку навскіс: дубові дошки під стіною мокнуть.',
      choices: [
        { label: 'Накрити лозовими матами', cost: { [PR.osier]: 2 }, outcomes: [{ log: 'Мати лягають щільно. Дошки сухі.' }] },
        { label: 'Хай мокнуть', outcomes: [{ log: 'Дві дошки повело, як корито. Гордій мовчки відносить їх на дрова. (Дубові дошки −2)', effects: [{ take: { [PR.oak]: 2 } }] }] },
      ],
    },
    {
      id: 'pm_ev03',
      where: 'home',
      when: standing,
      weight: 2,
      again: 3 * HOUR,
      text: 'Гордій кладе перед тобою чужий замок — іржавий, без ключа: «Відімкни. Без лому».',
      choices: [
        {
          label: 'Взятися',
          outcomes: [
            { w: 3, log: 'Пів години з дротиком — і замок клацає. Гордій хмикає, а це в нього похвала. (Досвід +4)', effects: [{ xp: 4, who: 'actor' }] },
            { w: 1, log: 'Замок не піддається. Гордій забирає його й відмикає за хвилину: «Дивись, а не слухай». (Досвід +2)', effects: [{ xp: 2, who: 'actor' }] },
          ],
        },
        { label: 'Попросити показати', outcomes: [{ log: 'Гордій показує раз — повільно, мовчки. Ти запам\'ятовуєш. (Досвід +2)', effects: [{ xp: 2, who: 'actor' }] }] },
      ],
    },
    {
      id: 'pm_ev04',
      where: 'home',
      when: standing,
      weight: 2,
      again: 3 * HOUR,
      text: 'Уночі в повітці шарудить і попискує: щурі з берега добралися до харчів.',
      choices: [
        { label: 'Засісти з молотком', outcomes: [{ log: 'Темрява, мішки, шурхіт — і ось вони.', effects: [{ fight: [{ enemy: PE.rat, n: 2 }] }] }] },
        { label: 'Хай їм', outcomes: [{ log: 'Зранку в мішку дірка. (Харчі −2)', effects: [{ take: { [PR.food]: 2 } }] }] },
      ],
    },
    {
      id: 'pm_ev05',
      where: 'home',
      when: { all: [standing, { flag: 'pm_ch2' }] },
      weight: 2,
      again: 3 * HOUR,
      text: 'Під брамою — жінка з дитиною на руках. З півдня, пішки. Просить хліба.',
      choices: [
        { label: 'Дати харчів', cost: { [PR.food]: 2 }, outcomes: [{ log: 'Вона кланяється й іде на північ. Дитина спить, не знає нічого. (Досвід +3)', effects: [{ xp: 3, who: 'actor' }] }] },
        { label: 'Нема чого дати', outcomes: [{ log: 'Вона киває, ніби іншого й не чекала, і йде.' }] },
      ],
    },
    {
      id: 'pm_ev06',
      where: 'home',
      when: { all: [standing, sky('pm_w5')] },
      weight: 3,
      tone: 'good',
      text: 'Приморозок. Гордій дістає з льоху сало й хліб: «Холод — це коли їсти». (Харчі +2)',
      effects: [{ add: { [PR.food]: 2 } }],
    },
    // ----- on the way and at work -----
    {
      id: 'pm_ev07',
      where: 'road',
      areas: [PA.bank, PA.oaks, PA.road],
      weight: 2,
      again: 2 * HOUR,
      text: 'На шляху — віз із тріснутою віссю. Візник лається на всі боки.',
      choices: [
        { label: 'Допомогти', outcomes: [{ log: 'Ви вдвох підважуєте віз, ти забиваєш клин. Візник віддає тобі мідяк. (Шаги +2)', effects: [{ give: { [PR.coin]: 2 } }] }] },
        { label: 'Пройти мимо', outcomes: [{ log: 'Лайка ще довго котиться тобі вслід.' }] },
      ],
    },
    {
      id: 'pm_ev08',
      where: 'road',
      areas: [PA.oaks],
      when: { all: [sky('pm_w4'), { flag: 'pm_fame', gte: 2 }] },
      weight: 3,
      text: 'У тумані хтось іде слідом: кроки, хрускіт гілля, сопіння.',
      choices: [
        {
          label: 'Обернутися й чекати',
          outcomes: [
            { w: 2, log: 'З туману вискакує вепреня — і з вереском тікає назад. Ти смієшся сам{|а} до себе. (Досвід +2)', effects: [{ xp: 2, who: 'actor' }] },
            { w: 1, log: 'З туману виходить пес — худий, з вишкіреними зубами.', effects: [{ fight: [{ enemy: PE.dog, n: 1 }] }] },
          ],
        },
        { label: 'Прискорити крок', outcomes: [{ log: 'Кроки відстають. Ти виходиш на узлісся мокр{ий|а} від туману.' }] },
      ],
    },
    {
      id: 'pm_ev09',
      where: 'place',
      areas: [PA.bank],
      weight: 2,
      once: true,
      tone: 'good',
      text: 'Між корінням верби — чийсь загублений ніж. Іржавий, але сталь добра: піде в горно. (Залізо +1)',
      effects: [{ give: { [PR.iron]: 1 } }],
    },
    {
      id: 'pm_ev10',
      where: 'place',
      areas: [PA.oaks],
      when: sky('pm_w3', 'pm_w7'),
      weight: 3,
      tone: 'good',
      text: 'Після дощу під дубами — гриби, цілі родини. (Харчі +2)',
      effects: [{ give: { [PR.food]: 2 } }],
    },
    {
      id: 'pm_ev11',
      where: 'place',
      areas: [PA.market],
      weight: 2,
      again: 2 * HOUR,
      text: 'Купець у рядах віддає вугілля за півціни: «Підмокло трохи. Висохне».',
      choices: [
        { label: 'Купити', cost: { [PR.coin]: 2 }, outcomes: [{ log: 'Мішок важкий і чорний. Висохне. (Вугілля +3)', effects: [{ give: { [PR.coal]: 3 } }] }] },
        { label: 'Не треба', outcomes: [{ log: 'Купець знизує плечима й гукає наступного.' }] },
      ],
    },
    // ----- on the road north -----
    {
      id: 'pm_ev12',
      where: 'road',
      areas: [PA4.crossing, PA4.village, PA4.bees],
      when: road,
      weight: 3,
      text: 'Обабіч шляху — кинутий віз, без коней. Під сіном щось біліє.',
      choices: [
        {
          label: 'Глянути',
          outcomes: [
            { w: 3, log: 'Полотняний мішечок сухарів. Хтось тікав і не доніс. (Харчі +2)', effects: [{ give: { [PR.food]: 2 } }] },
            { w: 1, log: 'Під сіном — пес. Худий, злий, і віз тепер його.', effects: [{ fight: [{ enemy: PE4.strays, n: 1 }] }] },
          ],
        },
        { label: 'Не чіпати чуже', outcomes: [{ log: 'Ти йдеш далі. Віз лишається стояти, як надгробок.' }] },
      ],
    },
    {
      id: 'pm_ev13',
      where: 'place',
      areas: [PA4.camp],
      when: road,
      weight: 3,
      again: 2 * HOUR,
      text: 'Біля вогню жінка латає казанок дротом — і ніяк: латка відпадає.',
      choices: [
        { label: 'Допомогти', outcomes: [{ log: 'Ти загинаєш латку, як учив Гордій. Казанок тримає. Жінка насипає тобі каші. (Харчі +2, досвід +2)', effects: [{ give: { [PR.food]: 2 } }, { xp: 2, who: 'actor' }] }] },
        { label: 'Нема коли', outcomes: [{ log: 'Жінка не відповідає. Латає далі.' }] },
      ],
    },
    {
      id: 'pm_ev14',
      where: 'place',
      areas: [PA4.village],
      when: road,
      weight: 2,
      once: true,
      tone: 'good',
      text: 'Коваль із Солоного села кидає тобі обрізок заліза: «Бачу, свій. На, знадобиться». (Залізо +1)',
      effects: [{ give: { [PR.iron]: 1 } }],
    },
  ],
};
