// Things of the whole game: what foes can be like, perks, how heroes start.
import type { Content } from '../shared/src/content.js';

export const traits: Content['traits'] = {
  pack: { name: 'Зграя', text: 'Ходять гуртом. Коли половина впала, решта тікає.' },
  fast: { name: 'Швидкий', text: 'Б\'є раніше, ніж ти встигнеш. Від нього важко втекти.' },
  armored: { name: 'Товстошкірий', text: 'Тупий удар відскакує. Вістря й сокира беруть краще.' },
  charge: { name: 'Натиск', text: 'Розганяється й б\'є вдвічі. Хто закрився — встоїть, а довге вістря зустріне.' },
  venom: { name: 'Отруйний', text: 'Укус пече ще кілька подихів. Шкіряні халяви рятують.' },
  grab: { name: 'Хапає', text: 'Вчеплюється й не пускає. Схопленого визволяє напарник.' },
  thief: { name: 'Злодій', text: 'Хапає з торби й тікає.' },
  caller: { name: 'Кличе своїх', text: 'Гукає на поміч. Встигни збити або заглушити.' },
  night: { name: 'Нічний', text: 'Під вечір лютіший.' },
  fearFire: { name: 'Боїться вогню', text: 'Смолоскип жене його геть.' },
  fearNoise: { name: 'Боїться гуку', text: 'Різкий звук збиває з пантелику.' },
  drag: { name: 'Тягне під воду', text: 'Схопить — і тягне. Напарник визволить.' },
  leech: { name: 'Кровосос', text: 'Присмоктується. Сіль або вогонь зганяють.' },
  shield: { name: 'Щит', text: 'Закривається, і удар іде вполовину.' },
};

