import type { ActionDef, AreaDef, ClueDef, Cond, EnemyDef, GoalDef, LocationDef, MysteryDef, ResourceDef, SceneDef, StealthNode } from '../../../shared/src/content.js';
import { HU } from '../hunter/ids.js';
import { SA, SE, SL, SM, SR, SS, ST } from './ids.js';

const SEC = 1000;
const met: Cond = { flag: 'ps_met' };
const ch5open: Cond = { any: [{ mainFlag: 'p2_act4_done' }, { flag: 'main_act', gte: 5 }] };
/** The trail left behind: work for bread at the abbey leaves it, the hunter sweeps it away. */
const trail = (n = 1) => ({ inc: 'ps_trail', by: n, max: 6 });
const sweep = { if: { flag: 'ps_trail', gte: 2 }, then: [{ inc: 'ps_trail', by: -2 }], else: [{ set: 'ps_trail', value: 0 }] };

export const resourcesS5: ResourceDef[] = [
  {
    id: SR.food,
    icon: 'food',
    name: 'Харчі',
    order: 1,
    kind: 'food',
    meal: { hp: 2, minutes: 8 },
    cap: 30,
    weight: 0.5,
    use: { heal: 6, anywhere: true, label: 'Поїсти', log: { self: 'Хліб, дичина, монастирський мед. Їси мовчки, як усі на дорозі.', other: '{name} їсть.' } },
  },
  { id: SR.wood, icon: 'wood', name: 'Хмиз і дрова', order: 2, cap: 24, weight: 1 },
  { id: SR.coin, carry: true, icon: 'coin', name: 'Шаги', order: 3, weight: 0 },
  { id: SR.hide, icon: 'hide', name: 'Шкурки', order: 4, cap: 12, weight: 1 },
  { id: SR.goods, icon: 'ladle', name: 'Ложки й гребінці', order: 5, cap: 12, weight: 0.3, desc: 'Вирізано вечорами біля вогню. На хліб міняються охоче.' },
  { id: ST.coat, icon: 'jacket', name: 'Тепла свита', order: 10, kind: 'tool', cap: 2, weight: 0, desc: 'Заячі шкурки хутром усередину, зшиті жилкою. Негарна. Тепла.' },
];

export const enemiesS5: EnemyDef[] = [
  {
    id: SE.wolf,
    icon: 'wolf',
    name: 'Вовк',
    acc: 'вовка',
    gen: 'вовка',
    verb: 'рве',
    level: 7,
    hp: 22,
    dmg: [3, 6],
    evade: 1,
    morale: 12,
    traits: ['pack', 'night'],
    ai: [{ move: 'attack', w: 3 }, { move: 'grab', w: 1 }],
    loot: { [SR.hide]: [1, 1] },
    desc: 'Осінні вовки: худі, нахабні. Ходять слідом за обозами — там є чим поживитися.',
  },
  {
    id: SE.rider,
    icon: 'rider',
    name: 'Роз\'їзд',
    acc: 'вершника',
    gen: 'вершника',
    verb: 'б\'є з коня',
    level: 8,
    hp: 28,
    dmg: [4, 7],
    armor: 1,
    morale: 13,
    humane: true,
    traits: ['fast'],
    ai: [{ move: 'attack', w: 3 }, { move: 'grab', w: 1 }],
    loot: { [SR.coin]: [2, 4] },
    desc: 'Полкові вершники при сірих возах. Їдуть по свіжому сліду, як по шляху.',
  },
  {
    id: SE.robber,
    icon: 'snatcher',
    name: 'Розбійник',
    acc: 'розбійника',
    gen: 'розбійника',
    verb: 'б\'є',
    level: 7,
    hp: 24,
    dmg: [3, 6],
    morale: 10,
    humane: true,
    traits: ['thief'],
    ai: [{ move: 'attack', w: 3 }, { move: 'steal', w: 1 }],
    loot: { [SR.coin]: [1, 3], [SR.food]: [0, 2] },
    desc: 'Такий самий утікач, як ви. Тільки вирішив, що чуже брати легше, ніж своє робити.',
  },
];

