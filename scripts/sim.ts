// Fight simulator: the real fight engine, heroes of a given stage, the bot's tactics.
// Usage: npm run sim  (prints win rates per foe and stage; numbers go to .design/balance.md)

import { content } from '../content/index.js';
import { E, G, U } from '../content/a1/ids.js';
import type { PlayerId, Slot } from '../shared/src/content.js';
import { xpForLevel } from '../shared/src/rules.js';
import { ContentIndex, Game, newWorld } from '../server/src/engine/index.js';
import { startFight } from '../server/src/engine/fight.js';
import { refreshHero } from '../server/src/engine/hero.js';
import { buildView } from '../server/src/engine/view.js';
import { Bot } from '../tests/bot.js';

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
};

const LEVEL_UPS: Record<'hunter' | 'maker', string[]> = {
  hunter: ['agi', 'end', 'per', 'agi', 'end', 'agi'],
  maker: ['str', 'end', 'end', 'str', 'agi', 'end'],
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

export function simulate(foes: Array<{ enemy: string; n?: number }>, stage: string, who: 'both' | 'hunter' | 'maker', runs = 400): SimResult {
  let wins = 0;
  let rounds = 0;
  let hpLeft = 0;
  for (let i = 0; i < runs; i++) {
    const kit = STAGES[stage]!;
    let g = makeWorld(kit, 1000 + i * 7, who);
    const party = (['p1', 'p2'] as PlayerId[]).filter((pid) => g.s.players[pid].online);
    lastResult = null;
    const f = startFight(g, 'a_02', foes, { party, scene: true });
    const bots = { p1: new Bot('p1', content, { seed: i }), p2: new Bot('p2', content, { seed: i + 1 }) };
    let won = false;
    let k = 0;
    let lastRound = f.round;
    while (g.s.fights.some((x) => x.id === f.id) && k++ < 200) {
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

const TABLE: Array<{ name: string; foes: Array<{ enemy: string; n?: number }>; stages: string[]; who: Array<'both' | 'hunter' | 'maker'> }> = [
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
];

if (process.argv[1]?.endsWith('sim.ts')) {
  const runs = Number(process.argv[2] ?? 300);
  const only = process.argv[3];
  for (const row of TABLE) {
    if (only && !row.name.includes(only)) continue;
    const cells: string[] = [];
    for (const st of row.stages)
      for (const who of row.who) {
        const r = simulate(row.foes, st, who, runs);
        cells.push(`${st}/${who[0]}: ${Math.round(r.win * 100)}% ${r.rounds.toFixed(1)}р ${Math.round(r.hpLeft * 100)}%hp`);
      }
    console.log(`${row.name.padEnd(16)} ${cells.join(' · ')}`);
  }
}
