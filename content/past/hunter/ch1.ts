import type { ActionDef, ClueDef, Cond, GoalDef, MysteryDef, NpcDef, SceneDef, SceneNode } from '../../../shared/src/content.js';
import { HE, HG, HL, HM, HN, HR, HU } from './ids.js';

const SEC = 1000;
const inside: Cond = { flag: 'ph_in' };
const fame = (n: number): Cond => ({ flag: 'ph_fame', gte: n });

/**
 * A trail: found at one place (its flag `ph_tN`), followed at another (`ph_tN_on`), and it ends in a scene at
 * a third (`done:<scene>`), where the beast (or the man) is met. Each one ended is fame of the hunter.
 */
export function trail(t: {
  n: number;
  open: Cond;
  find: { id: string; group: string; spot: string; label: string; log: string };
  follow: { id: string; group: string; spot: string; label: string; log: string };
  end: { id: string; title: string; group: string; spot: string; label: string; nodes: Record<string, SceneNode>; gives: string; level?: number };
}): { actions: ActionDef[]; scene: SceneDef } {
  const found = `ph_t${t.n}`;
  const on = `ph_t${t.n}_on`;
  return {
    actions: [
      {
        id: t.find.id,
        icon: 'spot:footprints',
        group: t.find.group,
        spot: t.find.spot,
        label: t.find.label,
        visible: { all: [t.open, { noFlag: found }] },
        effects: [{ set: found }],
        cooldown: 10 * SEC,
        gives: 'Слід',
        busy: 'дивиться на слід',
        log: { self: t.find.log, other: '{name} дивиться на землю.' },
      },
      {
        id: t.follow.id,
        icon: 'spot:tracks',
        group: t.follow.group,
        spot: t.follow.spot,
        label: t.follow.label,
        // a trail is walked in a few goings: the beast moves, the signs fade, one comes back for them
        visible: { all: [{ flag: found }, { flag: on, lt: 3 }] },
        effects: [{ inc: on, max: 3 }],
        cooldown: 16 * SEC,
        recharge: 20 * SEC,
        skill: 'gather',
        gives: 'Слід далі (до трьох разів)',
        busy: 'іде слідом',
        log: { self: t.follow.log, other: '{name} іде слідом.' },
      },
    ],
    scene: {
      id: t.end.id,
      title: t.end.title,
      group: t.end.group,
      spot: t.end.spot,
      label: t.end.label,
      visible: { flag: on, gte: 3 },
      // the beast at the end of the trail is not for the very first days
      ...(t.end.level ? { enabled: { level: t.end.level }, disabledHint: `Звір сильний. Набратися сил (рівень ${t.end.level}).` } : {}),
      gives: t.end.gives,
      start: 'n1',
      nodes: t.end.nodes,
    },
  };
}

/** The end of a trail: fame, experience; the scene's own last node points here. */
const ended = (extra: SceneNode['effects'] = []): SceneNode['effects'] => [{ inc: 'ph_fame', max: 12 }, { xp: 20, who: 'actor' }, ...(extra ?? [])];

const t1 = trail({
  n: 1,
  open: inside,
  find: { id: 'ph_x20', group: HL.isle, spot: 'yard', label: 'Подивитися, хто риє городи', log: 'Капуста вивернута з коренем, межа розрита, як плугом. Слід копитця — широкий, глибокий, задні ноги ступають у передні. Сікач, старий. Пішов у займище.' },
  follow: { id: 'ph_x21', group: HL.woods, spot: 'trail', label: 'Іти кабанячим слідом', log: 'Слід веде вздовж старого русла. Тут він терся об ясен — кора на висоті твого пояса здерта. Ось лігво: прим\'ята папороть, ще тепла.' },
  end: {
    id: 'ph_s02',
    title: 'Сікач',
    group: HL.woods,
    spot: 'trail',
    label: 'Чекати сікача біля лігва',
    gives: 'Бій',
    level: 2,
    nodes: {
      n1: { text: 'Ти сидиш на ясені над лігвом до сутінок. Він приходить сам — сивий, з одним надламаним іклом, і принюхується. Вітер — від нього до тебе. Він тебе не чує.', next: 'fight' },
      fight: { type: 'fight', foes: [{ enemy: HE.tusker }], win: 'won', lose: 'lost' },
      lost: { text: 'Сікач збиває тебе в папороть і йде, не озираючись. Ти добираєшся додому з синцем на пів стегна. Сидір дивиться й каже: «Завтра знову. Він тепер знає тебе, а ти — його».', incomplete: true, next: null },
      won: { text: 'Сікач падає в папороть. Ти довго сидиш поруч, поки руки не перестануть тремтіти. Сидір, побачивши тушу на човні, тільки хмикає — але того вечора наливає тобі {першому|першій}.', effects: ended(), next: null },
    },
  },
});

