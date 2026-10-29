// Tools for residents: one for each trade, made at the bench or the forge; it lifts the work of its own
// trade only (see `.design/residents2.md`). Clothes for residents are the heroes' body garments.
import type { ActionDef, Cond, ResourceDef } from '../shared/src/content.js';
import type { ItemIcon } from '../shared/src/pictures.js';
import { L, R } from './a1/ids.js';

const SEC = 1000;
const folk: Cond = { flag: 'p2_ulyana' };
const bench: Cond = { all: [folk, { flag: 'built:x_16' }] };
const forge: Cond = { all: [folk, { flag: 'built:x_52' }] };

/** Neutral ids of the residents' tools. */
export const FT = {
  billhook: 'r_70',
  mattock: 'r_71',
  rake: 'r_72',
  weir: 'r_73',
  sickle: 'r_74',
  hoe: 'r_75',
} as const;

const tool = (id: string, icon: ItemIcon, name: string, trade: string, desc: string, order: number): ResourceDef => ({
  id,
  icon,
  name,
  order,
  cap: 6,
  weight: 1,
  folkTool: trade,
  desc,
});

export const folkResources: ResourceDef[] = [
  tool(FT.billhook, 'billhook', 'Тесак', 'wood', 'Важкий, з гаком на кінці. Лозу бере одним махом, плавник — тягне з води.', 70),
  tool(FT.mattock, 'mattock', 'Кайло з дзьобом', 'earth', 'Дзьоб — для каменю, лопатка — для глини й торфу.', 70.1),
  tool(FT.rake, 'rake', 'Сольові граблі', 'salt', 'Дерев\'яні, щоб не іржавіли. Сіль згрібає, ропу не каламутить.', 70.2),
  tool(FT.weir, 'weir', 'Верша', 'catch', 'Плетена пастка на рибу й раків: ставиш з вечора — вранці є що їсти.', 70.3),
  tool(FT.sickle, 'sickle', 'Серп', 'herbs', 'Очерет, трави, ягідник — серпом удвічі чистіше, ніж ножем.', 70.4),
  tool(FT.hoe, 'hoe', 'Сапка', 'garden', 'Розпушити, підгорнути, прополоти — грядки люблять сапку.', 70.5),
];

const make = (id: string, group: string, label: string, visible: Cond, cost: Record<string, number>, item: string, why: string, busy: string, self: string, other: string): ActionDef => ({
  id,
  group,
  label,
  visible,
  cost,
  yield: { [item]: 1 },
  limit: 6,
  cooldown: 15 * SEC,
  skill: 'craft',
  knack: { role: 'maker', x: 1.5 },
  kind: 'craft',
  why,
  busy,
  log: { self, other },
});

export const folkActions: ActionDef[] = [
  make('x_220', L.forge, 'Викувати тесак', forge, { [R.iron]: 2, [R.coal]: 2, [R.oak]: 1 }, FT.billhook, 'Людям на лозі й плавнику — щоб не рвали руками.', 'кує тесак', 'Широке лезо з гаком. Важке — і добре: саме рубає.', '{name} кує тесак.'),
  make('x_221', L.forge, 'Викувати кайло', forge, { [R.iron]: 3, [R.coal]: 2, [R.oak]: 1 }, FT.mattock, 'Камінь, глина, руда — кайлом швидше, ніж ломом і руками.', 'кує кайло', 'Дзьоб і лопатка на одному держаку. Руку тягне донизу.', '{name} кує кайло.'),
  make('x_222', L.bench, 'Зробити сольові граблі', bench, { [R.wood]: 4, [R.rope]: 1 }, FT.rake, 'Хто біля ропи й солі — граблями згрібає вдвічі чистіше.', 'робить граблі', 'Дерев\'яні зуби, довгий держак. Солі вони не бояться.', '{name} робить граблі.'),
  make('x_223', L.bench, 'Сплести вершу', bench, { [R.reed]: 6, [R.rope]: 2 }, FT.weir, 'Верша ловить, поки людина спить.', 'плете вершу', 'Лозинка за лозинкою — горло всередину, щоб риба не вийшла.', '{name} плете вершу.'),
  make('x_224', L.forge, 'Викувати серп', forge, { [R.iron]: 2, [R.coal]: 1, [R.wood]: 1 }, FT.sickle, 'Очерет і трави — серпом, а не ножем.', 'кує серп', 'Тонкий вигин, зубчасте лезо. Ти пробуєш на пасмі очерету — бере.', '{name} кує серп.'),
  make('x_225', L.forge, 'Викувати сапку', forge, { [R.iron]: 1, [R.coal]: 1, [R.wood]: 2 }, FT.hoe, 'Город любить, коли землю ворушать.', 'кує сапку', 'Невелика, легка. Земля під нею розсипається.', '{name} кує сапку.'),
];