export const perks: Content['perks'] = [
  // Зброя: близький бій
  { id: 'first', branch: 'blade', tier: 1, name: 'Перший удар', text: 'Перший удар, що влучив у бою, сильніший на 2.' },
  { id: 'flank', branch: 'blade', tier: 1, name: 'Обхід', text: 'Обхід дає +20% влучності й +2 до удару (а не 10% і 1).' },
  { id: 'opening', branch: 'blade', tier: 2, name: 'Не проґавити', text: 'Удар по відкритому ворогу коштує на 1 очко менше.' },
  { id: 'lunge', branch: 'blade', tier: 2, active: true, name: 'Випад', text: 'Ворог за дві клітки — крок і удар, влучніший на 10%. Зброя зблизька, клітка між вами вільна. 2 очки.' },
  { id: 'swift', branch: 'blade', tier: 3, name: 'Швидкі руки', text: 'Рубонути, Оглушити й Серія коштують на 1 очко менше.' },
  { id: 'roll', branch: 'blade', tier: 3, active: true, name: 'Удар з перекатом', text: 'Перекат до ворога за 2–3 клітки й удар, а до свого ходу ти бережешся на третину. Без важкого на собі. 3 очки.' },
  { id: 'master', branch: 'blade', tier: 4, name: 'Набита рука', text: 'Зблизька влучаєш на 5% частіше й б\'єш на 1 сильніше.' },
  { id: 'desperate', branch: 'blade', tier: 4, active: true, name: 'Відчайдушний удар', text: 'Коли сил менше третини, удар зблизька удвічі сильніший і влучніший. 2 очки.' },
  { id: 'sweep', branch: 'blade', tier: 5, name: 'Широкий замах', text: 'Удар зблизька зачіпає ще одного ворога поруч із тобою — вполовину.' },
  { id: 'duel', branch: 'blade', tier: 5, name: 'Один на один', text: 'Коли поруч лише один ворог, удар зблизька сильніший на 3.' },
  { id: 'shieldbreak', branch: 'blade', tier: 6, name: 'Крізь щит', text: 'Хто закрився щитом, твій удар зблизька все одно бере повністю.' },
  { id: 'ram', branch: 'blade', tier: 6, active: true, name: 'Таран', text: 'Ворог на прямій за 2–4 клітки, шлях рівний і вільний — розгін і удар у півтора раза; часом збиває з ніг. 3 очки.' },
  { id: 'execute', branch: 'blade', tier: 7, name: 'Останній удар', text: 'Ворога, в якого лишилась п\'ята частина сил, валиш першим же влучним ударом (ватажок тримається — йому вдвічі).' },
  { id: 'tempest', branch: 'blade', tier: 7, name: 'Буря ударів', text: 'Серія — з будь-якою зброєю в руці й на 1 очко дешевша.' },
  // Око: відстань і знання звіра
  { id: 'eye', branch: 'sight', tier: 1, name: 'Пильне око', text: 'Усе про звіра видно з першої зустрічі.' },
  { id: 'quiet', branch: 'sight', tier: 1, name: 'Тихий крок', text: 'У дорозі нападають на третину рідше.' },
  { id: 'farshot', branch: 'sight', tier: 2, name: 'Далекий постріл', text: 'Стріляєш на 2 клітки далі, а укриття ворога заважає вдвічі менше.' },
  { id: 'cold', branch: 'sight', tier: 2, name: 'Холодна кров', text: 'Стріляєш, хоч ворог поруч, без поправки, і влучаєш на 5% частіше.' },
  { id: 'arrows', branch: 'sight', tier: 3, name: 'Збирач', text: 'Після перемоги половина випущеного повертається в торбу.' },
  { id: 'pinshot', branch: 'sight', tier: 3, active: true, name: 'Пришпилити', text: 'Постріл здалека (від 3 кліток) — влучений ворог своїм ходом не зійде з місця. 3 очки.' },
  { id: 'deadly', branch: 'sight', tier: 4, name: 'Смертельний приціл', text: 'Прицілений постріл сильніший у 2,5 раза (а не вдвічі).' },
  { id: 'watch', branch: 'sight', tier: 4, name: 'Насторожі', text: 'У бою ходиш одним із перших, а в першому раунді маєш ще 1 очко.' },
  { id: 'volley', branch: 'sight', tier: 5, name: 'Не сходячи з місця', text: 'Поки цього ходу не рушив з клітки, постріл коштує на 1 очко менше.' },
  { id: 'lore', branch: 'sight', tier: 5, name: 'Знає звіра', text: 'Кого ви вже здолали тричі, по тому влучаєш на 10% частіше й сильніше на 2.' },
  { id: 'pierce', branch: 'sight', tier: 6, name: 'Навиліт', text: 'Постріл бере крізь половину броні.' },
  { id: 'rain', branch: 'sight', tier: 6, active: true, name: 'Злива стріл', text: 'На весь хід — по стрілі в кожного ворога, якого видно й дістати (влучність −10%). Треба двоє ворогів і досить набоїв. 4 очки.' },
  { id: 'ambusher', branch: 'sight', tier: 7, name: 'Із засідки', text: 'Перший постріл у бою влучає напевно й удвічі сильніший.' },
  { id: 'twin', branch: 'sight', tier: 7, name: 'Дві стріли', text: 'Постріл пускає дві стріли: друга влучає на 20% рідше.' },
  // Плече: захист і напарник
  { id: 'shield', branch: 'guard', tier: 1, name: 'Щит для двох', text: 'Коли прикриваєш напарника, удар слабшає ще на третину.' },
  { id: 'tough', branch: 'guard', tier: 1, name: 'Міцний', text: 'Сил на 5 більше.' },
  { id: 'flint', branch: 'guard', tier: 2, name: 'Кремінь', text: 'Раз за бій лишаєшся на ногах там, де мав би впасти.' },
  { id: 'stance', branch: 'guard', tier: 2, name: 'Стійка', text: 'Кожне невитрачене очко ходу береже від 20% удару (а не 15%).' },
  { id: 'lift', branch: 'guard', tier: 3, name: 'Підставити плече', text: 'Підняти напарника — 1 очко, і він встає з половиною сил.' },
  { id: 'shove', branch: 'guard', tier: 3, active: true, name: 'Відштовхнути', text: 'Щитом або дубиною відкинути сусіднього ворога на клітку — він відкритий; а як позаду перешкода, ще й оглушений. 2 очки.' },
  { id: 'will', branch: 'guard', tier: 4, name: 'Залізна воля', text: 'З хватки виривається завжди, отрута тримає вдвічі коротше.' },
  { id: 'riposte', branch: 'guard', tier: 4, name: 'Відсіч', text: 'Хто зблизька не влучив по тобі, лишається відкритим.' },
  { id: 'bulwark', branch: 'guard', tier: 5, name: 'Заслін', text: 'Прикриваєш напарника й за дві клітки.' },
  { id: 'second', branch: 'guard', tier: 5, name: 'Друге дихання', text: 'Раз за бій, коли сил лишилось менше чверті, на своєму ході вертаєш третину.' },
  { id: 'taunt', branch: 'guard', tier: 6, name: 'Вийди на мене', text: 'Кого ти вдарив зблизька, той своїм ходом б\'є тільки тебе.' },
  { id: 'dash', branch: 'guard', tier: 6, active: true, name: 'Ривок до напарника', text: 'За 1 очко підбігти до напарника (до 4 кліток) і стати прикривати його. Коли ви не поруч.' },
  { id: 'rally', branch: 'guard', tier: 7, name: 'Поставити на ноги', text: 'Піднятий тобою напарник встає з усіма силами, а тобі вертається очко.' },
  { id: 'unbroken', branch: 'guard', tier: 7, name: 'Незламний', text: 'Раз за бій, падаючи, встаєш із третиною сил.' },
  // Руки: промисел, ремесло, дорога
  { id: 'hands', branch: 'craft', tier: 1, name: 'Вправні руки', text: 'Промисел часом дає на одне більше.' },
  { id: 'legs', branch: 'craft', tier: 1, name: 'Легка нога', text: 'Дорога забирає на десяту частину менше часу.' },
  { id: 'steady', branch: 'craft', tier: 2, name: 'Твердий крок', text: 'Торба на 4 більша, важке не сповільнює.' },
  { id: 'handy', branch: 'craft', tier: 2, name: 'Спритне ремесло', text: 'Робиш речі й будуєш на п\'яту частину швидше.' },
  { id: 'hardy', branch: 'craft', tier: 3, name: 'Звиклий до негоди', text: 'Холод бере на третину повільніше.' },
  { id: 'learner', branch: 'craft', tier: 3, name: 'Тямущий', text: 'Навички ростуть на чверть швидше.' },
  { id: 'double', branch: 'craft', tier: 4, name: 'Щедра земля', text: 'Промисел часом дає вдвічі.' },
  { id: 'packer', branch: 'craft', tier: 4, name: 'Добре вкладене', text: 'Торба на 6 більша, а повна торба не сповільнює дорогу.' },
  { id: 'thrifty', branch: 'craft', tier: 5, name: 'Ощадливий', text: 'Роблячи річ чи будуючи, часом вертаєш одну одиницю матеріалу.' },
  { id: 'tireless', branch: 'craft', tier: 5, name: 'Двожильний', text: 'Утома не сповільнює роботу й дорогу.' },
  { id: 'porter', branch: 'craft', tier: 6, name: 'Носильник', text: 'Важке в торбі важить на чверть менше.' },
  { id: 'forager', branch: 'craft', tier: 6, name: 'Нічого не минає', text: 'Промисел часом дає ще й щось їстівне.' },
  { id: 'artisan', branch: 'craft', tier: 7, name: 'Майстер на всі руки', text: 'Ремесло й будова — ще на третину швидше.' },
  { id: 'pathfinder', branch: 'craft', tier: 7, name: 'Знає всі стежки', text: 'Дорога ще на 15% коротша, засідки вдвічі рідші.' },
  // з доручень
  { id: 'shoulder', name: 'Плече до плеча', text: 'Поки ви обоє в бою на ногах, кожен тримає удар на 1 краще.', quest: true },
];

