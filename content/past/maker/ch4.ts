// The maker's past, chapter four «Дорога» (`.design/pasts-later.md` §3): the road north with a column of
// refugees. No workshop any more: a bag of tools, jobs for bread at the camp and in a salt village, copper
// discs with names instead of numbers, and the clerk Luka at the crossing.
import type { ActionDef, AreaDef, ClueDef, Cond, EnemyDef, GoalDef, LocationDef, ResourceDef, SceneDef } from '../../../shared/src/content.js';
import { PE, PL, PM, PN, PR } from './ids.js';

const SEC = 1000;

export const PA4 = { camp: 'pm_a6', crossing: 'pm_a7', village: 'pm_a8', bees: 'pm_a9', wood: 'pm_a10' } as const;
export const PL4 = { camp: 'pm_l6', crossing: 'pm_l7', village: 'pm_l8', bees: 'pm_l9', wood: 'pm_l10' } as const;
export const PR4 = { copper: 'pm_r9' } as const;
export const PT4 = { wheel: 'pm_t15', chain: 'pm_t16', lock: 'pm_t17', ladle: 'pm_t18', shoe: 'pm_t19' } as const;
export const PE4 = { strays: 'pm_e9', rider: 'pm_e10', robber: 'pm_e11' } as const;
export const PS4 = { road: 'pm_s20', luka: 'pm_s21', cart: 'pm_s22' } as const;

const ch4: Cond = { flag: 'pm_ch4' };
const word = (n: number): Cond => ({ flag: 'pm_road', gte: n });

export const resourcesM4: ResourceDef[] = [
  { id: PR4.copper, icon: 'ore', name: 'Мідь', order: 9, cap: 10, weight: 0.5, desc: 'Старий дзвоник, мідний казанок, обрізки — на кружала.' },
  { id: PT4.wheel, carry: true, icon: 'axle', name: 'Колесо', order: 34, kind: 'tool', weight: 3 },
  { id: PT4.chain, carry: true, icon: 'grapnel', name: 'Ланцюг', order: 35, kind: 'tool', weight: 2 },
  { id: PT4.lock, carry: true, icon: 'key', name: 'Замок до скрині', order: 36, kind: 'tool', weight: 1 },
  { id: PT4.ladle, carry: true, icon: 'ladle', name: 'Черпак', order: 37, kind: 'tool', weight: 1 },
  { id: PT4.shoe, carry: true, icon: 'iron', name: 'Підкова', order: 38, kind: 'tool', weight: 1 },
];

export const enemiesM4: EnemyDef[] = [
  {
    id: PE4.strays,
    icon: 'dog',
    name: 'Пес-приблуда',
    acc: 'пса',
    gen: 'пса',
    verb: 'рве',
    level: 4,
    hp: 14,
    dmg: [2, 4],
    evade: 1,
    morale: 10,
    traits: ['pack'],
    ai: [{ move: 'attack', w: 3 }, { move: 'grab', w: 1 }],
    loot: { [PR.leather]: [0, 1] },
    desc: 'Чийсь колись. Іде за валкою, бо від валки пахне хлібом.',
  },
  {
    id: PE4.rider,
    icon: 'rider',
    name: 'Роз\'їзд',
    acc: 'вершника',
    gen: 'вершника',
    verb: 'б\'є з коня',
    level: 6,
    hp: 24,
    dmg: [4, 6],
    armor: 1,
    morale: 12,
    humane: true,
    traits: ['fast'],
    ai: [{ move: 'attack', w: 3 }, { move: 'grab', w: 1 }],
    loot: { [PR.coin]: [2, 4] },
    desc: 'Полковий вершник при заставі. Ловить тих, хто обходить заставу плавнями.',
  },
  {
    id: PE4.robber,
    icon: 'snatcher',
    name: 'Розбійник із шляху',
    acc: 'розбійника',
    gen: 'розбійника',
    verb: 'б\'є кийком',
    level: 6,
    hp: 22,
    dmg: [3, 6],
    morale: 9,
    humane: true,
    traits: [],
    ai: [{ move: 'attack', w: 1 }],
    loot: { [PR.coin]: [1, 3], [PR.food]: [0, 2] },
    desc: 'Сам біженець — учора. Сьогодні в лісі над шляхом чекає на тих, хто відстав.',
  },
];

