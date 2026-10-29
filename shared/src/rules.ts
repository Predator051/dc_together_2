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
  const has = (id: string) => h.perks.includes(id);
  const perkCarry = (has('steady') ? PERK.steadyCarry : 0) + (has('packer') ? PERK.packerCarry : 0);
  const b = body ?? { hp: 0, dmg: 0, hit: 0, dodge: 0 };
  return {
    hpMax: Math.max(4, 10 + 3 * s.end + 2 * (h.level - 1) + hp + b.hp + (has('tough') ? PERK.toughHp : 0)),
    carry: 8 + 2 * s.str + carry + perkCarry,
    armor: armor + (has('bark') ? PERK.barkArmor : 0),
    dodge: Math.max(0, Math.min(0.3, 0.025 * s.agi + dodge) + b.dodge),
    hit: 0.7 + 0.03 * s.agi + acc + 0.03 * skill + b.hit,
    dmg: [Math.max(1, wdmg[0] + bonus + skillDmg + b.dmg), Math.max(1, wdmg[1] + bonus + skillDmg + b.dmg)],
    ranged,
    ammo,
    tags,
    shield,
    resist,
    tools,
    heavy: heavy && !has('steady'),
    toolSpeed,
  };
}

/** Numbers of the household: what residents eat and how hunger slows them (see `.design/residents2.md`). */
export const FOLK = {
  /** Hours of work a portion of plain food keeps a resident going; a cooked dish. */
  rawHours: 3,
  dishHours: 6,
  /** Most a belly holds; a new resident comes in with this much. */
  maxFed: 6,
  startFed: 3,
  /** A resident reaches for food with this little left. */
  eatAt: 1.5,
  /** A resting (or hurt) resident burns this much an hour. */
  restBurn: 0.5,
  /** A cooked dish lifts the work while it lasts. */
  dishLift: 1.1,
  /** Hunger by hours gone empty: under `low` — a little slower, under `weak` — half, after — no work. */
  low: 4,
  weak: 12,
  lowMult: 0.75,
  hungryMult: 0.5,
  /** Counted in steps of this many minutes. */
  stepMin: 10,
  /** Warned once when the food will last less than this many hours. */
  warnHours: 2,
};

export type FolkState = 'fed' | 'low' | 'hungry' | 'weak';

/** How residents grow in a trade: hours of work for each step, what each step adds; the last is taught. */
export const TRADE = {
  hours: [12, 48],
  mult: [1, 1.1, 1.2, 1.3],
  /** A hero teaches with this much skill of gathering, taking this long. */
  teachSkill: 4,
  teachMs: 3 * 60_000,
  teachXp: 5,
};

/** A resident's step in a trade: 0 new, 1 used to it, 2 skilled (by work), 3 a master's hand (taught). */
export function tradeRank(hours: number, master: boolean): number {
  if (master) return 3;
  return hours >= TRADE.hours[1]! ? 2 : hours >= TRADE.hours[0]! ? 1 : 0;
}

export function folkState(fed: number, starve: number): FolkState {
  if (fed > 0) return 'fed';
  if (starve < FOLK.low) return 'low';
  if (starve < FOLK.weak) return 'hungry';
  return 'weak';
}

export function folkHungerMult(st: FolkState): number {
  return st === 'fed' ? 1 : st === 'low' ? FOLK.lowMult : st === 'hungry' ? FOLK.hungryMult : 0;
}

/** Numbers of the perks (see `.design/progression.md`). */
export const PERK = {
  firstDmg: 2,
  flankAcc: 0.2,
  flankDmg: 2,
  masterAcc: 0.05,
  masterDmg: 1,
  quietAmbush: 0.67,
  farRange: 2,
  coldAcc: 0.05,
  deadlyAim: 2.5,
  watchInit: 6,
  shieldCut: 0.7,
  toughHp: 5,
  stanceGuard: 0.2,
  barkArmor: 1,
  legsTravel: 0.9,
  steadyCarry: 4,
  craftTime: 0.8,
  hardyChill: 0.67,
  learner: 1.25,
  doubleChance: 0.15,
  handsChance: 0.25,
  packerCarry: 6,
  sweepPart: 0.5,
  duelDmg: 3,
  loreAcc: 0.1,
  loreDmg: 2,
  loreBeaten: 3,
  bulwarkReach: 2,
  secondBelow: 0.25,
  secondHeal: 1 / 3,
  thriftyChance: 0.2,
  executeBelow: 0.2,
  twinAcc: -0.2,
  unbrokenHp: 1 / 3,
  porterWeight: 0.75,
  lungeAcc: 0.1,
  rollGuard: 0.3,
  desperateBelow: 1 / 3,
  desperateMult: 2,
  desperateAcc: 0.1,
  ramMult: 1.5,
  ramOpen: 0.5,
  rainAcc: -0.1,
  dashReach: 4,
  porterFrom: 2,
  foragerChance: 0.1,
  artisanTime: 0.67,
  pathfinderTravel: 0.85,
  pathfinderAmbush: 0.5,
};

/** What the perk tree needs: its branches, the level each step opens at, the perks in it. */
export interface PerkTree {
  tiers: number[];
  perks: Array<{ id: string; branch?: string; tier?: number; quest?: boolean }>;
}

export type PerkState = 'have' | 'can' | 'wait' | 'closed' | 'locked';

/**
 * Where a perk stands for this hero: taken; can be taken now; open but no point to spend (`wait`);
 * the other of its pair was taken (`closed`); its step is not open yet (`locked`: a lower level, or
 * nothing taken on the step before in its branch).
 */
export function perkState(t: PerkTree, h: { level: number; perks: string[]; perkPoints: number }, id: string): PerkState {
  if (h.perks.includes(id)) return 'have';
  const def = t.perks.find((x) => x.id === id);
  if (!def?.branch || !def.tier) return 'locked';
  const same = (tier: number) => t.perks.filter((x) => x.branch === def.branch && x.tier === tier);
  if (same(def.tier).some((x) => h.perks.includes(x.id))) return 'closed';
  if (h.level < (t.tiers[def.tier - 1] ?? Infinity)) return 'locked';
  if (def.tier > 1 && !same(def.tier - 1).some((x) => h.perks.includes(x.id))) return 'locked';
  return h.perkPoints > 0 ? 'can' : 'wait';
}

/**
 * How much a won foe of this level teaches a hero of that one: in full up to one level beneath,
 * then a quarter less for each level more (a tenth at least). Grinding weak beasts does not raise a hero.
 */
export function foeXpFactor(heroLevel: number, foeLevel: number): number {
  const gap = heroLevel - foeLevel - 1;
  return gap <= 0 ? 1 : Math.max(0.1, 1 - 0.25 * gap);
}

/** Perk points a hero of this level has earned in all (one a level from the second). */
export function perkPointsFor(level: number): number {
  return Math.max(0, level - 1);
}

/** Foes against the heroes: how much tougher than written, and how much more with two heroes. */
export const FOE = {
  hp: 1.35,
  dmg: 1.25,
  /** Health of foes when both heroes fight them; their blows too. */
  duoHp: 1.8,
  duoDmg: 1.25,
  /** Bosses (foes with phases): their own factors (their blows are written heavy already). */
  bossHp: 1.3,
  bossDuoHp: 1,
  bossDmg: 1,
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
