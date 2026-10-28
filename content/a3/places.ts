import type { AreaDef, LocationDef } from '../../shared/src/content.js';
import { A2, E2 } from '../a2/ids.js';
import { A3, E3, L3, S3 } from './ids.js';

const SEC = 1000;
const act3 = { flag: 'p2_act3' };
const camp = { flag: 'done:s_102' };

export const areas3: AreaDef[] = [
  {
    id: A3.steppe,
    name: 'Степ',
    where: 'у степу',
    scene: 'steppe',
    pos: [8, 5],
    danger: 11,
    ambush: 0.07,
    scout: S3.steppe,
    visible: act3,
    foes: [
      { enemy: E3.tarpan, w: 2 },
      { enemy: E3.robber, n: [2, 2], w: 2 },
      { enemy: E2.wolf, n: [3, 4], w: 2, night: true },
      { enemy: E3.recruiter, w: 1, if: { flag: 'p2_trip1' } },
    ],
    desc: 'За бродом очерет кінчається. Далі — ковила по пояс, кургани, вітер. І жодної води, крім криниці з журавлем.',
    links: [
      { to: A2.road, time: 14 * SEC },
      { to: A3.quarry, time: 12 * SEC },
    ],
  },
  {
    id: A3.quarry,
    name: 'Старий кар\'єр',
    where: 'у кар\'єрі',
    scene: 'quarry',
    pos: [9, 4],
    ambush: 0.04,
    scout: S3.quarry,
    visible: { flag: 'done:s_101' },
    foes: [{ enemy: E3.robber, n: [1, 2], w: 1 }],
    desc: 'Крейдяний кар\'єр, покинутий давно. Тепер у ньому живуть ті, кому нема куди йти.',
    links: [
      { to: A3.steppe, time: 12 * SEC },
      { to: A2.town, time: 16 * SEC },
    ],
  },
];

export const locations3: LocationDef[] = [
  {
    id: L3.steppe,
    name: 'Степ',
    area: A3.steppe,
    order: 1,
    visible: act3,
    desc: [
      { if: { flag: 'p2_trip1' }, text: 'Ковила, кургани, вітер. Тепер ви знаєте, куди веде шлях, і степ уже не здається порожнім.' },
      { text: 'Ковила, кургани, вітер. На кургані — кам\'яна баба, стара, як сам степ. Шлях іде на південь і зникає за обрієм.' },
    ],
    spots: [
      { id: 'grass', name: 'Ковила', x: 14, y: 24, icon: 'grass' },
      { id: 'mound', name: 'Курган', x: 50, y: 20, icon: 'mound' },
      { id: 'well', name: 'Криниця', x: 86, y: 24, icon: 'well' },
      { id: 'birds', name: 'Дрохви', x: 90, y: 60, icon: 'tracks' },
    ],
  },
  {
    id: L3.camp,
    name: 'Табір',
    area: A3.quarry,
    order: 1,
    visible: camp,
    desc: [
      { if: { flag: 'p2_freed_hundred' }, text: 'Табір виріс: між куренями сидять рядами ті, кого ви вивели з-під могили. Мовчать — але вже дивляться.' },
      { text: 'Курені з гілля й рядна під крейдяною стіною. Дим, діти, кашель. Говорять по-нашому, по-південному.' },
    ],
    progress: { flag: 'p2_rep_camp', max: 6, label: 'Довіра табору' },
    spots: [
      { id: 'huts', name: 'Курені', x: 14, y: 28, icon: 'tent' },
      { id: 'fire', name: 'Багаття', x: 50, y: 22, icon: 'hearth' },
      { id: 'sick', name: 'Хворі', x: 86, y: 28, icon: 'bed' },
    ],
  },
];
