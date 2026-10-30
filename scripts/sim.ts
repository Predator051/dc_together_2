// Fight simulator: the real fight engine, heroes of a given stage, the bot's tactics.
// Usage: npm run sim  (prints win rates per foe and stage; numbers go to .design/balance.md)

import { content } from '../content/index.js';
import { E, G, U } from '../content/a1/ids.js';
import { E2, G2 } from '../content/a2/ids.js';
import { E3, G3 } from '../content/a3/ids.js';
import type { PlayerId, Slot } from '../shared/src/content.js';
import { perkState, xpForLevel } from '../shared/src/rules.js';
import { ContentIndex, Game, newWorld } from '../server/src/engine/index.js';
import { makeElite, startFight } from '../server/src/engine/fight.js';
import { fieldFrom } from '../server/src/engine/terrain.js';
import type { FightNode } from '../shared/src/content.js';
import { refreshHero } from '../server/src/engine/hero.js';
import { buildView } from '../server/src/engine/view.js';
import { Bot, PERK_PLAN } from '../tests/bot.js';

const ix = new ContentIndex(content);
/** How the last scene fight ended (the sim runs fights as scene fights to catch the result). */
let lastResult: boolean | null = null;
Game.prototype.fightOver = function (won: boolean) {
  lastResult = won;
};

interface Kit {
  level: number;
  hunter: Partial<Record<Slot, string>>;
  maker: Partial<Record<Slot, string>>;
  bag: Record<string, number>;
  dog: boolean;
  evening?: boolean;
}

export const STAGES: Record<string, Kit> = {
  E0: { level: 1, hunter: {}, maker: { weapon: G.knife }, bag: {}, dog: false },
  E1: { level: 2, hunter: { weapon: G.spear, body: G.cape }, maker: { weapon: G.knife, body: G.cape }, bag: { [U.pebble]: 10 }, dog: false },
  E2: {
    level: 3,
    hunter: { weapon: G.spear, body: G.jacket, legs: G.boots, offhand: G.shield },
    maker: { weapon: G.club, body: G.jacket, legs: G.boots, offhand: G.shield },
    bag: { [U.bandage]: 1, [U.torch]: 2, [U.pinch]: 2 },
    dog: true,
  },
  E3: {
    level: 4,
    hunter: { weapon: G.ironspear, body: G.jacket, legs: G.boots, offhand: G.shield, head: G.hood },
    maker: { weapon: G.axe, body: G.jacket, legs: G.boots, offhand: G.shield, head: G.hood },
    bag: { [U.bandage]: 2, [U.torch]: 2, [U.pinch]: 2, [U.brew]: 1 },
    dog: true,
  },
  E4: {
    level: 5,
    hunter: { weapon: G.ironspear, body: G.coat, legs: G.boots, offhand: G.shield, head: G.helm },
    maker: { weapon: G.axe, body: G.coat, legs: G.boots, offhand: G.shield, head: G.helm },
    bag: { [U.bandage]: 2, [U.torch]: 2, [U.rattle]: 1, [U.brew]: 1 },
    dog: true,
  },
  // act two: the end of act one, then the forge of the second tier and the market
  E5: {
    level: 6,
    hunter: { weapon: G.ironspear, body: G.coat, legs: G.boots, offhand: G.shield, head: G.helm },
    maker: { weapon: G.axe, body: G.coat, legs: G.boots, offhand: G.shield, head: G.helm },
    bag: { [U.bandage]: 2, [U.torch]: 2, [U.rattle]: 1, [U.brew]: 1 },
    dog: true,
  },
  E6: {
    level: 8,
    hunter: { weapon: G.ironspear, body: G2.quilt, legs: G.boots, offhand: G2.ironshield, head: G.helm, hands: G2.bracers },
    maker: { weapon: G2.cleaver, body: G.coat, legs: G.boots, offhand: G2.ironshield, head: G.helm, hands: G2.bracers },
    bag: { [U.bandage]: 2, [U.torch]: 2, [U.rattle]: 1, [U.brew]: 1 },
    dog: true,
  },
  E7: {
    level: 9,
    hunter: { weapon: G2.sabre, body: G2.quilt, legs: G.boots, offhand: G2.ironshield, head: G.helm, hands: G2.bracers },
    maker: { weapon: G2.cleaver, body: G2.quilt, legs: G.boots, offhand: G2.ironshield, head: G.helm, hands: G2.bracers },
    bag: { [U.bandage]: 3, [U.torch]: 2, [U.rattle]: 1, [U.brew]: 1 },
    dog: true,
  },
  // act three: the felt cloak from the camp, a pike from the riders
  E8: {
    level: 11,
    hunter: { weapon: G3.pike, body: G3.burka, legs: G.boots, offhand: G2.ironshield, head: G.helm, hands: G2.bracers },
    maker: { weapon: G2.cleaver, body: G2.quilt, legs: G.boots, offhand: G2.ironshield, head: G.helm, hands: G2.bracers },
    bag: { [U.bandage]: 3, [U.torch]: 2, [U.rattle]: 1, [U.brew]: 1 },
    dog: true,
  },
};