export const areasS5: AreaDef[] = [
  {
    id: SA.oak,
    name: 'Під старим дубом',
    where: 'під дубом',
    scene: 'grove',
    home: true,
    // the road is behind them once the widow takes them in
    visible: { noFlag: 'ps_hanna' },
    pos: [2, 0],
    danger: 7,
    ambush: 0.04,
    foes: [
      { enemy: SE.wolf, n: [2, 2], w: 1, if: met },
      { enemy: SE.rider, n: [1, 2], w: 2, if: { flag: 'ps_trail', gte: 3 } },
    ],
    desc: 'Дуб на узліссі, такий широкий, що за ним сховаєш віз. Погасле вогнище — чиєсь, давнє. Тепер ваше.',
    links: [
      { to: SA.abbey, time: 14 * SEC, if: met },
      { to: SA.ford, time: 24 * SEC, if: { flag: 'ps_carts_done' } },
    ],
  },
  {
    id: SA.abbey,
    name: 'Монастир на горі',
    where: 'у монастирі',
    scene: 'grove',
    pos: [6, 0],
    visible: { all: [met, { noFlag: 'ps_hanna' }] },
    danger: 7,
    ambush: 0.06,
    foes: [
      { enemy: SE.robber, n: [1, 2], w: 1 },
      { enemy: SE.rider, n: [2, 2], w: 3, if: { flag: 'ps_trail', gte: 3 } },
    ],
    desc: 'Білі стіни, сад, вулики, дзвіниця. Ченців — п\'ятеро, і всі старі. Роботи — на двадцятьох.',
  },
  {
    id: SA.ford,
    name: 'Брід на Глуші',
    where: 'на броді',
    scene: 'brid',
    pos: [0, 0],
    visible: { flag: 'ps_carts_done' },
    danger: 6,
    ambush: 0.02,
    desc: 'Мілка осіння річка, пісок, жовте листя на воді. На тому березі — дим із коминів.',
  },
];

export const locationsS5: LocationDef[] = [
  {
    id: SL.oak,
    name: 'Стоянка',
    area: SA.oak,
    order: 1,
    visible: ch5open,
    desc: [
      { if: met, text: 'Два клунки під дубом. Вогнище на двох — і двоє, які ще не знають, як одне одного звати.' },
      { text: 'Старий дуб, погасле вогнище, тиша.' },
    ],
    spots: [
      { id: 'oak', name: 'Старий дуб', x: 50, y: 24, icon: 'log' },
      { id: 'brush', name: 'Хмиз', x: 12, y: 62, icon: 'sticks' },
      { id: 'timber', name: 'Діброва', x: 88, y: 60, icon: 'footprints' },
    ],
  },
  {
    id: SL.abbey,
    name: 'Монастир',
    area: SA.abbey,
    order: 1,
    visible: met,
    desc: 'Брама, сад із вуликами, дзвіниця, криниця з журавлем. Ченці дають хліб за роботу й не питають, звідки ви.',
    spots: [
      { id: 'hives', name: 'Вулики', x: 14, y: 24, icon: 'nest' },
      { id: 'tower', name: 'Дзвіниця', x: 86, y: 26, icon: 'hall' },
      { id: 'gate', name: 'Брама', x: 12, y: 62, icon: 'cart' },
      { id: 'well', name: 'Криниця', x: 88, y: 60, icon: 'well' },
    ],
  },
  {
    id: SL.ford,
    name: 'Брід',
    area: SA.ford,
    order: 1,
    visible: { flag: 'ps_carts_done' },
    desc: 'Пісок, мілина, жовте листя. За річкою — дзвіниця й дими.',
    spots: [
      { id: 'sand', name: 'Пісок', x: 14, y: 24, icon: 'footprints' },
      { id: 'ford', name: 'Брід', x: 86, y: 26, icon: 'pier' },
    ],
  },
];

