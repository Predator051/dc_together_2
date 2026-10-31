import type { ActionDef, ClueDef, Cond, GoalDef, MysteryDef, NpcDef, SceneDef } from '../../../shared/src/content.js';
import { resourcesM } from './base.js';
import { PE, PG, PL, PM, PN, PR, PS, PT } from './ids.js';

const SEC = 1000;
const inside: Cond = { flag: 'pm_in' };
const fame = (n: number): Cond => ({ flag: 'pm_fame', gte: n });

/**
 * An order on the board: take it (its flag), make the thing, hand it over (coins and fame).
 * The board shows what is open; what is taken waits in the workshop until it is made and carried.
 */
export function order(o: {
  n: number;
  who: string;
  label: string;
  open: Cond;
  make: { id: string; label: string; at: 'bench' | 'forge'; cost: Record<string, number>; thing: string; time: number; log: string };
  give: { id: string; label: string; group: string; spot: string; pay: number; log: string };
  take: { id: string; log: string };
}): ActionDef[] {
  const flag = `pm_o${o.n}`;
  const done = `pm_o${o.n}_done`;
  // the order on the board shows what is asked for
  const mark = resourcesM.find((r) => r.id === o.make.thing)?.icon;
  return [
    {
      id: o.take.id,
      ...(mark ? { icon: mark } : {}),
      group: PL.shop,
      spot: 'board',
      label: `Взяти замовлення: ${o.label}`,
      visible: { all: [inside, o.open, { noFlag: flag }] },
      effects: [{ set: flag }],
      cooldown: 3 * SEC,
      gives: o.who,
      busy: 'читає дошку замовлень',
      log: { self: o.take.log, other: '{name} бере замовлення.' },
    },
    {
      id: o.make.id,
      group: PL.shop,
      spot: o.make.at,
      label: o.make.label,
      visible: { all: [{ flag: flag }, { noFlag: done }, { not: { owns: o.make.thing } }] },
      cost: o.make.cost,
      // carried to whoever asked: it goes along by itself when one leaves the workshop (`carry`)
      yield: { [o.make.thing]: 1 },
      cooldown: o.make.time * SEC,
      skill: 'craft',
      kind: 'craft',
      why: o.who,
      busy: 'працює над замовленням',
      log: { self: o.make.log, other: '{name} працює над замовленням.' },
    },
    {
      id: o.give.id,
      icon: 'coin',
      group: o.give.group,
      spot: o.give.spot,
      label: o.give.label,
      visible: { all: [{ flag: flag }, { noFlag: done }] },
      enabled: { owns: o.make.thing },
      disabledHint: 'Спершу зробити в майстерні.',
      cost: { [o.make.thing]: 1 },
      effects: [{ add: { [PR.coin]: o.give.pay } }, { inc: 'pm_fame', max: 14 }, { set: done }, { xp: 6, who: 'actor' }],
      cooldown: 5 * SEC,
      kind: 'trade',
      gives: `+${o.give.pay} шагів · слава`,
      busy: 'віддає замовлення',
      log: { self: o.give.log, other: '{name} віддає замовлення.' },
    },
  ];
}