const LEVEL_UPS: Record<'hunter' | 'maker', string[]> = {
  hunter: ['agi', 'end', 'per', 'agi', 'end', 'agi', 'end', 'agi'],
  maker: ['str', 'end', 'end', 'str', 'agi', 'end', 'str', 'end'],
};

function makeWorld(kit: Kit, seed: number, who: 'both' | 'hunter' | 'maker'): Game {
  const now = 1_700_000_000_000;
  const s = newWorld(content, seed, now);
  const g = new Game(ix, s, now + (kit.evening ? 30 * 60_000 : 0));
  g.join('Марко', 'm', 'hunter');
  g.join('Оксана', 'f', 'maker');
  s.flags.p2_hut = 1;
  if (kit.dog) s.flags.p2_dog_back = 1;
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = s.players[pid];
    p.online = who === 'both' || p.role === who;
    p.at = 'a_02';
    p.level = kit.level;
    p.xp = xpForLevel(kit.level);
    const ups = LEVEL_UPS[p.role!];
    for (let i = 0; i < kit.level - 1; i++) p.stats[ups[i % ups.length] as 'str'] += 1;
    // perks as the bots take them (NOPERKS=1: none, to see what they add)
    p.perks = [];
    p.perkPoints = process.env.NOPERKS ? 0 : kit.level - 1;
    const tree = { tiers: content.hero.tiers, perks: content.perks };
    while (p.perkPoints > 0) {
      const id = PERK_PLAN[p.role!].find((x) => perkState(tree, p, x) === 'can') ?? content.perks.find((x) => perkState(tree, p, x.id) === 'can')?.id;
      if (!id) break;
      p.perks.push(id);
      p.perkPoints -= 1;
    }
    p.equip = { ...(p.role === 'hunter' ? kit.hunter : kit.maker) };
    p.bag = { ...kit.bag };
    refreshHero(g, pid);
    p.hp = p.hpMax;
  }
  return g;
}

export interface SimResult {
  win: number;
  rounds: number;
  hpLeft: number;
}

/** The drawn field of the story fight with exactly these foes, if it has one (bosses fight on their own ground). */
function storyField(foes: Array<{ enemy: string; n?: number }>): FightNode['field'] {
  const same = (a: typeof foes, b: typeof foes) => a.length === b.length && a.every((x, i) => x.enemy === b[i]!.enemy && (x.n ?? 1) === (b[i]!.n ?? 1));
  for (const sc of content.scenes)
    for (const n of Object.values(sc.nodes)) if (n.type === 'fight' && n.field && same(n.foes, foes)) return n.field;
  return undefined;
}

export function simulate(foes: Array<{ enemy: string; n?: number }>, stage: string, who: 'both' | 'hunter' | 'maker', runs = 400, elite = false): SimResult {
  const drawn = storyField(foes);
  let wins = 0;
  let rounds = 0;
  let hpLeft = 0;
  for (let i = 0; i < runs; i++) {
    const kit = STAGES[stage]!;
    let g = makeWorld(kit, 1000 + i * 7, who);
    const party = (['p1', 'p2'] as PlayerId[]).filter((pid) => g.s.players[pid].online);
    lastResult = null;
    const fld = drawn ? fieldFrom(drawn.rows, drawn.ground) : null;
    if (process.env.HARD) g.s.hard = true;
    const f = startFight(g, 'a_02', foes, { party, scene: true, ...(fld ? { field: fld.field, starts: { heroes: fld.heroes, foes: fld.foes } } : {}) });
    if (elite) makeElite(g, f, f.foes[0]!);
    const bots = { p1: new Bot('p1', content, { seed: i }), p2: new Bot('p2', content, { seed: i + 1 }) };
    let won = false;
    let k = 0;
    let lastRound = f.round;
    while (g.s.fights.some((x) => x.id === f.id) && k++ < 600) {
      for (const pid of party) {
        g = new Game(ix, g.s, g.now);
        const v = buildView(g, pid);
        const cmd = bots[pid].decide(v, g);
        if (cmd?.c === 'fight') g.command(pid, cmd);
      }
      const cur = g.s.fights.find((x) => x.id === f.id);
      if (cur && process.env.TRACE && i === 0 && cur.round !== lastRound) console.log(`r${lastRound}`, cur.lines.p1.join(' | '));
      if (cur) lastRound = cur.round;
    }
    // a scene fight ends through fightOver: a win leaves the foes' bestiary marked beaten
    won = lastResult === true;
    if (won) {
      wins++;
      hpLeft += party.reduce((s, pid) => s + g.s.players[pid].hp / g.s.players[pid].hpMax, 0) / party.length;
    }
    rounds += lastRound;
  }
  return { win: wins / runs, rounds: rounds / runs, hpLeft: wins ? hpLeft / wins : 0 };
}