const t2 = trail({
  n: 2,
  open: inside,
  find: { id: 'ph_x22', group: HL.isle, spot: 'yard', label: 'Порахувати курей', log: 'Двох нема. Під загородкою — підкоп, на дошці — руде волосся. Слід дрібний, рівний, лапа за лапою: лисиця. Пішла до очерету.' },
  follow: { id: 'ph_x23', group: HL.reeds, spot: 'tracks', label: 'Шукати лисячу нору', log: 'Слід петляє, кидається у воду, виходить знову — хитра. Пір\'я на кущі. Нора — під корчем на гриві, біля нори кісточки.' },
  end: {
    id: 'ph_s03',
    title: 'Нора',
    group: HL.reeds,
    spot: 'tracks',
    label: 'Підійти до лисячої нори',
    gives: 'Вибір',
    nodes: {
      n1: { text: 'З нори виглядає лисиця — і одразу ховається. А за нею — троє лисенят, руді клубки. Вони ще нічого не знають про курей.', next: 'n2' },
      n2: {
        type: 'choice',
        mode: 'each',
        text: 'Що ти робиш?',
        options: [
          { id: 'spare', label: 'Залишити їх. Загородку можна полатати', effects: [{ set: 'ph_fox_spared' }] },
          { id: 'take', label: 'Викурити й забрати шкурки', effects: [{ set: 'ph_fox_taken' }, { add: { [HR.hide]: 3 } }] },
        ],
        next: 'n3',
      },
      n3: {
        text: [
          [
            { if: { flag: 'ph_fox_spared' }, text: 'Ти латаєш загородку лозою — тісно, у два ряди. Сидір дивиться й нічого не каже. Але увечері розповідає, як колись теж лишив вовчицю з вовченятами. «Через рік вона вивела мені сохатого на стрільбу. Отак буває».' },
            { text: 'Три руді шкурки сохнуть на кілку. Сидір киває: «Шкурка добра». Більше нічого не каже.' },
          ],
        ],
        effects: ended(),
        next: null,
      },
    },
  },
});

const t3 = trail({
  n: 3,
  open: fame(1),
  find: { id: 'ph_x24', group: HL.ford, spot: 'pier', label: 'Розпитати, чого кричить поромник', log: 'Поромник Гнат бігає берегом: малий Сава пішов по вутині яйця і не вернувся. З ранку. Ти дивишся на мул біля води: дитячі босі ноги — пішли в очерет.' },
  follow: { id: 'ph_x25', group: HL.reeds, spot: 'nests', label: 'Іти за дитячими слідами', log: 'Слід дрібний, неуважний, ходить колами — так ходять, коли загубилися. Ось сів, ось плакав: вим\'ята осока. Ось пішов далі, до старої протоки.' },
  end: {
    id: 'ph_s04',
    title: 'Сава',
    group: HL.reeds,
    spot: 'nests',
    label: 'Гукати на старій протоці',
    gives: 'Пошук',
    nodes: {
      n1: { text: 'Ти не гукаєш — слухаєш. Очерет, вода, птахи. І тоненько, як комар, — схлип. Сава сидить на купині посеред протоки, вода навколо по груди дорослому. Сидить і тримає в руках два яйця.', effects: [{ meet: HN.ferryman }], next: 'n2' },
      n2: { text: 'Ти переносиш його на плечах. Яйця він так і не випускає. Гнат на березі хапає сина, лає, цілує, знову лає. Потім дістає з-за пазухи шаги — всі, що є.', effects: ended([{ inc: 'ph_fame', max: 12 }, { add: { [HR.coin]: 6 } }]), next: null },
    },
  },
});

