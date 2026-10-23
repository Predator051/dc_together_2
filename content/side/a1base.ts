// Side errands of act one: their places, things, foes, clues and the errands themselves.
import type { AreaDef, ClueDef, EnemyDef, LocationDef, MysteryDef, NpcDef, QuestDef, ResourceDef } from '../../shared/src/content.js';
import { A, E, G, L, M, R } from '../a1/ids.js';
import { Q, QA, QE, QL, QM, QN, QR, QS } from './ids.js';

const SEC = 1000;

// ------------------------------------------------------------------ places

export const sideAreas1: AreaDef[] = [
  {
    id: QA.isle,
    name: 'Чаплин острів',
    where: 'на Чаплиному острові',
    scene: 'isle',
    pos: [2, 4],
    visible: { flag: `done:${QS.boat2}` },
    danger: 1,
    ambush: 0.06,
    foes: [{ enemy: E.rat, n: [2, 3], w: 1 }],
    links: [
      { to: A.shore, time: 10 * SEC, if: { owns: QR.boat } },
      { to: A.reeds, time: 10 * SEC, if: { owns: QR.boat } },
    ],
    desc: 'Горбок посеред протоки, вербові кущі й сотні чапель. Пахне рибою й послідом.',
  },
  {
    id: QA.willow,
    name: 'Вербова коса',
    where: 'на Вербовій косі',
    scene: 'willow',
    pos: [0, 1],
    visible: { flag: `done:${QS.ferry2}` },
    danger: 2,
    ambush: 0.07,
    foes: [{ enemy: E.viper, w: 1 }],
    links: [{ to: A.grove, time: 12 * SEC, if: { flag: 'q02_ferry' } }],
    desc: 'Піщана коса за протокою, уся в червоній лозі. На кінці — старий стовп, порізаний ножем.',
  },
];

export const sideLocations1: LocationDef[] = [
  {
    id: QL.isle,
    name: 'Чаплин острів',
    area: QA.isle,
    order: 1,
    visible: { flag: `done:${QS.boat2}` },
    spots: [
      { id: 'herons', name: 'Чапельник', x: 50, y: 28, icon: 'nest' },
      { id: 'shoal', name: 'Мілководдя', x: 12, y: 62, icon: 'fish' },
      { id: 'reedbed', name: 'Рогіз', x: 88, y: 54, icon: 'reed' },
    ],
    desc: 'Чаплі здіймаються хмарою, коли причалюєш, і довго кричать.',
  },
  {
    id: QL.willow,
    name: 'Вербова коса',
    area: QA.willow,
    order: 1,
    visible: { flag: `done:${QS.ferry2}` },
    spots: [
      { id: 'osier', name: 'Верболіз', x: 14, y: 28, icon: 'sticks' },
      { id: 'post', name: 'Стовп', x: 86, y: 28, icon: 'stakes' },
      { id: 'shallows', name: 'Раки', x: 88, y: 62, icon: 'fish' },
    ],
    desc: 'Лоза тут червона, гнучка, хоч вузлом в\'яжи.',
  },
];

// ------------------------------------------------------------------ things

