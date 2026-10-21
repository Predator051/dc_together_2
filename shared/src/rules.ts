// Formulas of the hero and the fight. Pure functions: the server, the simulator and the tests share them.
import type { GearDef, GearTag, ResistId, SkillId, Slot, StatId } from './content.js';
import { SLOTS } from './content.js';

/** Total experience needed to reach level n. */
export function xpForLevel(n: number): number {
  if (n <= 1) return 0;
  return Math.round(20 * Math.pow(n - 1, 1.6));
}

export function levelFromXp(xp: number): number {
  let n = 1;
  while (xp >= xpForLevel(n + 1)) n++;
  return n;
}

/** Skill level from its experience: level n at 6·n². */
export function skillLevel(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 6));
}

export function skillXpFor(n: number): number {
  return 6 * n * n;
}

export interface HeroLike {
  level: number;
  stats: Record<StatId, number>;
  perks: string[];
  equip: Partial<Record<Slot, string>>;
  skills: Record<SkillId, number>;
}

export interface Derived {
  hpMax: number;
  carry: number;
  armor: number;
  dodge: number;
  /** Base chance to hit before the foe's evasion. */
  hit: number;
  /** Damage of the weapon in hand (melee or ranged), stat bonus included. */
  dmg: [number, number];
  ranged: boolean;
  ammo?: string;
  tags: Set<GearTag>;
  resist: Set<ResistId>;
  tools: Set<string>;
  heavy: boolean;
  /** Gathering speed bonus by tool kind (0.25 = 25% faster). */
  toolSpeed: Map<string, number>;
}

/** Fists and a belt knife-less start. */
const BARE: [number, number] = [1, 2];

export function derive(h: HeroLike, gear: (id: string) => GearDef | undefined): Derived {
  const s = h.stats;
  let hp = 0;
  let carry = 0;
  let armor = 0;
  let dodge = 0;
  let acc = 0;
  let wdmg: [number, number] = BARE;
  let ranged = false;
  let ammo: string | undefined;
  const tags = new Set<GearTag>();
  const resist = new Set<ResistId>();
  const tools = new Set<string>();
  const toolSpeed = new Map<string, number>();
  let heavy = false;
  for (const slot of SLOTS) {
    const id = h.equip[slot];
    if (!id) continue;
    const g = gear(id);
    if (!g) continue;
    hp += g.hp ?? 0;
    carry += g.carry ?? 0;
    armor += g.armor ?? 0;
    dodge += g.dodge ?? 0;
    acc += g.acc ?? 0;
    for (const r of g.resist ?? []) resist.add(r);
    for (const t of g.tools ?? []) {
      tools.add(t);
      if (g.speed) toolSpeed.set(t, Math.max(toolSpeed.get(t) ?? 0, g.speed));
    }
    if (slot === 'weapon') {
      if (g.dmg) wdmg = g.dmg;
      for (const t of g.tags ?? []) tags.add(t);
      ranged = !!g.tags?.includes('ranged');
      ammo = g.ammo;
    } else {
      for (const t of g.tags ?? []) if (t === 'heavy' || t === 'fire' || t === 'noise') tags.add(t);
    }
    if (g.tags?.includes('heavy')) heavy = true;
  }
  const bonus = ranged ? Math.floor(s.agi / 2) : Math.floor(s.str / 2);
  const skill = skillLevel(h.skills[ranged ? 'ranged' : 'melee'] ?? 0);
  const skillDmg = Math.floor(skill / 3);
  const perkCarry = h.perks.includes('steady') ? 4 : 0;
  return {
    hpMax: 10 + 3 * s.end + 2 * (h.level - 1) + hp,
    carry: 8 + 2 * s.str + carry + perkCarry,
    armor,
    dodge: Math.min(0.3, 0.025 * s.agi + dodge),
    hit: 0.7 + 0.03 * s.agi + acc + 0.03 * skill,
    dmg: [Math.max(1, wdmg[0] + bonus + skillDmg), Math.max(1, wdmg[1] + bonus + skillDmg)],
    ranged,
    ammo,
    tags,
    resist,
    tools,
    heavy: heavy && !h.perks.includes('steady'),
    toolSpeed,
  };
}

/** Chance to hit a foe with this much evasion. */
export function hitChance(base: number, evade: number, firstRoundRanged = false): number {
  const c = base - 0.05 * evade + (firstRoundRanged ? 0.25 : 0);
  return Math.max(0.2, Math.min(0.97, c));
}

/** How much longer/shorter a gathering action takes. */
export function gatherMult(o: { skill: number; toolSpeed: number; heavy: boolean; knack: number }): number {
  const m = (1 - 0.05 * Math.min(10, o.skill)) * (1 - o.toolSpeed) * (o.heavy ? 1.15 : 1);
  return Math.max(0.3, m / Math.max(1, o.knack));
}

export function travelMult(o: { trail: number; load: number; heavy: boolean }): number {
  return Math.max(0.4, (1 - 0.04 * Math.min(10, o.trail)) * (o.load > 0.75 ? 1.25 : 1) * (o.heavy ? 1.1 : 1));
}
