import type { AreaDef, LocationDef } from '../../shared/src/content.js';
import { A2, E2 } from '../a2/ids.js';
import { A3, L3, S3 } from './ids.js';

const SEC = 1000;
const act3 = { flag: 'p2_act3' };

export const areas3: AreaDef[] = [
  {
    id: A3.camp,
    name: 'Табір у кар\'єрі',
    where: 'у таборі',
    scene: 'quarry',
    pos: [8, 4],
    ambush: 0.05,
    scout: S3.quarry,
    visible: act3,
    foes: [{ enemy: E2.snatcher, n: [1, 2], w: 1, if: { flag: 'p2_bounty' } }],
    desc: [
      { if: { flag: 'done:s_101' }, text: 'Старий піщаний кар\'єр під Солоницею. Курені з рядна, вогнища, діти. Тут живуть ті, кого Пониззя вигнало на північ.' },
      { text: 'Під Солоницею, у старому кар\'єрі, — дими. Багато димів.' },
    ],
    links: [
      { to: A2.town, time: 8 * SEC },
      { to: A2.road, time: 10 * SEC },
    ],
  },
];

export const locations3: LocationDef[] = [
  {
    id: L3.camp,
    name: 'Табір',
    area: A3.camp,
    order: 1,
    visible: { flag: 'done:s_101' },
    progress: { flag: 'p2_rep_camp', max: 6, label: 'Довіра табору' },
    desc: [
      { if: { flag: 'p2_rep_camp', gte: 4 }, text: 'Біля вогнищ вам уже посуваються. Діти показують на вас пальцями — і не ховаються.' },
      { text: 'Курені з рядна й гілля, вогнища в ямах, щоб не видно було з дороги. На вас дивляться — і чекають, що ви візьмете.' },
    ],
    spots: [
      { id: 'fire', name: 'Вогнище табору', x: 54, y: 16, icon: 'hearth' },
      { id: 'tents', name: 'Курені', x: 86, y: 34, icon: 'tents' },
      { id: 'pit', name: 'Кар\'єр', x: 14, y: 34, icon: 'clay' },
      { id: 'steppe', name: 'Степ над кар\'єром', x: 88, y: 76, icon: 'grass' },
    ],
  },
];
