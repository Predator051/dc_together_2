import type { DelveMapDef } from '../../shared/src/content.js';
import { R } from '../a1/ids.js';
import { D3, R3 } from './ids.js';

/**
 * The road south to the Willow Gully, walked with a loaded cart: the store (light) is days of hay, bread and
 * water; ways cost it, a spare axle gives a day back, a well too. Fights wait at the ford and the mound the
 * first time; the bridge over the gully is mended by the maker or gone round below.
 */
export const treks3: DelveMapDef[] = [
  {
    id: D3.south,
    name: 'Шлях на південь',
    trek: true,
    start: 'stan',
    rooms: {
      stan: {
        name: 'Чумацький стан',
        pos: [0, 2],
        text: 'Віз навантажено, воли в ярмі. Явтух проводжає до броду й махає люлькою: — Цоб, Цабе! Тримайтеся колії.',
        exits: [{ to: 'ford', label: 'Рушати на південь, до броду', light: 1 }],
      },
      ford: {
        name: 'Вовчий брід',
        pos: [1, 2],
        text: 'Річечка розлилася вширш, дно кам\'янисте. На тому березі колія роздвоюється.',
        hunter: 'У мулі біля води — свіжі підкови, низькі, степові. Вершники. Двоє, може, троє.',
        maker: 'Ліва колія йде вгору, на могилу, — коротше, але колеса там різали землю глибоко. Права — в обхід, через хутір.',
        enter: [{ if: { noFlag: 'p2_ford_fought' }, next: 'ford' }],
        exits: [
          {
            to: 'mound',
            label: 'Навпростець, повз могилу',
            light: 1,
            risk: { p: 0.35, light: 1, log: { all: 'На підйомі тріщить вісь. Поки міняли — минув день.' } },
            maker: 'Колія глибока, кам\'яниста. Вісь може не витримати.',
            hunter: 'Зверху далеко видно. І тебе — теж.',
          },
          { to: 'khutir', label: 'В обхід, через хутір', light: 2, hunter: 'Там пахне старим згарищем. І — водою.', draft: true },
          { to: 'stan', label: 'Назад до стану', light: 1 },
        ],
      },
      mound: {
        name: 'Могила',
        pos: [2, 1],
        text: 'Висока степова могила, на верхівці — кам\'яна баба з руками на череві, обличчям на схід. Довкола — тільки ковила й вітер.',
        hunter: 'На півдні, над обрієм, — пил. Не хмара: багато ніг і копит. Іде повільно.',
        maker: 'Хтось поклав бабі до ніг пучок полину й дрібну монету. Давно — монета позеленіла.',
        enter: [{ if: { noFlag: 'p2_mound_fought' }, next: 'mound' }],
        acts: [
          {
            id: 'axle',
            label: 'Поміняти вісь і перекласти вантаж',
            once: false,
            cost: { [R3.axle]: 1 },
            light: -1,
            gives: '+1 до запасу',
            log: { all: 'Нова вісь сідає в маточину рівно. Вантаж — по-іншому, щоб волам легше. День виграно.' },
          },
        ],
        exits: [
          { to: 'gully', label: 'Униз, до балки', light: 1 },
          { to: 'ford', label: 'Назад до броду', light: 1 },
        ],
      },
      khutir: {
        name: 'Згорілий хутір',
        pos: [2, 3],
        text: 'Три обгорілі хати, тин, повалений на дорогу. Криниця з журавлем ціла. На воротах — нічого, навіть знаку.',
        hunter: 'Від криниці на південь — босі сліди. Гуськом, слід у слід, як тоді на солончаку. Свіжі.',
        maker: 'Попіл давній, торішній. Але хтось нещодавно витягав відро: мотузка мокра.',
        acts: [
          {
            id: 'well',
            label: 'Набрати води, напоїти волів',
            light: -1,
            gives: '+1 до запасу',
            log: { all: 'Вода холодна, з присмаком заліза. Воли п\'ють довго, повільно. Бочки знову повні.' },
          },
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
          { to: 'gully', label: 'Далі, до балки', light: 1 },
          { to: 'ford', label: 'Назад до броду', light: 2 },
        ],
      },
      gully: {
        name: 'Балка з містком',
        pos: [3, 2],
        text: 'Глибока балка з вербами на дні. Через неї — місток із колод, половина колод провалилася.',
        hunter: 'Знизу, по дну, можна пройти. Довго, і воли загрузнуть у мулі.',
        maker: 'Колоди цілі, перекинуті. Мотузками й запасною віссю замість поперечки — віз пройде.',
        acts: [
          {
            id: 'bridge',
            label: 'Полагодити місток',
            role: 'maker',
            cost: { [R.rope]: 2, [R3.axle]: 1 },
            effects: [{ set: 'p2_bridge' }],
            gives: 'Дорога через балку',
            log: { all: 'Колоди назад, мотузки внатяг, вісь — поперек замість зламаної балки. Місток стогне, але тримає.' },
          },
        ],
        exits: [
          { to: 'edge', label: 'Через місток', light: 1, enabled: { flag: 'p2_bridge' }, disabledHint: 'Місток провалений. Полагодити — або в обхід.' },
          { to: 'detour', label: 'В обхід, по дну балки', light: 2, hunter: 'Довго. Але пройдемо.' },
          { to: 'mound', label: 'Назад, на могилу', light: 1 },
        ],
      },
      detour: {
        name: 'Дно балки',
        pos: [4, 3],
        text: 'Верби, мул по маточини, комарі. Воли тягнуть, ви штовхаєте віз плечима.',
        exits: [
          { to: 'edge', label: 'Вибратися нагору', light: 1 },
          { to: 'gully', label: 'Назад до містка', light: 1 },
        ],
      },
      edge: {
        name: 'Край Вербової балки',
        pos: [5, 2],
        text: 'Далі балка розширюється, і внизу — вогні. Багато вогнів.',
        enter: [{ next: 'arrive' }],
        exits: [{ to: 'gully', label: 'Назад', light: 1, visible: { flag: 'p2_bridge' } }],
      },
    },
  },
];