export const sideResources1: ResourceDef[] = [
  { id: QR.feather, icon: 'feather', name: 'Чаплине пір\'я', order: 21.6, cap: 30, weight: 0.1 },
  { id: QR.osier, icon: 'osier', name: 'Лоза', order: 21.7, cap: 30, weight: 0.3 },
  { id: QR.viperskin, icon: 'viperskin', name: 'Гадюча шкіра', order: 54, kind: 'tool', weight: 0, desc: 'Біла луска матки. Міцна, як дублена.' },
  { id: QR.fat, icon: 'fat', name: 'Сомовий жир', order: 55, kind: 'tool', weight: 0, desc: 'Горщик білого жиру. Горить довго й не чадить.' },
  { id: QR.oarwood, icon: 'oar', name: 'Весло', order: 44, kind: 'tool', weight: 0, desc: 'Вузьке, з карбованою ручкою. Не ваше.' },
  { id: QR.boat, icon: 'boat', name: 'Довбанка', order: 45, kind: 'tool', weight: 0, desc: 'Видовбана з цілої верби, залатана смолою й мохом. Тримає двох.' },
  { id: QR.cable, icon: 'rope', name: 'Пороминий канат', order: 46, kind: 'tool', weight: 0, desc: 'Сорок сажнів кручених мотузок.' },
  { id: QR.block, icon: 'block', name: 'Блок', order: 47, kind: 'tool', weight: 0, desc: 'Дубове колесо з жолобом на залізній осі.' },
  { id: QR.mark, icon: 'mark', name: 'Відбиток знака', order: 48, kind: 'tool', weight: 0, desc: 'Знак каменяра, перемальований вуглиною на кору.' },
  { id: QR.level, icon: 'level', name: 'Рівень і висок', order: 49, kind: 'tool', weight: 0, desc: 'Дерев\'яний рівень з бульбашкою в склі і висок на шнурку. На ручці — ясеневий лист.' },
  { id: QR.grapnel, icon: 'grapnel', name: 'Гак-кішка', order: 50, kind: 'tool', weight: 0, desc: 'Три вигнуті зубці на кільці.' },
  { id: QR.relic, icon: 'buckle', name: 'Знахідка Третьої сотні', order: 51, kind: 'tool', weight: 0, desc: 'Те, що лишилося від солдатів у плавнях.' },
  { id: QR.hook, icon: 'bighook', name: 'Великий гак', order: 52, kind: 'tool', weight: 0, desc: 'Гак завбільшки з долоню, на ланцюжку.' },
  { id: QR.bait, icon: 'driedfish', name: 'Наживка', order: 53, kind: 'tool', weight: 0, desc: 'Солона риба, зашита в шкуру. Тхне за версту.' },
  {
    id: QR.osierbrew,
    icon: 'tea',
    name: 'Вербовий відвар',
    order: 34.5,
    kind: 'use',
    cap: 10,
    weight: 0.5,
    desc: 'Гіркий, як кора, з якої зварений. Збиває жар і гасить біль.',
    use: {
      heal: 12,
      cure: ['poison'],
      anywhere: true,
      label: 'Випити вербовий відвар',
      log: { self: 'Гірко, аж в\'яже язик. За хвилину біль тупіє, жар відступає.', other: '{name} п\'є вербовий відвар.' },
    },
  },
  { id: QR.osierback, icon: 'basket', name: 'Заплічний кіш з лози', order: 60.5, kind: 'gear', weight: 0, gear: { slot: 'belt', carry: 10 } },
  {
    id: QR.viperboots,
    icon: 'boots',
    name: 'Чоботи з гадючої шкіри',
    order: 69,
    kind: 'gear',
    weight: 0.8,
    gear: { slot: 'legs', resist: ['venom', 'salt'], dodge: 0.04 },
  },
  { id: QR.lamp, icon: 'lamp', name: 'Каганець', order: 59.5, kind: 'gear', weight: 0.5, gear: { slot: 'offhand', tools: ['light'] } },
];

// ------------------------------------------------------------------ foes

export const sideEnemies1: EnemyDef[] = [
  {
    id: QE.matka,
    icon: 'matka',
    name: 'Солонячка-матка',
    acc: 'солонячку-матку',
    gen: 'солонячки-матки',
    verb: 'жалить',
    level: 5,
    hp: 46,
    dmg: [4, 6],
    evade: 3,
    traits: ['fast', 'caller'],
    hidden: ['venom'],
    calls: E.viper,
    ai: [
      { move: 'venom', w: 3 },
      { move: 'attack', w: 2 },
      { move: 'call', every: 3, from: 2 },
    ],
    loot: { [R.bone]: [2, 3] },
    desc: 'Біла, товста, як колода. Під нею — гніздо, і з гнізда лізуть малі.',
  },
  {
    id: QE.elder,
    icon: 'elder',
    name: 'Старий сом',
    acc: 'старого сома',
    gen: 'старого сома',
    verb: 'б\'є хвостом',
    level: 6,
    hp: 84,
    dmg: [7, 10],
    armor: 2,
    traits: ['drag'],
    ai: [
      { move: 'drag', w: 1 },
      { move: 'attack', w: 2 },
    ],
    phases: [{ below: 0.4, text: 'Сом іде на дно й тягне мотузку так, що аж співає.', ai: [{ move: 'drag', w: 2 }, { move: 'attack', w: 1 }] }],
    loot: { [R.bone]: [2, 4] },
    desc: 'Довший за довбанку. На спині — старі гаки, що поросли шкірою.',
  },
];

// ------------------------------------------------------------------ journal

export const sideMysteries: MysteryDef[] = [{ id: QM.free, question: 'Хто варив тут до нас?', order: 9 }];

export const sideNpcs1: NpcDef[] = [
  {
    id: QN.vekla,
    name: 'Баба Векла',
    desc: [
      { if: { flag: `done:${QS.vekla3}` }, text: 'Вдова вільного солевара Харитона. Живе в очереті на палях. Ставить ятері по-старому і нікому не вірить. Вам — трохи.' },
      { text: 'Стара в очеретяній хатці на палях. Ставить ятері по-старому й не любить гостей.' },
    ],
  },
];

