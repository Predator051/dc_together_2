import type { ActionDef, ClueDef, Cond, GoalDef, SceneDef } from '../../../shared/src/content.js';
import { PE, PL, PM, PN, PR, PS } from './ids.js';

const SEC = 1000;
const ch3: Cond = { flag: 'pm_ch3' };
const hidden = (n: number): Cond => ({ flag: 'pm_hidden', gte: n });

/**
 * Chapter three (`.design/past-maker.md`): the recruiters in Kryvets take whoever is in no book. The workshop
 * hides people under the shed; the boy is taken anyway; the workshop burns; the road north.
 */
export const actionsM3: ActionDef[] = [
  {
    id: 'pm_x70',
    icon: 'clay',
    group: PL.shop,
    spot: 'hearth',
    label: 'Викопати схованку під повіткою',
    visible: ch3,
    once: true,
    cost: { [PR.oak]: 4, [PR.clay]: 4 },
    effects: [{ set: 'pm_cellar' }],
    cooldown: 30 * SEC,
    kind: 'build',
    why: 'Людей, яких нема в книгах, шукатимуть по дворах.',
    gives: 'Схованка',
    busy: 'копає схованку',
    log: { self: 'Земля під повіткою суха. Яма на шестеро, стіни — дубовими дошками, ляда — під сіном. Тимко тримає ліхтар і не питає, навіщо.', other: '{name} копає схованку.' },
  },
  {
    id: 'pm_x71',
    icon: 'spot:hearth',
    group: PL.market,
    spot: 'church',
    label: 'Перевести родину біженців у схованку',
    visible: { all: [ch3, { flag: 'pm_cellar' }, { noFlag: 'pm_ch3_done' }] },
    enabled: { flag: 'pm_hidden', lt: 4 },
    disabledHint: 'Схованка повна.',
    cost: { [PR.food]: 3 },
    effects: [{ inc: 'pm_hidden', max: 4 }, { xp: 8, who: 'actor' }],
    cooldown: 14 * SEC,
    recharge: 30 * SEC,
    ambush: 0.12,
    kind: 'home',
    gives: 'Ще одна родина',
    busy: 'веде біженців городами',
    log: {
      self: [
        'Задвірками, городами, через Явдошин сад. Мати несе малого, батько — нічого: нема вже чого нести.',
        'Біля церкви вербувальник гортає список. Ти ведеш їх повз, наче своїх, і говориш про погоду.',
        'Стара не хоче йти: «Я своє віджила». Ти береш її клунок, і вона йде за клунком.',
      ],
      other: '{name} кудись веде людей.',
    },
  },
  {
    id: 'pm_x72',
    icon: 'driedfish',
    group: PL.shop,
    spot: 'hearth',
    label: 'Носити їжу в схованку',
    visible: { all: [{ flag: 'pm_cellar' }, hidden(1), { noFlag: 'pm_ch3_done' }] },
    cost: { [PR.food]: 2 },
    effects: [{ inc: 'pm_fed', max: 6 }],
    cooldown: 8 * SEC,
    recharge: 25 * SEC,
    kind: 'home',
    gives: 'Схованка нагодована',
    busy: 'носить їжу під повітку',
    log: { self: 'Ляда, сходи, темрява, дихання. Хтось бере миску з твоїх рук, не кажучи нічого. Діти сплять.', other: '{name} носить їжу в схованку.' },
  },
  {
    id: 'pm_x73',
    icon: 'buckle',
    group: PL.shop,
    spot: 'forge',
    label: 'Карбувати бляшки для схованих',
    visible: { all: [{ flag: 'pm_cellar' }, hidden(1), { noFlag: 'pm_ch3_done' }] },
    enabled: { flag: 'pm_papers', lt: 4 },
    disabledHint: 'Бляшок на всіх уже вистачить.',
    cost: { [PR.iron]: 1, [PR.coal]: 2 },
    effects: [{ inc: 'pm_papers', max: 4 }],
    cooldown: 26 * SEC,
    skill: 'craft',
    kind: 'home',
    gives: 'Бляшка з номером',
    busy: 'карбує бляшки',
    log: {
      self: [
        'Номер, якого нема в жодній книзі, — але хто ж те перевірить? Мідь, карб, шнурок. Із бляшкою на шиї людина вже не лишня.',
        'Ти карбуєш і думаєш про Луку. Чужими бляшками рятуєш тих, кого бляшками ж і рахували.',
      ],
      other: '{name} карбує бляшки.',
    },
  },
];

