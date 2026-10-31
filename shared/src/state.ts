import type { Field } from './field.js';
import type { TemperState } from './rules.js';
import type { Gender, PlayerId, Role, LogKind, Slot, StatId, SkillId } from './content.js';

/**
 * Part two starts its own line of world versions at 10 (part one ended at 3): a part-one world is
 * never migrated into part two — it is read once as the legacy and a new world begins.
 */
export const STATE_VERSION = 13;
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
  /** In the hero's own past (`.design/personal.md` §3): sitting by the fire at home, needs held. */
  remembering?: boolean;
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
  /** Unspent perk points (one per level from the second, v13). */
  perkPoints: number;
  /** Past the act's level ceiling. */
  temper?: TemperState;
  /** Experience still to be doubled: the one behind, back after being away. */
  catchUp?: number;
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
  /** What was paid to begin it (things of errands come back if it ends unfinished, to be tried again). */
  paid?: Record<string, number>;
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
  /** Who stands at which post (post id → resident id), and who has said they are ready. */
  squad?: { posts: Record<string, string>; ready: Partial<Record<PlayerId, boolean>> } | null;
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
  /** What it means to do on its next turn (whom it goes for, a charge, a call). */
  intent: Intent | null;
  /** Kept from the fights of rounds; unused on the field. */
  next: Intent | null;
  /** Holding someone (grab / drag / leech). */
  holds: PlayerId | null;
  /** Rounds until its call brings help (0 = no call going). */
  calling: number;
  phase: number;
  /** The round it joined. */
  joined: number;
  /** Turns it has had. */
  acted: number;
  /** Once-moves already used. */
  used: string[];
  /** Open to blows up to this round (knocked off balance, a charge gone wide). */
  open?: number;
  /** Dazed: loses its next turn. */
  stun?: boolean;
  /** The round it was last dazed (it cannot be dazed two rounds running). */
  stunAt?: number;
  /** Knocked down in this round (one who feels no pain gets up again). */
  downAt?: number;
  /** Got up once already. */
  rose?: boolean;
  /** Where it stands on the field. */
  pos?: [number, number];
  /** Behind its shield until its next turn. */
  guarding?: boolean;
  /** The last hero who struck it. */
  hitBy?: PlayerId;
  /** Turns in a row it could strike no one (a foe that can never get at anyone leaves). */
  idle?: number;
  /** The round it last cast a net (a net is gathered up again for two rounds). */
  netAt?: number;
  /** Struck by a hero who draws it on: its next turn goes at that hero only. */
  taunt?: PlayerId;
  /** Pinned by a shot: on its next turn it does not leave its cell. */
  rooted?: boolean;
  /** The round it last swung all round (a wide swing is gathered again for a while). */
  sweptAt?: number;
  /** An old and seasoned one of its kind: tougher, not to be driven off, more to take from it. */
  elite?: boolean;
}

/** One beat of a fight, for it to be played out on screen: who did what to whom. */
export interface FightEvent {
  /** Running number (the screen plays only beats it has not seen). */
  s?: number;
  /** Actor: a player id, `f<uid>` for a foe, `dog`. */
  a: string;
  /** Target, same kinds. */
  t?: string;
  k: 'hit' | 'miss' | 'block' | 'dodge' | 'stun' | 'open' | 'heal' | 'down' | 'flee' | 'guard' | 'aim' | 'breathe' | 'hold' | 'call' | 'tick' | 'move' | 'come';
  n?: number;
  /** A walk: the cells stepped on. */
  path?: Array<[number, number]>;
}