export const actionsM1: ActionDef[] = [
  // ------------------------------------------------------------------ gathering
  {
    id: 'pm_x01',
    group: PL.bank,
    spot: 'osier',
    label: 'Різати лозу',
    yield: { [PR.osier]: [2, 3] },
    cooldown: 10 * SEC,
    skill: 'gather',
    kind: 'gather',
    job: { rate: 8 },
    busy: 'ріже лозу',
    log: { self: ['Гнучка, з червоною корою. Гордій каже: лоза — то половина колиски.', 'Пучок лози на плече. Руки пахнуть вербою.'], other: '{name} ріже лозу.' },
  },
  {
    id: 'pm_x02',
    group: PL.bank,
    spot: 'clay',
    label: 'Копати глину',
    yield: { [PR.clay]: 2 },
    cooldown: 12 * SEC,
    skill: 'gather',
    kind: 'gather',
    job: { rate: 5 },
    busy: 'копає глину',
    log: { self: 'Жовта, масна. Для горна — обмазати, щоб жар тримало.', other: '{name} копає глину.' },
  },
  {
    id: 'pm_x03',
    icon: 'driedfish',
    group: PL.bank,
    spot: 'fish',
    label: 'Вудити з кладок',
    yield: { [PR.food]: [1, 2] },
    cooldown: 12 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'вудить з кладок',
    log: { self: ['Окунь, плітка, ще плітка. Старий рибалка поруч не дивиться, але все бачить.', 'Поплавець тоне — і ти вже знаєш, що буде на вечерю.'], other: '{name} вудить рибу.' },
  },
  {
    id: 'pm_x04',
    group: PL.oaks,
    spot: 'oak',
    label: 'Колоти дубові дошки',
    yield: { [PR.oak]: [1, 2] },
    cooldown: 18 * SEC,
    skill: 'gather',
    kind: 'gather',
    job: { rate: 4 },
    busy: 'коле дуб',
    log: { self: ['Клин, молоток, ще клин. Дуб тріщить по волокну — рівно, як учив Гордій.', 'Дошка виходить крива. Ти пробуєш ще.'], other: '{name} коле дуб.' },
  },
  {
    id: 'pm_x05',
    icon: 'food',
    group: PL.oaks,
    spot: 'berry',
    label: 'Збирати ожину',
    yield: { [PR.food]: 1 },
    cooldown: 8 * SEC,
    skill: 'gather',
    kind: 'gather',
    job: { rate: 5 },
    busy: 'збирає ожину',
    log: { self: 'Пальці сині, кишені повні. Явдоха зварить узвар.', other: '{name} збирає ожину.' },
  },
  // ------------------------------------------------------------------ the market
  {
    id: 'pm_x06',
    icon: 'iron',
    group: PL.market,
    spot: 'smith',
    label: 'Купити залізо',
    cost: { [PR.coin]: 2 },
    yield: { [PR.iron]: 1 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'торгується в залізному ряду',
    log: { self: 'Прут залізний, ще теплий від чужого горна. «Гордієві — як своєму», — каже коваль.', other: '{name} купує залізо.' },
  },
  {
    id: 'pm_x07',
    icon: 'coal',
    group: PL.market,
    spot: 'smith',
    label: 'Купити вугілля',
    cost: { [PR.coin]: 1 },
    yield: { [PR.coal]: 2 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'купує вугілля',
    log: { self: 'Мішок вугілля з чорних рук вуглярів.', other: '{name} купує вугілля.' },
  },
  {
    id: 'pm_x08',
    icon: 'leather',
    group: PL.market,
    spot: 'stalls',
    label: 'Купити шкіру',
    cost: { [PR.coin]: 3 },
    yield: { [PR.leather]: 1 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'купує шкіру',
    log: { self: 'Добра, дублена. На фартух якраз.', other: '{name} купує шкіру.' },
  },
  {
    id: 'pm_x14',
    icon: 'coin',
    group: PL.market,
    spot: 'stalls',
    label: 'Лагодити дрібне в рядах',
    visible: inside,
    yield: { [PR.coin]: 1 },
    cooldown: 12 * SEC,
    recharge: 20 * SEC,
    skill: 'craft',
    kind: 'gather',
    busy: 'лагодить дрібне на торгу',
    log: {
      self: ['Перекупці несуть що є: ручку від відра, петлю, застібку. Мідяк за раз.', 'Баба з кошиком довго дивиться, як ти лагодиш їй кошикову ручку. «Гордіїв? Та видно».'],
      other: '{name} лагодить дрібне на торгу.',
    },
  },
  {
    id: 'pm_x09',
    icon: 'coin',
    group: PL.market,
    spot: 'stalls',
    label: 'Продати харчі перекупці',
    cost: { [PR.food]: 3 },
    yield: { [PR.coin]: 1 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'продає харчі',
    log: { self: 'Перекупка дає мало, зате одразу.', other: '{name} продає харчі.' },
  },
  // ------------------------------------------------------------------ the workshop
  {
    id: 'pm_x10',
    icon: 'spot:bench',
    group: PL.shop,
    spot: 'bench',
    label: 'Вчитися в майстра',
    visible: inside,
    train: { skill: 'craft', xp: 3 },
    cooldown: 15 * SEC,
    recharge: 40 * SEC,
    kind: 'train',
    gives: 'Ремесло',
    busy: 'вчиться в Гордія',
    log: {
      self: [
        'Гордій бере твою руку з рубанком і веде — раз, ще раз. «Не тисни. Дерево саме скаже, куди йти».',
        '«Замок — то не залізо. Замок — то обіцянка, що ніхто чужий не зайде». Гордій показує, як пригнати язичок.',
        'Ти пиляєш, Гордій мовчить. Мовчить — значить, добре.',
      ],
      other: '{name} вчиться в майстра.',
    },
  },
  {
    id: 'pm_x11',
    group: PL.shop,
    spot: 'forge',
    label: 'Викувати собі ніж',
    visible: { all: [inside, fame(1)] },
    cost: { [PR.iron]: 2, [PR.coal]: 2, [PR.oak]: 1 },
    yield: { [PG.blade]: 1 },
    limit: 1,
    cooldown: 20 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Молотком від псів не наборонишся.',
    busy: 'кує ніж',
    log: { self: 'Перший ніж — твій. Кривуватий у п\'яті, але гострий. Гордій бере, дивиться на світло й віддає: «Носи».', other: '{name} кує собі ніж.' },
  },
  {
    id: 'pm_x12',
    group: PL.shop,
    spot: 'bench',
    label: 'Пошити шкіряний фартух',
    visible: inside,
    cost: { [PR.leather]: 2 },
    yield: { [PG.apron]: 1 },
    limit: 1,
    cooldown: 16 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Іскри з горна пропалюють сорочку.',
    busy: 'шиє фартух',
    log: { self: 'Шкіра цупка, шило ламається двічі. Зате тепер іскри відскакують.', other: '{name} шиє фартух.' },
  },
  {
    id: 'pm_x13',
    icon: 'clay',
    group: PL.shop,
    spot: 'forge',
    label: 'Обмазати горно глиною',
    visible: inside,
    once: true,
    cost: { [PR.clay]: 4 },
    effects: [{ set: 'pm_forge' }],
    cooldown: 14 * SEC,
    kind: 'build',
    why: 'Горно тріснуло, жар іде в щілини.',
    gives: 'Горно: менше вугілля',
    busy: 'обмазує горно',
    log: { self: 'Глина лягає в тріщини. Наступного ранку горно гуде рівно, як кіт.', other: '{name} обмазує горно.' },
  },
  // ------------------------------------------------------------------ the orders
  ...order({
    n: 1,
    who: 'Вдова Христя з Підгірної',
    label: 'засув для вдови',
    open: { day: 0 },
    take: { id: 'pm_x20', log: '«Засув на сінешні двері. Христя, вдова, Підгірна. Плачу п\'ять шагів». Почерк Гордія — він записує за тими, хто не вміє.' },
    make: { id: 'pm_x21', label: 'Зробити засув', at: 'bench', cost: { [PR.oak]: 2, [PR.iron]: 1 }, thing: PT.bolt, time: 16, log: 'Дубовий брус, залізна скоба. Засув ходить туго — так і треба, щоб не відсунули знадвору.' },
    give: { id: 'pm_x22', label: 'Віднести засув вдові Христі', group: PL.market, spot: 'church', pay: 5, log: 'Христя сама ставить засув на місце, сама пробує. Довго. Потім киває: «Тепер хоч сплю». І дає п\'ять шагів, зав\'язані у вузлик.' },
  }),
  ...order({
    n: 2,
    who: 'Бондар Самійло',
    label: 'обручі для бондаря',
    open: { day: 0 },
    take: { id: 'pm_x23', log: '«Обручі на шість бочок. Самійло-бондар. Сім шагів». Гордій дописав збоку: «Гартувати!»' },
    make: { id: 'pm_x24', label: 'Викувати обручі', at: 'forge', cost: { [PR.iron]: 2, [PR.coal]: 2 }, thing: PT.hoops, time: 18, log: 'Смуга за смугою — у коло, заклепка, у воду. Пара з шипінням підіймається до стелі.' },
    give: { id: 'pm_x25', label: 'Віднести обручі бондарю', group: PL.market, spot: 'stalls', pay: 7, log: 'Самійло натягує обруч на клепки й б\'є киянкою. Сидить. «Гордієва школа», — каже він і платить.' },
  }),
  ...order({
    n: 3,
    who: 'Коваль Петро — у нього донька',
    label: 'колиска для ковалевої доньки',
    open: fame(2),
    take: { id: 'pm_x26', log: '«Колиска. Дівчинка. Петро, коваль. Шість шагів — і щоб не скрипіла». Під цим Гордій намалював маленьке сонце.' },
    make: { id: 'pm_x27', label: 'Сплести колиску', at: 'bench', cost: { [PR.oak]: 3, [PR.osier]: 4 }, thing: PT.cradle, time: 22, log: 'Дубовий полоз, лозове плетиво — тісно, рівно. Ти гойдаєш порожню колиску, і вона мовчить. Не скрипить.' },
    give: { id: 'pm_x28', label: 'Віднести колиску ковалю', group: PL.market, spot: 'smith', pay: 6, log: 'Петро, здоровий, як двері, бере колиску обережно, наче вона вже не порожня. «Спасибі, {майстре|майстрине}», — каже він тобі. Тобі, не Гордієві.' },
  }),
  ...order({
    n: 4,
    who: 'Старий рибалка Онопрій',
    label: 'ніж для рибалки',
    open: fame(1),
    take: { id: 'pm_x29', log: '«Ніж для риби, тонкий. Онопрій, кладки. Шість шагів». Букви криві — цей записав сам.' },
    make: { id: 'pm_x30', label: 'Викувати рибальський ніж', at: 'forge', cost: { [PR.iron]: 1, [PR.coal]: 2, [PR.oak]: 1 }, thing: PT.knife, time: 16, log: 'Тонке лезо, руків\'я з дуба, щоб не слизько. Ти точиш його довше, ніж кував.' },
    give: { id: 'pm_x31', label: 'Віднести ніж рибалці', group: PL.bank, spot: 'fish', pay: 6, log: 'Онопрій пробує лезо на нігті й усміхається беззубо. «Тепер і в мене щось гостре є. Окрім язика».' },
  }),
  ...order({
    n: 5,
    who: 'Дяк від церкви',
    label: 'ключ до церковної скрині',
    open: { all: [fame(4), { flag: 'built:pm_x15' }] },
    take: { id: 'pm_x32', log: '«Ключ до старої скрині в ризниці — загубили. Дяк. Сім шагів». Гордій: «Скриня — моя, двадцять років тому. Пам\'ятаю замок».' },
    make: { id: 'pm_x33', label: 'Підібрати ключ до скрині', at: 'forge', cost: { [PR.iron]: 1, [PR.coal]: 1 }, thing: PT.key, time: 20, log: 'Гордій малює вусики на дошці з пам\'яті. Ти куєш, пиляєш, знов пиляєш. На третій раз ключ стає, як рідний.' },
    give: { id: 'pm_x34', label: 'Віднести ключ дякові', group: PL.market, spot: 'church', pay: 7, log: 'Скриня відчиняється з зітханням. Усередині — метричні книги, старі, у шкірі. Дяк гладить їх, як котів. «Тут увесь Кривець. Хто народився, хто вінчався, хто помер». І тільки потім платить.' },
  }),
  {
    id: 'pm_x15',
    icon: 'spot:bench',
    group: PL.shop,
    spot: 'bench',
    label: 'Поставити на верстак лещата',
    visible: { all: [inside, fame(3)] },
    once: true,
    cost: { [PR.iron]: 3, [PR.oak]: 2, [PR.coal]: 2 },
    cooldown: 24 * SEC,
    kind: 'build',
    why: 'Дрібне — ключі, завіси, ґрати — в руках не втримаєш.',
    gives: 'Верстак: тонка робота',
    busy: 'ставить лещата',
    log: { self: 'Гвинт, губки, станина з дубового бруса. Гордій крутить гвинт, слухає скрип і каже: «Тепер — майстерня».', other: '{name} ставить лещата.' },
  },
  ...order({
    n: 6,
    who: 'Корчмар Мусій',
    label: 'ґрати на вікно корчми',
    open: { all: [fame(3), { flag: 'built:pm_x15' }] },
    take: { id: 'pm_x36', log: '«Ґрати на вікно комори. Мусій, корчма. Десять шагів. Лізуть». Гордій: «Лізуть — бо є що брати».' },
    make: { id: 'pm_x37', label: 'Викувати ґрати', at: 'forge', cost: { [PR.iron]: 3, [PR.coal]: 3 }, thing: PT.grate, time: 26, log: 'Чотири прути навхрест, заклепки гарячими. Важкі — тягнеш через двір волоком.' },
    give: { id: 'pm_x38', label: 'Віднести ґрати корчмареві', group: PL.market, spot: 'stalls', pay: 10, log: 'Мусій ставить ґрати сам, бо не довіряє. Потім частує тебе квасом і питає, чи не продасть Гордій тебе йому в корчму. Жартує. Мабуть.' },
  }),
  ...order({
    n: 7,
    who: 'Дівка Ганнуся — заміж іде',
    label: 'скриня для молодої',
    open: fame(5),
    take: { id: 'pm_x39', log: '«Скриня на посаг. Ганнуся з Вигону. Дев\'ять шагів. З замком!» І знизу, іншою рукою: «Щоб мати не відкривала».' },
    make: { id: 'pm_x40', label: 'Зробити скриню з замком', at: 'bench', cost: { [PR.oak]: 5, [PR.iron]: 1, [PR.osier]: 2 }, thing: PT.chest, time: 30, log: 'Дошки в паз, кути в ластівчин хвіст, на віко — тюльпан, як уміла Явдоха показати. Замок — твій, з першого до останнього зуба.' },
    give: { id: 'pm_x41', label: 'Віднести скриню на Вигін', group: PL.market, spot: 'church', pay: 9, log: 'Ганнуся відмикає, замикає, відмикає. Сміється. Мати за її спиною теж сміється — і пробує ключ, коли донька не бачить.' },
  }),
  ...order({
    n: 8,
    who: 'Староста — для церковних дверей',
    label: 'завіси на церковні двері',
    open: { all: [fame(5), { flag: 'pm_o5_done' }] },
    take: { id: 'pm_x42', log: '«Завіси на великі двері. Староста. Вісім шагів». Гордій довго дивиться на запис. «Двері ті ставив мій майстер. Не зганьби».' },
    make: { id: 'pm_x43', label: 'Викувати завіси', at: 'forge', cost: { [PR.iron]: 2, [PR.coal]: 2 }, thing: PT.hinges, time: 22, log: 'Довгі, з закрутом на кінці — як були. Ти куєш їх тричі, поки Гордій не каже «так».' },
    give: { id: 'pm_x44', label: 'Віднести завіси старості', group: PL.market, spot: 'church', pay: 8, log: 'Двері знімають удесятьох. Нові завіси сідають, і двері йдуть легко, без звуку. Староста тисне тобі руку при всіх.' },
  }),
];

export const scenesM1: SceneDef[] = [
  {
    id: PS.gate,
    title: 'Брама з ключем',
    group: PL.shop,
    spot: 'board',
    label: 'Постукати в браму',
    visible: { noFlag: 'pm_in' },
    gives: 'Початок',
    start: 'n1',
    nodes: {
      n1: {
        text: [
          'Осінь. Кривець пахне яблуками й димом. У тебе — вузлик, лист від старости й чоботи, які давно просять каші.',
          { if: { pflag: 'bg_home' }, text: 'Удома лишився сад — малий, у три яблуні. Ти обіцяв{|ла} собі колись мати такий самий, свій.' },
          { if: { pflag: 'bg_people' }, text: 'Удома лишилися ті, кого ти любиш. Вони казали: «Вивчишся — вернешся». Ти віриш.' },
          { if: { pflag: 'bg_nothing' }, text: 'Удома не лишилося нічого, що тримало б. Тому й пішов{|ла}.' },
        ],
        next: 'n2',
      },
      n2: {
        text: 'Брама відчиняється раніше, ніж ти встигаєш постукати вдруге. Широкий, сивий, у шкіряному фартусі — майстер Гордій. Читає лист, ворушачи губами. Довго дивиться на тебе.',
        effects: [{ meet: PN.gordiy }],
        next: 'n3',
      },
      n3: {
        text: '— Учнів у мене не було дванадцять років, — каже він. — Останній утік у солдати. — Він показує на верстак. — Зроби засув. Побачимо.',
        next: 'n4',
      },
      n4: {
        type: 'choice',
        mode: 'each',
        text: 'Що ти кажеш?',
        options: [
          { id: 'yes', label: '— Зроблю. Покажіть, де дерево.', effects: [{ pset: 'pm_bg_eager' }] },
          { id: 'ask', label: '— А чого він утік?', effects: [{ pset: 'pm_bg_asked' }] },
        ],
        next: 'n5',
      },
      n5: {
        text: [
          [
            { if: { pflag: 'pm_bg_asked' }, text: 'Гордій хмикає. — Бо там платять одразу. А тут — через рік. — Він дає тобі молоток. — Тримай. Свого в тебе, бачу, нема.' },
            { text: 'Гордій хмикає й дає тобі молоток. — Тримай. Свого в тебе, бачу, нема.' },
          ],
          'З хати виходить Явдоха, жінка Гордія, з мискою вишень. — Нагодуй спершу, а тоді вже засуви. — І тобі, тихіше: — Він добрий. Тільки мовчить багато.',
        ],
        effects: [{ meet: PN.yavdokha }, { set: 'pm_in' }, { wear: PG.hammer }, { add: { [PR.oak]: 2, [PR.iron]: 1, [PR.coin]: 3, [PR.food]: 4 } }, { checkpoint: 'pm1.start' }],
        next: null,
      },
    },
  },
  {
    id: PS.night,
    title: 'Нічні гості',
    group: PL.shop,
    spot: 'forge',
    label: 'Хтось шарудить біля повітки',
    visible: { all: [inside, fame(3)] },
    gives: 'Бій',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Уночі тебе будить тихе дзенькання: хтось перебирає залізо в повітці. Гордій хропе. Ти береш молоток.',
        next: 'n2',
      },
      n2: {
        text: 'У місячному світлі — двоє. Мішок, у мішку — Гордієві прути. — Тихо, — шепоче один, — а то й тебе в мішок.',
        next: 'fight',
      },
      fight: { type: 'fight', foes: [{ enemy: PE.tramp, n: 2 }], win: 'won', lose: 'lost' },
      lost: {
        text: 'Тебе збивають з ніг, мішок дзенькає за тином. Коли Гордій вибігає з лампою, злодіїв уже нема. — Живий{|а}? — питає він. — То й добре. Залізо — то залізо.',
        effects: [{ take: { [PR.iron]: 2 } }],
        incomplete: true,
        next: null,
      },
      won: {
        text: 'Волоцюги тікають через тин, кинувши мішок. А в кущах біля воріт щось ворушиться. Ти тягнеш за комір — хлопчик, малий, худий, босий. Стояв на чатах.',
        effects: [{ meet: PN.tymko }],
        next: 'n3',
      },
      n3: {
        text: '— Тимко, — каже він, не дивлячись. — Я не крав. Я стояв. Вони казали — дадуть хліба. — Він дивиться на твої руки, а не на тебе. — Я нічий. Мене в книгу не вписали, бо мамка прийшла з-за річки.',
        effects: [{ clue: 'pm_c3' }],
        next: 'n4',
      },
      n4: {
        type: 'choice',
        mode: 'each',
        text: 'Гордій стоїть у дверях з лампою й чекає, що ти скажеш.',
        options: [
          { id: 'keep', label: '— Хай лишиться. Носитиме лозу.', effects: [{ set: 'pm_tymko_kept' }] },
          { id: 'go', label: '— Іди, Тимку. І щоб я тебе тут не бачив{|ла}.', effects: [{ set: 'pm_tymko_gone' }] },
        ],
        next: 'n5',
      },
      n5: {
        text: [
          { if: { flag: 'pm_tymko_kept' }, text: 'Гордій довго мовчить. Потім каже: — У повітці на сіні тепло. — І йде спати. Явдоха вранці ставить на стіл три миски замість двох.' },
          { text: 'Тимко зникає в темряві, навіть не оглянувшись. Гордій зачиняє браму на засув і каже тільки: — Твоя воля.' },
        ],
        effects: [{ xp: 10, who: 'actor' }],
        next: null,
      },
    },
  },
  {
    id: PS.clerk,
    title: 'Писар з казни',
    group: PL.shop,
    spot: 'board',
    label: 'Вийти до гостя біля брами',
    visible: { all: [{ flag: 'done:pm_s03' }, fame(7)] },
    gives: 'Замовлення · вибір',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Біля брами — бричка, коні в попонах. З брички виходить чоловік у сукняному каптані, з чорнильницею на поясі. Ввічливий, усміхнений.',
        next: 'n2',
      },
      n2: {
        text: '— Лука, писар князівської казни, — кланяється він. — Чув про вашу майстерню. Мені потрібні бляшки. Мідні, круглі, на шнурку. Сто штук, і на кожній — номер, від одного до ста. — Він кладе на верстак срібну монету. — Це завдаток.',
        effects: [{ meet: PN.luka }, { clue: 'pm_c1' }],
        next: 'n3',
      },
      n3: {
        text: '— Перепис, — пояснює Лука. — Князь хоче знати, скільки в нього людей. Щоб нікого не загубити. Номер на шию — і ніхто вже не загубиться.',
        maker: 'Ти дивишся на монету. Срібло. За засув вдові дають чотири мідяки.',
        next: 'n4',
      },
      n4: {
        text: 'Гордій витирає руки й не бере монету. — Людей не номерують, — каже він тихо. — Номерують бочки. Худобу номерують. — Він дивиться на тебе. — Але ти вже не учень. Вирішуй сам{|а}: замовлення прийшло до майстерні, а майстерня — не тільки моя.',
        effects: [{ clue: 'pm_c2' }],
        next: 'n5',
      },
      n5: {
        type: 'choice',
        mode: 'each',
        text: 'Лука чекає, усміхаючись.',
        options: [
          { id: 'take', label: 'Взятися: це тільки бляшки, а срібло — це срібло', effects: [{ set: 'pm_tags' }] },
          { id: 'no', label: 'Відмовитися: «Людей не номерують»', effects: [{ set: 'pm_tags_no' }] },
        ],
        next: 'n6',
      },
      n6: {
        text: [
          { if: { flag: 'pm_tags' }, text: 'Лука кланяється, лишає завдаток і мідний лист. — Через тиждень заїду. — Бричка рушає. Гордій мовчки йде до горна й розпалює його — для тебе.' },
          { text: 'Лука ховає монету без образи. — Знайду іншого майстра, — каже він легко. — Майстрів багато. — Бричка рушає. Гордій кладе тобі руку на плече — уперше — і мовчки йде в хату.' },
        ],
        effects: [{ mystery: PM.numbers, level: 1 }],
        next: null,
      },
    },
  },
  {
    id: PS.supper,
    title: 'Вечеря в саду',
    group: PL.shop,
    spot: 'hearth',
    label: 'Сісти вечеряти з Гордієм і Явдохою',
    visible: { any: [{ flag: 'pm_tags_made' }, { flag: 'pm_tags_no' }] },
    gives: 'Кінець розділу',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Вечеря в саду, під старою грушею. Явдоха ставить на стіл вареники, узвар, хліб. Тимко, якщо він тут, їсть так, ніби хтось може забрати.',
        next: 'n2',
      },
      n2: {
        text: [
          { if: { flag: 'pm_tags' }, text: 'Сто бляшок лежать у скриньці на полиці, дзенькають, коли проходиш повз. Лука заплатив сріблом. Гордій за вечерю жодного разу на скриньку не глянув.' },
          { text: 'Майстер Гордій розповідає, як сам був учнем, у Кам\'янці, і як майстер бив його по руках лінійкою. Сміється — уперше при тобі.' },
        ],
        next: 'n3',
      },
      n3: {
        text: '— Ти чий{|я}? — питає раптом Явдоха. — Тобто — звідки ти? Хто твої?',
        next: 'n4',
      },
      n4: {
        type: 'choice',
        mode: 'each',
        text: 'Що ти відповідаєш?',
        options: [
          { id: 'tell', label: 'Розповісти про дім', effects: [{ pset: 'pm_bg_told' }] },
          { id: 'here', label: '— Тепер, мабуть, ваш{|а}.', effects: [{ pset: 'pm_bg_here' }] },
        ],
        next: 'n5',
      },
      n5: {
        text: [
          [
            { if: { pflag: 'pm_bg_here' }, text: 'Явдоха дивиться на Гордія. Гордій дивиться в миску. — Ну то й їж, — каже він. — Наш{|а} — то наш{|а}.' },
            { if: { pflag: 'bg_home' }, text: 'Ти розповідаєш про три яблуні. Явдоха слухає і киває. — Посадимо тобі тут одну. Хай росте, поки ти вчишся.' },
            { text: 'Ти розповідаєш — коротко, уривками. Явдоха не перебиває. Коли ти замовкаєш, вона просто підкладає тобі ще вареників.' },
          ],
          'Над садом — зорі, низько, по-південному. Десь за річкою гавкають пси. Тоді ти ще не знаєш, що це найкраща осінь у твоєму житті.',
        ],
        effects: [{ actDone: 1 }, { startAct: 2 }, { set: 'pm_ch1_done' }, { checkpoint: 'pm1.end' }],
        next: null,
      },
    },
  },
];