export const scenesM3: SceneDef[] = [
  {
    id: PS.recruit,
    title: 'Списки',
    group: PL.market,
    spot: 'church',
    label: 'Протиснутися до натовпу біля церкви',
    visible: { all: [{ flag: 'pm_ch2_done' }, { flag: 'main_act', gte: 3 }] },
    gives: 'Новий розділ',
    start: 'n1',
    nodes: {
      n1: {
        text: [
          'Осінь знову. На майдані — віз, на возі — стіл, за столом — урядник у синьому, з книгою. Довкола — вершники з нагайками.',
          'Урядник читає метричну книгу Кривця — ту саму, зі скрині в ризниці. Кого в книзі нема, того записує в свою.',
        ],
        effects: [{ meet: PN.kindrat }],
        next: 'n2',
      },
      n2: {
        text: '— Лишні, — пояснює урядник Кіндрат у натовп, ласкаво. — Нічиї. Їм же краще: полк — то хліб і дах. — Вершники ведуть від пристані чоловіків, жінок. На шиях у них — мідні бляшки на шнурках.',
        maker: [
          [
            { if: { flag: 'pm_tags' }, text: 'Мідні, круглого карбу. Номер сорок вісім — на шиї в хлопця з пристані. Ти пам\'ятаєш, як карбувала його твоя рука.' },
            { text: 'Мідні, круглого карбу. Не твої. Лука знайшов іншого майстра.' },
          ],
        ],
        effects: [{ clue: 'pm_c7' }, { mystery: PM.numbers, level: 4 }],
        next: 'n3',
      },
      n3: {
        text: 'Тимко стоїть поруч і дивиться на книгу. Його в книзі нема. Ти береш його за плече й ведеш додому, не оглядаючись. Гордій уже в дворі. — Під повіткою, — каже він. — Яму. Сьогодні.',
        effects: [{ set: 'pm_ch3' }, { checkpoint: 'pm3.start' }],
        next: null,
      },
    },
  },
  {
    id: PS.tymko,
    title: 'Тимко',
    group: PL.shop,
    spot: 'board',
    label: 'Шукати Тимка — його нема з ранку',
    visible: { all: [ch3, hidden(4), { flag: 'pm_fed', gte: 3 }, { flag: 'pm_papers', gte: 3 }] },
    enabled: { level: 5 },
    disabledHint: 'Їх буде багато, і вони збройні. Набратися сил (рівень 5).',
    gives: 'Погоня · бій',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Тимко пішов на берег по лозу — і не вернувся. Рибалка Онопрій прибігає задиханий: «Взяли. Вершники. На Брід повели, з іншими».',
        next: 'n2',
      },
      n2: {
        text: 'Ти біжиш шляхом, не відчуваючи ніг. За бродом, біля розбитих возів, — валка: люди мотузкою за руки, вершники по боках, Кіндрат на чолі. Тимко — останній, найменший. Він бачить тебе й не кричить. Вчився.',
        next: 'fight',
      },
      fight: { type: 'fight', foes: [{ enemy: PE.sergeant }, { enemy: PE.recruiter }], win: 'won', lose: 'lost' },
      lost: {
        text: 'Нагайка збиває тебе в пил. Кіндрат дивиться згори: — Майстрів не беремо. Майстри нам ще знадобляться. — Валка рушає. Ти підводишся, коли вже нікого не видно. Ще не пізно — вони йдуть повільно.',
        incomplete: true,
        next: null,
      },
      won: {
        text: 'Кіндрат лежить у пилу, вершники розбіглися. Ти ріжеш мотузку — одну руку, другу, десяту. Люди стоять і не вірять. Потім біжать — у плавні, у верболіз, хто куди.',
        effects: [{ set: 'pm_tymko_saved' }],
        next: 'n3',
      },
      n3: {
        text: 'Тимко тримається за твій рукав аж до самого дому. Біля брами каже: — Я знав, що прийдеш. — І вперше за весь час плаче.',
        effects: [{ xp: 30, who: 'actor' }],
        next: null,
      },
    },
  },
  {
    id: PS.fire,
    title: 'Згарище',
    group: PL.shop,
    spot: 'hearth',
    label: 'Прокинутися від диму',
    visible: { flag: 'done:pm_s11' },
    gives: 'Кінець розділу',
    start: 'n1',
    nodes: {
      n1: {
        text: [
          'Уночі тебе будить дим. Повітка горить, горить дах майстерні, горить груша над столом, де ви вечеряли. Біля брами — вершники з факелами. Кіндрат не забув.',
          [
            { if: { pflag: 'bg_home' }, text: 'Горить сад. Яблунька, яку Явдоха посадила тобі восени, спалахує, як свічка.' },
            { text: 'Горить сад Явдохи — вишні, груша, все.' },
          ],
        ],
        next: 'n2',
      },
      n2: {
        text: 'Гордій з відром біжить до повітки — до ляди, до схованки. Люди виходять із ями в дим, діти на руках. Ти тягнеш за руки, рахуєш: один, два, три… Рахуєш, як колись бляшки.',
        effects: [{ if: { flag: 'pm_hidden', gte: 4 }, then: [{ set: 'pm_hid_all' }] }],
        next: 'n3',
      },
      n3: {
        text: '— Іди, — каже Явдоха. Обличчя в сажі, в руках — твій вузлик, той самий, з яким ти прийш{ов|ла}. — На північ. Хлопця бери. Тут уже не буде ні майстерні, ні нас.',
        next: 'n4',
      },
      n4: {
        type: 'choice',
        mode: 'each',
        text: 'Гордій стоїть у вогні, біля горна, і не кличе тебе.',
        options: [
          { id: 'go', label: 'Піти, як вона каже', effects: [{ pset: 'pm_bg_went' }] },
          { id: 'gordiy', label: 'Побігти до Гордія', effects: [{ pset: 'pm_bg_ran' }] },
        ],
        next: 'n5',
      },
      n5: {
        text: [
          [
            { if: { pflag: 'pm_bg_ran' }, text: 'Гордій відштовхує тебе — сильно, як ніколи. — Ключ, — каже він і вкладає тобі в долоню твій перший молоток. — Двері відмикай. Людей — ні. Іди. — І повертається до горна.' },
            { text: 'Ти йдеш, не оглядаючись, бо знаєш: оглянешся — не підеш. Позаду падає дах майстерні з дубовим ключем над брамою.' },
          ],
          [
            { if: { flag: 'pm_tymko_saved' }, text: 'Тимко йде поруч, тримаючись за твій вузлик.' },
            { text: 'Ти йдеш сам{|а}.' },
          ],
          'До ранку ви вже за Кривцем. Дорога на північ — довга, і на ній багато таких, як ти. Нічиїх.',
        ],
        effects: [{ actDone: 3 }, { set: 'pm_ch3_done' }, { checkpoint: 'pm3.end' }],
        next: null,
      },
    },
  },
];

