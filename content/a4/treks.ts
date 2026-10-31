import type { DelveMapDef } from '../../shared/src/content.js';
import { R } from '../a1/ids.js';
import { R3 } from '../a3/ids.js';
import { D4 } from './ids.js';

/**
 * The long road south to the ford, past the Willow Gully (empty now), across the steppe (the fast road with a
 * patrol, or the gullies, slower and quiet), through a burnt farmstead (a well) and into the reeds, where the
 * hunter knows the channels. The store (light) is days of hay, bread and water, as on the road of act three.
 */
export const treks4: DelveMapDef[] = [
  {
    id: D4.south,
    name: 'На Пониззя',
    trek: true,
    start: 'stan',
    rooms: {
      stan: {
        name: 'Чумацький стан',
        pos: [0, 2],
        text: 'Явтух сам перевіряє ярма. — Шість днів, — каже. — Повз балку, степом, а там — плавні. У плавнях віз не пройде, лишите його в Згарищах.',
        exits: [{ to: 'gully', label: 'Рушати до Вербової балки', light: 1 }],
      },
      gully: {
        name: 'Вербова балка',
        pos: [1, 2],
        text: 'Табір вербувальника порожній. Ями від вогнищ, кілки коновʼязі, стовп, біля якого лежав Ярема. Вітер ганяє попіл.',
        hunter: 'Сліди колони йдуть на південь — тисячі ніг у ногу. Земля збита, як тік.',
        maker: 'У попелі — недогорілий аркуш, рівний почерк: «...варити на місці, сіль везти не треба...». Решта згоріла.',
        first: [{ clue: 'c_71' }],
        exits: [
          { to: 'road', label: 'Шляхом — швидко', light: 1, hunter: 'На шляху — роз\'їзди. Свіжі кінські сліди.' },
          { to: 'ravines', label: 'Балками — тихо', light: 2, maker: 'Довше. Але віз пройде: дно сухе.' },
        ],
      },
      road: {
        name: 'Степовий шлях',
        pos: [2, 1],
        text: 'Шлях рівний і порожній. Надто порожній: жодного воза назустріч.',
        enter: [{ if: { noFlag: 'p2_road4_fought' }, next: 'road' }],
        exits: [
          { to: 'burnt', label: 'Далі, до згарищ', light: 1 },
          { to: 'gully', label: 'Назад до балки', light: 1 },
        ],
      },
      ravines: {
        name: 'Балки',
        pos: [2, 3],
        text: 'Сухі балки з терном на схилах. Віз іде повільно, зате з шляху вас не видно.',
        hunter: 'На дні балки — кістки коня. Обгризені. Зграя ходить тут.',
        acts: [
          {
            id: 'axle',
            label: 'Поміняти вісь і перекласти вантаж',
            once: false,
            cost: { [R3.axle]: 1 },
            light: -1,
            gives: '+1 до запасу',
            log: { all: 'Нова вісь, вантаж по-новому. День виграно.' },
          },
        ],
        exits: [
          { to: 'burnt', label: 'Вибратися до згарищ', light: 1 },
          { to: 'gully', label: 'Назад до балки', light: 2 },
        ],
      },
      burnt: {
        name: 'Згарища',
        pos: [3, 2],
        text: 'Хутір без жодної стіни. Тільки печі стоять — білі, як кістки. Криниця з журавлем ціла.',
        hunter: 'На одвірку, що вцілів, — зарубки зросту дітей. Найвища — на рівні твого плеча.',
        maker: [
          'На брамі випалене тавро: коло з трьома крапками. Двір позначили як «узятий».',
          { if: { past: 'pm_brand_spoiled' }, text: 'Коло не замкнене. Волосинка тріщини. Твоя.' },
        ],
        acts: [
          {
            id: 'well',
            label: 'Набрати води, напоїти волів',
            light: -1,
            gives: '+1 до запасу',
            log: { all: 'Вода холодна. Воли п\'ють довго. Ви набираєте бочки — далі води не буде до плавнів.' },
          },
          {
            id: 'leave',
            label: 'Лишити віз у згарищах, далі пішки й човном',
            once: true,
            light: -1,
            gives: '+1 до запасу',
            log: { all: 'Віз ховаєте за піччю, волів — у балці на прив\'язі. Беріть, що несеться на плечах. Іти стає легше.' },
          },
        ],
        exits: [
          { to: 'reeds', label: 'У плавні', light: 1 },
          { to: 'road', label: 'Назад, на шлях', light: 1 },
        ],
      },
      reeds: {
        name: 'Плавні',
        pos: [4, 2],
        text: 'Очерет вищий за голову. Вода стоїть, протоки розходяться, як пальці.',
        hunter: [
          'Ти береш жердину. Ці протоки читаються, як сліди: де течія, там глибоко.',
          { if: { past: 'ph_ch1_done' }, text: 'Ти їх знаєш з дитинства. Тут Сидір учив тебе, де глибоко.' },
        ],
        maker: 'Без {partner} ти б тут кружля{в|ла} до осені.',
        exits: [
          { to: 'hide', label: 'Протокою — до Броду', light: 1, hunter: 'Тут. Повз верби, потім ліворуч.' },
          { to: 'burnt', label: 'Назад, до згарищ', light: 1 },
        ],
      },
      hide: {
        name: 'Острівець під Бродом',
        pos: [5, 2],
        text: 'На острівці серед протоки — курінь. Дим. Хтось тут живе.',
        enter: [{ next: 'arrive' }],
        exits: [{ to: 'reeds', label: 'Назад', light: 1 }],
      },
    },
  },
];

/** The road's cost on top of the store: what the cart is loaded with. */
export const trekCost4 = { [R3.hay]: 14, [R.food]: 16, [R.water]: 8 };