export const areasM4: AreaDef[] = [
  {
    id: PA4.camp,
    name: 'Валка',
    where: 'у валці',
    scene: 'quarry',
    pos: [6, 4],
    visible: ch4,
    desc: 'Вози колом, вогонь посередині. Люди з Кривця, з хуторів, з-за річки. Ніхто нікого не питає, звідки.',
    links: [
      { to: PA4.crossing, time: 8 * SEC },
      { to: PA4.village, time: 10 * SEC },
    ],
  },
  {
    id: PA4.crossing,
    name: 'Переправа',
    where: 'на переправі',
    scene: 'brid',
    pos: [4, 4],
    visible: ch4,
    danger: 6,
    ambush: 0.05,
    refuge: PA4.camp,
    foes: [{ enemy: PE4.rider, n: [1, 1], w: 1 }],
    desc: 'Пором, частокіл, два намети. Стіл під навісом, за столом — писар. Черга до столу не меншає.',
  },
  {
    id: PA4.village,
    name: 'Солоне село',
    where: 'у Солоному селі',
    scene: 'kryvets',
    pos: [4, 2],
    visible: ch4,
    danger: 5,
    ambush: 0.03,
    refuge: PA4.camp,
    foes: [{ enemy: PE4.strays, n: [1, 2], w: 1, if: word(2) }],
    desc: 'Біленькі хати, білі купи солі під повітками, кузня з димом. Тут ще працюють — і ще платять.',
    links: [
      { to: PA4.bees, time: 10 * SEC, if: word(2) },
      { to: PA4.wood, time: 12 * SEC, if: word(4) },
    ],
  },
  {
    id: PA4.bees,
    name: 'Монастирська пасіка',
    where: 'на пасіці',
    scene: 'grove',
    pos: [6, 0],
    visible: { all: [ch4, word(2)] },
    danger: 6,
    ambush: 0.05,
    refuge: PA4.camp,
    foes: [{ enemy: PE4.strays, n: [2, 2], w: 1 }],
    desc: 'Дзвіниця без дзвонаря, вулики в саду. Ченці пішли — бджоли лишилися.',
    links: [{ to: PA4.wood, time: 10 * SEC, if: word(4) }],
  },
  {
    id: PA4.wood,
    name: 'Ліс над шляхом',
    where: 'у лісі над шляхом',
    scene: 'grove',
    pos: [2, 0],
    visible: { all: [ch4, word(4)] },
    danger: 6,
    ambush: 0.07,
    refuge: PA4.camp,
    foes: [
      { enemy: PE4.robber, n: [1, 2], w: 2 },
      { enemy: PE.wolf, n: [2, 2], w: 1 },
    ],
    desc: 'Дуби й сосни, темно навіть удень. На узліссі — старий дуб, під яким можна заночувати.',
  },
];

