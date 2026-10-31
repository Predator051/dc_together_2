// The hunter's past, day to day: weather by the season of each chapter, hunger and cold (light: Sydir
// keeps the fire while the island stands, the night camp has its own on the road), a hot dish, and
// small happenings between the story's beats.
import type { ActionDef, AmbientDef, Cond, EventSetDef, NeedsDef, ResourceDef, WeatherSetDef } from '../../../shared/src/content.js';
import { HA4, HE4, HL4 } from './ch4.js';
import { HA, HE, HL, HR, HU } from './ids.js';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const inside: Cond = { flag: 'ph_in' };
/** The island still stands (Sydir keeps the fire). */
const standing: Cond = { noFlag: 'ph_ch3_done' };
const road: Cond = { flag: 'ph_ch4' };
/** From the first chapter's end to the third chapter's start: spring and summer of the war. */
const spring: Cond = { all: [{ flag: 'ph_ch1_done' }, { noFlag: 'ph_ch3' }] };
const autumn: Cond = { not: spring };
const sky = (...ids: string[]): Cond => ({ any: ids.map((weather) => ({ weather })) });

export const HU2 = { soup: 'ph_u2' } as const;

export const lifeResourcesH: ResourceDef[] = [
  {
    id: HU2.soup,
    icon: 'soup',
    name: 'Юшка',
    order: 3.5,
    kind: 'use',
    cap: 8,
    weight: 1,
    meal: { hp: 5, minutes: 18, warm: 40 },
    desc: 'Риба, вода, цибулина й перець. Сидорова: на дні завжди є щось, чого не чекаєш.',
    use: {
      anywhere: true,
      label: 'З\'їсти юшку',
      log: { self: ['Юшка гаряча, аж пече губи. Тепло спускається до колін.', 'Ти сьорбаєш юшку з дерев\'яної миски, як Сидір: голосно.'], other: '{name} їсть юшку.' },
    },
  },
];

export const lifeActionsH: ActionDef[] = [
  {
    id: 'ph_x120',
    group: HL.isle,
    spot: 'hearth',
    label: 'Зварити юшку',
    visible: { all: [inside, standing] },
    enabled: { stove: 'warm' },
    disabledHint: 'Варять на вогні.',
    cost: { [HR.food]: 2 },
    yield: { [HU2.soup]: 2 },
    cooldown: 12 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Гаряче ситніше за копчене й гріє.',
    busy: 'варить юшку',
    log: { self: ['Казанок над вогнем, риба в казанку. Сидір кидає туди щось із кишені й не каже що.', 'Юшка вариться довго. Ти дивишся у вогонь.'], other: '{name} варить юшку.' },
  },
  {
    id: 'ph_x121',
    group: HL4.camp,
    spot: 'fire',
    label: 'Зварити юшку в ямці',
    visible: road,
    cost: { [HR.food]: 2 },
    yield: { [HU2.soup]: 2 },
    cooldown: 14 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Вогонь малий, щоб не видно. Але юшку зварить.',
    busy: 'варить юшку',
    log: { self: 'Казанок на трьох палицях, вогонь у ямці — щоб не видно здалеку. Пахне домом.', other: '{name} варить юшку.' },
  },
  {
    id: 'ph_x122',
    icon: 'spot:bed',
    group: HL.isle,
    spot: 'hearth',
    label: 'Наслати собі сухого очерету',
    visible: { all: [inside, standing, { flag: 'ph_fame', gte: 1 }] },
    cost: { [HR.osier]: 4, [HR.hide]: 1 },
    cooldown: 12 * SEC,
    kind: 'build',
    once: true,
    why: 'Під боком — голі дошки. Сидір каже: «Ловець має спати м\'яко, бо встає рано».',
    busy: 'стелить лежанку',
    log: { self: 'Сухий очерет, лозове плетиво, шкурка зверху. Пахне літом.', other: '{name} стелить собі лежанку.' },
  },
];