export const actionsS5: ActionDef[] = [
  // ------------------------------------------------------------------ under the oak
  {
    id: 'ps_x01',
    group: SL.oak,
    spot: 'timber',
    role: 'hunter',
    label: 'Полювати в діброві',
    visible: met,
    yield: { [SR.food]: [2, 3] },
    chance: [{ p: 0.3, add: { [SR.hide]: 1 } }],
    cooldown: 12 * SEC,
    skill: 'gather',
    knack: { role: 'hunter', x: 1.3 },
    kind: 'gather',
    busy: 'полює в діброві',
    log: {
      self: ['Заєць у жолудях. Ти береш його з першої стріли.', 'Дикий голуб на сухій гілці. Один — на двох вистачить.'],
      other: '{name} полює в діброві.',
    },
  },
  {
    id: 'ps_x02',
    group: SL.oak,
    spot: 'brush',
    label: 'Збирати хмиз',
    visible: met,
    yield: { [SR.wood]: [2, 3] },
    cooldown: 9 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'збирає хмиз',
    log: {
      self: ['Сухі дубові гілки ламаються з тріском, як постріл. Ти озираєшся щоразу.', 'Хмизу повно: тут давно ніхто не ночував.'],
      other: '{name} збирає хмиз.',
    },
  },
  {
    id: 'ps_x03',
    icon: 'spot:footprints',
    group: SL.oak,
    spot: 'brush',
    role: 'hunter',
    label: 'Замести слід довкола стоянки',
    visible: { all: [met, { flag: 'ps_trail', gte: 1 }] },
    effects: [sweep],
    cooldown: 14 * SEC,
    kind: 'home',
    gives: 'Слід −2',
    busy: 'замітає слід',
    log: {
      self: [
        'Гілкою по стежці, листям зверху, а свій слід — у бік болота. Хто піде по ньому, той погуляє.',
        'Ти ведеш хибну стежку до струмка й назад по воді. Слід обривається там, де його ніхто не шукатиме.',
      ],
      other: '{name} замітає ваш слід.',
    },
  },
  {
    id: 'ps_x04',
    group: SL.oak,
    spot: 'oak',
    role: 'maker',
    label: 'Вирізати ложки й гребінці',
    visible: met,
    cost: { [SR.wood]: 2 },
    yield: { [SR.goods]: 2 },
    cooldown: 14 * SEC,
    skill: 'craft',
    kind: 'craft',
    busy: 'вирізає ложки',
    log: {
      self: ['Ніж іде по дубу легко: рука пам\'ятає. Ложка, ще ложка, гребінець — на хліб.', 'Ти вирізаєш на держаку квітку. Навіщо — сам{|а} не знаєш. Хай буде.'],
      other: '{name} вирізає ложки біля вогню.',
    },
  },
  {
    id: 'ps_x05',
    group: SL.oak,
    spot: 'oak',
    role: 'hunter',
    label: 'Нарізати стріл',
    visible: met,
    cost: { [SR.wood]: 2 },
    yield: { [HU.arrow]: 5 },
    cooldown: 12 * SEC,
    skill: 'craft',
    kind: 'craft',
    busy: 'стругає стріли',
    log: {
      self: 'Прямі гілки, пір\'я з голуба, жилка. П\'ять стріл — криві, але долетять.',
      other: '{name} стругає стріли.',
    },
  },

  {
    id: 'ps_x06',
    group: SL.oak,
    spot: 'oak',
    role: 'maker',
    label: 'Пошити теплу свиту зі шкурок',
    visible: { flag: 'ps_carts_done' },
    cost: { [SR.hide]: 5, [SR.wood]: 2 },
    yield: { [ST.coat]: 1 },
    cooldown: 20 * SEC,
    skill: 'craft',
    kind: 'craft',
    busy: 'шиє свиту',
    log: {
      self: ['Голка з кістки, жилка, шкурки хутром усередину. Шви кривуваті: шити ти вчи{вся|лася} не на кожухах. Але вітер не пройде.', 'Друга свита — менша, по мірці, яку ти зня{в|ла} оком. Мірку ніхто не просив знімати.'],
      other: '{name} шиє свиту зі шкурок.',
    },
  },

  // ------------------------------------------------------------------ the abbey: work for bread
  {
    id: 'ps_x10',
    group: SL.abbey,
    spot: 'hives',
    role: 'maker',
    label: 'Полагодити вулики',
    cost: { [SR.wood]: 2 },
    yield: { [SR.food]: 3 },
    effects: [{ inc: 'ps_orders', max: 12 }, trail()],
    cooldown: 16 * SEC,
    recharge: 50 * SEC,
    skill: 'craft',
    kind: 'trade',
    gives: 'Хліб і мед · слід +1',
    busy: 'лагодить вулики',
    log: {
      self: ['Колода тріснула, дах протікає, леток гниє. Ти лагодиш — бджоли гудуть, але не жалять. Чернець приносить мед на окрайці.', 'Старий чернець дивиться, як ти працюєш, і каже: — Руки в тебе не жебрацькі. — Більше нічого не питає.'],
      other: '{name} лагодить монастирські вулики.',
    },
  },
  {
    id: 'ps_x11',
    group: SL.abbey,
    spot: 'tower',
    role: 'maker',
    label: 'Перетягти дзвіницю: нова мотузка, нові клинці',
    cost: { [SR.wood]: 3 },
    yield: { [SR.food]: 2, [SR.coin]: 3 },
    effects: [{ inc: 'ps_orders', max: 12 }, trail()],
    cooldown: 18 * SEC,
    recharge: 80 * SEC,
    skill: 'craft',
    kind: 'trade',
    gives: 'Шаги й хліб · слід +1',
    busy: 'лагодить дзвіницю',
    log: {
      self: 'Ти лізеш нагору, міняєш клинці, перетягаєш мотузку. Дзвін гуде тобі просто у вухо — і ти чомусь не можеш перестати всміхатися.',
      other: 'На дзвіниці щось гуркоче: {name} лагодить дзвін.',
    },
  },
  {
    id: 'ps_x12',
    group: SL.abbey,
    spot: 'gate',
    label: 'Обміняти ложки на хліб',
    cost: { [SR.goods]: 2 },
    yield: { [SR.food]: 4 },
    effects: [trail()],
    cooldown: 10 * SEC,
    kind: 'trade',
    gives: 'Хліб · слід +1',
    busy: 'міняє ложки на хліб',
    log: {
      self: ['Брат-ключар крутить ложку в руках, хмикає — і дає півхлібини. За дві — цілу.', 'Біля брами — інші утікачі. Хтось теж міняє: хустку, ніж, обручку. Хліб — дорожчий за обручку.'],
      other: '{name} міняє ложки на хліб.',
    },
  },
  {
    id: 'ps_x13',
    group: SL.abbey,
    spot: 'well',
    role: 'hunter',
    label: 'Носити ченцям воду',
    yield: { [SR.food]: 2 },
    effects: [{ inc: 'ps_orders', max: 12 }, trail()],
    cooldown: 14 * SEC,
    recharge: 50 * SEC,
    kind: 'trade',
    gives: 'Хліб · слід +1',
    busy: 'носить воду',
    log: {
      self: ['Журавель рипить, відро важке. Ченці старі — їм самим не під силу. Тобі дають хліба й не питають імені.', 'Ти носиш воду й дивишся на шлях. По шляху їдуть. По шляху завжди хтось їде.'],
      other: '{name} носить ченцям воду.',
    },
  },
];