export const locationsM4: LocationDef[] = [
  {
    id: PL4.camp,
    name: 'Валка',
    area: PA4.camp,
    order: 1,
    visible: ch4,
    progress: { flag: 'pm_road', max: 8, label: 'Слово на шляху' },
    desc: [
      { if: word(5), text: 'Тебе вже кличуть по ремеслу: «майстре». Біля твого воза — черга з тим, що зламалося.' },
      { text: 'Вози колом, вогонь посередині. Ти розкладаєш торбу на передку — інструментів на одну руку.' },
    ],
    spots: [
      { id: 'fire', name: 'Вогонь', x: 54, y: 16, icon: 'hearth' },
      { id: 'carts', name: 'Вози', x: 86, y: 34, icon: 'cart' },
      { id: 'bag', name: 'Торба майстра', x: 14, y: 34, icon: 'bench' },
    ],
  },
  {
    id: PL4.crossing,
    name: 'Переправа',
    area: PA4.crossing,
    order: 1,
    visible: ch4,
    desc: 'Ім\'я. Звідки. Чий. У кого бляшка з номером — проходить. У кого нема — до воза з рогожею.',
    spots: [
      { id: 'queue', name: 'Черга', x: 14, y: 24, icon: 'folk' },
      { id: 'table', name: 'Стіл писаря', x: 50, y: 20, icon: 'hall' },
      { id: 'ferry', name: 'Пором', x: 86, y: 26, icon: 'pier' },
    ],
  },
  {
    id: PL4.village,
    name: 'Солоне село',
    area: PA4.village,
    order: 1,
    visible: ch4,
    desc: 'Солевари, кузня, пекарня. Чужих тут не люблять, але роботу дають.',
    spots: [
      { id: 'huts', name: 'Хати', x: 14, y: 24, icon: 'folk' },
      { id: 'smithy', name: 'Кузня', x: 50, y: 20, icon: 'anvil' },
      { id: 'salt', name: 'Солеварня', x: 86, y: 26, icon: 'salt' },
    ],
  },
  {
    id: PL4.bees,
    name: 'Пасіка',
    area: PA4.bees,
    order: 1,
    visible: { all: [ch4, word(2)] },
    desc: 'Вулики-колоди в старому саду. Дзвіниця, а в ній — дзвоник, який ніхто не забрав.',
    spots: [
      { id: 'hives', name: 'Вулики', x: 14, y: 24, icon: 'nest' },
      { id: 'tower', name: 'Дзвіниця', x: 86, y: 26, icon: 'hall' },
    ],
  },
  {
    id: PL4.wood,
    name: 'Ліс',
    area: PA4.wood,
    order: 1,
    visible: { all: [ch4, word(4)] },
    desc: 'Хмиз, жолуді, сухі дубові гілки. І тиша, від якої хочеться озирнутися.',
    spots: [
      { id: 'oak', name: 'Старий дуб', x: 50, y: 24, icon: 'log' },
      { id: 'brush', name: 'Хмиз', x: 12, y: 62, icon: 'sticks' },
      { id: 'timber', name: 'Вітролам', x: 88, y: 60, icon: 'log' },
    ],
  },
];

/**
 * A job on the road: someone at the camp asks (`take`), the maker makes it from the bag (`make`, at the bag of
 * tools, or at the village smithy for a coin), and hands it over (`give`): bread and the word on the road.
 */
function job(o: {
  n: number;
  label: string;
  open: Cond;
  thing: string;
  cost: Record<string, number>;
  smithy?: boolean;
  time: number;
  pay: number;
  take: { id: string; log: string };
  make: { id: string; label: string; log: string };
  give: { id: string; label: string; log: string };
}): ActionDef[] {
  const flag = `pm_j${o.n}`;
  const done = `pm_j${o.n}_done`;
  return [
    {
      id: o.take.id,
      icon: 'spot:folk',
      group: PL4.camp,
      spot: 'carts',
      label: `Узятися: ${o.label}`,
      visible: { all: [ch4, o.open, { noFlag: flag }] },
      effects: [{ set: flag }],
      cooldown: 3 * SEC,
      busy: 'слухає, що зламалося',
      log: { self: o.take.log, other: '{name} береться за роботу.' },
    },
    {
      id: o.make.id,
      group: o.smithy ? PL4.village : PL4.camp,
      spot: o.smithy ? 'smithy' : 'bag',
      label: o.make.label,
      visible: { all: [{ flag }, { noFlag: done }, { not: { owns: o.thing } }] },
      cost: o.smithy ? { ...o.cost, [PR.coin]: (o.cost[PR.coin] ?? 0) + 2 } : o.cost,
      yield: { [o.thing]: 1 },
      cooldown: o.time * SEC,
      skill: 'craft',
      kind: 'craft',
      busy: 'працює',
      log: { self: o.make.log, other: '{name} працює над чужою річчю.' },
    },
    {
      id: o.give.id,
      icon: 'food',
      group: PL4.camp,
      spot: 'carts',
      label: o.give.label,
      visible: { all: [{ flag }, { noFlag: done }] },
      enabled: { owns: o.thing },
      disabledHint: 'Спершу зробити.',
      cost: { [o.thing]: 1 },
      effects: [{ add: { [PR.food]: o.pay } }, { inc: 'pm_road', max: 8 }, { set: done }, { xp: 8, who: 'actor' }],
      cooldown: 4 * SEC,
      kind: 'trade',
      gives: `+${o.pay} їжі · слово на шляху`,
      busy: 'віддає роботу',
      log: { self: o.give.log, other: '{name} віддає роботу.' },
    },
  ];
}