export const needsH: NeedsDef = {
  from: inside,
  snack: HR.food,
  campWood: HR.wood,
  fires: { [HA4.camp]: road },
  comfort: [
    { if: standing, name: 'Сидорова хата' },
    { if: { stove: 'warm' }, name: 'у печі горить' },
    { if: { flag: 'built:ph_x122' }, name: 'своя лежанка' },
  ],
};

export const weatherH: WeatherSetDef = {
  from: inside,
  span: [15 * MIN, 25 * MIN],
  first: 'ph_w1',
  kinds: [
    {
      id: 'ph_w1',
      name: 'Ясно',
      weight: 5,
      log: ['Над плавнями ясно й тихо. Видно аж до Броду.', 'Розвиднілося. Вода в протоках як дзеркало.'],
    },
    {
      id: 'ph_w2',
      name: 'Вітер',
      weight: 3,
      sky: 'wind',
      log: ['Вітер кладе очерет хвилями, свистить у кілках.', 'Знявся вітер. Човни б\'ються об кілки.'],
      chill: 3,
      dry: 2,
      bonus: { fx: ['twigs'], p: 0.3, text: 'Вітер трусить плавні: збирати буває щедріше' },
    },
    {
      id: 'ph_w3',
      name: 'Дощ',
      weight: 3,
      sky: 'rain',
      log: ['Сіється дощ. Плавні сірі, як стара сіть.', 'Задощило. По воді — дрібні кола.'],
      travel: 1.1,
      ambush: 0.7,
      chill: 2,
      dry: 0,
      bonus: { fx: ['fish'], p: 0.35, text: 'У дощ риба бере краще' },
    },
    {
      id: 'ph_w4',
      name: 'Туман',
      weight: 3,
      sky: 'fog',
      log: ['Туман піднімається з води — за десять кроків нічого.', 'Плавні тонуть у молоці. Чути тільки качок.'],
      travel: 1.1,
      ambush: 1.4,
      xp: 1.3,
      bonus: { fx: ['snare'], p: 0.35, text: 'У тумані звіра легше підкрасти' },
    },
    {
      id: 'ph_w5',
      name: 'Приморозок',
      weight: 2,
      when: autumn,
      sky: 'frost',
      log: ['Приморозок: забереги взялися тонкою кригою.', 'Холодно. Очерет у інеї, дзвенить.'],
      chill: 5,
      frozen: true,
      travel: 0.9,
      jobs: 0.9,
      bonus: { fx: ['chop'], p: 0.35, text: 'Мерзле гілля ламається легше' },
    },
    {
      id: 'ph_w6',
      name: 'Пригріває',
      weight: 3,
      when: spring,
      sky: 'heat',
      log: ['Сонце пригріває, над водою гудуть комарі.', 'Тепло. Від плавнів пахне мулом і цвітом.'],
      pace: 1.1,
      chill: -3,
      dry: 2,
    },
    {
      id: 'ph_w7',
      name: 'Гроза',
      weight: 1,
      when: spring,
      sky: 'storm',
      log: ['Гримить над плавнями. Ллє як з відра.', 'Небо чорне. Блискавка б\'є в степ за Бродом.'],
      pace: 1.1,
      travel: 1.25,
      ambush: 0.4,
      chill: 4,
      dry: 0,
      jobs: 0.6,
    },
  ],
};

export const ambientH: AmbientDef = {
  areas: {
    [HA.isle]: 'marsh',
    [HA.ford]: 'river',
    [HA.reeds]: 'marsh',
    [HA.woods]: 'grove',
    [HA.steppe]: 'hill',
    [HA4.camp]: 'marsh',
    [HA4.ridges]: 'marsh',
    [HA4.dam]: 'river',
    [HA4.ravine]: 'hill',
    [HA4.wood]: 'grove',
  },
  fires: { [HA4.camp]: road },
  actions: {
    ph_x01: 'twigs',
    ph_x02: 'fish',
    ph_x03: 'walk',
    ph_x04: 'chop',
    ph_x06: 'snare',
    ph_x54: 'fish',
    ph_x55: 'water',
    ph_x56: 'snare',
    ph_x57: 'walk',
    ph_x59: 'walk',
    ph_x61: 'arrow',
    ph_x62: 'walk',
    ph_x120: 'steam',
    ph_x121: 'steam',
    ph_x122: 'build',
  },
};

