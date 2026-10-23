import type { ResidentDef } from '../../shared/src/content.js';
import { H } from './ids.js';

export const residents: ResidentDef[] = [
  {
    id: H.ulyana,
    name: [{ if: { flag: 'p2_act2' }, text: 'Уляна' }, { text: 'Жінка з ям' }],
    desc: 'Мовчить. Працює так, ніби її руки знають більше, ніж вона сама. Інколи співає — самими губами.',
    traits: [
      { name: 'Руки пам\'ятають', text: 'Очерет ріже й шкрябає сіль удвічі вправніше.', mult: { x_06: 2, x_33: 1.5 } },
      { name: 'Боїться води', text: 'До води не підходить: ні раків, ні ропи.', avoid: ['x_03', 'x_34', 'x_05'] },
    ],
  },
];
