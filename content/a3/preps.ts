import type { ActionDef, FxKind, PrepDef } from '../../shared/src/content.js';
import { L, R } from '../a1/ids.js';
import { L2, R2 } from '../a2/ids.js';
import { S3 } from './ids.js';

const SEC = 1000;

/**
 * What one hero can do alone before the together scenes of act three (`.design/personal.md` §1). Each makes
 * the scene go better, none is needed: the camp (an option more, trust), the caravan (easier fights at the ford
 * and the mound, a day more of store), the silent hundred (a quieter start, a captain without his rider,
 * standing hidden among the silent).
 */
export const preps3: PrepDef[] = [
  // ------------------------------------------------------------------ the quarry
  {
    id: 'prep_quarry_look',
    scene: S3.quarry,
    role: 'hunter',
    text: 'Подивитися на кар\'єр згори, зі степу, — перш ніж іти до людей.',
    gives: 'ви знатимете, чого табору бракує найбільше.',
  },
  {
    id: 'prep_quarry_ask',
    scene: S3.quarry,
    role: 'maker',
    text: 'Розпитати в солоницькій корчмі, хто живе в кар\'єрі й хто там старший.',
    gives: 'у таборі про вас уже чули — і не найгірше.',
  },
  // ------------------------------------------------------------------ the caravan
  {
    id: 'prep_ford',
    scene: S3.caravan,
    role: 'hunter',
    text: 'Сходити шляхом на південь до броду й подивитися, хто там стереже.',
    gives: 'біля броду вас не застануть зненацька.',
  },
  {
    id: 'prep_cart',
    scene: S3.caravan,
    role: 'maker',
    text: 'Перебрати віз перед дорогою: маточини, дьоготь, запасні чеки.',
    gives: 'віз піде легше — запасу на дорогу більше.',
  },
  {
    id: 'prep_wolves',
    scene: S3.caravan,
    text: 'Посидіти з погоничами біля казана й розпитати про дорогу на південь.',
    gives: 'ви знаєте, де на шляху лихі місця для волів.',
  },
  // ------------------------------------------------------------------ the silent hundred
  {
    id: 'prep_grease',
    scene: S3.rescue,
    role: 'maker',
    text: 'Змастити Явтухові вози, щоб ніч не чула коліс.',
    gives: 'вози підійдуть тихо.',
  },
  {
    id: 'prep_whistle',
    scene: S3.rescue,
    role: 'hunter',
    text: 'Підстерегти на шляху гінця, що їздить між балкою і Солоницею.',
    gives: 'того, хто мав би стояти біля сотника, тієї ночі там не буде.',
  },
  {
    id: 'prep_shirts',
    scene: S3.rescue,
    text: 'Пошити сірі сорочки, такі, як на тихих.',
    gives: 'серед тихих вас не відрізнити.',
  },
];

