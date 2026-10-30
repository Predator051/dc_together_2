import type { ResourceDef } from '../../shared/src/content.js';
import { G3, R3, T3 } from './ids.js';

const shelves = (add: number) => [
  { if: { flag: 'built:x_31' }, add },
  { if: { flag: 'built:x_32' }, add },
];

export const resources3: ResourceDef[] = [
  // ----- for the road -----
  { id: R3.hay, icon: 'hay', name: 'Сіно', order: 30, cap: 30, capBonus: shelves(10), weight: 1, desc: 'Степова трава, просушена на сонці. Волам у дорогу.' },
  { id: R3.axle, icon: 'axle', name: 'Запасна вісь', order: 31, cap: 4, weight: 3, desc: 'Дубова вісь, обтесана під маточину. На шляху ламаються саме вони.' },

  // ----- things kept for a purpose -----
  { id: T3.wagon, icon: 'wagon', name: 'Віз', order: 43, kind: 'tool', weight: 0, desc: 'Свій віз: дубові полудрабки, окуті колеса, ярмо. Піде й на далеку дорогу.' },
  { id: T3.oxen, icon: 'oxen', name: 'Пара волів', order: 44, kind: 'tool', weight: 0, desc: 'Сірі, круторогі, неквапливі. Цоб і Цабе — як інакше.' },
  { id: T3.list, icon: 'book', name: 'Список Тодося', order: 45, kind: 'tool', weight: 0, desc: 'Дрібний рівний почерк. Номери, дати, міри. І куди.' },

  // ----- gear -----
  { id: G3.burka, icon: 'burka', name: 'Повстяна бурка', order: 78, kind: 'gear', weight: 2, gear: { slot: 'body', armor: 1, hp: 4, resist: ['cold'], tools: ['disguise'] } },
  { id: G3.pike, icon: 'pike', name: 'Довга піка', order: 79, kind: 'gear', weight: 2, gear: { slot: 'weapon', dmg: [4, 7], acc: 0.04, tags: ['pierce', 'reach'] } },
];
