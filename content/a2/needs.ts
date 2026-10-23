// Needs, act two: millet from the market, a hearty porridge, felt blankets.
import type { ActionDef, Cond, FxKind, ResourceDef } from '../../shared/src/content.js';
import { L, R } from '../a1/ids.js';
import { L2, R2 } from './ids.js';

const SEC = 1000;
const act2: Cond = { flag: 'p2_act2' };
const town: Cond = { flag: 'done:s_32' };

/** Neutral ids of the needs (act two). */
export const N2N = {
  millet: 'r_31',
  porridge: 'u_11',
} as const;

export const needs2Resources: ResourceDef[] = [
  { id: N2N.millet, icon: 'millet', name: 'Пшоно', order: 29.5, cap: 12, weight: 1 },
  {
    id: N2N.porridge,
    icon: 'porridge',
    name: 'Куліш',
    order: 39.5,
    kind: 'use',
    cap: 8,
    weight: 1,
    meal: { hp: 7, dmg: 1, minutes: 18, warm: 20 },
    desc: 'Пшоно з солониною, густе — ложка стоїть. Чумацька страва.',
    use: {
      anywhere: true,
      label: 'З\'їсти куліш',
      log: { self: ['Куліш густий, з димком. Після нього хочеться горами вертіти.', 'Ти їси куліш дерев\'яною ложкою, як чумаки біля возів.'], other: '{name} їсть куліш.' },
    },
  },
];

export const needs2Actions: ActionDef[] = [
  {
    id: 'x_117',
    group: L.bunks,
    label: 'Пошити повстяні ковдри',
    visible: { all: [act2, { flag: 'built:x_64' }] },
    cost: { [R2.felt]: 3, [R.rope]: 1 },
    cooldown: 12 * SEC,
    kind: 'build',
    once: true,
    why: 'Під повстю не змерзнеш навіть на голих дошках.',
    gives: 'Затишок +1',
    busy: 'шиє ковдри',
    log: { self: 'Повсть цупка, тепла, пахне вівцею. Ти зшиваєш краї грубою ниткою.', other: '{name} шиє повстяні ковдри.' },
  },
  {
    id: 'x_118',
    group: L2.market,
    label: 'Купити пшона',
    visible: town,
    cost: { [R2.coin]: 2 },
    yield: { [N2N.millet]: 2 },
    cooldown: 4 * SEC,
    kind: 'trade',
    busy: 'купує пшоно',
    log: { self: 'Жовте пшоно сиплеться в мішечок. На торгу пахне хлібом і дьогтем.', other: '{name} купує пшоно.' },
  },
  {
    id: 'x_119',
    group: L.hearth,
    label: 'Зварити куліш',
    visible: { all: [{ flag: 'built:x_107' }, town] },
    enabled: { stove: 'warm' },
    disabledHint: 'Під казанком має горіти.',
    cost: { [N2N.millet]: 1, [R2.meat]: 1, [R.water]: 1 },
    yield: { [N2N.porridge]: 3 },
    cooldown: 14 * SEC,
    skill: 'craft',
    knack: { role: 'maker', x: 1.5 },
    kind: 'craft',
    why: 'Найситніша страва: і сили, і рука твердіша.',
    busy: 'варить куліш',
    log: { self: 'Пшоно, солонина, вода — і помішувати, щоб не пригоріло. Пахне чумацьким табором.', other: '{name} варить куліш.' },
  },
];

export const needs2Fx: Record<string, FxKind> = { x_117: 'build', x_118: 'trade', x_119: 'steam' };