const t4 = trail({
  n: 4,
  open: fame(2),
  find: { id: 'ph_x26', group: HL.woods, spot: 'ash', label: 'Подивитися на вовчі сліди', log: 'Пара. Самець і самиця, ідуть слід у слід. Ходять до острова щоночі — але не на острів: до коптильні. Риба їм пахне.' },
  follow: { id: 'ph_x27', group: HL.reeds, spot: 'tracks', label: 'Знайти, де вовки переходять воду', log: 'Брід через протоку — по коліно. Звідси вони й ходять. Ти мітиш місце зарубкою на вербі.' },
  end: {
    id: 'ph_s05',
    title: 'Вовчий брід',
    group: HL.reeds,
    spot: 'tracks',
    label: 'Чекати вовків на броді',
    gives: 'Бій',
    level: 3,
    nodes: {
      n1: { text: 'Місяць. Вода блищить. Двоє виходять з очерету, як одна тінь, — і зупиняються, коли ти встаєш.', next: 'fight' },
      fight: { type: 'fight', foes: [{ enemy: HE.wolf, n: 2 }], win: 'won', lose: 'lost' },
      lost: { text: 'Вовки йдуть у плавні, а ти лишаєшся в холодній воді з порваним рукавом. Не цієї ночі.', incomplete: true, next: null },
      won: { text: 'Вовки більше не приходять до коптильні. Сидір говорить сусідам на Броді: «{Мій справився|Моя справилася}». Не «{онук|онука}», не «{учень|учениця}» — «{мій|моя}».', effects: ended(), next: null },
    },
  },
});

const t8 = trail({
  n: 8,
  open: fame(3),
  find: { id: 'ph_x28', group: HL.reeds, spot: 'water', label: 'Подивитися, хто рве верші', log: 'Верші розірвані знизу, риба з\'їдена наполовину — тільки найсмачніше. На мулі — слід з перетинками й борозна від хвоста. Видра. Пішла вниз протокою, до Броду.' },
  follow: { id: 'ph_x29', group: HL.ford, spot: 'pier', label: 'Шукати видрячу нору під поромом', log: 'Під палями порому — ковзанка, гладенька, як лід. Видра тут грається. Нора — під корінням старої верби, вхід під водою.' },
  end: {
    id: 'ph_s16',
    title: 'Видра',
    group: HL.ford,
    spot: 'pier',
    label: 'Поставити на видру пастку під поромом',
    gives: 'Вибір',
    nodes: {
      n1: { text: 'Ти ставиш пастку — не петлю, а кошик, як навчив Сидір: видра заходить і не може вийти. Вранці в кошику — вона. Велика, мокра, і дивиться на тебе розумними чорними очима.', next: 'n2' },
      n2: {
        type: 'choice',
        mode: 'each',
        text: 'Видряче хутро на Броді — найдорожче.',
        options: [
          { id: 'skin', label: 'Забрати шкуру', effects: [{ add: { [HR.hide]: 2, [HR.coin]: 6 } }] },
          { id: 'free', label: 'Відвезти її подалі й відпустити', effects: [{ set: 'ph_otter_freed' }, { add: { [HR.food]: 4 } }] },
        ],
        next: 'n3',
      },
      n3: { text: 'Поромник Гнат, що бачив усе з порому, тільки хитає головою: «Сидорова школа». Сава ходить за тобою два дні, просить навчити ставити кошики.', effects: ended(), next: null },
    },
  },
});

