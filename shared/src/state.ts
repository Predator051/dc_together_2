import type { Gender, PlayerId, Role, LogKind, Slot, StatId, SkillId } from './content.js';

/**
 * Part two starts its own line of world versions at 10 (part one ended at 3): a part-one world is
 * never migrated into part two — it is read once as the legacy and a new world begins.
 */
export const STATE_VERSION = 10;
export const PART = 2;

export interface PlayerState {
  id: PlayerId;
  joined: boolean;
  name: string;
  gender: Gender;
  role: Role | null;
  /** Area id where the player is (added in state version 2). */
  at: string;
  hp: number;
  hpMax: number;
  flags: Record<string, number>;
  cooldowns: Record<string, number>;
  busy: { action: string; until: number } | null;
  /** Runtime only; reset to false on load. */
  online: boolean;
  lastSeen: number;
  /** What the world looked like when this player left (v3). */
  away: Snapshot | null;
  /** Shown once on return after a real absence: "while you were away" (v3). */
  welcome: Snapshot | null;
  /** The last act whose summary this player has closed (v3). */
  seenSummary: number;

  // ----- part two: the hero -----
  level: number;
  xp: number;
  /** Unspent stat points (one per level). */
  points: number;
  stats: Record<StatId, number>;
  perks: string[];
  /** Perks offered and waiting for a pick. */
  perkChoice: string[] | null;
  /** Skill experience. */
  skills: Record<SkillId, number>;
  /** Worn things (item ids). */
  equip: Partial<Record<Slot, string>>;
  /** Saved outfits. */
  sets: Record<string, Partial<Record<Slot, string>>>;
  /** What the hero carries (taken from the place or packed at home). */
  bag: Record<string, number>;
  /** On the way somewhere. */
  travel: {
    from: string;
    to: string;
    since: number;
    until: number;
    /** A longer walk: the stops still ahead after `to`, each with its walking time. */
    route?: Array<[string, number]>;
    /** When the whole walk began and when it ends. */
    begin?: number;
    end?: number;
  } | null;
  /** In a fight (id). */
  fight: number | null;
  /** Poison ticks left. */
  poison: number;
  /** Last time health was restored by rest. */
  regenAt: number;
  /** Hunger, warmth and rest (null until they begin). Times are ms of play. */
  needs: NeedsState | null;
}

export interface NeedsState {
  /** Last time the needs were counted. */
  at: number;
  /** Dishes in the slots: ms left of each. */
  meals: Array<{ id: string; left: number }>;
  /** 0 = warm, 100 = frozen stiff. */
  chill: number;
  /** Wet for this long. */
  wet: number;
  /** A hot drink still helps for this long. */
  drink: number;
  /** Rested for this long. */
  rested: number;
  /** Play since the last rest. */
  awake: number;
  /** Last time freezing took health. */
  bite: number;
}

export interface Snapshot {
  at: number;
  day: number;
  res: Record<string, number>;
  /** First log id written after the snapshot. */
  log: number;
}

/** Counters for the end-of-act summary (v3; worlds older than that start counting at the update). */
export interface Stats {
  gathered: Record<string, number>;
  actions: Record<PlayerId, number>;
  crafted: number;
  trips: number;
  suppers: number;
  fights?: number;
}

export interface CombatState {
  enc: string;
  hp: number;
  fear: number;
  round: number;
  picks: Partial<Record<PlayerId, string>>;
  /** Narrative of the last resolved round, pre-rendered per player. */
  lastRound: Record<PlayerId, string[]>;
}

export interface SceneState {
  id: string;
  node: string;
  paused: boolean;
  ready: Partial<Record<PlayerId, boolean>>;
  picks: Partial<Record<PlayerId, string>>;
  /** Options already used in `any` hubs (by node). */
  used: Record<string, string[]>;
  /** Visited nodes with what was picked, to render the transcript. */
  trail: Array<{ node: string; picks?: Partial<Record<PlayerId, string>>; combat?: Record<PlayerId, string[]> }>;
  combat: CombatState | null;
  startedAt: number;
  /** A descent in progress (kept while the scene steps out for a story beat and comes back). */
  delve?: DelveState | null;
  stealth?: StealthState | null;
  operation?: OperationState | null;
  /** The last hand sign each player showed (in earplugs nobody hears anybody). */
  signs?: Partial<Record<PlayerId, { id: string; at: number; turn: number }>>;
}

export interface DelveState {
  map: string;
  node: string;
  room: string;
  light: number;
  lightMax: number;
  /** Way each player wants to go: `go:<room>`. */
  picks: Partial<Record<PlayerId, string>>;
  /** What happened last, per player. */
  lines: Record<PlayerId, string[]>;
}

