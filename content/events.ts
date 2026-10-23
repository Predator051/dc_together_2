import type { Cond, EventSetDef } from '../shared/src/content.js';
import { A, E, H, R } from './a1/ids.js';
import { A2, E2, H2, R2 } from './a2/ids.js';

const MIN = 60_000;
const HOUR = 60 * MIN;
const act2: Cond = { flag: 'p2_act2' };
const dog: Cond = { flag: 'p2_dog_back' };
// places and things of the errands (their own ids live with them)
const ISLE = 'a_13';
const SPIT = 'a_14';
const FEATHER = 'r_40';
const OSIER = 'r_41';
const sky = (...ids: string[]): Cond => ({ any: ids.map((weather) => ({ weather })) });

// Small happenings between the story's beats. Each one is small: a find, a trade-off, a scratch,
// sometimes a fight; never a loss that takes more than a few minutes of work to make good.
// Home ones are told plainly (both read them); away ones speak to the one who is there.
export const events: EventSetDef = {
  from: { flag: 'p2_hut' },
  gap: [15 * MIN, 25 * MIN],
  road: 0.4,
  place: 0.15,
  kinds: [
    // ----- at home -----
    {
      id: 'ev_01',
      where: 'home',
      when: dog,
      weight: 3,
      text: 'Сірко раптом стає дибки й гавкає на очерет за хатою — низько, з хрипом.',
      choices: [
        {
          label: 'Піти глянути',
          outcomes: [
            { w: 3, log: 'В очереті — гніздо лиски, і пес його вистежив. Яйця — до казанка. (Харчі +2)', effects: [{ add: { [R.food]: 2 } }] },
            { w: 2, log: 'Там тільки слід — широкий, кабанячий. Хтось ходить коло хати поночі; тепер ви знаєте кого. (Досвід +2)', effects: [{ xp: 2, who: 'actor' }] },
          ],
        },
        { label: 'Цитьнути на пса', outcomes: [{ log: 'Сірко замовкає, але ще довго не зводить очей з очерету.' }] },
      ],
    },
    {
      id: 'ev_02',
      where: 'home',
      weight: 2,
      again: 3 * HOUR,
      text: 'Уночі в коморі шарудить і попискує: пацюки добралися до харчів.',
      choices: [
        { label: 'Засісти з кийком', outcomes: [{ log: 'Засідка в коморі: темрява, мішки, шурхіт — і ось вони.', effects: [{ fight: [{ enemy: E.rat, n: 2 }] }] }] },
        { label: 'Підвісити мішки під стелю', cost: { [R.rope]: 1 }, outcomes: [{ log: 'Мішки з харчами тепер висять під стелею на мотузці. Пацюки пішли шукати поживи деінде.' }] },
        { label: 'Хай їм', outcomes: [{ log: 'Зранку в коморі прогризений мішок. (Харчі −2)', effects: [{ take: { [R.food]: 2 } }] }] },
      ],
    },
    {
      id: 'ev_03',
      where: 'home',
      when: sky('w_rain', 'w_storm'),
      weight: 4,
      text: 'Дощ знайшов шпарину в очеретяному даху: капає просто на лежанки.',
      choices: [
        { label: 'Підлатати дах', cost: { [R.reed]: 3 }, outcomes: [{ log: 'Нові снопи очерету лягли щільно. У хаті знову сухо.' }] },
        { label: 'Підставити казанок', outcomes: [{ log: 'Казанок дзенькає до ранку. Шкури біля лежанок відсиріли, одну довелося викинути. (Шкури −1)', effects: [{ take: { [R.hide]: 1 } }] }] },
      ],
    },
    {
      id: 'ev_04',
      where: 'home',
      weight: 2,
      again: 3 * HOUR,
      text: 'До Варниці прибивається чоловік із порожньою торбою — біженець, іде на північ. Просить води й чогось поїсти.',
      choices: [
        {
          label: 'Нагодувати',
          cost: { [R.food]: 2 },
          outcomes: [{ log: 'Він їсть мовчки, а на прощання лишає моток мотузки: «Мені вже нема чого в\'язати». (Мотузка +2)', effects: [{ add: { [R.rope]: 2 } }] }],
        },
        { label: 'Дати води', cost: { [R.water]: 1 }, outcomes: [{ log: 'Він п\'є довго, дякує і йде далі — на північ, не озираючись.' }] },
        { label: 'Не пускати', outcomes: [{ log: 'Він киває, ніби іншого й не чекав, і йде. Слід на піску тягнеться на північ.' }] },
      ],
    },
    {
      id: 'ev_05',
      where: 'home',
      when: { weather: 'w_storm' },
      weight: 5,
      again: 6 * HOUR,
      tone: 'good',
      text: 'Блискавка влучила в стару вербу біля хати. Дерево тріснуло навпіл — дров тепер надовго. (Плавник +4)',
      effects: [{ add: { [R.wood]: 4 } }],
    },
    {
      id: 'ev_06',
      where: 'home',
      when: { weather: 'w_frost' },
      weight: 3,
      text: 'Приморозок прихопив воду в діжці — зверху товстий лід.',
      choices: [
        { label: 'Розтопити біля печі', cost: { [R.wood]: 1 }, outcomes: [{ log: 'Лід тріщить у казанку, і вода знову є, ще й чистіша, ніж була. (Вода +2)', effects: [{ add: { [R.water]: 2 } }] }] },
        { label: 'Хай стоїть до сонця', outcomes: [{ log: 'Діжку лишили як є. До обіду лід зійде сам.' }] },
      ],
    },
    {
      id: 'ev_07',
      where: 'home',
      when: { resident: H.ulyana },
      weight: 3,
      tone: 'good',
      text: [
        { if: act2, text: 'Уляна не спала всю ніч: до ранку перебрала й перев\'язала очерет у коморі. Снопи рівні, як під шнур. (Очерет +3)' },
        { text: 'Жінка з ям не спала всю ніч: до ранку перебрала й перев\'язала очерет у коморі. Снопи рівні, як під шнур. (Очерет +3)' },
      ],
      effects: [{ add: { [R.reed]: 3 } }],
    },
    {
      id: 'ev_08',
      where: 'home',
      when: dog,
      weight: 2,
      tone: 'good',
      text: 'Сірко гордо приносить до порога задушену ондатру й кладе її на поріг. Похвалити — і на шкуру. (Шкури +1)',
      effects: [{ add: { [R.hide]: 1 } }],
    },
    {
      id: 'ev_09',
      where: 'home',
      when: { all: [{ resident: H2.ostap }, { resident: H2.yavdokha }] },
      weight: 3,
      tone: 'good',
      text: 'Увечері Остап заводить пісню біля печі, і Явдоха тихо підхоплює — без слів. Втома відходить. (Здоров\'я +5)',
      effects: [{ heal: 5, who: 'both' }],
    },
    {
      id: 'ev_10',
      where: 'home',
      when: { resident: H2.marta },
      weight: 3,
      tone: 'good',
      text: 'Марта повертається з річки з повним кошиком: «Риба сама йшла в руки». (Харчі +3)',
      effects: [{ add: { [R.food]: 3 } }],
    },
    {
      id: 'ev_12',
      where: 'home',
      when: { all: [{ flag: 'built:x_201' }, { not: { seen: 'r_51' } }] },
      weight: 6,
      text: 'Повз Варницю йде жінка з клунком за плечима. Побачила грядки — зупинилася: «Насіння буряка маю. Поміняю на харчі».',
      choices: [
        {
          label: 'Поміняти',
          cost: { [R.food]: 2 },
          outcomes: [{ log: 'Жінка відсипає в долоню жменю бурякового насіння, загорнутого в ганчірку: «Садіть рідко — буряк любить простір». (Насіння буряка +3)', effects: [{ add: { r_51: 3 } }] }],
        },
        { label: 'Не треба', outcomes: [{ log: 'Жінка киває й іде далі, на північ.' }] },
      ],
    },
    {
      id: 'ev_11',
      where: 'home',
      when: { resident: H2.hordiy },
      weight: 2,
      tone: 'good',
      text: 'Гордій уночі сам розпалив горно й перекував старий іржавий лом. Зранку на ковадлі — чисті бруски заліза. (Залізо +2)',
      effects: [{ add: { [R.iron]: 2 } }],
    },

    // ----- away: act one -----
    {
      id: 'ev_21',
      where: 'place',
      areas: [A.shore],
      weight: 3,
      tone: 'good',
      text: 'Хвиля вимила з мулу цілий стовбур — легкий, сухий, ніби чекав саме на тебе. (Плавник +3)',
      effects: [{ give: { [R.wood]: 3 } }],
    },
    {
      id: 'ev_22',
      where: 'place',
      areas: [A.reeds],
      weight: 2,
      text: 'У гущавині очерету — гніздо, а над ним кружляє розлючений лунь.',
      choices: [
        {
          label: 'Взяти яйця',
          outcomes: [
            { log: 'Лунь пікірує, але ти вже з яйцями в шапці. (Харчі +2)', effects: [{ give: { [R.food]: 2 } }] },
            { log: 'Лунь б\'є кігтями в потилицю — гаряче й боляче. Вціліло одне яйце. (Здоров\'я −3, Харчі +1)', effects: [{ heal: -3, who: 'actor' }, { give: { [R.food]: 1 } }] },
          ],
        },
        { label: 'Обійти', outcomes: [{ log: 'Ти обходиш гніздо стороною. Лунь ще довго кричить услід.' }] },
      ],
    },
    {
      id: 'ev_23',
      where: 'road',
      areas: [A.flat],
      when: sky('w_warm', 'w_wind'),
      weight: 3,
      tone: 'good',
      text: 'Сонце й вітер виварили на краю калюжі тонку білу кірку. Збираєш її в жменю. (Сіль-сирець +2)',
      effects: [{ give: { [R.saltraw]: 2 } }],
    },
    {
      id: 'ev_24',
      where: 'place',
      areas: [A.well],
      when: sky('w_rain', 'w_storm'),
      weight: 3,
      tone: 'good',
      text: 'Після дощу ропа в колодязі піднялася — черпати легко. (Ропа +2)',
      effects: [{ give: { [R.brine]: 2 } }],
    },
    {
      id: 'ev_25',
      where: 'place',
      areas: [A.grove],
      weight: 2,
      tone: 'good',
      text: 'На затопленій колоді — мох, зверху сухий і густий, як подушка. (Мох +3)',
      effects: [{ give: { [R.moss]: 3 } }],
    },
    {
      id: 'ev_26',
      where: 'place',
      areas: [A.dyke],
      weight: 2,
      once: true,
      tone: 'good',
      text: 'Між каменями греблі застрягло старе сокирне лезо, руде від іржі. Згодиться на переплавку. (Залізо +1)',
      effects: [{ give: { [R.iron]: 1 } }],
    },
    {
      id: 'ev_27',
      where: 'road',
      when: { weather: 'w_fog' },
      weight: 3,
      text: 'Туман такий густий, що стежка зникає за два кроки. Десь поруч хлюпає вода.',
      choices: [
        {
          label: 'Йти навпростець',
          outcomes: [
            { log: 'Виходиш навіть швидше, ніж думав{|ла}, — і дорогою помічаєш те, що вдень проминув{|ла} б. (Досвід +3)', effects: [{ xp: 3, who: 'actor' }] },
            { log: 'Нога провалюється в баюру по коліно. Холодно, мокро — але вибираєшся. (Здоров\'я −2)', effects: [{ heal: -2, who: 'actor' }] },
          ],
        },
        { label: 'Перечекати', outcomes: [{ log: 'Сідаєш на купину й чекаєш, доки туман порідшає. Тиша така, що чути, як шелестить очерет.' }] },
      ],
    },
    {
      id: 'ev_28',
      where: 'road',
      areas: [A.grove, A.dyke],
      weight: 2,
      text: 'На стежці — свіжі кабанячі сліди й зрита земля. Звір пройшов щойно.',
      choices: [
        { label: 'Піти по сліду', outcomes: [{ log: 'Слід веде в чагарник — і звідти, хрокаючи, вилітає кабан!', effects: [{ fight: [{ enemy: E.boar }] }] }] },
        { label: 'Обминути', outcomes: [{ log: 'Ти звертаєш убік і робиш гак. Хай іде собі своєю дорогою.' }] },
      ],
    },

    // ----- away: act two -----
    {
      id: 'ev_41',
      where: 'road',
      areas: [A2.road],
      when: act2,
      weight: 3,
      text: 'Назустріч рипить чумацька валка. Старший гукає: «Солі не продаси? Дам чесно, більше, ніж у Солониці!»',
      choices: [
        {
          label: 'Продати три мірки солі',
          cost: { [R.salt]: 3 },
          outcomes: [{ log: 'Чумак зважує сіль на долоні, хитає головою — добра — і відлічує шаги. (Шаги +5)', effects: [{ give: { [R2.coin]: 5 } }] }],
        },
        { label: 'Розпитати про шлях', outcomes: [{ log: 'Чумаки охоче розповідають, де броди, де вовки, а де шинок із добрим пивом. (Досвід +2)', effects: [{ xp: 2, who: 'actor' }] }] },
        { label: 'Привітатися й іти далі', outcomes: [{ log: 'Чумаки гукають услід: «Щасти, {земляче|землячко}!» — і валка рипить далі.' }] },
      ],
    },
    {
      id: 'ev_42',
      where: 'place',
      areas: [A2.town],
      when: act2,
      weight: 2,
      text: 'Біля управи хлопчак тягне за рукав: «Купіть пиріжка! З горохом, ще теплий!»',
      choices: [
        { label: 'Купити', cost: { [R2.coin]: 1 }, outcomes: [{ log: 'Пиріжок справді теплий і пахне домом. З\'їдаєш його на ходу.', effects: [{ eat: R.food, who: 'actor' }] }] },
        { label: 'Не треба', outcomes: [{ log: 'Хлопчак зітхає й біжить до наступного перехожого.' }] },
      ],
    },
    {
      id: 'ev_43',
      where: 'place',
      areas: [A2.bog],
      when: act2,
      weight: 2,
      tone: 'good',
      text: 'Бура вода вимила на берег грудку криці: колись тут уже плавили руду. (Криця +1)',
      effects: [{ give: { [R2.bloom]: 1 } }],
    },
    {
      id: 'ev_44',
      where: 'place',
      areas: [ISLE],
      when: act2,
      weight: 2,
      tone: 'good',
      text: 'Чаплі линяють: біля гнізд пір\'я — бери скільки хочеш. (Чаплине пір\'я +2)',
      effects: [{ give: { [FEATHER]: 2 } }],
    },
    {
      id: 'ev_45',
      where: 'place',
      areas: [SPIT],
      when: act2,
      weight: 2,
      tone: 'good',
      text: 'Лоза тут росте так густо й рівно, ніби хтось її колись садив. (Лоза +3)',
      effects: [{ give: { [OSIER]: 3 } }],
    },
    {
      id: 'ev_46',
      where: 'road',
      areas: [A2.road, A2.bog],
      when: { all: [act2, { evening: true }] },
      weight: 3,
      text: 'З-за пагорба тягнеться вовче виття. Йому відповідає друге — ближче.',
      choices: [
        { label: 'Стати й чекати зі зброєю', outcomes: [{ log: 'З-за кущів виходить вовк — сам, худий і злий.', effects: [{ fight: [{ enemy: E2.wolf }] }] }] },
        { label: 'Поспішити далі', outcomes: [{ log: 'Ти прискорюєш крок. Виття довго тягнеться слідом, але ніхто не наздоганяє.' }] },
      ],
    },
  ],
};