export const sideClues1: ClueDef[] = [
  {
    id: 'c_39',
    to: 'both',
    mystery: QM.free,
    title: 'Стовп на косі',
    text: 'На стовпі старого порому — імена, вирізані ножем: «Харитон. Мусій. Гнат-сіряк. Явдоха з дітьми…» Над ними — три хвилі. Нижні рядки хтось зішкріб.',
  },
  {
    id: 'c_40',
    to: 'maker',
    mystery: M.water,
    title: 'Записи каменярки',
    text: 'Горислава, каменярка з Острожця, будувала греблю й ропник для вільних солеварів: «Ропа тут — з-під крейди, з півночі. Не відбиває неба, як та, біля озера. Варити тільки повільно, відстоювати, маточну — геть. Інакше гірчить і гасить людину».',
  },
  {
    id: 'c_41',
    to: 'both',
    mystery: M.salt,
    title: 'Двадцять років тому',
    text: 'Векла: «Харитон варив чисту, на продаж по селах. Потім цех заборонив вільну варку. Харитона забрали Білі — бо в цеховій книзі його не було. А людей тоді ще сірі приводили. Цех платив їм сіллю, мірками».',
  },
  {
    id: 'c_42',
    to: 'maker',
    mystery: QM.free,
    title: 'Дошка в льоху',
    text: 'Облік вільних солеварів, вирізаний на дошці: «Продано на Кручі — 30 мір. Продано в Ясенець — 12». Ясенець колись купував чисту сіль тут, у плавнях.',
  },
  {
    id: 'c_43',
    to: 'both',
    mystery: M.water,
    title: 'Дно ропника',
    text: 'Ропник глибший за всі мотузки. Унизу вода гуде в такт — повільно, рівно, як дзвін Ясенця на сполох, тільки ніхто в нього не б\'є.',
  },
  {
    id: 'c_44',
    to: 'both',
    mystery: M.bones,
    title: 'Листи з Третьої сотні',
    text: 'Солдат Третьої сотні писав матері: «Нам дали підмогу — тихих. Не бояться, не їдять, поки не скажеш. Сотник каже — каліки з тилу. Я бачив, як один ішов на шаблі й не кліпнув. Я тікаю на північ. Хай буде, що буде».',
  },
  {
    id: 'c_45',
    to: 'hunter',
    mystery: M.silence,
    title: 'Бляшка в сомі',
    text: 'У шлунку старого сома — мідна бляшка на шнурку, з колом трьох крапок і числом «12». Такі вішають мовчунам. Хтось колись тікав через вир.',
  },
];

// ------------------------------------------------------------------ the errands