export const actionsM4: ActionDef[] = [
  // ------------------------------------------------------------------ jobs for bread
  ...job({
    n: 1,
    label: 'колесо на возі вдови',
    open: ch4,
    thing: PT4.wheel,
    cost: { [PR.oak]: 3, [PR.iron]: 1 },
    time: 16,
    pay: 4,
    take: { id: 'pm_x74', log: 'Вдова з трьома дітьми показує на колесо: обід тріснув, дві спиці вилетіли. — До Солоного не доїдемо.' },
    make: { id: 'pm_x75', label: 'Полагодити колесо', log: 'Нові спиці з дуба, обід — у залізну шину. Колесо крутиться рівно.' },
    give: { id: 'pm_x76', label: 'Поставити колесо вдові', log: 'Вдова мовчки кладе тобі в руки хліб. Найменший хлопчик тримається за колесо, ніби воно втече.' },
  }),
  ...job({
    n: 2,
    label: 'черпак для спільного казана',
    open: ch4,
    thing: PT4.ladle,
    cost: { [PR.oak]: 2 },
    time: 10,
    pay: 3,
    take: { id: 'pm_x77', log: 'Казан на всю валку один, а черпака нема: розливають кухлем, обпікаються.' },
    make: { id: 'pm_x78', label: 'Вирізати черпак', log: 'Липи нема — дуб. Важкий, але не трісне.' },
    give: { id: 'pm_x79', label: 'Віддати черпак до казана', log: 'Тепер юшку розливають рівно. Хтось сміється — уперше за день.' },
  }),
  ...job({
    n: 3,
    label: 'замок до скрині біженки',
    open: word(1),
    thing: PT4.lock,
    cost: { [PR.iron]: 2 },
    smithy: true,
    time: 14,
    pay: 4,
    take: { id: 'pm_x80', log: 'У скрині — все, що лишилося від хати: рушники, ікона, свідоцтво про шлюб. Замок збили на першій же заставі.' },
    make: { id: 'pm_x81', label: 'Викувати замок у кузні', log: 'Коваль Солоного дає горно за два шаги й дивиться, як ти працюєш. — Добра рука, — каже. — Чия наука?' },
    give: { id: 'pm_x82', label: 'Повісити замок на скриню', log: 'Жінка замикає скриню й ховає ключ на груди. — Тепер хоч щось моє.' },
  }),
  ...job({
    n: 4,
    label: 'ланцюг для воза з волами',
    open: word(2),
    thing: PT4.chain,
    cost: { [PR.iron]: 3, [PR.coal]: 1 },
    smithy: true,
    time: 18,
    pay: 5,
    take: { id: 'pm_x83', log: 'Старий чумак: ярмо тримається на мотузці, а мотузка — на чесному слові.' },
    make: { id: 'pm_x84', label: 'Викувати ланцюг', log: 'Ланка за ланкою. Коваль Солоного приносить тобі води й не питає вже нічого.' },
    give: { id: 'pm_x85', label: 'Віддати ланцюг чумакові', log: 'Чумак пробує ланцюг зубами, як монету. — По-чумацьки, — каже. Від нього це похвала.' },
  }),
  ...job({
    n: 5,
    label: 'підкова для коня, що кульгає',
    open: word(3),
    thing: PT4.shoe,
    cost: { [PR.iron]: 2, [PR.coal]: 1 },
    smithy: true,
    time: 12,
    pay: 4,
    take: { id: 'pm_x86', log: 'Кінь кульгає на задню. Без коня ця родина далі не піде — четверо малих на возі.' },
    make: { id: 'pm_x87', label: 'Викувати підкову', log: 'Підкова виходить трохи важка. Зате надовго.' },
    give: { id: 'pm_x88', label: 'Підкувати коня', log: 'Кінь стоїть тихо, ніби розуміє. Діти на возі рахують твої удари молотком.' },
  }),

  // ------------------------------------------------------------------ names instead of numbers
  {
    id: 'pm_x89',
    icon: 'mark',
    group: PL4.camp,
    spot: 'bag',
    label: 'Вирізати мідне кружальце з іменем',
    visible: { all: [ch4, word(3)] },
    enabled: { flag: 'pm_names_made', lt: 6 },
    cost: { [PR4.copper]: 1 },
    effects: [{ inc: 'pm_names_made', max: 6 }, { xp: 6, who: 'actor' }],
    cooldown: 10 * SEC,
    skill: 'craft',
    kind: 'craft',
    gives: 'Кружальце з іменем',
    busy: 'карбує ім\'я на міді',
    beats: [
      {
        if: { flag: 'pm_tags' },
        log: { self: 'Твоя рука пам\'ятає цей карб. Тільки тепер — букви, а не цифри.', other: '{name} карбує щось на міді.', kind: 'story' },
      },
    ],
    log: {
      self: ['«Марина, донька Степана». Дівчинка водить пальцем по літерах, хоч читати не вміє.', '«Яким Пасічник». Старий вішає кружальце на шию поверх сорочки — щоб видно.', '«Тимко». Кружальце маленьке, на дитячу шию.'],
      other: '{name} карбує ім\'я на мідному кружальці.',
    },
  },

  // ------------------------------------------------------------------ the camp and what feeds it
  {
    id: 'pm_x90',
    icon: 'food',
    group: PL4.camp,
    spot: 'fire',
    label: 'Покласти свій хліб до спільного казана',
    visible: ch4,
    cost: { [PR.food]: 4 },
    effects: [{ inc: 'pm_fed4', max: 6 }],
    cooldown: 6 * SEC,
    recharge: 90 * SEC,
    kind: 'trade',
    gives: 'Валка сита',
    busy: 'ділиться хлібом',
    log: { self: ['Казан на всіх. Діти першими, старі — останніми.', 'Хтось ділить свою миску надвоє — для сусідки, що не підвелася.'], other: '{name} ділиться хлібом.' },
  },
  {
    id: 'pm_x100',
    icon: 'leather',
    group: PL4.camp,
    spot: 'carts',
    label: 'Виміняти шкіру на хліб',
    visible: ch4,
    cost: { [PR.leather]: 3 },
    yield: { [PR.food]: 2 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'міняє шкіру',
    log: { self: 'Шкіра на постоли, хліб — на дорогу. Чесний обмін, у валці інакше не буває.', other: '{name} міняє шкіру на хліб.' },
  },
  {
    id: 'pm_x91',
    group: PL4.village,
    spot: 'smithy',
    label: 'Підробляти в кузні',
    visible: ch4,
    yield: { [PR.coin]: 2 },
    cooldown: 14 * SEC,
    recharge: 25 * SEC,
    skill: 'craft',
    kind: 'gather',
    busy: 'підробляє в кузні',
    log: { self: ['Міх, молот, кліщі. Коваль платить скупо, але чесно.', 'Ти куєш цвяхи для солеварні — сотню, другу. Руки самі пам\'ятають.'], other: '{name} підробляє в кузні.' },
  },
  {
    id: 'pm_x92',
    icon: 'iron',
    group: PL4.village,
    spot: 'smithy',
    label: 'Купити залізо в коваля',
    visible: ch4,
    cost: { [PR.coin]: 3 },
    yield: { [PR.iron]: 2 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'торгується з ковалем',
    log: { self: 'Обрізки, старі обручі, зламана коса. Для торби майстра — скарб.', other: '{name} купує залізо.' },
  },
  {
    id: 'pm_x93',
    group: PL4.village,
    spot: 'salt',
    label: 'Носити ропу на солеварні',
    visible: ch4,
    yield: { [PR.food]: [2, 3] },
    cooldown: 12 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'носить ропу',
    log: { self: ['Відро за відром. Платять хлібом — і сіллю, щоб не гнило.', 'Солевар дивиться на твої руки. — Майстрові руки, — каже, — а носиш відра.'], other: '{name} носить ропу на солеварні.' },
  },
  {
    id: 'pm_x94',
    group: PL4.bees,
    spot: 'tower',
    label: 'Зняти мідь із дзвіниці',
    visible: { all: [ch4, word(2)] },
    yield: { [PR4.copper]: [1, 2] },
    cooldown: 14 * SEC,
    recharge: 40 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'знімає мідь із дзвіниці',
    log: { self: ['Дзвоник, мідна оковка дверей, лампадка. Ченцям уже не треба. Людям — треба.', 'Дзвоник дзенькає в руках востаннє. Ти ховаєш його в торбу, щоб не чути.'], other: '{name} лізе на дзвіницю.' },
  },
  {
    id: 'pm_x95',
    group: PL4.bees,
    spot: 'hives',
    label: 'Брати мед із покинутих вуликів',
    visible: { all: [ch4, word(2)] },
    yield: { [PR.food]: [2, 4] },
    cooldown: 14 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'бере мед',
    log: { self: ['Бджоли сердиті, але живі. Мед темний, гречаний.', 'Ти лишаєш бджолам половину. Ченці б так зробили.'], other: '{name} бере мед на пасіці.' },
  },
  {
    id: 'pm_x96',
    group: PL4.wood,
    spot: 'timber',
    label: 'Тесати дуб із вітролому',
    visible: { all: [ch4, word(4)] },
    yield: { [PR.oak]: [2, 3] },
    cooldown: 14 * SEC,
    skill: 'gather',
    knack: { role: 'maker', x: 1.3 },
    kind: 'gather',
    busy: 'тесає дуб',
    log: { self: ['Буря звалила дуба, ти його доробляєш. Добрі дошки, сухі.', 'Сокира чужа, позичена в чумака. Але слухається.'], other: '{name} тесає дуб.' },
  },
  {
    id: 'pm_x97',
    group: PL4.village,
    spot: 'huts',
    label: 'Розбирати стару клуню за брус',
    visible: ch4,
    yield: { [PR.oak]: [2, 3] },
    cooldown: 14 * SEC,
    skill: 'gather',
    knack: { role: 'maker', x: 1.3 },
    kind: 'gather',
    busy: 'розбирає клуню',
    log: { self: ['Сільчанин віддає клуню на дрова, а дубові сволоки — тобі. — На колеса? Бери. Нам однаково тікати.', 'Цвяхи виходять із дуба з рипом. Ти складаєш їх у торбу теж.'], other: '{name} розбирає стару клуню.' },
  },
  {
    id: 'pm_x99',
    group: PL4.village,
    spot: 'smithy',
    label: 'Прибирати в кузні за обрізки',
    visible: ch4,
    yield: { [PR.iron]: 1, [PR.coal]: 1 },
    cooldown: 12 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'прибирає в кузні',
    log: { self: ['Окалина, обрізки, зламані цвяхи. Коваль махає рукою: забирай, що знайдеш.', 'Під ковадлом — пів підкови й кусок шини. Для торби — скарб.'], other: '{name} прибирає в кузні.' },
  },
  {
    id: 'pm_x98',
    group: PL4.wood,
    spot: 'brush',
    label: 'Палити вугіль у ямі',
    visible: { all: [ch4, word(4)] },
    yield: { [PR.coal]: [2, 3] },
    cooldown: 16 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'палить вугіль',
    log: { self: 'Яма, хмиз, дерн зверху. До ранку — вугілля на дві кузні.', other: '{name} палить вугіль у лісі.' },
  },
];

export const scenesM4: SceneDef[] = [
  // ------------------------------------------------------------------ the road begins
  {
    id: PS4.road,
    title: 'Шлях',
    group: PL.shop,
    spot: 'hearth',
    label: 'Рушати на північ',
    visible: { all: [{ flag: 'pm_ch3_done' }, { flag: 'main_act', gte: 4 }, { noFlag: 'pm_ch4' }] },
    gives: 'Новий розділ',
    start: 'n1',
    nodes: {
      n1: {
        text: [
          'Шлях на північ не порожній. Вози, тачки, люди з клунками, корова на мотузку. Усі йдуть мовчки, бо говорити нема про що.',
          [
            { if: { flag: 'pm_tymko_saved' }, text: 'Тимко тримається за твій рукав. Не плаче — вчиться дорослим.' },
            { text: 'Марина несе на руках чужу дитину. Старий Яким рахує кроки вголос, щоб не думати.' },
          ],
        ],
        effects: [{ startAct: 4 }, { set: 'pm_ch4' }],
        next: 'n2',
      },
      n2: {
        text: 'Біля першої переправи — застава. Стіл, книга, писар. «Ім\'я. Звідки. Чий». У кого бляшка з номером — того пропускають. У кого нема — відводять убік, до воза з рогожею.',
        next: 'n3',
      },
      n3: {
        type: 'choice',
        mode: 'each',
        text: 'Що робиш ти?',
        options: [
          { id: 'named', label: 'Стати в чергу й назвати себе', effects: [{ set: 'pm_named' }] },
          { id: 'unnamed', label: 'Обійти заставу плавнями вночі', effects: [{ set: 'pm_unnamed' }] },
        ],
        next: 'n4',
      },
      n4: {
        goto: [{ if: { flag: 'pm_unnamed' }, next: 'n4u' }],
        next: 'n4n',
      },
      n4n: {
        text: 'Писар записує тебе, не підводячи голови. — Ремесло? — Майстер{|ня}. — Майстрів не чіпаємо. Проходь. — Твоє ім\'я лягає в книгу рівним почерком. Тепер ти — є.',
        next: 'n5',
      },
      n4u: {
        text: 'Уночі ти ведеш своїх плавнями, повз частокіл. На тому березі вже чекає вершник із ліхтарем.',
        next: 'fight',
      },
      fight: { type: 'fight', foes: [{ enemy: PE4.rider }], win: 'n5u', lose: 'lost' },
      lost: {
        text: 'Вершник женеться за тобою до самого очерету. Ти ховаєшся у воді до світанку — і вертаєшся до валки ні з чим. Спробуй ще.',
        incomplete: true,
        next: null,
      },
      n5u: {
        text: 'Ліхтар падає у воду. Ви виходите на той берег мокрі, але цілі. Тебе нема в жодній книзі — і так краще.',
        next: 'n5',
      },
      n5: {
        text: 'Увечері, біля чужого вогню, тобі приносять першу роботу: колесо на возі тріснуло, а до Солоного села ще два дні. «Заплатимо хлібом». Ти розкладаєш торбу. Інструментів — на одну руку.',
        effects: [{ moveTo: 'pm_a6', who: 'actor' }, { add: { [PR.food]: 4 } }, { checkpoint: 'pm4.start' }],
        next: null,
      },
    },
  },

  // ------------------------------------------------------------------ the clerk at the crossing
  {
    id: PS4.luka,
    title: 'Лука',
    group: PL4.crossing,
    spot: 'table',
    label: 'Повести людей з кружалами через заставу',
    visible: { all: [ch4, { flag: 'pm_names_made', gte: 4 }, word(5)] },
    enabled: { all: [{ flag: 'pm_fed4', gte: 3 }, { level: 6 }] },
    disabledHint: 'Валка має бути сита, щоб іти (тричі покласти хліб до казана). І сили: на тому березі — роз\'їзди (рівень 6).',
    gives: 'Розмова · вибір',
    start: 'n1',
    nodes: {
      n1: {
        text: 'За столом під навісом — не той писар, що був. Цей постарілий, у полковому сукні. Він крутить у пальцях мідне кружальце: «Марина, донька Степана». Довго дивиться на нього, потім на тебе. — Гарний карб, — каже писар Лука. — Я знаю тільки одну руку з таким нахилом.',
        effects: [{ meet: PN.luka }, { clue: 'pm_c8' }],
        next: 'n2',
      },
      n2: {
        text: [
          'Він не кличе варту. Бере перо й записує дівчинку з черги — повільно, виправляє літеру, перепитує, як звали батька. Дмухає на чорнило. — Записана — значить, є, — каже він, не підводячи очей. — Кого нема в книзі, того можна забрати, і ніхто не спитає.',
          { if: { flag: 'pm_tags_no' }, text: '— Ви вже раз відмовили, — додає він. — Я пам\'ятаю. Знайшов іншого майстра — гіршого. Через вас бляшки в них криві.' },
        ],
        next: 'n3',
      },
      n3: {
        text: '— Полку потрібен писар, що вміє і рахувати, і карбувати. Тепло на зиму. Хліб. Перо. — Він кладе кружальце на стіл. — А цих пропущу. Усіх. Сьогодні.',
        next: 'n4',
      },
      n4: {
        type: 'choice',
        mode: 'each',
        text: 'Що ти відповідаєш?',
        options: [
          { id: 'sit', label: 'Сісти поруч із ним за стіл', effects: [{ set: 'pm_clerk' }] },
          { id: 'no', label: '— Ні. Моя рука більше нікого не рахує.', effects: [{ set: 'pm_refused' }] },
        ],
        next: 'n5',
      },
      n5: {
        goto: [{ if: { flag: 'pm_clerk' }, next: 'sat' }],
        next: 'refused',
      },
      sat: {
        text: 'Ти сідаєш. Лука підсуває тобі чорнильницю. Черга рушає: Марина, Яким, удова з колесом — усі проходять, і кожного ти записуєш сам{|а}. Рівно, як учили. До весни ти — писар полку.',
        next: 'end',
      },
      refused: {
        text: 'Лука зітхає, як зітхають над поганою роботою. — Тоді пропущу лише тих, у кого бляшки. Решта — до воза. — Уночі ти ведеш решту бродом нижче застави, сам{|а}. На тому березі — роз\'їзд.',
        next: 'fight',
      },
      fight: { type: 'fight', foes: [{ enemy: PE4.rider }, { enemy: PE4.robber }], win: 'won', lose: 'lostR' },
      lostR: {
        text: 'Тебе збивають з ніг на мілині. Люди розбігаються назад, у плавні. Треба буде вести ще раз.',
        incomplete: true,
        next: null,
      },
      won: {
        text: 'Роз\'їзд тікає берегом. Люди виходять із води мокрі, з кружалами на шиях.',
        next: 'end',
      },
      end: {
        text: 'Уночі над переправою — дощ. Ти рахуєш людей на тому березі не номерами: Марина, Яким, вдова, її троє…',
        effects: [{ xp: 30, who: 'actor' }, { inc: 'pm_road', max: 8 }],
        next: null,
      },
    },
  },

  // ------------------------------------------------------------------ the grey cart: the end of chapter four
  {
    id: PS4.cart,
    title: 'Сірий віз',
    group: PL4.wood,
    spot: 'oak',
    label: 'Заночувати під старим дубом',
    visible: { flag: 'done:pm_s21' },
    gives: 'Кінець розділу',
    start: 'n1',
    nodes: {
      n1: {
        text: [
          [
            { if: { flag: 'pm_clerk' }, text: 'Обоз полку стоїть у лісі на ніч. Ти виходиш до вітру — і не вертаєшся. Перо лишається на столі, книга відкрита. Хай рахують без тебе.' },
            { text: 'Вісь на твоєму возі тріскає на корені, і валка йде далі без тебе: чекати нікому. Ти лишаєшся під старим дубом сам{|а}, з торбою.' },
          ],
          'Ніч холодна, перша з морозом.',
        ],
        next: 'n2',
      },
      n2: {
        text: 'Під ранок повз проходять вози під рогожею — тихі, без пісні, без скрипу. Ніхто не поганяє, ніхто не говорить. Один зупиняється навпроти дуба.',
        next: 'n3',
      },
      n3: {
        text: 'Хтось у сірому довго дивиться на тебе з передка. Потім — на твою торбу з інструментами. — Цей чийсь, — каже він комусь у возі. Віз рушає.',
        next: 'n4',
      },
      n4: {
        text: 'Ти довго дивишся вслід. Потім розумієш, що не спиш — і що в лісі є ще хтось. Кроки. Легкі, обережні. Мисливські.',
        effects: [{ actDone: 4 }, { set: 'pm_ch4_done' }, { mystery: PM.numbers, level: 5 }, { checkpoint: 'pm4.end' }],
        next: null,
      },
    },
  },
];

export const cluesM4: ClueDef[] = [
  { id: 'pm_c8', to: 'maker', mystery: PM.numbers, title: 'Записана — значить, є', text: 'Писар Лука на переправі: «Кого нема в книзі, того можна забрати, і ніхто не спитає». Він вірить, що рятує чорнилом.' },
];

export const goalsM4: GoalDef[] = [
  { id: 'pm_goal40', text: 'Далі — північ. Хтось ще йде цією дорогою сам.', when: { flag: 'pm_ch4_done' } },
  { id: 'pm_goal39', text: 'Ліс над шляхом. Заночувати під старим дубом.', when: { all: [{ flag: 'done:pm_s21' }, { noFlag: 'pm_ch4_done' }] } },
  { id: 'pm_goal38', text: 'Провести людей з кружалами через заставу.', when: { all: [{ flag: 'pm_names_made', gte: 4 }, word(5), { noFlag: 'done:pm_s21' }] } },
  { id: 'pm_goal37', text: 'Карбувати кружала з іменами: міді — на пасіці, на старій дзвіниці.', when: { all: [ch4, word(3), { flag: 'pm_names_made', lt: 4 }] } },
  { id: 'pm_goal36', text: 'Ремесло за хліб: брати роботу у валці, робити з торби й у кузні Солоного села.', when: ch4 },
  { id: 'pm_goal35', text: 'Майстерні більше нема. Рушати на північ.', when: { all: [{ flag: 'pm_ch3_done' }, { flag: 'main_act', gte: 4 }] } },
];
