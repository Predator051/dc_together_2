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
  /** A shield in the other hand (block, bash). */
  shield: boolean;
  resist: Set<ResistId>;
  tools: Set<string>;
  heavy: boolean;
  /** Gathering speed bonus by tool kind (0.25 = 25% faster). */
  toolSpeed: Map<string, number>;
}

/** Fists and a belt knife-less start. */
const BARE: [number, number] = [1, 2];

/** What hunger, cold and food add to the hero (see NEED). */
export interface BodyMods {
  hp: number;
  dmg: number;
  hit: number;
  dodge: number;
}

export function derive(h: HeroLike, gear: (id: string) => GearDef | undefined, body?: BodyMods): Derived {
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
  let shield = false;
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
      if (slot === 'offhand' && g.tags?.includes('shield')) shield = true;
    }
    if (g.tags?.includes('heavy')) heavy = true;
  }
  const bonus = ranged ? Math.floor(s.agi / 2) : Math.floor(s.str / 2);
  const skill = skillLevel(h.skills[ranged ? 'ranged' : 'melee'] ?? 0);
  const skillDmg = Math.floor(skill / 3);
  const perkCarry = h.perks.includes('steady') ? 4 : 0;
  const b = body ?? { hp: 0, dmg: 0, hit: 0, dodge: 0 };
  return {
    hpMax: Math.max(4, 10 + 3 * s.end + 2 * (h.level - 1) + hp + b.hp),
    carry: 8 + 2 * s.str + carry + perkCarry,
    armor,
    dodge: Math.max(0, Math.min(0.3, 0.025 * s.agi + dodge) + b.dodge),
    hit: 0.7 + 0.03 * s.agi + acc + 0.03 * skill + b.hit,
    dmg: [Math.max(1, wdmg[0] + bonus + skillDmg + b.dmg), Math.max(1, wdmg[1] + bonus + skillDmg + b.dmg)],
    ranged,
    ammo,
    tags,
    shield,
    resist,
    tools,
    heavy: heavy && !h.perks.includes('steady'),
    toolSpeed,
  };
}

/** Foes against the heroes: how much tougher than written, and how much more with two heroes. */
export const FOE = {
  hp: 1.35,
  dmg: 1.25,
  /** Health of foes when both heroes fight them; their blows too. */
  duoHp: 1.8,
  duoDmg: 1.25,
  /** Bosses (foes with phases): their own factors (their blows are written heavy already). */
  bossHp: 1,
  bossDuoHp: 1,
  bossDmg: 0.85,
  /** The first foes teach the fight: the toughening grows in up to this level. */
  rampTo: 4,
  /** A charge that lands. */
  charge: 2.5,
  /** Foes this many levels under the weakest hero can be driven off without a fight. */
  rout: 3,
};

/** How much tougher than written a foe of this level is (`full` — the factor at full strength). */
export function foeRamp(full: number, level: number): number {
  return 1 + (full - 1) * Math.min(1, Math.max(0, (level - 1) / (FOE.rampTo - 1)));
}

/** Numbers of the strong moves (see `.design/combat2.md`). */
export const TECH = {
  /** A blow at an open foe: always lands, more damage, half the armour. */
  open: 1.5,
  thrustOpen: 2,
  thrustAcc: 0.2,
  stunDmg: 0.6,
  chop: 1.5,
  flurryAcc: -0.15,
  block: 0.3,
  bashStun: 0.5,
};

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

// ----- needs: hunger, warmth, rest ------------------------------------------------

const MIN = 60_000;

/** Numbers of the needs. Rates of chill are points per minute of play. */
export const NEED = {
  /** Dishes at once. */
  slots: 3,
  /** The last part of a dish's time: half the bonus, and it may be eaten again. */
  fade: 0.25,
  hunger: { hp: -3, dmg: -1 },
  chill: { evening: 8, wet: 15, homeEvening: 4, resist: 0.5, fire: 40, low: 20, drink: 0.5 },
  /** Chill at or below: warmed through (wounds heal faster). */
  warmAt: 15,
  /** Chill at or above: cold; at the top: frozen stiff. */
  coldAt: 60,
  freezeAt: 100,
  /** At home, under the roof, the chill stops here (cold, never frozen). */
  homeMaxChill: 80,
  cold: { hit: -0.08, dodge: -0.04 },
  /** Frozen stiff: one health point lost this often. */
  biteEvery: MIN,
  warmRegen: 1.5,
  /** Hungry or cold: wounds close this much slower. */
  slowRegen: 0.5,
  wetFor: 4 * MIN,
  /** By a fire clothes dry this many times faster. */
  dryByFire: 4,
  tiredAfter: 40 * MIN,
  /** Rested for base + per comfort point, minutes. */
  restBase: 4,
  restPer: 2,
  restBusy: 12_000,
  rested: { pace: 0.9, skill: 1.5 },
  tired: { pace: 1.2, skill: 0.5 },
  campFor: 5 * MIN,
  campWood: 2,
  campBusy: 6_000,
} as const;

export type ColdLevel = 'warm' | 'ok' | 'cold' | 'frozen';

export function coldLevel(chill: number): ColdLevel {
  if (chill >= NEED.freezeAt) return 'frozen';
  if (chill >= NEED.coldAt) return 'cold';
  if (chill <= NEED.warmAt) return 'warm';
  return 'ok';
}

/** A dish in its last quarter gives half and may be eaten again. */
export function mealFading(left: number, minutes: number): boolean {
  return left < minutes * MIN * NEED.fade;
}

/** Health and strike from the dishes in the slots (or hunger, when none), and the cold's bite. */
export function bodyMods(
  meals: Array<{ left: number; hp: number; dmg?: number; minutes: number }>,
  chill: number,
): BodyMods {
  const m: BodyMods = { hp: 0, dmg: 0, hit: 0, dodge: 0 };
  if (!meals.length) {
    m.hp += NEED.hunger.hp;
    m.dmg += NEED.hunger.dmg;
  }
  for (const x of meals) {
    const half = mealFading(x.left, x.minutes);
    m.hp += half ? Math.ceil(x.hp / 2) : x.hp;
    if (x.dmg && !half) m.dmg += x.dmg;
  }
  const lvl = coldLevel(chill);
  if (lvl === 'cold' || lvl === 'frozen') {
    m.hit += NEED.cold.hit;
    m.dodge += NEED.cold.dodge;
  }
  return m;
}
