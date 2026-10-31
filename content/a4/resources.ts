import type { ResourceDef } from '../../shared/src/content.js';
import { T4 } from './ids.js';

export const resources4: ResourceDef[] = [
  // ----- things kept for a purpose -----
  { id: T4.key, icon: 'key', name: 'Обвуглений ключ', order: 46, kind: 'tool', weight: 0, desc: 'Дубовий ключ з-над брами майстерні в Кривці. Обгорів, але цілий: вирізаний з одного шматка.' },
  { id: T4.stake, icon: 'mark', name: 'Кілок із зарубками', order: 47, kind: 'tool', weight: 0, desc: 'Кілок від сітей з острова. Зарубки — скільки риби, скільки днів. Рахунок людини, що не читала.' },
  { id: T4.pebble, icon: 'pebble', name: 'Камінець із водопою', order: 48, kind: 'tool', weight: 0, desc: 'Звичайний річковий камінець. Данило підняв його з піску біля води й поклав вам у долоню: «Скажіть матері: я чув».' },
];