export const mysteriesS5: MysteryDef[] = [{ id: SM.carts, question: 'Куди везуть сірі вози?', order: 1 }];

export const cluesS5: ClueDef[] = [
  {
    id: 'ps_c1',
    to: 'both',
    mystery: SM.carts,
    title: 'Білий стовп',
    text: 'У балці за монастирем сірі вози передають людям у білому — не полковим. Сотник кланяється їм першим. Далі вози йдуть на схід, до крейдяних круч.',
  },
  {
    id: 'ps_c2',
    to: 'both',
    mystery: SM.carts,
    title: 'На схід',
    text: 'Сірі вози минули монастир і звернули на схід, до крейдяних круч. Ченці зачиняють браму, коли вони їдуть.',
  },
];

export const goalsS5: GoalDef[] = [
  { id: 'ps_goal5', text: 'На заході — брід. Перед дорогою — замести слід і взяти харчів.', when: { all: [{ flag: 'ps_carts_done' }, { owns: ST.coat, gte: 2 }] } },
  { id: 'ps_goal4', text: 'Ночі вже холодні. Свити на двох — зі шкурок, що дасть діброва.', when: { flag: 'ps_carts_done' } },
  { id: 'ps_goal3', text: 'Під вечір повз браму монастиря ідуть вози.', when: { flag: 'ps_orders', gte: 10 } },
  { id: 'ps_goal2', text: 'Монастир на горі годує тих, хто працює. Тільки слід за вами там лишається.', when: met },
  { id: 'ps_goal1', text: 'Під старим дубом хтось є.', when: ch5open },
];

