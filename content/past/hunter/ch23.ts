import type { ActionDef, ClueDef, Cond, GoalDef, ResidentDef, SceneDef, SceneNode } from '../../../shared/src/content.js';
import { trail } from './ch1.js';
import { HE, HH, HL, HM, HN, HR } from './ids.js';

const SEC = 1000;
const ch2: Cond = { flag: 'ph_ch2' };
const ch3: Cond = { flag: 'ph_ch3' };
const fame = (n: number): Cond => ({ flag: 'ph_fame', gte: n });
const ended = (extra: SceneNode['effects'] = []): SceneNode['effects'] => [{ inc: 'ph_fame', max: 12 }, { xp: 24, who: 'actor' }, ...(extra ?? [])];

/** Chapters two and three of the hunter's past (`.design/past-hunter.md`): the ford at war; the black water. */
export const residentsH: ResidentDef[] = [
  {
    id: HH.sydir,
    name: 'Сидір',
    desc: 'Старий ловчий. Далеко вже не ходить: сидить на острові, ставить верші, ріже лозу й бурчить.',
    traits: [
      { name: 'Рибалка', text: 'Верші — удвічі.', mult: { ph_x02: 2 } },
      { name: 'Старий', text: 'До займища не ходить.', avoid: ['ph_x04'] },
    ],
  },
];

const t5 = trail({
  n: 5,
  open: ch2,
  find: { id: 'ph_x40', group: HL.steppe, spot: 'mound', label: 'Подивитися на сліди біля кургану', log: 'Чоботи — полкові, підбиті. Один, ішов уночі, падав. Кров на ковилі, небагато. Звернув до плавнів, не до шляху: ховається.' },
  follow: { id: 'ph_x41', group: HL.reeds, spot: 'tracks', label: 'Іти за втікачем в очерет', log: 'Він знає плавні гірше за кабана: ламав очерет, лишав чоботами ями. На гриві — згаслий вогонь без диму. Розумний. Але голодний.' },
  end: {
    id: 'ph_s08',
    title: 'Утікач',
    group: HL.reeds,
    spot: 'tracks',
    label: 'Вийти до вогнища на гриві',
    gives: 'Вибір',
    nodes: {
      n1: { text: 'Хлопець років двадцяти сидить біля холодного вогнища, тримаючи ногу. Побачивши тебе, хапає палицю — і кидає. — Не видавай, — каже він. — Я з полку. Нас ведуть на південь, а попереду ставлять тих… тихих. Я бачив. Я не можу.', effects: [{ meet: HN.deserter }], next: 'n2' },
      n2: {
        type: 'choice',
        mode: 'each',
        text: 'На Броді за втікачів платять.',
        options: [
          { id: 'hide', label: 'Перев\'язати ногу й вивести на північ, плавнями', effects: [{ set: 'ph_deserter_saved' }] },
          { id: 'give', label: 'Відвести на Брід, до полку', effects: [{ set: 'ph_deserter_given' }, { add: { [HR.coin]: 10 } }] },
        ],
        next: 'n3',
      },
      n3: {
        text: [
          [
            { if: { flag: 'ph_deserter_saved' }, text: 'Три дні ти ведеш його очеретами на північ. Він майже не говорить. На прощання каже: «Тихі не винні. Їх такими зробили». І йде.' },
            { text: 'На Броді урядник платить тобі десять шагів і кладе втікача на віз. Той не дивиться на тебе. Сидір того вечора не говорить з тобою зовсім.' },
          ],
        ],
        effects: ended(),
        next: null,
      },
    },
  },
});