export const actionsH1: ActionDef[] = [
  ...t8.actions,
  ...t1.actions,
  ...t2.actions,
  ...t3.actions,
  ...t4.actions,
  // ------------------------------------------------------------------ gathering
  {
    id: 'ph_x01',
    group: HL.reeds,
    spot: 'osier',
    label: 'Різати лозу',
    visible: inside,
    yield: { [HR.osier]: [2, 3] },
    cooldown: 10 * SEC,
    skill: 'gather',
    kind: 'gather',
    job: { rate: 8 },
    busy: 'ріже лозу',
    log: { self: ['Червона лоза, гнучка. На силки — те що треба.', 'Пучок лози, другий. Руки пам\'ятають, як різати — навскіс.'], other: '{name} ріже лозу.' },
  },
  {
    id: 'ph_x02',
    group: HL.reeds,
    spot: 'water',
    label: 'Ставити верші в протоці',
    visible: inside,
    yield: { [HR.food]: [1, 2] },
    cooldown: 14 * SEC,
    skill: 'gather',
    kind: 'gather',
    job: { rate: 5 },
    busy: 'ставить верші',
    log: { self: ['Верша важка: лин, карась, ще карась.', 'Порожньо. Сидір казав би: «Риба теж думає».'], other: '{name} ставить верші.' },
  },
  {
    id: 'ph_x03',
    group: HL.reeds,
    spot: 'nests',
    label: 'Збирати пір\'я біля гнізд',
    visible: inside,
    yield: { [HR.feather]: [2, 3] },
    cooldown: 10 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'збирає пір\'я',
    log: { self: 'Чапляче, гусяче, качине. На стріли — тільки рівне, з правого крила.', other: '{name} збирає пір\'я.' },
  },
  {
    id: 'ph_x04',
    group: HL.woods,
    spot: 'ash',
    label: 'Різати ясенові палиці',
    visible: inside,
    yield: { [HR.wood]: [1, 2] },
    cooldown: 14 * SEC,
    skill: 'gather',
    kind: 'gather',
    job: { rate: 4 },
    busy: 'ріже ясен',
    log: { self: 'Молодий ясен, рівний, без сучків. На лук — з тіньового боку, там волокно щільніше.', other: '{name} ріже ясенові палиці.' },
  },
  // ------------------------------------------------------------------ snares
  {
    id: 'ph_x05',
    icon: 'osier',
    group: HL.reeds,
    spot: 'tracks',
    label: 'Поставити силки на стежках',
    visible: { all: [inside, { noFlag: 'ph_snared' }] },
    cost: { [HR.osier]: 3 },
    effects: [{ set: 'ph_snared' }],
    cooldown: 12 * SEC,
    gives: 'Силки стоять',
    busy: 'ставить силки',
    log: { self: 'Петля з лози, кілочок, прикормка. Шість петель — на шести стежках, яких ніхто, крім тебе, не бачить.', other: '{name} ставить силки.' },
  },
  {
    id: 'ph_x06',
    icon: 'hide',
    group: HL.reeds,
    spot: 'tracks',
    label: 'Перевірити силки',
    visible: { flag: 'ph_snared' },
    effects: [{ unset: 'ph_snared' }],
    chance: [
      { p: 0.8, add: { [HR.hide]: 1 } },
      { p: 0.6, add: { [HR.food]: 2 } },
      { p: 0.4, add: { [HR.hide]: 1 } },
      { p: 0.3, add: { [HR.fat]: 1 } },
    ],
    cooldown: 10 * SEC,
    recharge: 45 * SEC,
    skill: 'gather',
    kind: 'gather',
    gives: '+? Шкурки, дичина',
    busy: 'перевіряє силки',
    log: { self: ['Ондатра, заєць, ще ондатра. Одна петля порвана — хтось сильніший приходив.', 'Дві петлі порожні, у третій — видра. Сидір буде радий: видра — то гроші.'], other: '{name} перевіряє силки.' },
  },
  // ------------------------------------------------------------------ the ford
  {
    id: 'ph_x07',
    icon: 'coin',
    group: HL.ford,
    spot: 'furs',
    label: 'Продати шкурки',
    visible: inside,
    cost: { [HR.hide]: 1 },
    yield: { [HR.coin]: 2 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'торгується зі шкірниками',
    log: { self: 'Шкірник мне шкурку в пальцях, дує на хутро. «Сидорова? Беру».', other: '{name} продає шкурки.' },
  },
  {
    id: 'ph_x08',
    icon: 'coin',
    group: HL.ford,
    spot: 'tavern',
    label: 'Продати рибу в корчму',
    visible: inside,
    cost: { [HR.food]: 3 },
    yield: { [HR.coin]: 1 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'продає рибу',
    log: { self: 'Корчмар бере рибу, не торгуючись: перевізники їдять багато.', other: '{name} продає рибу.' },
  },
  {
    id: 'ph_x09',
    icon: 'iron',
    group: HL.ford,
    spot: 'furs',
    label: 'Купити залізо на вістря',
    visible: inside,
    cost: { [HR.coin]: 2 },
    yield: { [HR.iron]: 1 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'купує залізо',
    log: { self: 'Кований дріт, обрізки. Сидір з цього викує тобі вістря на два десятки стріл.', other: '{name} купує залізо.' },
  },
  // ------------------------------------------------------------------ the island
  {
    id: 'ph_x10',
    group: HL.isle,
    spot: 'bench',
    label: 'Зробити лук',
    visible: inside,
    cost: { [HR.wood]: 3, [HR.fat]: 1, [HR.osier]: 2 },
    yield: { [HG.bow]: 1 },
    limit: 1,
    cooldown: 26 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Ножем звіра не наздоженеш.',
    busy: 'гне лук',
    log: { self: 'Сидір показує, де ясен гнеться, а де ламається. Тятива з жил, просочена жиром. Перший постріл — у копицю, другий — уже в мішень.', other: '{name} робить лук.' },
  },
  {
    id: 'ph_x11',
    group: HL.isle,
    spot: 'bench',
    label: 'Наробити стріл',
    visible: { owns: HG.bow },
    cost: { [HR.wood]: 1, [HR.feather]: 3, [HR.iron]: 1 },
    yield: { [HU.arrow]: 8 },
    cooldown: 16 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Стріли губляться в очереті, як голки в сіні.',
    busy: 'робить стріли',
    log: { self: 'Древко, пір\'я на клей, вістря — Сидорові. Вісім. Кожну ти пускаєш у копицю, щоб знати, як летить.', other: '{name} робить стріли.' },
  },
  {
    id: 'ph_x12',
    group: HL.isle,
    spot: 'bench',
    label: 'Пошити шкіряну свиту',
    visible: inside,
    cost: { [HR.hide]: 4, [HR.fat]: 1 },
    yield: { [HG.coat]: 1 },
    limit: 1,
    cooldown: 20 * SEC,
    skill: 'craft',
    kind: 'craft',
    why: 'Осінь у плавнях холодна й мокра.',
    busy: 'шиє свиту',
    log: { self: 'Шкурки внахльост, шви жиром. Свита важка, пахне коптильнею — і не пропускає води.', other: '{name} шиє свиту.' },
  },
  {
    id: 'ph_x13',
    icon: 'bow',
    group: HL.isle,
    spot: 'yard',
    label: 'Стріляти з Сидором по мішені',
    visible: { owns: HG.bow },
    train: { skill: 'ranged', xp: 3 },
    cooldown: 12 * SEC,
    recharge: 30 * SEC,
    kind: 'train',
    gives: 'Стрільба',
    busy: 'стріляє по мішені',
    log: { self: ['«Не дивись на стрілу. Дивись туди, куди хочеш, щоб вона прийшла». Сидір б\'є в шапку на кілку з сорока кроків.', 'Ти влучаєш тричі з п\'яти. Сидір каже: «Ще рік». Але усміхається.'], other: '{name} стріляє по мішені.' },
  },
  {
    id: 'ph_x14',
    icon: 'spot:kiln',
    group: HL.isle,
    spot: 'smoke',
    label: 'Коптити рибу',
    visible: inside,
    cost: { [HR.food]: 2, [HR.wood]: 1 },
    yield: { [HR.food]: 4 },
    cooldown: 18 * SEC,
    kind: 'craft',
    busy: 'коптить рибу',
    log: { self: 'Вільховий дим, риба на прутах. Копчена лежить місяць — і на Броді за неї дають більше.', other: '{name} коптить рибу.' },
  },
];

export const scenesH1: SceneDef[] = [
  t8.scene,
  t1.scene,
  t2.scene,
  t3.scene,
  t4.scene,
  {
    id: 'ph_s01',
    title: 'Острів',
    group: HL.isle,
    spot: 'hearth',
    label: 'Вийти на берег острова',
    visible: { noFlag: 'ph_in' },
    gives: 'Початок',
    start: 'n1',
    nodes: {
      n1: {
        text: [
          'Кінець літа. Плавні жовтіють. Ти пригоняєш човен до острова, де живе дід Сидір, — уже не вперше, але вперше назовсім.',
          { if: { pflag: 'bg_home' }, text: 'Там, звідки ти, був сад. Тут саду нема — тільки верби, вода і небо, більше, ніж будь-де.' },
          { if: { pflag: 'bg_people' }, text: 'Там, звідки ти, лишилися люди. Ти обіцяв{|ла} навідуватись. Плавні від них — два дні човном.' },
          { if: { pflag: 'bg_nothing' }, text: 'Звідки ти — краще не згадувати. Плавні не питають.' },
        ],
        next: 'n2',
      },
      n2: {
        text: 'Сидір сидить на призьбі з сіттю. Не підводиться. — Прийш{ов|ла}, — каже він, і це не питання. — Ну то дивись. Плавні вчать тільки тих, хто дивиться.',
        effects: [{ meet: HN.sydir }],
        next: 'n3',
      },
      n3: {
        text: 'Він дає тобі ніж — старий, з кістяною колодочкою, сточений до половини. — Мій перший. Лука в тебе нема — зробиш сам{|а}, коли знайдеш ясен. А поки — подивись, хто риє мої городи.',
        effects: [{ set: 'ph_in' }, { wear: HG.knife }, { add: { [HR.food]: 4, [HR.coin]: 3, [HR.osier]: 3 } }, { checkpoint: 'ph1.start' }],
        next: null,
      },
    },
  },
  {
    id: 'ph_s06',
    title: 'Купці',
    group: HL.ford,
    spot: 'pier',
    label: 'Вийти до купців, що питають провідника',
    visible: { all: [fame(6), { flag: 'done:ph_s04' }] },
    enabled: { level: 2 },
    disabledHint: 'Уночі в плавнях буває всяке. Набратися сил (рівень 2).',
    gives: 'Провести · вибір',
    start: 'n1',
    nodes: {
      n1: {
        text: 'На Броді — четверо возів під рогожею, міцні коні, люди без облич: шапки на очі. Старший, гладкий, з перснем, кланяється тобі. — Кажуть, ти знаєш плавні, як Сидір. Треба провести нас уночі на той бік. Без парома. Без питань. Платимо сріблом.',
        effects: [{ meet: HN.merchant }],
        next: 'n2',
      },
      n2: {
        text: 'Ти ведеш їх стежкою, якою {сам|сама} ходиш по качок: по гриві, по колінну воду, повз старий брід. Коні хропуть. Вози йдуть тихо — занадто тихо для возів, повних товару.',
        next: 'n3',
      },
      n3: {
        text: 'Опівночі, на середині плавнів, з-під рогожі — кашель. Дитячий. Хтось одразу затуляє рота. Купець, що йде поруч, каже рівно: — Товар. Хворіє з дороги.',
        effects: [{ clue: 'ph_c1' }],
        next: 'n4',
      },
      n4: {
        type: 'choice',
        mode: 'each',
        text: 'До берега — година ходу.',
        options: [
          { id: 'quiet', label: 'Промовчати й вести далі. Срібло є срібло', effects: [{ set: 'ph_guided_quiet' }, { add: { [HR.coin]: 15 } }] },
          { id: 'look', label: 'На привалі зазирнути під рогожу', effects: [{ set: 'ph_looked' }, { add: { [HR.coin]: 15 } }, { clue: 'ph_c2' }] },
        ],
        next: 'n5',
      },
      n5: {
        text: [
          [
            { if: { flag: 'ph_looked' }, text: 'На привалі ти піднімаєш край рогожі. Люди. Сидять рядами, щільно, в однакових сірих сорочках — і сплять із розплющеними очима. На шиї в найближчого — мідна бляшка на шнурку. Ніхто не кричить. Ніхто навіть не дивиться на тебе. Купець опускає рогожу назад і кладе тобі в долоню ще срібло. Мовчки.' },
            { text: 'Ти ведеш далі. Кашель більше не чути. На тому березі купець відраховує срібло, і вози зникають у степу. Ти рахуєш монети двічі — і чомусь не радієш.' },
          ],
        ],
        effects: [{ mystery: HM.carts, level: 1 }, { xp: 15, who: 'actor' }],
        next: null,
      },
    },
  },
  {
    id: 'ph_s07',
    title: 'Вечеря на острові',
    group: HL.isle,
    spot: 'hearth',
    label: 'Сісти вечеряти з Сидором',
    visible: { flag: 'done:ph_s06' },
    gives: 'Кінець розділу',
    start: 'n1',
    nodes: {
      n1: {
        text: 'Юшка з линів, хліб з Броду, цибуля з городу, який більше ніхто не риє. Сидір їсть повільно. Коли ти розповідаєш про вози, він кладе ложку.',
        next: 'n2',
      },
      n2: {
        text: [
          '— Я таких уже бачив, — каже він. — Давно. Тоді теж возили — «товар». Тоді теж не питали. — Він довго мовчить. — У плавнях усе видно, дитино. Тільки не всі дивляться.',
          [
            { if: { flag: 'ph_looked' }, text: 'Ти розповідаєш про бляшки на шиях. Сидір не дивиться на тебе. Він дивиться у вогонь, наче там є щось, що йому вже давно відомо.' },
            { text: 'Ти не кажеш йому про кашель. Він не питає. Але дивиться так, ніби чув його теж.' },
          ],
        ],
        next: 'n3',
      },
      n3: {
        text: [
          [
            { if: { pflag: 'bg_home' }, text: '— Посадимо тобі тут яблуню, — каже раптом Сидір. — На гряді. Вона, правда, води не любить. Але й ти {не любив|не любила}, а бач — {прижився|прижилася}.' },
            { text: '— Звикай, — каже Сидір. — Плавні — то тепер твоє.' },
          ],
          'Над водою кричить бугай. Тоді ти ще не знаєш, що це найтихіша осінь, яку тобі судилося прожити.',
        ],
        effects: [{ actDone: 1 }, { startAct: 2 }, { set: 'ph_ch1_done' }, { checkpoint: 'ph1.end' }],
        next: null,
      },
    },
  },
];

export const mysteriesH: MysteryDef[] = [{ id: HM.carts, question: 'Що за «товар» у возах?', order: 1 }];

export const cluesH1: ClueDef[] = [
  { id: 'ph_c1', to: 'hunter', mystery: HM.carts, title: 'Кашель під рогожею', text: 'Купці везли через плавні вночі чотири вози «товару». З-під рогожі кашляла дитина.' },
  { id: 'ph_c2', to: 'hunter', mystery: HM.carts, title: 'Сірі сорочки', text: 'Під рогожею — люди в однакових сірих сорочках, сплять із розплющеними очима. На шиях — мідні бляшки з номерами.' },
];

export const npcsH: NpcDef[] = [
  { id: HN.sydir, name: 'Дід Сидір', desc: 'Старий ловчий з острова в плавнях. Глухуватий на праве вухо. Бачить усе.' },
  { id: HN.ferryman, name: 'Поромник Гнат', desc: 'Перевозить на Броді. Син Сава — неслух.' },
  { id: HN.merchant, name: 'Купець з перснем', desc: 'Возить «товар» через плавні вночі. Платить сріблом.' },
  { id: HN.andriy, name: 'Андрій', desc: 'Молодий солдат з тихої колони. Не говорить.' },
  { id: HN.deserter, name: 'Утікач', desc: 'Ховається в плавнях від полку.' },
];

export const goalsH1: GoalDef[] = [
  { id: 'ph_goal1', text: 'Вийти на берег острова.', when: { noFlag: 'ph_in' } },
  { id: 'ph_goal2', text: 'Дивитися, хто що лишив на землі: слід — то вже півсправи. Сидір чекає, що ти впораєшся сам{|а}.', when: { all: [inside, { flag: 'ph_fame', lt: 6 }] } },
  { id: 'ph_goal3', text: 'Про тебе вже говорять на Броді. Там когось шукають провідника.', when: { all: [fame(6), { noFlag: 'done:ph_s06' }] } },
  { id: 'ph_goal4', text: 'Сидір кличе вечеряти.', when: { noFlag: 'ph_ch1_done' } },
];