/** The copper tags for the clerk: made once (taken the order) and paid in silver. */
export const tagsM1: ActionDef[] = [
  {
    id: 'pm_x35',
    icon: 'buckle',
    group: PL.shop,
    spot: 'forge',
    label: 'Карбувати бляшки з номерами',
    visible: { all: [{ flag: 'pm_tags' }, { noFlag: 'pm_tags_made' }] },
    cost: { [PR.coal]: 3 },
    effects: [{ set: 'pm_tags_made' }, { add: { [PR.coin]: 15 } }, { clue: 'pm_c4' }, { mystery: PM.numbers, level: 2 }],
    cooldown: 40 * SEC,
    skill: 'craft',
    kind: 'craft',
    gives: '+15 шагів',
    busy: 'карбує бляшки',
    log: {
      self: 'Один. Два. Три. Ти б\'єш карбом по міді сто разів, і після сорокового цифри перестають бути цифрами. Сорок вісім. Сорок дев\'ять. Пальці пам\'ятають кожну.',
      other: '{name} карбує бляшки.',
    },
  },
];

export const mysteriesM: MysteryDef[] = [{ id: PM.numbers, question: 'Навіщо людям номери?', order: 1 }];

export const cluesM1: ClueDef[] = [
  { id: 'pm_c1', to: 'maker', mystery: PM.numbers, title: 'Сто бляшок', text: 'Писар Лука замовив сто мідних бляшок на шнурку, з номерами від одного до ста. «Для перепису, щоб нікого не загубити».' },
  { id: 'pm_c2', to: 'maker', mystery: PM.numbers, title: 'Слова Гордія', text: '«Людей не номерують. Номерують бочки. Худобу номерують».' },
  { id: 'pm_c3', to: 'maker', mystery: PM.numbers, title: 'Тимко без книги', text: 'Тимка не вписали в метричну книгу: мати прийшла з-за річки. «Я нічий», — каже він.' },
  { id: 'pm_c4', to: 'maker', mystery: PM.numbers, title: 'Сорок вісім', text: 'Ти карбуєш сто номерів. Пальці запам\'ятовують їх раніше, ніж голова.' },
];

