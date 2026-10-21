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
  { id: 'first', name: 'Перший удар', text: 'У першому раунді бою удар сильніший на 2.' },
  { id: 'flint', name: 'Кремінь', text: 'Раз за бій лишаєшся на ногах там, де мав би впасти.' },
  { id: 'hands', name: 'Вправні руки', text: 'Промисел часом дає на одне більше.' },
  { id: 'steady', name: 'Твердий крок', text: 'Торба на 4 більша, важке не сповільнює.' },
  { id: 'eye', name: 'Пильне око', text: 'Усе про звіра видно з першої зустрічі.' },
  { id: 'shield', name: 'Щит для двох', text: 'Коли прикриваєш напарника, удар слабшає ще на третину.' },
];

export const hero: Content['hero'] = {
  base: {
    hunter: { str: 2, agi: 4, end: 2, per: 4, wil: 3 },
    maker: { str: 4, agi: 2, end: 4, per: 2, wil: 3 },
  },
  perkLevels: [2, 4, 6, 8, 10, 12],
};

export const roleTitles: Content['roleTitles'] = {
  hunter: { m: 'Ловець', f: 'Ловчиня' },
  maker: { m: 'Майстер', f: 'Майстриня' },
};