export interface OperationState {
  turn: number;
  tracks: Record<string, number>;
  picks: Partial<Record<PlayerId, string>>;
  lines: Record<PlayerId, string[]>;
}

export interface StealthState {
  pos: number;
  turn: number;
  time: number;
  alarm: number;
  picks: Partial<Record<PlayerId, string>>;
  lines: Record<PlayerId, string[]>;
}

export interface Proposal {
  scene: string;
  /** Button (scene or pool action) that created the proposal. */
  via: string;
  by: PlayerId;
  at: number;
}

export interface LogEntry {
  id: number;
  t: number;
  kind: LogKind;
  actor?: PlayerId;
  /** Pre-rendered per player; players absent from the map do not see the entry. */
  text: Partial<Record<PlayerId, string>>;
}

/** One foe in a fight. */
export interface FoeState {
  uid: number;
  enemy: string;
  hp: number;
  hpMax: number;
  fear: number;
  out: null | 'dead' | 'fled' | 'down';
  /** What it does this round, and (seen by the hunter) the next one. */
  intent: Intent | null;
  next: Intent | null;
  /** Holding someone (grab / drag / leech). */
  holds: PlayerId | null;
  /** Rounds until its call brings help (0 = no call going). */
  calling: number;
  phase: number;
  /** Rounds since the fight began when it joined. */
  joined: number;
  /** Rounds it has acted (for `every` moves). */
  acted: number;
  /** Once-moves already used. */
  used: string[];
}

export interface Intent {
  move: string;
  target?: PlayerId;
}

export interface FightState {
  id: number;
  area: string;
  /** Part of a story scene (the scene waits for it). */
  scene: boolean;
  party: PlayerId[];
  /** The dog fights along. */
  dog: boolean;
  foes: FoeState[];
  round: number;
  picks: Partial<Record<PlayerId, string>>;
  /** What happened last round, per player. */
  lines: Record<PlayerId, string[]>;
  nextUid: number;
  /** Who got down (and is out until lifted). */
  down: PlayerId[];
  /** Players who ran. */
  fled: PlayerId[];
  /** Heroes already lifted once (a second fall is for good). */
  lifted?: PlayerId[];
  /** Enemy traits revealed during this fight (for the bestiary line). */
  startedAt: number;
}

export interface ResidentState {
  /** Action id they work at, or null. */
  job: string | null;
  /** Fraction of the next unit (by resource). */
  acc: Record<string, number>;
  hurtUntil: number;
  hungry: boolean;
  since: number;
}

/** What part one left behind (imported once from its world). */
export interface Legacy {
  ending: number;
  flags: Record<string, number>;
  players: Array<{ pid: PlayerId; name: string; gender: Gender; role: Role | null; flags: Record<string, number> }>;
  rescued: number;
  npcs: Record<string, number>;
}

export interface WorldState {
  version: number;
  part: number;
  meta: {
    seed: number;
    rng: number;
    createdAt: number;
    lastTick: number;
    day: number;
    act: number;
    nextLogId: number;
    actDone: number;
    /** Real time when the current day began (v3): evening falls as it gets long. */
    dayAt: number;
  };
  players: Record<PlayerId, PlayerState>;
  res: Record<string, number>;
  /** Resources ever seen (so they stay in the list at 0). */
  seenRes: Record<string, number>;
  flags: Record<string, number>;
  stove: { fuel: number; lit: boolean };
  /** Small happenings: when each hero (and the home) may get the next, when each was last, the open cards. */
  events?: {
    next: Record<string, number>;
    last: Record<string, number>;
    open: Array<{ uid: number; id: string; pid: PlayerId | null; area: string; at: number }>;
    uid: number;
  };
  /** The weather now, until when it holds, and what comes after it. */
  weather?: { id: string; until: number; next: string };
  /** Campfires burning away from home: area → when it goes out. */
  fires?: Record<string, number>;
  scene: SceneState | null;
  proposal: Proposal | null;
  log: LogEntry[];
  clues: Record<string, { who: PlayerId[]; at: number }>;
  mysteries: Record<string, number>;
  npcs: Record<string, { met: boolean; rel: number }>;
  goal: string | null;
  /** Side errands: begun, done, or closed another way. */
  quests?: Record<string, 'on' | 'done' | 'closed'>;
  stats: Stats;

  // ----- part two -----
  fights: FightState[];
  nextFightId: number;
  bestiary: Record<string, { seen: number; beaten: number; known: string[] }>;
  residents: Record<string, ResidentState>;
  legacy: Legacy | null;
  /** Last time residents' work was counted. */
  workAt: number;
  /** Scenes queued by effects, started when the current scene ends. */
  chain?: string[];
}