export interface Intent {
  move: string;
  target?: PlayerId;
  /** The run of a charge; the cells a wide swing will sweep. */
  line?: Array<[number, number]>;
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
  /** Kept from the fights of rounds; unused on the field. */
  picks?: Partial<Record<PlayerId, string>>;
  /** What has happened lately, per player (the last lines). */
  lines: Record<PlayerId, string[]>;
  nextUid: number;
  /** Who got down (and is out until lifted). */
  down: PlayerId[];
  /** Players who ran. */
  fled: PlayerId[];
  /** Heroes already lifted once (a second fall is for good). */
  lifted?: PlayerId[];
  startedAt: number;
  /** Heroes taking aim: the next shot lands, twice as hard. */
  aim?: PlayerId[];
  /** Foes already made tougher for two heroes. */
  duo?: boolean;
  /** Fought on the hard road. */
  hard?: boolean;
  /** The latest beats (numbered). */
  events?: FightEvent[];
  seq?: number;
  /** Driven off without a fight (the loot is taken all the same). */
  routed?: boolean;
  /** The ground. */
  field?: Field;
  /** Where the heroes and the dog stand. */
  pos?: Partial<Record<PlayerId, [number, number]>>;
  dogPos?: [number, number] | null;
  /** Who moves in what order (player ids, `f<uid>`, `dog`), whose turn it is, action points left. */
  order?: string[];
  turn?: number;
  ap?: number;
  /** Damage cut until each one's next turn (points left unspent), and stances held. */
  guard?: Record<string, number>;
  stance?: Record<string, 'keep' | 'block' | 'cover'>;
  /** Once-a-fight or once-a-turn perks already used (`<pid>:<perk>[:<round>]`). */
  used?: string[];
  /** Shots let fly by each hero (some come back after a win). */
  shots?: Partial<Record<PlayerId, number>>;
  /** The household helping from their posts (rendered when the fight began). */
  aid?: Array<{ do: 'heal' | 'stun' | 'hurt' | 'guard' | 'tie'; n: number; from: number; every: number; text: Record<PlayerId, string> }>;
}

export interface ResidentState {
  /** Action id they work at, or null. */
  job: string | null;
  /** Fraction of the next unit (by resource). */
  acc: Record<string, number>;
  hurtUntil: number;
  /** Some hunger now (any state but fed; kept for older readers). */
  hungry: boolean;
  since: number;
  /** Hours of work left in the belly (a working resident burns one an hour, a resting one half). */
  fed?: number;
  /** Hours gone without food once the belly was empty. */
  starve?: number;
  /** Hours left of a cooked dish's lift. */
  good?: number;
  /** Hours worked by trade; trades a hero taught to a master's hand. */
  exp?: Record<string, number>;
  master?: string[];
  /** What they have on: a tool of a trade, a garment (item ids, taken from the home store). */
  gear?: { tool?: string; wear?: string };
}

/** What part one left behind (imported once from its world). */
export interface Legacy {
  ending: number;
  flags: Record<string, number>;
  players: Array<{ pid: PlayerId; name: string; gender: Gender; role: Role | null; flags: Record<string, number> }>;
  rescued: number;
  npcs: Record<string, number>;
}

export interface AskState {
  id: number;
  by: PlayerId;
  res: string;
  n: number;
  got: number;
  at: number;
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
  /** The home garden: what grows in each bed and how far, until when it is watered, when last counted. */
  garden?: { beds: Array<{ crop: string | null; grown: number }>; wetUntil: number; at: number };
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
  /** What was already told of preparations: `open:<scene>` (it can be readied), `<prep id>` (readied). */
  preps?: Record<string, 1>;
  stats: Stats;

  // ----- part two -----
  fights: FightState[];
  nextFightId: number;
  bestiary: Record<string, { seen: number; beaten: number; known: string[] }>;
  residents: Record<string, ResidentState>;
  /** Residents may be fed cooked dishes from the store (else plain food only). */
  feedDishes?: boolean;
  /** Warned that the household's food runs short / that people go hungry (said once each). */
  larderLow?: boolean;
  folkHungry?: boolean;
  legacy: Legacy | null;
  /** Last time residents' work was counted. */
  workAt: number;
  /** Scenes queued by effects, started when the current scene ends. */
  chain?: string[];
  /** How each player's last fight ended, as it stood after the last blow (the view shows it a moment). */
  afterFight?: Partial<Record<PlayerId, { at: number; how: 'win' | 'lose' | 'fled'; fight: FightState; loot?: Record<string, number> }>>;
  /** What one hero has asked the other to bring home (the asks board); counted as the other brings it. */
  asks?: AskState[];
  /** A world for one hero (the past): scenes start at once, nobody waits for a partner. */
  solo?: boolean;
  /** In a past: the main story's flags as they were when the hero came in (what the past may reflect). */
  mainFlags?: Record<string, number>;
  /** The heroes' pasts, one world each (only in the main world). */
  past?: Partial<Record<PlayerId, WorldState>>;
  /** The hard road is on (both agreed). */
  hard?: boolean;
  /** One proposed the hard road; the other has not answered yet. */
  hardAsk?: { by: PlayerId; at: number } | null;
  nextAskId?: number;
}
