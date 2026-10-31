import type { ActionDef, Cond } from '../../shared/src/content.js';
import { R } from '../a1/ids.js';
import { L4 } from './ids.js';

const SEC = 1000;
const south: Cond = { flag: 'p2_brid' };

/**
 * The south, part one: the hiding place in the reeds trusts you as you feed and hear it (p2_rep_hide, up to
 * 6); the reeds give firewood for a night fire and fish; the ashes of the town give iron and coal; the island
 * gives wild honey (food) and fish. Firewood matters here: away from home a rest needs a fire.
 */
export const actions4: ActionDef[] = [
  // ------------------------------------------------------------------ the hiding place
  {
    id: 'x_249',
    icon: 'food',
    group: L4.hide,
    spot: 'fire',
    label: 'Нагодувати схованку',
    visible: south,
    cost: { [R.food]: 6 },
    effects: [{ inc: 'p2_rep_hide', max: 6 }],
    cooldown: 8 * SEC,
    recharge: 120 * SEC,
    kind: 'trade',
    gives: 'Довіра схованки',
    busy: 'годує людей у схованці',
    log: {
      self: [
        'Килина ділить рибу на вісім рівних шматків. Свій віддає хлопчикові.',
        'Старий їсть повільно, довго жує. Потім каже: — Дякую. — І вперше дивиться вам в очі.',
        'Дівчата їдять, не підводячи голів. Одна шепоче іншій: «Ці не з полку».',
      ],
      other: '{name} годує людей у схованці.',
    },
  },
  {
    id: 'x_250',
    icon: 'spot:hearth',
    group: L4.hide,
    spot: 'fire',
    label: 'Посидіти з ними біля вогню',
    visible: south,
    effects: [{ inc: 'p2_rep_hide', max: 2 }],
    cooldown: 10 * SEC,
    kind: 'home',
    busy: 'сидить біля вогню в схованці',
    beats: [
      {
        log: {
          self: 'Килина говорить, не відриваючись від сіті: — Вони прийшли на Покрову. Вежливі. Полковник навіть шапку зняв. А потім хутори запалали — один за одним, як свічки.',
          other: '{name} слухає Килину.',
          kind: 'story',
        },
      },
      {
        log: {
          self: 'Старий без шапки: — Міцних забрали. Мого онука теж. Сам пішов, без мотузки. Його нагодували в обозі — і він пішов.',
          other: '{name} слухає старого.',
          kind: 'story',
        },
      },
      {
        if: { role: 'hunter' },
        log: {
          self: 'Хлопчик з вудкою підсідає ближче й показує на той берег: — Уночі вони не сплять. Стоять. Я рахував: до ранку ніхто не ліг.',
          other: '{name} слухає хлопчика.',
          kind: 'story',
        },
      },
      {
        if: { role: 'maker' },
        log: {
          self: 'Старий показує бляшку на шнурку, стерту ножем. — Онук стер мені номер, перш ніж піти. Сказав: «Діду, ти не номер».',
          other: '{name} роздивляється бляшку старого.',
          kind: 'story',
        },
      },
    ],
    log: {
      self: ['Біля вогню говорять пошепки. Вогонь маленький, у ямі: щоб не видно з того берега.', 'Хтось тихо співає першу строфу південної пісні. Другої не знає ніхто.'],
      other: '{name} сидить біля вогню в схованці.',
    },
  },
  {
    id: 'x_251',
    group: L4.hide,
    spot: 'reeds',
    label: 'Різати сухий очерет на вогонь',
    visible: south,
    yield: { [R.wood]: [2, 3] },
    chance: [{ p: 0.4, add: { [R.reed]: 2 } }],
    cooldown: 10 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'ріже очерет',
    log: {
      self: ['Сухий очерет горить швидко і майже без диму — те, що треба вночі.', 'Ти ріжеш тихо: на тому березі чути кожен звук.'],
      other: '{name} ріже очерет.',
    },
  },
  {
    id: 'x_252',
    group: L4.hide,
    spot: 'water',
    label: 'Ловити рибу в протоці',
    visible: south,
    yield: { [R.food]: [2, 3] },
    cooldown: 12 * SEC,
    skill: 'gather',
    knack: { role: 'hunter', x: 1.3 },
    kind: 'gather',
    busy: 'ловить рибу в протоці',
    log: {
      self: ['Лин, два карасі, щука з руку. Протока годує, якщо знати, де стояти.', 'Хлопчик з вудкою сідає поруч і мовчки показує, де клює.'],
      other: '{name} ловить рибу в протоці.',
    },
  },

  // ------------------------------------------------------------------ the ashes of the town
  {
    id: 'x_253',
    group: L4.town,
    spot: 'smith',
    label: 'Шукати залізо на згарищі',
    visible: south,
    yield: { [R.iron]: [1, 2] },
    chance: [{ p: 0.35, add: { [R.coal]: 2 } }],
    cooldown: 14 * SEC,
    skill: 'gather',
    knack: { role: 'maker', x: 1.3 },
    kind: 'gather',
    busy: 'шукає залізо на згарищі',
    log: {
      self: [
        'Завіси, скоби, обруч від бочки. Залізо не горить — тільки чорніє.',
        'Під обвугленою балкою — підкова. Чиясь хата стояла тут, чийсь кінь.',
      ],
      other: '{name} шукає залізо на згарищі.',
    },
  },
  {
    id: 'x_254',
    group: L4.town,
    spot: 'ashes',
    label: 'Збирати вугілля з пожарищ',
    visible: south,
    yield: { [R.coal]: [2, 3] },
    cooldown: 12 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'збирає вугілля на згарищах',
    log: {
      self: ['Вугілля дубове, добре — з чиїхось сволоків.', 'Ти не дивишся, з якої хати береш. Так легше.'],
      other: '{name} збирає вугілля.',
    },
  },

  // ------------------------------------------------------------------ the island
  {
    id: 'x_255',
    group: L4.isle,
    spot: 'smoke',
    label: 'Дикий мед у дуплі над коптильнею',
    visible: { all: [south, { flag: 'p2_island' }] },
    yield: { [R.food]: [3, 4] },
    cooldown: 16 * SEC,
    recharge: 90 * SEC,
    skill: 'gather',
    kind: 'gather',
    busy: 'дістає мед',
    log: {
      self: ['Бджоли пережили пожежу. Мед темний, з присмаком диму.', 'Ти виймаєш стільник обережно, лишаєш бджолам половину.'],
      other: '{name} дістає дикий мед.',
    },
  },
  {
    id: 'x_256',
    group: L4.isle,
    spot: 'nets',
    label: 'Поставити сіть між кілками',
    visible: { all: [south, { flag: 'p2_island' }] },
    cost: { [R.rope]: 1 },
    yield: { [R.food]: [4, 6] },
    cooldown: 14 * SEC,
    skill: 'gather',
    knack: { role: 'hunter', x: 1.3 },
    kind: 'gather',
    busy: 'ставить сіть',
    log: {
      self: ['Старі кілки ще тримають. Сіть — нова, твоя. До ранку — повна.', 'Риба б\'ється в сіті, як колись. Острову байдуже, що на ньому вже нікого нема.'],
      other: '{name} ставить сіть на острові.',
    },
  },

  // ------------------------------------------------------------------ the ford
  {
    id: 'x_257',
    icon: 'spot:tracks',
    group: L4.ford,
    spot: 'tavern',
    label: 'Дивитися на табір з горища корчми',
    visible: south,
    cooldown: 12 * SEC,
    kind: 'home',
    busy: 'дивиться на табір полку',
    log: {
      self: [
        'Ряди, ряди, ряди. Сірі сорочки. Між рядами ходять вартові з ліхтарями, хоч і день.',
        'Біля синього намету — коні. Багато коней. Полковник, мабуть, не любить ходити пішки.',
        'Над обозом — дим. Чорний, низький. Пахне чимось знайомим, гірким.',
      ],
      other: '{name} дивиться на табір із горища корчми.',
    },
  },
];