export const eventsH: EventSetDef = {
  from: inside,
  gap: [15 * MIN, 25 * MIN],
  road: 0.4,
  place: 0.15,
  kinds: [
    // ----- on the island -----
    {
      id: 'ph_ev01',
      where: 'home',
      when: standing,
      weight: 2,
      again: 3 * HOUR,
      text: 'Сидір кличе латати сіть: дірка така, що пройде сом.',
      choices: [
        { label: 'Сісти поруч', outcomes: [{ log: 'Ви латаєте до сутінок. Сидір розповідає про сома, якого не впіймав тридцять років тому. (Досвід +3)', effects: [{ xp: 3, who: 'actor' }] }] },
        { label: 'Іншим разом', outcomes: [{ log: 'Сидір латає сам, бурмочучи щось про молодих.' }] },
      ],
    },
    {
      id: 'ph_ev02',
      where: 'home',
      when: { all: [standing, sky('ph_w3', 'ph_w7')] },
      weight: 4,
      text: 'Дощ затікає в коптильню: вогонь шипить, от-от згасне.',
      choices: [
        { label: 'Підкласти сухих палиць', cost: { [HR.wood]: 2 }, outcomes: [{ log: 'Дим знову валить густо. Риба не пропала.' }] },
        { label: 'Хай', outcomes: [{ log: 'Риба в коптильні розкисла, Сидір віддає її свиням. (Риба й дичина −2)', effects: [{ take: { [HR.food]: 2 } }] }] },
      ],
    },
    {
      id: 'ph_ev03',
      where: 'home',
      when: standing,
      weight: 2,
      again: 3 * HOUR,
      text: 'Уночі біля човнів плюскіт і писк: щурі гризуть сіті.',
      choices: [
        { label: 'Вийти з ножем', outcomes: [{ log: 'Темрява, мокрі кілки — і ось вони.', effects: [{ fight: [{ enemy: HE.rat, n: 2 }] }] }] },
        { label: 'Хай гризуть', outcomes: [{ log: 'Зранку сіть у дірах — плести наново. (Лоза −2)', effects: [{ take: { [HR.osier]: 2 } }] }] },
      ],
    },
    {
      id: 'ph_ev04',
      where: 'home',
      when: { all: [standing, sky('ph_w5')] },
      weight: 3,
      tone: 'good',
      text: 'Приморозок. Сидір дістає з комори в\'ялену щуку: «Холод любить ситих». (Риба й дичина +2)',
      effects: [{ add: { [HR.food]: 2 } }],
    },
    {
      id: 'ph_ev05',
      where: 'home',
      when: { all: [standing, { flag: 'ph_ch2' }] },
      weight: 2,
      once: true,
      text: 'До острова пригрібає перевізник з Броду — мокрий до пояса, синій. Просить посушитися.',
      choices: [
        { label: 'Пустити до вогню', outcomes: [{ log: 'Він гріється, п\'є Сидорове, а на прощання лишає пучок стріл: «Мені нема в кого стріляти». (Стріли +4)', effects: [{ add: { [HU.arrow]: 4 } }] }] },
        { label: 'Не пускати', outcomes: [{ log: 'Він киває й гребе далі, не озираючись.' }] },
      ],
    },
    // ----- on the way and at work -----
    {
      id: 'ph_ev06',
      where: 'road',
      areas: [HA.reeds, HA.woods],
      when: { all: [sky('ph_w4'), { flag: 'ph_fame', gte: 2 }] },
      weight: 3,
      text: 'У тумані очерет шелестить не від вітру. Хтось великий іде протокою.',
      choices: [
        {
          label: 'Завмерти',
          outcomes: [
            { w: 2, log: 'За три кроки від тебе проходить лось. Ти бачиш його вухо — мокре, велике. (Досвід +3)', effects: [{ xp: 3, who: 'actor' }] },
            { w: 1, log: 'З очерету вилітає кабан — просто на тебе.', effects: [{ fight: [{ enemy: HE.boar, n: 1 }] }] },
          ],
        },
        { label: 'Обійти', outcomes: [{ log: 'Ти обходиш протоку гривою. Хто б там не був — нехай.' }] },
      ],
    },
    {
      id: 'ph_ev07',
      where: 'road',
      areas: [HA.ford, HA.woods],
      weight: 2,
      again: 2 * HOUR,
      text: 'На стежці — заєць у чужих силках, ще живий.',
      choices: [
        { label: 'Забрати', outcomes: [{ log: 'Чужі силки, чужий заєць. Тепер твій. (Риба й дичина +2)', effects: [{ give: { [HR.food]: 2 } }] }] },
        { label: 'Відпустити', outcomes: [{ log: 'Заєць зникає в траві. Силки ти ставиш, як були: чуже не бери, казав Сидір. (Досвід +2)', effects: [{ xp: 2, who: 'actor' }] }] },
      ],
    },
    {
      id: 'ph_ev08',
      where: 'place',
      areas: [HA.reeds],
      weight: 2,
      once: true,
      tone: 'good',
      text: 'Під корчем — чийсь старий ніж, сточений до половини, але гострий. Сталь піде в діло. (Залізо +1)',
      effects: [{ give: { [HR.iron]: 1 } }],
    },
    {
      id: 'ph_ev09',
      where: 'place',
      areas: [HA.woods],
      when: sky('ph_w3', 'ph_w7'),
      weight: 3,
      tone: 'good',
      text: 'Після дощу на мокрій землі сліди видно, як писане. Ти читаєш, хто ходив уночі. (Досвід +3)',
      effects: [{ xp: 3, who: 'actor' }],
    },
    {
      id: 'ph_ev10',
      where: 'place',
      areas: [HA.ford],
      weight: 2,
      again: 2 * HOUR,
      text: 'Шкірник на Броді гукає: «Маєш шкурку? Сьогодні дам більше».',
      choices: [
        { label: 'Продати шкурку', cost: { [HR.hide]: 1 }, outcomes: [{ log: 'Він мне шкурку, дме на хутро й платить без торгу. (Шаги +3)', effects: [{ give: { [HR.coin]: 3 } }] }] },
        { label: 'Не треба', outcomes: [{ log: 'Шкірник знизує плечима: «Завтра дам менше».' }] },
      ],
    },
    // ----- on the road north -----
    {
      id: 'ph_ev11',
      where: 'road',
      areas: [HA4.ridges, HA4.dam, HA4.ravine],
      when: road,
      weight: 3,
      text: 'На гриві — кинутий курінь. Усередині щось лежить, накрите рогожею.',
      choices: [
        {
          label: 'Глянути',
          outcomes: [
            { w: 3, log: 'Шматок сала в тряпиці й суха лоза. Хтось тікав і не доніс. (Риба й дичина +1, лоза +2)', effects: [{ give: { [HR.food]: 1, [HR.osier]: 2 } }] },
            { w: 1, log: 'Під рогожею — вовк. Худий, і курінь тепер його.', effects: [{ fight: [{ enemy: HE4.wolf, n: 1 }] }] },
          ],
        },
        { label: 'Не чіпати', outcomes: [{ log: 'Ти обходиш курінь. Чуже.' }] },
      ],
    },
    {
      id: 'ph_ev12',
      where: 'place',
      areas: [HA4.camp],
      when: road,
      weight: 3,
      again: 2 * HOUR,
      text: 'Біля вогню мала дівчинка питає, як це ти не боїшся плавнів уночі.',
      choices: [
        { label: 'Розповісти', outcomes: [{ log: 'Ти розповідаєш про Сидора й про лиску, що водила тебе водою. Дівчинка засинає на півслові. (Досвід +2)', effects: [{ xp: 2, who: 'actor' }] }] },
        { label: 'Мовчки підкинути гілля', outcomes: [{ log: 'Вогонь тріщить. Дівчинка дивиться на нього, поки не засне.' }] },
      ],
    },
  ],
};