const SEES: StealthNode['sees'] = {
  watching: 'Задній погонич обертається.',
  away: 'Погоничі дивляться на шлях.',
  loose: 'Під ногою — сухе листя.',
  firm: 'Під ногою — трава, тиха.',
};

export const scenesS5: SceneDef[] = [
  // ------------------------------------------------------------------ under the oak: the two meet
  {
    id: SS.oak,
    title: 'Під дубом',
    group: SL.oak,
    spot: 'oak',
    label: [
      { if: { role: 'hunter' }, text: 'Підійти до того, хто спить під дубом' },
      { text: 'Прокинутися: хтось іде' },
    ],
    visible: { all: [ch5open, { noFlag: 'ps_met' }] },
    gives: 'Новий розділ',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Старий дуб на узліссі, такий широкий, що за ним можна сховати віз. Під ним — погасле вогнище й людина, сіра від дорожнього пилу.',
        hunter: [
          'Ти ступаєш тихо — не щоб підкрастися: ти так ходиш завжди. Під дубом спить хтось, поклавши під голову торбу з інструментом. Руки в опіках і мозолях. Ти накладаєш стрілу. Про всяк випадок.',
          { if: { flag: 'pm_clerk' }, text: 'На сплячому — полкове сукно з мідними гудзиками. Ти тримаєш стрілу на тятиві довше, ніж треба.' },
        ],
        maker: [
          'Ти прокидаєшся від кроку. Не від звуку — від того, що замовкли птахи на дубі. Над тобою стоїть хтось із луком, і стріла дивиться тобі в груди.',
          { if: { flag: 'pm_clerk' }, text: 'Ти згадуєш, що на тобі полкове сукно. Зараз воно — не найкраща одежа.' },
        ],
        effects: [{ startAct: 5 }],
        next: 'first',
      },
      first: {
        type: 'choice',
        mode: 'each',
        text: 'Хтось має заговорити першим.',
        options: [
          { id: 'carts', visible: { role: 'hunter' }, label: '— Сірі вози. Ти їх бачи{p:в|ла}?', effects: [{ pset: 'ps_first_carts' }] },
          { id: 'alive', visible: { role: 'hunter' }, label: '— Ти {p:живий|жива}?', effects: [{ pset: 'ps_first_alive' }] },
          { id: 'who', visible: { role: 'maker' }, label: '— Ти хто?', effects: [{ pset: 'ps_first_who' }] },
          { id: 'dont', visible: { role: 'maker' }, label: '— Не стріляй.', effects: [{ pset: 'ps_first_dont' }] },
        ],
        next: 'n2',
      },
      n2: {
        text: 'Стріла опускається. Не зовсім — на півдорозі до землі. Ніхто не відповідає на те, що спитали. Обоє відповідають на інше.',
        hunter: '— Ніхто, — кажеш ти. — Іду на північ.',
        maker: '— Іду на північ, — кажеш ти. — Як усі.',
        next: 'n3',
      },
      n3: {
        text: 'Потім ви сидите по різні боки погаслого вогнища й мовчите. Хмиз підсовують мовчки — то одна рука, то друга. Вогонь береться.',
        hunter: 'Інструмент у торбі добрий, чистий. Хто так тримає інструмент, той не грабує.',
        maker: 'Лук саморобний, тятива намащена жиром. Хто так тримає лук, той не стріляє першим.',
        effects: [{ set: 'ps_met' }, { mystery: SM.carts, level: 1 }, { give: { [HU.arrow]: 20 }, who: 'hunter' }, { add: { [SR.food]: 4 } }, { checkpoint: 'ps5.start' }],
        next: 'n4',
      },
      n4: {
        type: 'choice',
        mode: 'joint',
        text: 'Ранок. Шлях один, а вас двоє.',
        options: [
          { id: 'with', label: 'Іти далі разом — хоча б до найближчого села', next: 'with' },
          { id: 'apart', label: 'Розійтися: кожен своєю дорогою', next: 'apart' },
        ],
        mismatch: 'apart',
      },
      with: {
        text: 'Ви йдете разом. Не поруч — на два кроки одне від одного. Так, щоб устигнути, якщо що.',
        next: null,
      },
      apart: {
        text: 'Ви розходитеся. За годину зустрічаєтеся біля того самого струмка — бо стежка тут одна. Сміятися нема сили. Далі йдете разом.',
        effects: [{ set: 'ps_wary' }],
        next: null,
      },
    },
  },

  // ------------------------------------------------------------------ the grey carts pass the abbey
  {
    id: SS.carts,
    title: 'Сірі вози',
    group: SL.abbey,
    spot: 'gate',
    label: 'Під вечір біля брами',
    visible: { all: [met, { noFlag: 'ps_carts_done' }] },
    enabled: { flag: 'ps_orders', gte: 10 },
    disabledHint: 'Під вечір повз браму щось їде — але ви тут ще чужі, вас до брами не пустять. Попрацюйте в монастирі.',
    gives: 'Вибір',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Під вечір повз монастирську браму йдуть вози. Чотири, під сірою рогожею. Коні ситі, погоничі в сірих сорочках мовчать. Ченці зачиняють браму й хрестяться.',
        hunter: [
          [
            { if: { flag: 'ph_looked' }, text: 'Ти знаєш, що під рогожею. Ти вже раз підня{в|ла} край — на переправі, давно.' },
            { text: 'Рогожа на передньому возі ворушиться. Хтось під нею дихає.' },
          ],
        ],
        maker: [
          [
            { if: { flag: 'pm_tags' }, text: 'З-під рогожі звисає рука з мідною бляшкою на зап\'ясті. Ти знаєш цю бляшку. Твоя рука, твій карб.' },
            { text: 'З-під рогожі звисає рука з мідною бляшкою на зап\'ясті.' },
          ],
        ],
        next: 'n2',
      },
      n2: {
        type: 'choice',
        mode: 'joint',
        text: 'Вози звертають на схід — до крейдяних круч, кажуть ченці. Більше ченці нічого не кажуть.',
        options: [
          { id: 'follow', label: 'Іти за возами — подивитися, куди везуть', next: 'f1' },
          { id: 'stay', label: 'Не чіпати. Нас двоє', next: 's1' },
        ],
        mismatch: 'm1',
      },
      m1: {
        text: 'Ви сперечаєтеся пошепки — уперше. Поки сперечаєтеся, вози зникають за пагорбом. Рішення прийняло себе саме.',
        next: 's1',
      },
      f1: {
        type: 'stealth',
        text: 'Ви йдете за возами узбіччям, по той бік живоплоту. Смеркає.',
        path: [false, true, false, false, true, false, false],
        watch: [false, false, true, false, false, true],
        alarm: 3,
        time: 16,
        sees: SEES,
        win: 'f2',
        lose: 'caught',
      },
      caught: {
        text: 'Задній погонич свистить у два пальці. З-за возів вилітають вершники.',
        next: 'fight',
      },
      fight: {
        type: 'fight',
        foes: [{ enemy: SE.rider, n: 2 }],
        win: 'f2',
        lose: 'lost',
      },
      lost: {
        text: 'Вас збивають у рів і їдуть далі, навіть не обшукавши. Двоє лишніх на узбіччі — не варто зупинки. Ви вертаєтеся до дуба побиті, а вози вже далеко.',
        effects: [{ moveTo: SA.oak, who: 'both' }],
        incomplete: true,
        next: null,
      },
      f2: {
        text: 'З пагорба видно балку. Вози стають біля кам\'яного стовпа з білою плямою вапна. Їх зустрічають люди в білому — не полкові. Вози переходять з рук у руки, як мішки з борошном. Далі — на схід, до крейдяних круч.',
        hunter: 'Білі. Ти не знаєш, хто вони такі. Але бачиш: полковий сотник кланяється їм першим.',
        maker: 'Ти рахуєш вози: чотири. Мідних бляшок — двадцять, може, тридцять. Своя рука — у чужій книзі.',
        effects: [{ set: 'ps_carts_followed' }, { inc: 'ps_trail', by: 2, max: 6 }, { clue: 'ps_c1' }, { mystery: SM.carts, level: 2 }],
        next: 'end',
      },
      s1: {
        text: 'Ви дивитеся, як вози зникають за пагорбом. Ніхто не каже ні слова. Потім ви помічаєте, що досі стоїте обоє — і дивитеся в той бік.',
        effects: [{ set: 'ps_carts_left' }, { clue: 'ps_c2' }, { mystery: SM.carts, level: 1 }],
        next: 'end',
      },
      end: {
        text: 'Уночі біля вогню під дубом хтось із вас уперше каже більше, ніж три слова. Про дорогу, не про себе. Про себе — ще рано.',
        hunter: 'Ти слухаєш і дивишся на вогонь. Вперше за багато днів ти засинаєш раніше, ніж збиралася б на варті.',
        maker: 'Ти говориш і стругаєш ложку. Ложка виходить кривувата. Ти не переробляєш.',
        effects: [{ set: 'ps_carts_done' }, { moveTo: SA.oak, who: 'both' }, { xp: 20, who: 'both' }, { checkpoint: 'ps5.carts' }],
        next: null,
      },
    },
  },

  // ------------------------------------------------------------------ the ford: names
  {
    id: SS.ford,
    title: 'Брід на Глуші',
    group: SL.ford,
    spot: 'ford',
    label: 'Перейти брід',
    visible: { all: [{ flag: 'ps_carts_done' }, { noFlag: 'ps_ch5_done' }] },
    enabled: { all: [{ flag: 'ps_trail', lt: 3 }, { owns: ST.coat, gte: 2 }] },
    disabledHint: 'Вода вже осіння: без теплої одежі на двох за річкою не перезимувати. І слід за вами ще свіжий — роз\'їзд піде по ньому аж до броду.',
    cost: { [SR.food]: 20 },
    gives: 'Кінець розділу',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Мілкий осінній брід. Пісок, жовте листя пливе по воді. На тому березі — дим із коминів і дзвіниця.',
        hunter: 'Тут чути дзвін.',
        maker: 'Тут є церква. А в церкві, мабуть, книга.',
        next: 'n2',
      },
      n2: {
        text: 'Ви заходите у воду по коліна. Холодно. Посеред броду хтось зупиняється перший.',
        next: 'ask',
      },
      ask: {
        type: 'choice',
        mode: 'each',
        text: 'Що ти кажеш посеред броду?',
        options: [
          { id: 'name', label: '— Як тебе звати?', effects: [{ pset: 'ps_asked_name' }] },
          { id: 'hand', label: 'Мовчки подати руку — течія тягне', effects: [{ pset: 'ps_gave_hand' }] },
        ],
        next: 'n3',
      },
      n3: {
        text: [
          [
            { if: { any: [{ pflag: 'ps_asked_name' }, { partnerPflag: 'ps_asked_name' }] }, text: '— {partner}, — чуєш ти. Ім\'я падає у воду, як камінець, і йде на дно. Тепер воно тут.' },
            { text: 'Рука в руці — мокра, холодна, тверда. На тому березі ти чуєш: «{partner}». Тихо, ніби пробуючи, чи можна.' },
          ],
          'Уперше за всю дорогу хтось кличе тебе на ім\'я.',
        ],
        next: 'n4',
      },
      n4: {
        text: 'На тому березі — село. Ви ще не знаєте, як воно зветься.',
        effects: [{ set: 'ps_ch5_done' }, { xp: 30, who: 'both' }, { heal: 'full' }, { actDone: 5 }, { checkpoint: 'ps5.end' }],
        next: null,
      },
    },
  },
];
