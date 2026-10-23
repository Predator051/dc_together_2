import type { Cond, ResourceDef } from '../../shared/src/content.js';
import { G2, R2, T2 } from './ids.js';

/** Goods can be taken along once the road to the buyers is known. */
export const WARE: Cond = { flag: 'done:s_31' };

const shelves = (add: number) => [
  { if: { flag: 'built:x_31' }, add },
  { if: { flag: 'built:x_32' }, add },
];

export const resources2: ResourceDef[] = [
  // ----- money and goods -----
  { id: R2.coin, icon: 'coin', name: 'Шаги', order: 22, kind: 'use', cap: 999, weight: 0, desc: 'Мідні шаги. У Солониці за них купують те, чого на болотах не добудеш.' },
  { id: R2.ore, icon: 'ore', name: 'Болотяна руда', order: 23, cap: 16, capBonus: shelves(8), weight: 2 },
  { id: R2.peat, icon: 'peat', name: 'Торф', order: 24, cap: 20, capBonus: shelves(10), weight: 1 },
  { id: R2.wax, icon: 'wax', name: 'Віск', order: 25, cap: 10, weight: 0.3 },
  { id: R2.cloth, icon: 'cloth', name: 'Полотно', order: 26, cap: 12, capBonus: shelves(4), weight: 0.5 },
  { id: R2.felt, icon: 'felt', name: 'Повсть', order: 27, cap: 8, weight: 0.5 },
  { id: R2.bloom, icon: 'bloom', name: 'Криця', order: 28, cap: 10, capBonus: shelves(4), weight: 2 },
  {
    id: R2.meat,
    icon: 'meat',
    name: 'Солонина',
    order: 29,
    kind: 'food',
    cap: 20,
    capBonus: shelves(6),
    weight: 1,
    ware: WARE,
    meal: { hp: 5, dmg: 1, minutes: 15 },
    use: {
      anywhere: true,
      label: 'З\'їсти солонини',
      log: { self: 'Ти відрізаєш скибку солонини. Солона, жорстка — і сили від неї як від доброго сну.', other: '{name} жує солонину.' },
    },
  },

  // ----- things kept for a purpose -----
  { id: T2.mask, icon: 'mask', name: 'Мокра хустка', order: 40, kind: 'tool', weight: 0, desc: 'Полотно, змочене водою. Зав\'язати на обличчя — і дим не так б\'є в голову.' },
  { id: T2.pincers, icon: 'pincers', name: 'Ковальські кліщі', order: 42, kind: 'tool', weight: 0, desc: 'Довгі, важкі, з загартованими губками. Перекусять і ланцюг.' },
  { id: T2.plugs, icon: 'plugs', name: 'Затички з воску', order: 41, kind: 'tool', weight: 0, desc: 'Як колись у Ясенці. Глушать усе — і гудіння теж.' },

  // ----- gear -----
  {
    id: G2.pick,
    icon: 'pick',
    name: 'Кайло',
    order: 70,
    kind: 'gear',
    weight: 2,
    gear: { slot: 'weapon', dmg: [3, 5], tags: ['pierce'], tools: ['pick'], speed: 0.4 },
  },
  {
    id: G2.cleaver,
    icon: 'cleaver',
    name: 'Тесак',
    order: 71,
    kind: 'gear',
    weight: 1.5,
    gear: { slot: 'weapon', dmg: [3, 6], acc: 0.03, tags: ['cleave'], tools: ['blade', 'axe'], speed: 0.1 },
  },
  { id: G2.ironshield, icon: 'shield', name: 'Окутий щит', order: 72, kind: 'gear', weight: 2.5, gear: { slot: 'offhand', armor: 1, dodge: 0.05 } },
  { id: G2.bracers, icon: 'bracers', name: 'Наручі з бляхою', order: 73, kind: 'gear', weight: 0.5, gear: { slot: 'hands', armor: 1, acc: -0.02 } },
  { id: G2.softboots, icon: 'boots', name: 'М\'які постоли', order: 74, kind: 'gear', weight: 0.5, gear: { slot: 'legs', dodge: 0.03, tools: ['quiet'] } },
  { id: G2.coat, icon: 'robe', name: 'Чумацька свита', order: 75, kind: 'gear', weight: 1.5, gear: { slot: 'body', hp: 2, resist: ['cold'], tools: ['disguise'] } },
  { id: G2.sabre, icon: 'sabre', name: 'Шабля', order: 76, kind: 'gear', weight: 1, gear: { slot: 'weapon', dmg: [3, 7], acc: 0.08, tools: ['blade'] } },
  { id: G2.quilt, icon: 'quilt', name: 'Стьобанка', order: 77, kind: 'gear', weight: 2, gear: { slot: 'body', armor: 2, hp: 3, resist: ['cold'] } },
];