const t6 = trail({
  n: 6,
  open: { all: [ch2, fame(7)] },
  find: { id: 'ph_x42', group: HL.ford, spot: 'tavern', label: 'Вислухати сотенного розвідника в корчмі', log: '«Мародери ходять плавнями, грабують хутори. Знайди, де сидять, — заплатимо». Він малює на столі пальцем у пиві: острів, Брід, протоки. Неправильно.' },
  follow: { id: 'ph_x43', group: HL.steppe, spot: 'road', label: 'Шукати мародерів над шляхом', log: 'Дим, де диму бути не повинно. Коні без вершників на прив\'язі. Сліди ведуть у балку над шляхом.' },
  end: {
    id: 'ph_s09',
    title: 'Балка',
    group: HL.steppe,
    spot: 'road',
    label: 'Підкрастися до табору мародерів',
    gives: 'Бій',
    nodes: {
      n1: { text: 'У балці — троє біля вогню, на возі — чужі мішки, чужий кожух, дитяча колиска. Один підводить голову й нюхає вітер.', next: 'fight' },
      fight: { type: 'fight', foes: [{ enemy: HE.looter, n: 2 }], win: 'won', lose: 'lost' },
      lost: { text: 'Вони женуть тебе до самих плавнів. Ти ховаєшся у воді по шию, поки не стихне тупіт.', incomplete: true, next: null },
      won: { text: 'Мародери тікають степом, кинувши віз. Колиску ти віддаєш поромникові Гнату — він знає, чия.', effects: ended([{ add: { [HR.coin]: 8 } }]), next: null },
    },
  },
});

const t7 = trail({
  n: 7,
  open: { all: [ch2, fame(8)] },
  find: { id: 'ph_x44', group: HL.steppe, spot: 'mound', label: 'Подивитися, чого кричать круки', log: 'Вовки йдуть за обозами з півдня — їм лишають. Зграя: п\'ятеро, і один кульгавий. Ідуть до займища.' },
  follow: { id: 'ph_x45', group: HL.woods, spot: 'trail', label: 'Іти за зграєю до займища', log: 'Вовки ріжуть кабанів, лякають коней на Броді. Лігво — під корчами на старому руслі.' },
  end: {
    id: 'ph_s10',
    title: 'Зграя',
    group: HL.woods,
    spot: 'trail',
    label: 'Чекати зграю біля лігва',
    gives: 'Бій',
    level: 4,
    nodes: {
      n1: { text: 'Вони приходять удосвіта, один за одним, і кульгавий — останній.', next: 'fight' },
      fight: { type: 'fight', foes: [{ enemy: HE.wolf, n: 3 }], win: 'won', lose: 'lost' },
      lost: { text: 'Зграя розсипається й збирається знову — вже довкола тебе. Ти відступаєш до води. Не сьогодні.', incomplete: true, next: null },
      won: { text: 'Кульгавий іде останнім і першим зупиняється. Дивиться на тебе довго — і веде решту на південь, за обозами.', effects: ended(), next: null },
    },
  },
});

export const actionsH2: ActionDef[] = [...t5.actions, ...t6.actions, ...t7.actions];

export const actionsH3: ActionDef[] = [
  {
    id: 'ph_x50',
    icon: 'spot:footprints',
    group: HL.reeds,
    spot: 'tracks',
    label: 'Вивести родину плавнями на північ',
    visible: { all: [ch3, { noFlag: 'ph_ch3_done' }] },
    enabled: { flag: 'ph_led', lt: 4 },
    disabledHint: 'Усіх, кого можна було, — уже вивели.',
    cost: { [HR.food]: 3 },
    effects: [{ inc: 'ph_led', max: 4 }, { xp: 8, who: 'actor' }],
    cooldown: 20 * SEC,
    recharge: 30 * SEC,
    ambush: 0.12,
    kind: 'home',
    gives: 'Ще одна родина',
    busy: 'веде людей плавнями',
    log: {
      self: ['Мати, дід і троє малих — по пояс у воді, тримаючись за мотузку. Ти йдеш {першим|першою}, Сидорова жердина — попереду.', 'Старий не хоче йти: «Хата там». Ти кажеш, що хати вже нема. Він іде.'],
      other: '{name} веде людей плавнями.',
    },
  },
  {
    id: 'ph_x51',
    icon: 'spot:tracks',
    group: HL.woods,
    spot: 'trail',
    label: 'Заплутати сліди за втікачами',
    visible: { all: [ch3, { flag: 'ph_led', gte: 1 }, { noFlag: 'ph_ch3_done' }] },
    enabled: { flag: 'ph_hid', lt: 3 },
    disabledHint: 'Слідів уже не знайти.',
    effects: [{ inc: 'ph_hid', max: 3 }],
    cooldown: 16 * SEC,
    recharge: 25 * SEC,
    skill: 'gather',
    kind: 'home',
    gives: 'Слід заплутано',
    busy: 'плутає сліди',
    log: { self: 'Хибна стежка в займище, гілки на воду, сліди назад — як тебе вчив Сидір, тільки для людей, не для звіра.', other: '{name} плутає сліди.' },
  },
];

