import type { ClueDef, GoalDef, MysteryDef, NpcDef } from '../../shared/src/content.js';
import { M2 } from '../a2/ids.js';
import { M4, N4 } from './ids.js';

export const mysteries4: MysteryDef[] = [{ id: M4.brew, question: 'Що варять у полку?', order: 11 }];

export const clues4: ClueDef[] = [
  {
    id: 'c_70',
    to: 'both',
    mystery: M2.danylo,
    title: 'Друга строфа',
    text: 'Уляна співає другу строфу південної пісні — ту, яку в таборі забули. «Перша — всіх. Друга — тільки моя. Я її йому співала, коли він хворів. Він її впізнає. Навіть звідти».',
  },
  {
    id: 'c_71',
    to: 'maker',
    mystery: M4.brew,
    title: 'Аркуш у попелі',
    text: 'У порожньому таборі у Вербовій балці — недогорілий аркуш рівним почерком: «...варити на місці, сіль везти не треба...».',
  },
  {
    id: 'c_72',
    to: 'both',
    mystery: M4.brew,
    title: 'Роз\'їзд у Кривці',
    text: 'Біля згорілої пристані Кривця — свіжі колеса й кінський гній. Роз\'їзд полку шукає те саме, що й ви: живих.',
  },
  {
    id: 'c_73',
    to: 'both',
    mystery: M4.brew,
    title: 'Дим над обозом',
    text: 'З острова видно табір за Бродом: рівні ряди сірих сорочок. Над обозом — дим, хоч у таборі палити заборонено. Хтось щось варить.',
  },
];

export const npcs4: NpcDef[] = [
  {
    id: N4.kylyna,
    name: 'Килина',
    desc: 'Старша схованки в плавнях. Тримає вила так, як тримають, коли вже доводилось. Вогню вдень не палить.',
  },
];

const south = { flag: 'p2_brid' };

export const goals4: GoalDef[] = [
  { id: 'g_255', text: 'За Бродом — табір полку. Підійти ближче — далі буде.', when: { all: [{ flag: 'p2_kryvets' }, { flag: 'p2_island' }] } },
  { id: 'g_252', text: 'Схованку треба тримати: нагодувати людей, наловити риби, вислухати.', when: { all: [south, { flag: 'p2_rep_hide', lt: 2 }] } },
  { id: 'g_253', text: 'Кривець — недалеко від Броду.', when: { all: [south, { noFlag: 'p2_kryvets' }] } },
  { id: 'g_254', text: 'Острів — видно з протоки.', when: { all: [south, { noFlag: 'p2_island' }] } },
  { id: 'g_251', text: 'Вирушити обозом на Пониззя — з чумацького стану.', when: { all: [{ flag: 'p2_act4' }, { noFlag: 'p2_brid' }] } },
];