const TABLE: Array<{ name: string; foes: Array<{ enemy: string; n?: number }>; stages: string[]; who: Array<'both' | 'hunter' | 'maker'>; elite?: boolean }> = [
  { name: 'Пацюки ×3', foes: [{ enemy: E.rat, n: 3 }], stages: ['E0', 'E1'], who: ['hunter', 'maker'] },
  { name: 'Гадюка', foes: [{ enemy: E.viper }], stages: ['E0', 'E1', 'E2'], who: ['hunter', 'maker'] },
  { name: 'Стара гадюка', foes: [{ enemy: E.oldviper }], stages: ['E2', 'E3'], who: ['hunter', 'maker', 'both'] },
  { name: 'Пси ×3', foes: [{ enemy: E.dog, n: 3 }], stages: ['E1', 'E2', 'E3'], who: ['hunter', 'maker', 'both'] },
  { name: 'П\'явки ×3', foes: [{ enemy: E.leech, n: 3 }], stages: ['E1', 'E2'], who: ['hunter', 'maker'] },
  { name: 'Кабан', foes: [{ enemy: E.boar }], stages: ['E2', 'E3'], who: ['hunter', 'maker', 'both'] },
  { name: 'Сивий кабан', foes: [{ enemy: E.greyboar }], stages: ['E3', 'E4'], who: ['both'] },
  { name: 'Сом', foes: [{ enemy: E.catfish }], stages: ['E2', 'E3'], who: ['both'] },
  { name: 'Пес Білих', foes: [{ enemy: E.hound }], stages: ['E2', 'E3'], who: ['both', 'hunter'] },
  { name: 'Пси Білих ×2', foes: [{ enemy: E.hound, n: 2 }], stages: ['E3', 'E4'], who: ['both', 'maker'] },
  { name: 'Білий', foes: [{ enemy: E.white }], stages: ['E3', 'E4'], who: ['both', 'maker'] },
  { name: 'Фока + 2 пси', foes: [{ enemy: E.foka }, { enemy: E.hound, n: 2 }], stages: ['E3', 'E4'], who: ['both'] },
  { name: 'Вовки ×3', foes: [{ enemy: E2.wolf, n: 3 }], stages: ['E5', 'E6'], who: ['both', 'hunter', 'maker'] },
  { name: 'Вовки ×2', foes: [{ enemy: E2.wolf, n: 2 }], stages: ['E5'], who: ['hunter', 'maker'] },
  { name: 'Хапун', foes: [{ enemy: E2.snatcher }], stages: ['E5', 'E6'], who: ['both', 'hunter', 'maker'] },
  { name: 'Хапуни ×2', foes: [{ enemy: E2.snatcher, n: 2 }], stages: ['E5', 'E6'], who: ['both', 'maker'] },
  { name: 'Білий + 2 пси', foes: [{ enemy: E.white }, { enemy: E.hound, n: 2 }], stages: ['E5', 'E6'], who: ['both'] },
  // a seasoned one at the head (✦): routine fights that now and then are not
  { name: '✦ Пси ×3', foes: [{ enemy: E.dog, n: 3 }], stages: ['E2', 'E3'], who: ['hunter', 'maker', 'both'], elite: true },
  { name: '✦ Кабан', foes: [{ enemy: E.boar }], stages: ['E3', 'E4'], who: ['hunter', 'maker', 'both'], elite: true },
  { name: '✦ Сивий кабан', foes: [{ enemy: E.greyboar }], stages: ['E4', 'E5'], who: ['both'], elite: true },
  { name: '✦ Вовки ×3', foes: [{ enemy: E2.wolf, n: 3 }], stages: ['E5', 'E6'], who: ['both', 'hunter'], elite: true },
  { name: '✦ Хапун', foes: [{ enemy: E2.snatcher }], stages: ['E5', 'E6'], who: ['both', 'maker'], elite: true },
  { name: 'Вершники ×2', foes: [{ enemy: E3.rider, n: 2 }], stages: ['E7', 'E8'], who: ['both', 'hunter'] },
  { name: 'Ярема + вершник', foes: [{ enemy: E3.captain }, { enemy: E3.rider }], stages: ['E7', 'E8'], who: ['both'] },
  // readied alone beforehand (`prep_*`): the ford with one rider, the mound with two wolves, the captain without his rider
  { name: 'Вершник ×1 (підг.)', foes: [{ enemy: E3.rider, n: 1 }], stages: ['E7'], who: ['both'] },
  { name: 'Ярема сам (підг.)', foes: [{ enemy: E3.captain }], stages: ['E7', 'E8'], who: ['both'] },
  { name: 'Гак + хапун', foes: [{ enemy: E2.hook }, { enemy: E2.snatcher, n: 1 }], stages: ['E5', 'E6', 'E7'], who: ['both'] },
];

if (process.argv[1]?.endsWith('sim.ts')) {
  const runs = Number(process.argv[2] ?? 300);
  const only = process.argv[3];
  for (const row of TABLE) {
    if (only && !row.name.includes(only)) continue;
    const cells: string[] = [];
    for (const st of row.stages)
      for (const who of row.who) {
        const r = simulate(row.foes, st, who, runs, row.elite);
        cells.push(`${st}/${who[0]}: ${Math.round(r.win * 100)}% ${r.rounds.toFixed(1)}р ${Math.round(r.hpLeft * 100)}%hp`);
      }
    console.log(`${row.name.padEnd(16)} ${cells.join(' · ')}`);
  }
}