export const cluesM3: ClueDef[] = [
  { id: 'pm_c7', to: 'maker', mystery: PM.numbers, title: 'Книга і список', text: 'Урядник Кіндрат читає метричну книгу Кривця. Кого в ній нема — «лишні», того пишуть у полк. На шиях — мідні бляшки.' },
];

export const goalsM3: GoalDef[] = [
  { id: 'pm_goal30', text: 'Біля церкви — натовп. Щось читають уголос.', when: { all: [{ flag: 'pm_ch2_done' }, { flag: 'main_act', gte: 3 }, { noFlag: 'pm_ch3' }] } },
  { id: 'pm_goal31', text: 'Викопати схованку під повіткою.', when: { all: [ch3, { noFlag: 'pm_cellar' }] } },
  { id: 'pm_goal32', text: 'Переводити біженців у схованку, носити їм їжу, карбувати їм бляшки — з бляшкою людина вже не лишня. Вербувальники ходять торгом.', when: { all: [{ flag: 'pm_cellar' }, { noFlag: 'done:pm_s11' }] } },
  { id: 'pm_goal33', text: 'Майстерня не спить.', when: { all: [{ flag: 'done:pm_s11' }, { noFlag: 'pm_ch3_done' }] } },
  { id: 'pm_goal34', text: 'Далі — дорога на північ. Коли ви з напарником пройдете далі разом, буде що згадати.', when: { flag: 'pm_ch3_done' } },
];