/** The works that do them (`prep`: shown only while the scene can still come and the step is not done). */
export const prepActions3: ActionDef[] = [
  {
    id: 'x_241',
    icon: 'spot:footprints',
    group: L2.camp,
    spot: 'verge',
    role: 'hunter',
    prep: 'prep_quarry_look',
    label: 'Подивитися на кар\'єр зі степу',
    effects: [{ set: 'prep_quarry_look' }],
    cooldown: 30 * SEC,
    busy: 'лежить у ковилі над кар\'єром',
    log: {
      self: 'Ти лежиш у ковилі над краєм кар\'єру до полудня. Унизу — курені, діти, дими з ям. І жінки з відрами — ходять по воду аж до балки, туди й назад, раз по раз. Своєї криниці в них нема: пересохла.',
      other: '{name} ходить дивитися на кар\'єр зі степу.',
    },
  },
  {
    id: 'x_242',
    icon: 'coin',
    group: L2.tavern,
    role: 'maker',
    prep: 'prep_quarry_ask',
    label: 'Розпитати в корчмі про табір у кар\'єрі',
    cost: { [R2.coin]: 2 },
    effects: [{ set: 'prep_quarry_ask' }],
    cooldown: 20 * SEC,
    busy: 'розпитує в корчмі',
    log: {
      self: 'Два кухлі для погоничів — і язики розв\'язуються. «У кар\'єрі? Пониззяни. Старша в них — Параска, баба з ціпком, тверда, як кремінь. Харчів не просять, людей не віддають». Ти кажеш, хто ти й звідки. Погонич киває: «Перекажу. Я туди сіно вожу».',
      other: '{name} розпитує в корчмі про табір.',
    },
  },
  {
    id: 'x_243',
    icon: 'spot:tracks',
    group: L2.camp,
    spot: 'ford',
    role: 'hunter',
    prep: 'prep_ford',
    label: 'Сходити до броду на південь',
    effects: [{ set: 'prep_ford' }],
    cooldown: 45 * SEC,
    ambush: 0.25,
    busy: 'ходить шляхом на південь',
    log: {
      self: 'До броду — півдня ходу. Ти дивишся на нього з верболозу на цьому березі. Двоє вершників напувають коней, третій сидить у кущах із свистком — звідти видно весь брід. Ти запам\'ятовуєш кущ.',
      other: '{name} ходить на південь, до броду.',
    },
  },
  {
    id: 'x_244',
    icon: 'axle',
    group: L.bench,
    role: 'maker',
    prep: 'prep_cart',
    label: 'Перебрати віз перед дорогою',
    cost: { [R.resin]: 2, [R.rope]: 2 },
    effects: [{ set: 'prep_cart' }],
    cooldown: 25 * SEC,
    kind: 'build',
    busy: 'перебирає віз',
    log: {
      self: 'Маточини — на дьоготь, чеки — нові, ярмо — підтягнути. Віз тепер котиться сам, ледь торкнеш.',
      other: '{name} перебирає віз перед дорогою.',
    },
  },
  {
    id: 'x_245',
    icon: 'food',
    group: L2.camp,
    spot: 'carts',
    prep: 'prep_wolves',
    label: 'Розпитати погоничів про дорогу на південь',
    cost: { [R.food]: 2 },
    effects: [{ set: 'prep_wolves' }],
    cooldown: 15 * SEC,
    busy: 'сидить із погоничами',
    log: {
      self: 'Погоничі їдять твій хліб і розказують. «Біля могили вовки беруть волів — ото як стануть та заревуть, так і знай. Паліть вогонь, поки сонце, — і вовк обійде». Старий погонич малює на землі могилу й балку.',
      other: '{name} розпитує погоничів про дорогу.',
    },
  },
  {
    id: 'x_246',
    icon: 'resin',
    group: L2.camp,
    spot: 'carts',
    role: 'maker',
    prep: 'prep_grease',
    label: 'Змастити Явтухові вози',
    cost: { [R.resin]: 3 },
    effects: [{ set: 'prep_grease' }],
    cooldown: 25 * SEC,
    busy: 'змащує вози',
    log: {
      self: 'Дьоготь у маточини, повсть під ярма, ганчір\'я на ланцюги. Ти котиш віз — і чуєш тільки, як шурхотить під колесом пісок.',
      other: '{name} змащує Явтухові вози.',
    },
  },
  {
    id: 'x_247',
    icon: 'whistle',
    group: L2.camp,
    spot: 'ford',
    role: 'hunter',
    prep: 'prep_whistle',
    label: 'Підстерегти гінця з балки',
    effects: [{ set: 'prep_whistle' }],
    cooldown: 50 * SEC,
    ambush: 0.3,
    busy: 'чатує на шляху',
    log: {
      self: 'Гонець ночує біля броду, кінь стриножений. Ти пускаєш коня в степ і ведеш його слід навмання, далеко на схід. Уранці гонець піде шукати — пішки, з сідлом на плечі. І той, хто стоїть біля сотника, поскаче шукати його.',
      other: '{name} чатує на шляху біля броду.',
    },
  },
  {
    id: 'x_248',
    icon: 'cloth',
    group: L.bench,
    prep: 'prep_shirts',
    label: 'Пошити сірі сорочки',
    cost: { [R2.cloth]: 4, [R.rope]: 1 },
    effects: [{ set: 'prep_shirts' }],
    cooldown: 25 * SEC,
    kind: 'craft',
    busy: 'шиє сорочки',
    log: {
      self: 'Грубе полотно, без вишивки, без коміра, пояс — мотузкою. Ти приміряєш — і на мить тобі стає холодно: так одягають тих, кого не питають.',
      other: '{name} шиє сірі сорочки.',
    },
  },
];

export const prepFx3: Record<string, FxKind> = {
  x_241: 'care',
  x_242: 'trade',
  x_243: 'care',
  x_244: 'build',
  x_245: 'care',
  x_246: 'build',
  x_247: 'care',
  x_248: 'build',
};