export const hero: Content['hero'] = {
  base: {
    hunter: { str: 2, agi: 4, end: 2, per: 4, wil: 3 },
    maker: { str: 4, agi: 2, end: 4, per: 2, wil: 3 },
  },
  branches: [
    { id: 'blade', name: 'Зброя', text: 'Близький бій: обхід, відкритий ворог, прийоми.' },
    { id: 'sight', name: 'Око', text: 'Постріл, укриття, знання звіра.' },
    { id: 'guard', name: 'Плече', text: 'Захист себе й напарника.' },
    { id: 'craft', name: 'Руки', text: 'Промисел, ремесло, дорога.' },
  ],
  tiers: [2, 4, 7, 10, 13, 16, 19],
  // a level or two above where the story leaves the heroes at the end of each act (`.design/balance.md`)
  caps: { 1: 8, 2: 11, 3: 13 },
  temperGift: {
    1: { r_01: 12, r_03: 4, r_15: 3, r_11: 2 },
    2: { r_22: 5, r_26: 2, r_18: 2, r_11: 2 },
    3: { r_22: 6, r_76: 6, r_26: 2, r_18: 2 },
  },
};

export const roleTitles: Content['roleTitles'] = {
  hunter: { m: 'Ловець', f: 'Ловчиня' },
  maker: { m: 'Майстер', f: 'Майстриня' },
};

/** Trades residents grow in by working, the last step taught by a hero (see `.design/residents2.md`). */
export const trades: Content['trades'] = [
  { id: 'wood', name: 'Дерево й лоза', teach: ['maker'], jobs: ['x_02', 'x_62', 'x_152'] },
  { id: 'earth', name: 'Камінь, глина й руда', teach: ['maker'], jobs: ['x_07', 'x_59', 'x_60', 'x_90', 'x_91', 'x_228'] },
  { id: 'salt', name: 'Вода, ропа й сіль', teach: ['maker', 'hunter'], jobs: ['x_15', 'x_33', 'x_34'] },
  { id: 'catch', name: 'Лови', teach: ['hunter'], jobs: ['x_03', 'x_74', 'x_123', 'x_124'] },
  { id: 'herbs', name: 'Очерет, трави й ягоди', teach: ['hunter'], jobs: ['x_06', 'x_92', 'x_114', 'x_229'] },
  { id: 'garden', name: 'Город', teach: ['maker', 'hunter'], jobs: ['x_204'] },
];