export const npcsM: NpcDef[] = [
  { id: PN.gordiy, name: 'Майстер Гордій', desc: 'Слюсар, столяр і коваль у Кривці. Мовчить, коли все добре.' },
  { id: PN.yavdokha, name: 'Явдоха', desc: 'Гордієва жінка. Сад, вареники, і все бачить.' },
  { id: PN.luka, name: 'Писар Лука', desc: 'Писар князівської казни. Ввічливий, платить сріблом.' },
  { id: PN.tymko, name: 'Тимко', desc: 'Хлопчик-сирота з-за річки. Не вписаний у жодну книгу.' },
  { id: PN.yarema, name: 'Десятник Ярема', desc: 'Від полку. Молодий, чисто поголений, говорить рівно, як на плацу.' },
  { id: PN.kindrat, name: 'Урядник Кіндрат', desc: 'Урядник вербувальника. Читає чужі книги вголос.' },
];

export const goalsM1: GoalDef[] = [
  { id: 'pm_goal1', text: 'Постукати в браму майстра Гордія.', when: { noFlag: 'pm_in' } },
  { id: 'pm_goal2', text: 'Взяти замовлення з дошки, зробити й віднести. Слава майстерні росте з кожним.', when: { all: [inside, { flag: 'pm_fame', lt: 3 }] } },
  { id: 'pm_goal3', text: 'Робити замовлення далі. Уночі біля повітки хтось буває.', when: { all: [fame(3), { noFlag: 'done:pm_s03' }] } },
  { id: 'pm_goal8', text: 'Поставити на верстак лещата — для тонкої роботи.', when: { all: [fame(3), { noFlag: 'built:pm_x15' }] } },
  { id: 'pm_goal4', text: 'Слава майстерні росте. Про неї вже говорять і поза Кривцем.', when: { all: [{ flag: 'done:pm_s03' }, { flag: 'pm_fame', lt: 7 }] } },
  { id: 'pm_goal5', text: 'Біля брами чекає гість.', when: { all: [fame(7), { noFlag: 'done:pm_s04' }] } },
  { id: 'pm_goal6', text: 'Викарбувати сто бляшок для писаря.', when: { all: [{ flag: 'pm_tags' }, { noFlag: 'pm_tags_made' }] } },
  { id: 'pm_goal7', text: 'Явдоха кличе вечеряти в сад.', when: { noFlag: 'pm_ch1_done' } },
];