actionsH3.push({
  id: 'ph_x52',
  icon: 'food',
  group: HL.reeds,
  spot: 'osier',
  label: 'Носити їжу тим, хто ховається на гривах',
  visible: { all: [ch3, { flag: 'ph_led', gte: 1 }, { noFlag: 'ph_ch3_done' }] },
  enabled: { flag: 'ph_fed', lt: 4 },
  disabledHint: 'Їжі в них поки вистачає.',
  cost: { [HR.food]: 2 },
  effects: [{ inc: 'ph_fed', max: 4 }],
  cooldown: 12 * SEC,
  recharge: 30 * SEC,
  kind: 'home',
  gives: 'Нагодовано',
  busy: 'носить їжу на гриви',
  log: { self: 'Риба в мішку, хліб, сіль. На гриві — п\'ятеро біля вогню без диму. Мала бере рибу обома руками й не їсть — несе матері.', other: '{name} носить їжу в плавні.' },
});

export const scenesH23: SceneDef[] = [
  t5.scene,
  t6.scene,
  t7.scene,
  {
    id: 'ph_s11',
    title: 'Брід у війні',
    group: HL.ford,
    spot: 'pier',
    label: 'Вийти на гомін біля порому',
    visible: { all: [{ flag: 'ph_ch1_done' }, { flag: 'main_act', gte: 2 }] },
    gives: 'Новий розділ',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Весна. На Броді — полк. Пором ходить день і ніч, корчма повна, шкірники купують уже не хутро, а чоботи. На тому березі, на півдні, щоночі заграва.',
        next: 'n2',
      },
      n2: {
        text: 'Сидір цієї весни не сідає в човен. «Ноги не ті», — каже він, і ставить верші біля острова. Ти тепер ходиш плавнями сам{|а}.',
        effects: [{ resident: HH.sydir }, { set: 'ph_ch2' }, { checkpoint: 'ph2.start' }],
        next: null,
      },
    },
  },
  {
    id: 'ph_s12',
    title: 'Тиха колона',
    group: HL.ford,
    spot: 'pier',
    label: 'Дивитися, як колона переходить Брід',
    visible: { all: [ch2, fame(9)] },
    gives: 'Кінець розділу',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Колона йде через Брід цілий день. Солдати як солдати — лаються, п\'ють, співають. А в середині — інші. У сірих сорочках, з мідними бляшками на шиях. Вони йдуть у ногу й мовчать. Перевізники хрестяться.',
        effects: [{ set: 'ph_saw_silent' }, { clue: 'ph_c3' }, { mystery: HM.carts, level: 3 }],
        next: 'n2',
      },
      n2: {
        text: 'Один з тихих — молодий, з білявим чубом — спотикається на поромі й падає. Ти підхоплюєш його. Він не дякує, не дивиться. Але пальці його довго не відпускають твого рукава. На бляшці — дряпиною, не карбом — «Андрій».',
        effects: [{ meet: HN.andriy }, { set: 'ph_andriy' }],
        next: 'n3',
      },
      n3: {
        type: 'choice',
        mode: 'each',
        text: 'Пором рушає. Андрій стоїть серед інших і дивиться перед себе.',
        options: [
          { id: 'name', label: 'Гукнути йому вслід: «Андрію!»', effects: [{ set: 'ph_andriy_called' }] },
          { id: 'quiet', label: 'Мовчки дивитися, як іде пором', effects: [{ set: 'ph_andriy_watched' }] },
        ],
        next: 'n4',
      },
      n4: {
        text: [
          [
            { if: { flag: 'ph_andriy_called' }, text: 'На середині ріки він повертає голову. Тільки голову — повільно, як крізь сон. І тут пором зникає за верболозом.' },
            { text: 'Пором зникає за верболозом. Ти стоїш на березі, поки не стемніє.' },
          ],
          'Увечері Сидір каже тільки одне: «Їх так і возили тоді. Мовчазних. Я думав — більше не побачу».',
        ],
        effects: [{ actDone: 2 }, { startAct: 3 }, { set: 'ph_ch2_done' }, { checkpoint: 'ph2.end' }],
        next: null,
      },
    },
  },
  {
    id: 'ph_s13',
    title: 'Вербувальники',
    group: HL.ford,
    spot: 'tavern',
    label: 'Протиснутися до корчми, де читають списки',
    visible: { all: [{ flag: 'ph_ch2_done' }, { flag: 'main_act', gte: 3 }] },
    gives: 'Новий розділ',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Осінь знову. У корчмі на Броді — урядник з книгою й вербувальники з нагайками. Читають хутори плавнів: хто є в книзі, хто ні. Кого нема — лишні.',
        next: 'n2',
      },
      n2: {
        text: 'Ти знаєш кожен хутір у плавнях — і знаєш, що половини людей там нема в жодній книзі: прийшли з-за річки, від війни, від голоду. Поромник Гнат ловить тебе за рукав: — Вони завтра підуть плавнями. Хутір за хутором.',
        effects: [{ clue: 'ph_c4' }, { mystery: HM.carts, level: 4 }, { set: 'ph_ch3' }, { checkpoint: 'ph3.start' }],
        next: null,
      },
    },
  },
  {
    id: 'ph_s14',
    title: 'Урядник',
    group: HL.woods,
    spot: 'trail',
    label: 'Зустріти вербувальників на займищі',
    visible: { all: [ch3, { flag: 'ph_led', gte: 4 }, { flag: 'ph_hid', gte: 3 }, { flag: 'ph_fed', gte: 3 }] },
    enabled: { level: 5 },
    disabledHint: 'Їх буде кілька, і всі збройні. Набратися сил (рівень 5).',
    gives: 'Бій',
    start: 'n1',
    nodes: {
      n1: { text: 'Урядник з двома вершниками йде твоїми хибними слідами до займища. Далі — протока, а за протокою — остання родина, яку ти ще {не вивів|не вивела}.', next: 'fight' },
      fight: { type: 'fight', foes: [{ enemy: HE.sergeant }, { enemy: HE.recruiter }], win: 'won', lose: 'lost' },
      lost: { text: 'Тебе збивають у воду. Урядник стоїть над протокою й дивиться на той бік. Але ніч темна, а слідів там нема. Він плює й іде назад.', incomplete: true, next: null },
      won: { text: 'Урядник лежить у папороті, вершники ловлять своїх коней у плавнях. Остання родина переходить протоку за твоєю жердиною.', effects: [{ set: 'ph_sergeant_beaten' }, { xp: 30, who: 'actor' }], next: null },
    },
  },
  {
    id: 'ph_s15',
    title: 'Чорна вода',
    group: HL.isle,
    spot: 'hearth',
    label: 'Повернутися на острів',
    visible: { flag: 'done:ph_s14' },
    gives: 'Кінець розділу',
    start: 'n1',
    nodes: {
      n1: {
        text: [
          'Над плавнями — дим. Горять хутори, горить очерет. Острів ще цілий, але над Бродом уже вершники з факелами.',
          [
            { if: { pflag: 'bg_home' }, text: 'Яблунька на гряді, яку посадив Сидір, стоїть у диму. Вона так і не встигла зацвісти.' },
            { text: 'Коптильня ще диміть — уперше тобі здається, що це просто дим.' },
          ],
        ],
        next: 'n2',
      },
      n2: {
        text: 'Сидір сидить на призьбі з сіттю, як того першого дня. — Іди, — каже він. — На північ. Плавні тебе виведуть. А я — тут. Острів мій. — Він дає тобі свій лук. — Зі старого ясена. Не губи.',
        next: 'n3',
      },
      n3: {
        type: 'choice',
        mode: 'each',
        text: 'Човен тицяється в берег.',
        options: [
          { id: 'go', label: 'Сісти в човен', effects: [{ pset: 'ph_bg_went' }] },
          { id: 'stay', label: 'Сісти поруч із ним', effects: [{ pset: 'ph_bg_sat' }] },
        ],
        next: 'n4',
      },
      n4: {
        text: [
          [
            { if: { pflag: 'ph_bg_sat' }, text: 'Ти сидиш поруч, поки дим не підходить до самої води. Тоді він штовхає тебе в човен — сильно, як ніколи. «Дивись, — каже він. — Плавні вчать тих, хто дивиться». І відпихає човен жердиною.' },
            { text: 'Ти відпихаєшся жердиною й не озираєшся. Не озираєшся довго.' },
          ],
          'До ранку ти вже далеко на півночі, де плавні кінчаються. Попереду — дорога. На ній багато таких, як ти. Нічиїх.',
        ],
        effects: [{ actDone: 3 }, { set: 'ph_ch3_done' }, { checkpoint: 'ph3.end' }],
        next: null,
      },
    },
  },
];

