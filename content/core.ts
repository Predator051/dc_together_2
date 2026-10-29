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
  { id: 'finish', branch: 'blade', tier: 2, name: 'Добити', text: 'По ворогу, в якого лишилось менше половини сил, б\'єш на 2 сильніше.' },
  { id: 'swift', branch: 'blade', tier: 3, name: 'Швидкі руки', text: 'Рубонути, Оглушити й Серія коштують на 1 очко менше.' },
  { id: 'momentum', branch: 'blade', tier: 3, name: 'Розгін', text: 'Звалив ворога своїм ударом — маєш ще 1 очко (раз за хід).' },
  { id: 'master', branch: 'blade', tier: 4, name: 'Набита рука', text: 'Зблизька влучаєш на 5% частіше й б\'єш на 1 сильніше.' },
  { id: 'fury', branch: 'blade', tier: 4, name: 'Злість', text: 'Коли сил менше половини, удар зблизька сильніший на 3.' },
  // Око: відстань і знання звіра
  { id: 'eye', branch: 'sight', tier: 1, name: 'Пильне око', text: 'Усе про звіра видно з першої зустрічі.' },
  { id: 'quiet', branch: 'sight', tier: 1, name: 'Тихий крок', text: 'У дорозі нападають на третину рідше.' },
  { id: 'farshot', branch: 'sight', tier: 2, name: 'Далекий постріл', text: 'Стріляєш на 2 клітки далі, а укриття ворога заважає вдвічі менше.' },
  { id: 'cold', branch: 'sight', tier: 2, name: 'Холодна кров', text: 'Стріляєш, хоч ворог поруч, без поправки, і влучаєш на 5% частіше.' },
  { id: 'arrows', branch: 'sight', tier: 3, name: 'Збирач', text: 'Після перемоги половина випущеного повертається в торбу.' },
  { id: 'quick', branch: 'sight', tier: 3, name: 'Швидкий постріл', text: 'У першому раунді постріл коштує 1 очко.' },
  { id: 'deadly', branch: 'sight', tier: 4, name: 'Смертельний приціл', text: 'Прицілений постріл сильніший у 2,5 раза (а не вдвічі).' },
  { id: 'watch', branch: 'sight', tier: 4, name: 'Насторожі', text: 'У бою ходиш одним із перших, а в першому раунді маєш ще 1 очко.' },
  // Плече: захист і напарник
  { id: 'shield', branch: 'guard', tier: 1, name: 'Щит для двох', text: 'Коли прикриваєш напарника, удар слабшає ще на третину.' },
  { id: 'tough', branch: 'guard', tier: 1, name: 'Міцний', text: 'Сил на 5 більше.' },
  { id: 'flint', branch: 'guard', tier: 2, name: 'Кремінь', text: 'Раз за бій лишаєшся на ногах там, де мав би впасти.' },
  { id: 'stance', branch: 'guard', tier: 2, name: 'Стійка', text: 'Кожне невитрачене очко ходу береже від 20% удару (а не 15%).' },
  { id: 'lift', branch: 'guard', tier: 3, name: 'Підставити плече', text: 'Підняти напарника — 1 очко, і він встає з половиною сил.' },
  { id: 'bark', branch: 'guard', tier: 3, name: 'Шкіра як кора', text: 'Броня на 1 більша.' },
  { id: 'will', branch: 'guard', tier: 4, name: 'Залізна воля', text: 'З хватки виривається завжди, отрута тримає вдвічі коротше.' },
  { id: 'riposte', branch: 'guard', tier: 4, name: 'Відсіч', text: 'Хто зблизька не влучив по тобі, лишається відкритим.' },
  // Руки: промисел, ремесло, дорога
  { id: 'hands', branch: 'craft', tier: 1, name: 'Вправні руки', text: 'Промисел часом дає на одне більше.' },
  { id: 'legs', branch: 'craft', tier: 1, name: 'Легка нога', text: 'Дорога забирає на десяту частину менше часу.' },
  { id: 'steady', branch: 'craft', tier: 2, name: 'Твердий крок', text: 'Торба на 4 більша, важке не сповільнює.' },
  { id: 'handy', branch: 'craft', tier: 2, name: 'Спритне ремесло', text: 'Робиш речі й будуєш на п\'яту частину швидше.' },
  { id: 'hardy', branch: 'craft', tier: 3, name: 'Звиклий до негоди', text: 'Холод бере на третину повільніше.' },
  { id: 'learner', branch: 'craft', tier: 3, name: 'Тямущий', text: 'Навички ростуть на чверть швидше.' },
  { id: 'double', branch: 'craft', tier: 4, name: 'Щедра земля', text: 'Промисел часом дає вдвічі.' },
  { id: 'packer', branch: 'craft', tier: 4, name: 'Добре вкладене', text: 'Торба на 6 більша, а повна торба не сповільнює дорогу.' },
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
  tiers: [2, 4, 7, 10],
};

export const roleTitles: Content['roleTitles'] = {
  hunter: { m: 'Ловець', f: 'Ловчиня' },
  maker: { m: 'Майстер', f: 'Майстриня' },
};