export const quests1: QuestDef[] = [
  {
    id: Q.boat,
    title: 'Чужий човен',
    act: 1,
    from: 'Мілина: довбанка в мулі після бурі.',
    start: { flag: `done:${QS.boat1}` },
    steps: [
      { text: 'Відкопати довбанку з мулу на Мілині.', done: { flag: 'q01_dig', gte: 3 } },
      { text: 'Знайти весло: його могло прибити в Очерети.', done: { owns: QR.oarwood } },
      { text: 'Залатати довбанку на верстаку: смола, мох, мотузка.', done: { owns: QR.boat } },
      { text: 'Спустити довбанку на воду — удвох.', done: { flag: `done:${QS.boat2}` } },
    ],
    reward: 'Довбанка ваша: з Мілини й Очеретів — водою на Чаплин острів. Там яйця, пір\'я і тиша.',
  },
  {
    id: Q.ferry,
    title: 'Пором на два береги',
    act: 1,
    from: 'Затоплений гай: старий пором через протоку.',
    start: { flag: `done:${QS.ferry1}` },
    steps: [
      { text: 'Сплести поромний канат на верстаку.', done: { owns: QR.cable } },
      { text: 'Витесати блок з дуба й заліза.', done: { owns: QR.block } },
      { text: 'Натягнути канат через протоку — один на воді, другий на поромі.', done: { flag: 'q02_ferry' } },
      { text: 'Сплести з лози заплічний кіш.', done: { owns: QR.osierback } },
    ],
    reward: 'Пором ходить: з гаю — на Вербову косу. Лоза дає кіш на плечі й відвар від жару.',
  },
  {
    id: Q.pack,
    title: 'Сірко і пси',
    act: 1,
    from: 'Вечеря: Сірко щоночі тікає в гай.',
    start: { flag: `done:${QS.pack1}` },
    steps: [
      { text: 'Знайти лігво в гаю за слідами.', done: { flag: 'q03_track', gte: 3 } },
      { text: 'Лишати харчі біля нори, щоб звикли.', done: { flag: 'q03_food', gte: 2 } },
      { text: 'Піти до лігва вдвох.', done: { flag: `done:${QS.pack2}` } },
    ],
    reward: 'Сірко бігав зі зграєю — і навчився: частіше збиває натиск і хватку, а засідку чує здалеку.',
  },
  {
    id: Q.mason,
    title: 'Ясеневий лист',
    act: 1,
    from: 'Стара гребля: знак каменяра на замковому камені.',
    start: { flag: `done:${QS.mason1}` },
    steps: [
      { text: 'Знайти ще три знаки каменяра: на Ропнику, на Солончаку, у Гаю.', done: { owns: QR.mark, gte: 3 } },
      { text: 'Шукати схованку біля води, що не відбиває неба.', done: { flag: `done:${QS.mason2}` } },
      { text: 'Поставити відстійник біля чрену.', done: { flag: 'built:x_128' } },
    ],
    reward: 'Відстійник Горислави: з тієї ж ропи — удвічі більше чистої солі.',
  },
  {
    id: Q.vekla,
    title: 'Очеретянка',
    act: 1,
    from: 'Очерети: хтось бере рибу з ятерів раніше за вас.',
    start: { flag: `done:${QS.vekla1}` },
    steps: [
      { text: 'Простежити, хто ставить ятері.', done: { flag: 'q05_watch', gte: 2 } },
      { text: 'Знайти того, хто живе в очереті.', done: { flag: `done:${QS.vekla2}` } },
      { text: 'Перекрити бабі Веклі дах.', done: { flag: 'built:x_131' } },
      { text: 'Віднести їй відвар з кори (у торбі).', done: { flag: 'built:x_132' } },
      { text: 'Вислухати Веклу.', done: { flag: `done:${QS.vekla3}` } },
    ],
    reward: 'Векла навчила ставити ятір по-старому: після кожної вечері — харчі з мілини. І розповіла, чия була ваша варниця.',
  },
  {
    id: Q.cellar,
    title: 'Соляний льох',
    act: 1,
    from: 'Солончак: кам\'яні сходи під корою.',
    start: { flag: `done:${QS.cellar1}` },
    steps: [
      { text: 'Розчистити сходи в льох.', done: { flag: 'q06_steps', gte: 3 } },
      { text: 'Спуститися зі смолоскипами — удвох.', done: { flag: `done:${QS.cellar2}` } },
      { text: 'Пошити чоботи з гадючої шкіри.', done: { owns: QR.viperboots } },
    ],
    reward: 'Стара сіль вільних солеварів — ваша. І чоботи, в яких не страшні ні гадюка, ні сіль.',
  },
  {
    id: Q.bell,
    title: 'Дзвін у ропнику',
    act: 1,
    from: 'Ропник: у гудінні щось дзенькає.',
    start: { flag: `done:${QS.bell1}` },
    steps: [
      { text: 'Викувати гак-кішку.', done: { owns: QR.grapnel } },
      { text: 'Спуститися в ропник на мотузці — удвох.', done: { flag: `done:${QS.bell2}` } },
      { text: 'Повісити дзвін над варницею.', done: { flag: 'built:x_137' } },
    ],
    reward: 'Над варницею — дзвін вільних солеварів. Під ним затишніше. І гучний звук рве тишу — це ви вже знаєте.',
  },
  {
    id: Q.hundred,
    title: 'Третя сотня',
    act: 1,
    from: 'Затоплений гай: ще одна пряжка в корінні.',
    start: { flag: `done:${QS.hundred1}` },
    steps: [
      { text: 'Шукати сліди сотні: у Гаю, на Греблі, на Гаті.', done: { owns: QR.relic, gte: 3 } },
      { text: 'Підважити плиту під шлюзом і прочитати, що там.', done: { flag: `done:${QS.hundred2}` } },
    ],
    reward: 'Ви навчилися в мертвих солдатів стояти пліч-о-пліч: поки ви обоє на ногах, кожному легше тримати удар.',
  },
  {
    id: Q.elder,
    title: 'Сом-Дід',
    act: 1,
    from: 'Стара гребля: спина у вирі, ширша за човен.',
    start: { flag: `done:${QS.elder1}` },
    steps: [
      { text: 'Викувати великий гак.', done: { owns: QR.hook } },
      { text: 'Заготувати наживку: солона риба в шкурі.', done: { owns: QR.bait } },
      { text: 'Ніч на виру — удвох.', done: { flag: `done:${QS.elder2}` } },
      { text: 'Зробити каганець із сомового жиру.', done: { owns: QR.lamp } },
    ],
    reward: 'Старого сома нема. Харчів — на тиждень, а каганець світить у плавнях уночі: засідок менше.',
  },
];

/** Things that errands put into the daily life (comfort, resident work, supper gifts). */
export const sideDaily1 = [{ res: R.food, add: 4, if: { flag: 'built:x_133' } }];

export const sideComfort1 = [
  { if: { flag: 'built:x_137' }, name: 'дзвін над варницею' },
  { if: { flag: 'built:x_127' }, name: 'пухові подушки' },
  { if: { flag: 'p2_pup' }, name: 'цуценя біля вогню' },
];