export const cluesH23: ClueDef[] = [
  { id: 'ph_c3', to: 'hunter', mystery: HM.carts, title: 'Тихі в колоні', text: 'Полкова колона через Брід. У середині — люди в сірих сорочках з бляшками, йдуть у ногу й мовчать. Сидір: «Їх так і возили тоді».' },
  { id: 'ph_c4', to: 'hunter', mystery: HM.carts, title: 'Хто в книзі', text: 'Урядник на Броді читає хутори плавнів за книгою. Кого в книзі нема — того в полк.' },
];

export const goalsH23: GoalDef[] = [
  { id: 'ph_goal20', text: 'На Броді гомін. Щось сталося.', when: { all: [{ flag: 'ph_ch1_done' }, { flag: 'main_act', gte: 2 }, { noFlag: 'ph_ch2' }] } },
  { id: 'ph_goal21', text: 'Тепер у плавнях — сліди людей. Читати їх так само, як звірині.', when: { all: [ch2, { flag: 'ph_fame', lt: 9 }] } },
  { id: 'ph_goal22', text: 'Через Брід іде колона.', when: { all: [fame(9), { noFlag: 'ph_ch2_done' }] } },
  { id: 'ph_goal30', text: 'На Броді в корчмі читають якісь списки.', when: { all: [{ flag: 'ph_ch2_done' }, { flag: 'main_act', gte: 3 }, { noFlag: 'ph_ch3' }] } },
  { id: 'ph_goal31', text: 'Виводити людей з хуторів плавнями на північ, носити їм їжу на гриви й плутати за ними сліди. Вербувальники підуть хутір за хутором.', when: { all: [ch3, { noFlag: 'done:ph_s14' }] } },
  { id: 'ph_goal32', text: 'Острів ще стоїть.', when: { all: [{ flag: 'done:ph_s14' }, { noFlag: 'ph_ch3_done' }] } },
  { id: 'ph_goal33', text: 'Далі — дорога на північ. Коли ви з напарником пройдете далі разом, буде що згадати.', when: { flag: 'ph_ch3_done' } },
];
