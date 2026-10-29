// Content model: everything the engine executes is described by these types.
// Content modules (content/actN) export plain data that satisfies them.

export type Role = 'hunter' | 'maker';
export type Gender = 'm' | 'f';
export type PlayerId = 'p1' | 'p2';
export const PLAYER_IDS: readonly PlayerId[] = ['p1', 'p2'];

import type { CropLook, ItemIcon, PortraitId, SceneId, SpotIcon } from './pictures.js';

/** Condition evaluated against the world (and, where relevant, a viewing/acting player). */
export type Cond =
  | { flag: string; gte?: number; lt?: number }
  | { noFlag: string }
  | { pflag: string }
  | { noPflag: string }
  | { partnerPflag: string }
  | { res: string; gte?: number; lt?: number }
  | { day: number }
  | { role: Role }
  | { clue: string }
  | { anyClue: string }
  | { partnerJoined: boolean }
  | { partnerOnline: boolean }
  | { stove: 'warm' | 'cold' | 'never' }
  | { rel: string; gte?: number; lt?: number }
  /** Viewer / partner is in this area. */
  | { at: string }
  | { partnerAt: string }
  /** Hero level of the viewer (or the higher of the two without a viewer). */
  | { level: number }
  /** The viewer has a tool of this kind on (in any slot). */
  | { tool: string }
  /** Some hero is wearing / owns (storage + worn + bags) this item. */
  | { owns: string; gte?: number }
  /** Some hero has this item on. */
  | { worn: string }
  /** An enemy trait has been seen (bestiary) / an enemy met. */
  | { trait: string }
  | { met: string }
  /** It is evening now (the day grows long). */
  | { evening: boolean }
  /** The weather now is this one. */
  | { weather: string }
  /** This resident lives in the household. */
  | { resident: string }
  /** This thing has been in the store at least once. */
  | { seen: string }
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond };

/** A text, optionally with conditional variants (first matching variant wins). */
export type TextVariant = { if?: Cond; text: string };
export type Text = string | TextVariant[];
/**
 * Paragraphs. A string is one paragraph. An array of only variant objects is ONE paragraph with
 * variants (first match). Any other array is a list of paragraphs, where a string is a plain
 * paragraph, a variant object is a conditional paragraph and a nested array is a variant group.
 */
export type Para = string | TextVariant | TextVariant[];
export type Paras = string | Para[];

/**
 * Log text field: a Text, or a random pool — an array with plain strings (and optionally
 * conditional variants) from which one eligible line is picked at random.
 */
export type LogLine = Text | Array<string | TextVariant>;

/**
 * Log line. `self` is shown to the actor (2nd person), `other` to the partner (3rd person,
 * `{name}` and `{a|b}` refer to the actor). `all` is shown to everyone with the viewer as subject.
 */
export interface LogText {
  self?: LogLine;
  other?: LogLine;
  all?: LogLine;
  kind?: LogKind;
}
export type LogKind = 'story' | 'act' | 'find' | 'warn' | 'system' | 'day' | 'goal';

export type EffectTarget = 'actor' | 'both' | Role;

export type Effect =
  | { set: string; value?: number }
  | { unset: string }
  | { inc: string; by?: number; max?: number }
  | { pset: string; who?: EffectTarget; value?: number }
  | { add: Record<string, number> }
  | { take: Record<string, number> }
  | { clue: string }
  | { log: LogText }
  | { mystery: string; level: number }
  | { rel: string; by: number }
  | { meet: string }
  | { scene: string }
  | { advanceDay: true }
  | { heal: number | 'full'; who?: EffectTarget }
  /** A dish goes into the meal slots (if there is room for it), without being paid for. */
  | { eat: string; who?: EffectTarget }
  | { stove: number }
  | { actDone: number }
  | { startAct: number }
  /** Move players to another area (travel). */
  | { moveTo: string; who?: EffectTarget }
  /** Hero experience for the target(s). */
  | { xp: number; who?: EffectTarget }
  /** A resident joins the household. */
  | { resident: string }
  /** Ask the server to keep a snapshot of the world (a checkpoint). */
  | { checkpoint: string }
  /** Put things into the bag(s) of the target(s) instead of the home store. */
  | { give: Record<string, number>; who?: EffectTarget }
  /** Put a piece of gear straight on the target (or into the store if the slot is taken). */
  | { wear: string; who?: EffectTarget }
  /** Start a fight in the actor's area (outside scenes). */
  | { fight: Array<{ enemy: string; n?: number }> }
  /** A perk (usually an errand's) for the target(s). */
  | { perk: string; who?: EffectTarget }
  /** Water the home garden (it grows faster while moist). */
  | { garden: 'water' }
  | { if: Cond; then: Effect[]; else?: Effect[] };

export interface ResourceDef {
  id: string;
  name: string;
  /** A resident's tool: it lifts the work of this trade. */
  folkTool?: string;
  /** Base storage cap; undefined = unlimited. */
  cap?: number;
  capBonus?: Array<{ if: Cond; add: number }>;
  /** Hidden counters are never shown to players (reservoirs, internal stock). */
  hidden?: boolean;
  /**
   * res: material; tool: a unique thing; people: counters of folk; gear: something to wear or wield;
   * use: a consumable that can be taken along and used (also in fights); food: eaten.
   */
  kind?: 'res' | 'tool' | 'people' | 'gear' | 'use' | 'food';
  desc?: Text;
  order: number;
  /** Weight in a bag (default 1). */
  weight?: number;
  gear?: GearDef;
  use?: UseDef;
  /** Goods to sell: while this holds, they can be taken from the store along in the bag. */
  ware?: Cond;
  /** Its small mark in lists (every visible thing has one). */
  icon?: ItemIcon;
  /** A dish: eaten, it fills one of the hero's meal slots for a while. */
  meal?: MealDef;
}

/** What a dish gives while it lasts (see NEED in rules.ts). */
export interface MealDef {
  hp: number;
  dmg?: number;
  /** How long it lasts, minutes of play. */
  minutes: number;
  /** Eaten hot: warms up right away (points of warmth). */
  warm?: number;
}

export type Slot = 'head' | 'body' | 'hands' | 'legs' | 'weapon' | 'offhand' | 'belt';
export const SLOTS: readonly Slot[] = ['weapon', 'offhand', 'head', 'body', 'hands', 'legs', 'belt'];
export type StatId = 'str' | 'agi' | 'end' | 'per' | 'wil';
export const STATS: readonly StatId[] = ['str', 'agi', 'end', 'per', 'wil'];
export type SkillId = 'melee' | 'ranged' | 'gather' | 'craft' | 'trail';
export const SKILLS: readonly SkillId[] = ['melee', 'ranged', 'gather', 'craft', 'trail'];
export type ResistId = 'venom' | 'salt' | 'cold';
export type GearTag = 'pierce' | 'reach' | 'fire' | 'ranged' | 'heavy' | 'noise' | 'blunt' | 'cleave' | 'shield';
export type TraitId =
  | 'pack'
  | 'fast'
  | 'armored'
  | 'charge'
  | 'venom'
  | 'grab'
  | 'thief'
  | 'caller'
  | 'night'
  | 'fearFire'
  | 'fearNoise'
  | 'drag'
  | 'leech'
  | 'shield';

export interface GearDef {
  slot: Slot;
  armor?: number;
  hp?: number;
  /** Hit chance bonus (0.05 = +5%). */
  acc?: number;
  dmg?: [number, number];
  dodge?: number;
  carry?: number;
  resist?: ResistId[];
  tags?: GearTag[];
  /** Tool kinds it serves as: blade, axe, pick, gloves, light, net… */
  tools?: string[];
  /** Ranged weapons spend this per shot (taken from the bag). */
  ammo?: string;
  /** Faster gathering of actions that need one of its tools (0.25 = 25% faster). */
  speed?: number;
}

/** A consumable: what using it does (in a fight, or anywhere for heal). */
export interface UseDef {
  heal?: number;
  cure?: Array<'poison' | 'leech' | 'grab'>;
  /** Scares beasts with this trait (adds fear to all of them), or stuns callers. */
  scare?: { trait: TraitId; fear: number };
  /** Damage to one foe (thrown). */
  dmg?: [number, number];
  /** Usable outside fights too (eat, bandage). */
  anywhere?: boolean;
  /** Not used up (a rattle, a horn). */
  reusable?: boolean;
  /** A hot drink: points of warmth at once, and for `warmFor` ms the cold bites half as hard. */
  warm?: number;
  warmFor?: number;
  label: Text;
  log: LogText;
}

export interface ChanceDef {
  p: number;
  add?: Record<string, number>;
  effects?: Effect[];
  log?: LogText;
  if?: Cond;
}

/** One-time vignette shown instead of the usual log the next time the action is done. */
export interface BeatDef {
  log: LogText;
  effects?: Effect[];
  if?: Cond;
}

export interface ActionDef {
  id: string;
  label: Text;
  /** Location / group id where the button lives. */
  group: string;
  /** Named spot of that location on its plan. */
  spot?: string;
  /**
   * The mark on its button when what it gives is not a thing (a skill, a building, an errand): a thing's
   * icon (ITEM_ICONS) or `spot:` + a spot icon. Works that give a marked thing show that thing's.
   */
  icon?: string;
  role?: Role;
  /** Can be done only once in the whole world. */
  once?: boolean;
  /** Can be done once by each player. */
  oncePerPlayer?: boolean;
  visible?: Cond;
  enabled?: Cond;
  disabledHint?: Text;
  cost?: Record<string, number>;
  yield?: Record<string, number | [number, number]>;
  /** Repeat yield/chance rolls once per unit of this resource (e.g. placed snares). */
  rollsPer?: string;
  chance?: ChanceDef[];
  effects?: Effect[];
  /** How long the player is busy (all routine actions locked), ms. */
  cooldown: number;
  /** Extra per-action recharge before this action can be repeated, ms. */
  recharge?: number;
  /** Partner-visible status while busy: 3rd person, `{a|b}` = actor gender. */
  busy?: Text;
  log?: LogText | LogText[];
  /** Vignettes, each shown once (in order, skipping ones whose condition fails). */
  beats?: BeatDef[];
  /** Extra "what you get" line for results the engine cannot describe (unlocks, upgrades). */
  gives?: Text;
  hint?: Text;
  kind?: 'gather' | 'craft' | 'build' | 'home' | 'train' | 'trade';
  /** Why this recipe exists (the need it answers), shown with it. */
  why?: Text;
  /** Part of this side errand (players see it like any other; the test bots leave it alone unless told). */
  quest?: string;
  /** Hide when this many of the yielded gear exist (stored + worn + carried). Default for gear: 2. */
  limit?: number;
  /** Needs a tool of this kind on (shown disabled with the reason otherwise). */
  tool?: string;
  /** A tool of this kind (not required) makes it faster. */
  boost?: string;
  /** Skill that grows with it and speeds it up. */
  skill?: SkillId;
  /** Chance of being attacked while doing it (overrides the area's). */
  /** Work in water: the hero gets wet. */
  wet?: boolean;
  ambush?: number;
  /** Residents can be set to do it: yield units per hour of real time. */
  job?: { rate: number };
  /** Skill experience instead of things (training). */
  train?: { skill: SkillId; xp: number };
  /** The role does it this much better (time ×1/x, default 1). */
  knack?: { role: Role; x: number };
}

/** A together action that starts a scene picked from a pool (e.g. supper). */
export interface PoolActionDef {
  id: string;
  label: Text;
  group: string;
  spot?: string;
  pool: string;
  visible?: Cond;
  enabled?: Cond;
  disabledHint?: Text;
  cost?: Record<string, number>;
  gives?: Text;
  hint?: Text;
}

export interface LocationDef {
  id: string;
  name: string;
  desc: Text;
  visible: Cond;
  order: number;
  base?: boolean;
  /** Area the location belongs to (default: the first area). Players see only their area. */
  area?: string;
  /** A shared piece of work shown as a bar: the flag counts up to max. */
  progress?: { flag: string; max: number; label: string };
  /**
   * The place on the drawn plan of its area (per cent of width and height) and its picture.
   * A place has either one spot (`plan`) or several named ones (`spots`), or both: then whatever
   * names no spot goes to `plan`.
   */
  plan?: PlanSpot;
  spots?: NamedSpot[];
}

export interface PlanSpot {
  x: number;
  y: number;
  icon: SpotIcon;
}

/** A named spot inside a place: actions, scenes and pools pick it with `spot`. */
export interface NamedSpot extends PlanSpot {
  id: string;
  name: string;
}

/**
 * Spots of every plan the interface draws itself: the way out, the store (the bag away from home)
 * and the people. Places keep clear of them all.
 */
export const PLAN_FIXED: Readonly<Record<'gate' | 'store' | 'folk', PlanSpot>> = {
  gate: { x: 50, y: 90, icon: 'gate' },
  store: { x: 37, y: 66, icon: 'store' },
  folk: { x: 63, y: 66, icon: 'folk' },
};

/** A place players can be in. `where` is the locative form for texts ("у Ясенці"). */
export interface AreaDef {
  id: string;
  name: string;
  where: string;
  /** The ground its plan is drawn on. */
  scene?: SceneId;
  /** Map position (grid units). */
  pos?: [number, number];
  /** Ways to neighbouring places: base travel time, ms; some open only when a condition holds. */
  links?: Array<{ to: string; time: number; if?: Cond }>;
  /** Recommended hero level. */
  danger?: number;
  /** Who may jump at you here (weighted). */
  foes?: FoeEntry[];
  /** Chance of an attack per action / arrival. */
  /** Wet underfoot: arriving here soaks the hero (unless something keeps feet dry). */
  wet?: boolean;
  ambush?: number;
  /** Home: the store is here, the bag is emptied on arrival. */
  home?: boolean;
  /** The place is on the map at all (as '?') while this holds. */
  visible?: Cond;
  /** Scene that explores it (both together); until done the place cannot be entered alone. */
  scout?: string;
  desc?: Text;
  /** Hardships of the place: without the resist/tool, each action here hurts. */
  cond?: Array<{ need: string; hp: number; text: Text }>;
  /** Under a roof or underground: the weather does not reach it. */
  roof?: boolean;
}

export interface FoeEntry {
  enemy: string;
  n?: [number, number];
  w: number;
  /** Only in the evening. */
  night?: boolean;
  if?: Cond;
}

export type EnemyMoveKind = 'attack' | 'charge' | 'grab' | 'steal' | 'call' | 'venom' | 'leech' | 'guard' | 'drag';

export interface EnemyMove {
  move: EnemyMoveKind;
  w?: number;
  /** Every n rounds (from round `from`, default 1). */
  every?: number;
  from?: number;
  once?: boolean;
}

export interface EnemyDef {
  id: string;
  /** Nominative, accusative, genitive (sg). */
  name: string;
  acc: string;
  gen: string;
  level: number;
  hp: number;
  dmg: [number, number];
  armor?: number;
  /** Harder to hit (−5% per point). */
  evade?: number;
  /** Fear it can take before fleeing; undefined = never flees. */
  morale?: number;
  traits: TraitId[];
  /** Traits not obvious at first sight (the hunter notices them). */
  hidden?: TraitId[];
  ai: EnemyMove[];
  loot?: Record<string, [number, number]>;
  rare?: { p: number; loot: Record<string, number> };
  /** People are knocked down, never killed. */
  humane?: boolean;
  desc: Text;
  /** Phases by remaining health (fraction): new moves, armor, help arriving. */
  phases?: Array<{ below: number; text: Text; ai?: EnemyMove[]; armor?: number; add?: Array<{ enemy: string; n?: number }> }>;
  /** Who comes when it calls. */
  calls?: string;
  /** Flavour of its attack (3rd person present, e.g. «кусає»). */
  verb: string;
  /** Its portrait. */
  icon: PortraitId;
}

export interface ResidentTraitDef {
  name: string;
  text: Text;
  /** Job output multiplier by action id or by `skill:<id>`. */
  mult?: Record<string, number>;
  /** Will not work these actions. */
  avoid?: string[];
}

/** A trade of residents: the jobs it holds, who of the heroes can teach it to a master's hand. */
export interface TradeDef {
  id: string;
  name: string;
  teach: Role[];
  /** Job action ids (each job in exactly one trade). */
  jobs: string[];
}

export interface ResidentDef {
  id: string;
  name: Text;
  desc: Text;
  traits: ResidentTraitDef[];
}

export interface PerkDef {
  id: string;
  name: string;
  text: string;
  /** Earned on an errand only, never on a level (outside the tree). */
  quest?: boolean;
  /** Where it stands in the tree: the branch and the step (1-based); each step is a pair, one or the other. */
  branch?: string;
  tier?: number;
  /** A move of its own in a fight (a `tech` of the same id), not a standing gain. */
  active?: boolean;
}

/** A branch of the perk tree. */
export interface PerkBranchDef {
  id: string;
  name: string;
  text: string;
}

/**
 * A side errand. It appears in the journal once `start` holds; its current step is the first one
 * whose `done` fails; it is done when every step is. `fail` closes it another way (a choice).
 */
export interface QuestDef {
  id: string;
  title: string;
  act: number;
  /** Who asked, or where it began (one line). */
  from: Text;
  start: Cond;
  steps: Array<{ text: Text; done: Cond }>;
  /** What came of it (shown once done). */
  reward: Text;
  fail?: Cond;
  failText?: Text;
}

export interface OptionDef {
  id: string;
  label: Text;
  visible?: Cond;
  /** Shown but not selectable while this fails. */
  enabled?: Cond;
  disabledHint?: Text;
  /** Only this role may pick it (others see it greyed out). */
  role?: Role;
  next?: string | null;
  effects?: Effect[];
  /** For `any` hubs: option disappears once picked. */
  once?: boolean;
}

interface NodeBase {
  /** Shared narrative. */
  text?: Paras;
  /** Personal narrative, only the player with this role receives it. */
  hunter?: Paras;
  maker?: Paras;
  effects?: Effect[];
}

export interface TextNode extends NodeBase {
  type?: 'text';
  /** null/undefined = scene ends after this node. */
  next?: string | null;
  goto?: Array<{ if: Cond; next: string | null }>;
  button?: Text;
  /** Ending here does not mark the scene as done (it can be replayed). */
  incomplete?: boolean;
}

export interface ChoiceNode extends NodeBase {
  type: 'choice';
  /**
   * joint: both pick, equal picks follow the option, different picks go to `mismatch`.
   * each: both pick for themselves; afterwards go to `next`.
   * any: the first pick decides (question hubs).
   */
  mode: 'joint' | 'each' | 'any';
  options: OptionDef[];
  mismatch?: string;
  next?: string | null;
}

export interface CombatNode extends NodeBase {
  type: 'combat';
  enc: string;
  win: string;
  lose: string;
}

/**
 * Exploring a map underground, both players together, with a limited light. Each step costs light;
 * the party moves when both pick the same way. Each role notices different things about the ways
 * (the hunter feels the air, the maker reads the stone). Rooms remember being found, and one-time
 * finds stay found, so a failed descent still teaches the map.
 */
export interface DelveNode extends NodeBase {
  type: 'delve';
  map: string;
  light: number;
  /** Extra light while a condition holds (a better lamp…). */
  bonus?: Array<{ if: Cond; light: number }>;
  /** Start somewhere else once something has been reached (first match). */
  starts?: Array<{ if: Cond; room: string }>;
  /** Walking out of the start room. */
  out: string | null;
  /** The light gives out. */
  dark: string | null;
}

/**
 * Slipping past watchers: a path of tiles, a rhythm of looks. Only the hunter sees when the
 * watchers look; only the maker sees which stones are loose. Each turn both pick: step, creep
 * (silent but slow) or freeze. Moving while watched, or stepping on loose stones, raises the alarm.
 */
export interface StealthNode extends NodeBase {
  type: 'stealth';
  /** Tiles to cross; true = loose stones. */
  path: boolean[];
  /** The watchers' heads, turn after turn (repeats); true = looking this way. */
  watch: boolean[];
  /** Caught when the alarm reaches this. */
  alarm: number;
  /** Extra slack while a condition holds. */
  bonus?: Array<{ if: Cond; alarm?: number; time?: number }>;
  /** Time before the earplugs give out (a creep takes two). */
  time: number;
  /** What each role perceives: the watchers' heads, the stones underfoot. */
  sees: { watching: Text; away: Text; loose: Text; firm: Text };
  win: string;
  lose: string;
}

/** A counter shown as a bar during an operation. */
export interface OperationTrackDef {
  id: string;
  label: string;
  max: number;
  start?: number;
  /** Kept in this world flag: read at the start, written every turn (survives a failed attempt). */
  flag?: string;
  /** Rising is bad; reaching max fails the operation. */
  bad?: boolean;
}

export interface OperationMoveDef {
  id: string;
  label: Text;
  role?: Role;
  visible?: Cond;
  enabled?: Cond;
  disabledHint?: Text;
  cost?: Record<string, number>;
  /** Change of tracks. */
  delta?: Record<string, number>;
  /** Move up to n from one track to another (e.g. awake people → out). */
  transfer?: { from: string; to: string; n: number };
  /** Extra while a condition holds. */
  bonus?: Array<{ if: Cond; delta?: Record<string, number>; n?: number }>;
  log: LogText;
}

/**
 * Two fronts at once: every turn both pick a move (each from their own set), the world pushes back
 * (events), the bars show where things stand. A bad bar reaching its max fails; when the turns run
 * out, the win track decides.
 */
export interface OperationNode extends NodeBase {
  type: 'operation';
  turns: number;
  tracks: OperationTrackDef[];
  moves: OperationMoveDef[];
  /** What the world does after both moves (from turn `from`, every `every` turns). */
  events: Array<{ from?: number; every?: number; delta: Record<string, number>; text: Text; if?: Cond }>;
  win: { track: string; gte: number; next: string };
  /** The turns ran out short of the win. */
  lose: string;
  /** A bad track reached its max. */
  fail: string;
}

/** A fight inside a scene: the scene waits for its end. Losing returns to `lose` (retry later). */
/**
 * A ground drawn by hand for a fight (bosses, errands): 8 rows of 7 letters, see FIELD_KEYS in
 * server/src/engine/terrain.ts; `h` marks where the heroes come in, `f` where the foes stand (in order), `F` a foe waiting in deep water.
 */
export interface FieldDef {
  ground: string;
  rows: string[];
}

export interface FightNode extends NodeBase {
  type: 'fight';
  foes: Array<{ enemy: string; n?: number }>;
  /** Fought on this ground instead of one made for the place. */
  field?: FieldDef;
  win: string;
  lose: string;
}

export type SceneNode = TextNode | ChoiceNode | CombatNode | DelveNode | StealthNode | OperationNode | FightNode;

export interface DelveExitDef {
  to: string;
  label: Text;
  visible?: Cond;
  enabled?: Cond;
  disabledHint?: Text;
  /** Light it takes (default 1). */
  light?: number;
  /** What each role notices about this way. */
  hunter?: Text;
  maker?: Text;
  /** The hunter feels air moving this way. */
  draft?: boolean;
  /** Bad stone: on a roll, it costs extra light or strength. The maker sees it coming. */
  risk?: { p: number; light?: number; hp?: number; log: LogText };
}

export interface DelveActDef {
  id: string;
  label: Text;
  role?: Role;
  visible?: Cond;
  enabled?: Cond;
  disabledHint?: Text;
  /** Once in the whole world (default true). */
  once?: boolean;
  /** Light it takes; negative gives light. */
  light?: number;
  cost?: Record<string, number>;
  effects?: Effect[];
  log: LogText;
  /** What it gives, for the label (else derived from effects). */
  gives?: Text;
}

export interface DelveRoomDef {
  name: string;
  /** Grid position for the map drawing. */
  pos: [number, number];
  text: Paras;
  hunter?: Paras;
  maker?: Paras;
  /** Effects the first time anyone enters. */
  first?: Effect[];
  exits: DelveExitDef[];
  acts?: DelveActDef[];
  /** Entering leaves the map for a scene node (first match); the map resumes when it comes back. */
  enter?: Array<{ if?: Cond; next: string }>;
}

export interface DelveMapDef {
  id: string;
  name: string;
  start: string;
  rooms: Record<string, DelveRoomDef>;
}

export interface SceneDef {
  id: string;
  title: string;
  /** Where the proposal button is shown (absent = can only be started by effects/pools). */
  group?: string;
  spot?: string;
  label?: Text;
  visible?: Cond;
  enabled?: Cond;
  disabledHint?: Text;
  cost?: Record<string, number>;
  /** What the scene gives; without it the button shows "+?". */
  gives?: Text;
  /** Default true: once completed it disappears. */
  once?: boolean;
  /** Part of this side errand. */
  quest?: string;
  /** Completing this scene marks the location as explored. */
  explores?: string;
  pool?: string;
  priority?: number;
  start: string;
  nodes: Record<string, SceneNode>;
  onEnd?: Effect[];
  summary?: LogText;
}

export interface CombatOptionDef {
  id: string;
  label: Text;
  role?: Role;
  visible?: Cond;
  cost?: Record<string, number>;
  dmg?: [number, number];
  fear?: number;
  hit?: number;
  defend?: boolean;
  taunt?: boolean;
  heal?: number;
  /** Narrative of the move: self/other perspectives. */
  log: LogText;
  miss?: LogText;
}

export interface EncounterDef {
  id: string;
  name: string;
  enemy: { name: string; hp: number; fear: number; dmg: [number, number] };
  options: CombatOptionDef[];
  /** Option available to a downed player. */
  downOption: CombatOptionDef;
  ally?: { if: Cond; fear?: number; dmg?: [number, number]; log: LogText };
  armor?: { if: Cond; value: number };
  enemyLog: LogText;
  enemyMissLog?: LogText;
  /** The fight is lost if it drags on this long (default 15 rounds). */
  maxRounds?: number;
  /** Names of the two bars when they mean something else (e.g. a book catching fire). */
  bars?: { hp?: string; fear?: string };
}

export interface ClueDef {
  id: string;
  title: string;
  text: Text;
  to: 'both' | Role;
  mystery?: string;
}

export interface MysteryDef {
  id: string;
  question: string;
  order: number;
}

export interface GoalDef {
  id: string;
  text: Text;
  /** The current goal is the first one in the list whose condition holds. */
  when?: Cond;
}

export interface NpcDef {
  id: string;
  name: Text;
  desc: Text;
}

/**
 * Daily change: add `add` (× the amount of resource `per`, if given) to a resource or a flag.
 * Flags never go below `min` (default 0).
 */
export interface DailyDef {
  res?: string;
  flag?: string;
  add: number;
  per?: string;
  min?: number;
  if?: Cond;
}

export interface NeedsDef {
  /** The needs count from this moment on (before it, nothing is shown). */
  from: Cond;
  /** What makes home cosy: each that holds adds one to the comfort of a rest by the home fire. */
  comfort: Array<{ if: Cond; name: Text }>;
  /** A dish the heroes are taken to have just eaten when the needs begin. */
  snack?: string;
  /** Burnt for a campfire away from home (from the bag), and what lights it (owned). */
  campWood: string;
  campLight?: string;
}

/** A crop of the home garden: planted from its seed, grows in real time (also while nobody plays). */
export interface CropDef {
  id: string;
  /** What goes into the ground (one, from the store). */
  seed: string;
  /** Growing time at the plain pace (dry, calm weather), ms. */
  grows: number;
  /** What a ripe bed gives (into the store). */
  yield: Record<string, number | [number, number]>;
  /** How it is drawn on the bed. */
  look: CropLook;
  /** What it is while it grows: sown, come up, growing, nearly ripe. */
  stages: [string, string, string, string];
}

export interface GardenDef {
  /** The home place whose panel shows the beds. */
  group: string;
  /** How many beds there are: the largest `n` whose condition holds. */
  beds: Array<{ if: Cond; n: number }>;
  crops: CropDef[];
  /** Watering keeps the beds moist this long, and moist they grow this many times as fast. */
  wetFor: number;
  wet: number;
  /** The action residents can be set to: they keep the beds watered while the store has `water`. */
  tend?: string;
  water: string;
}

/** One way an event can go (picked by weight when a choice has several). */
export interface EventOutcome {
  w?: number;
  effects?: Effect[];
  /** What happened, for the log (the one who chose; at home everyone sees it). */
  log: Text;
}

export interface EventChoice {
  label: Text;
  /** Paid from the bag away from home, from the store at home. */
  cost?: Record<string, number>;
  /** Shown but locked while this does not hold (with `why`). */
  if?: Cond;
  why?: Text;
  outcomes: EventOutcome[];
}

/**
 * A small happening between the story's beats. Home ones come while someone is at home and are
 * shared (either hero may answer); road ones on arriving somewhere, place ones after work there.
 * Without choices it simply happens (a line in the log); with them, a card waits for an answer.
 */
export interface EventDef {
  id: string;
  where: 'home' | 'road' | 'place';
  /** Only in these places (road / place). */
  areas?: string[];
  when?: Cond;
  weight: number;
  /** Once ever; otherwise not again for `again` ms (default two hours of play). */
  once?: boolean;
  again?: number;
  text: Text;
  /** Without choices: what it does at once, and the log line is `text`. */
  effects?: Effect[];
  /** good: a find; bad: a warning (colours the log line of a choice-less event). */
  tone?: 'good' | 'bad';
  choices?: EventChoice[];
}

export interface EventSetDef {
  /** Events come from this moment on. */
  from: Cond;
  /** Time between two events for one hero (and for the home), ms. */
  gap: [number, number];
  /** Chance that a due event comes on arriving somewhere / after work away from home. */
  road: number;
  place: number;
  kinds: EventDef[];
}

/** How the sky looks behind the page (client layer over the place's own backdrop). */
export type SkyKind = 'rain' | 'storm' | 'wind' | 'frost' | 'heat' | 'fog';

/**
 * A kind of weather. It holds for both heroes at once; its effects are trade-offs and count only
 * outside (away from home, not under a roof), except the effect on the residents' work.
 */
export interface WeatherDef {
  id: string;
  name: string;
  /** Lines for the log when it sets in (one at random). */
  log: string[];
  /** How often it comes compared to the others; `when` limits it to a part of the story. */
  weight: number;
  when?: Cond;
  sky?: SkyKind;
  /** Work and walking take this many times longer. */
  pace?: number;
  travel?: number;
  /** Chance of an attack × this. */
  ambush?: number;
  /** Chill points per minute outside (negative: it warms). */
  chill?: number;
  /** Wet clothes dry this many times as fast (0: they do not dry outside at all). */
  dry?: number;
  /** Wet places do not soak (the ground is frozen). */
  frozen?: boolean;
  /** Residents' work × this. */
  jobs?: number;
  /** Experience from fights × this. */
  xp?: number;
  /** Some kinds of work (by their accent) sometimes yield one more. */
  bonus?: { fx: FxKind[]; p: number; text: string };
  /** The garden grows this many times as fast; rain waters it. */
  grow?: number;
  waters?: boolean;
}

export interface WeatherSetDef {
  /** The weather turns from this moment on (before it the sky is just the place's own). */
  from: Cond;
  /** How long one weather holds, ms (random between). */
  span: [number, number];
  /** The first weather. */
  first: string;
  kinds: WeatherDef[];
}

export interface StoveDef {
  /** Burn time of one log, ms. */
  perWood: number;
  maxWood: number;
  coldPenalty: number;
  low: number;
}

/** Backdrop of the place a player is in. */
export type AmbientKind = 'cellar' | 'candle' | 'snow' | 'river' | 'cave' | 'marsh' | 'salt' | 'grove' | 'hill' | 'fog';
/** What an action looks and sounds like while it runs (each kind has its own sound). */
export type FxKind =
  | 'fire' // stoking a fire
  | 'flint' // striking a light
  | 'forge' // hammer on hot iron
  | 'whet' // whetstone on a blade
  | 'chop' // axe into wood
  | 'water' // bucket, water drawn
  | 'fish' // line cast, fish trap
  | 'row' // oars, crossing water
  | 'steam' // pot on the fire
  | 'walk' // steps
  | 'twigs' // steps and snapping dry wood
  | 'snare' // steps and a creaking noose
  | 'send' // several people walking off
  | 'arrow' // bowstring and arrow
  | 'string' // fitting a bowstring
  | 'carve' // knife whittling
  | 'rope' // twisting fibre
  | 'build' // hammering wood
  | 'rubble' // stones and earth
  | 'scrap' // scrap iron
  | 'sift' // flour
  | 'rummage' // searching chests and sacks
  | 'bowl' // feeding an animal
  | 'salt' // knife, board and salt
  | 'wax' // kneading wax
  | 'hive' // a hive in winter
  | 'trade' // sacks changing hands
  | 'care' // pouring a drink, a spoon
  | 'breath' // slow breathing
  | 'heart'; // a heartbeat

/** Ambience; the action accents also tell the weather which work it favours. */
export interface AmbientDef {
  /** Backdrop per area id. */
  areas: Record<string, AmbientKind>;
  /** Checked in order before `areas` (e.g. the prologue cellar). */
  overrides?: Array<{ when: Cond; kind: AmbientKind }>;
  /** A fire burns in this area (besides the home stove) while the condition holds. */
  fires?: Record<string, Cond>;
  /** Action id → accent shown while it runs. */
  actions: Record<string, FxKind>;
}

export interface Content {
  areas: AreaDef[];
  resources: ResourceDef[];
  actions: ActionDef[];
  pools: PoolActionDef[];
  locations: LocationDef[];
  scenes: SceneDef[];
  encounters: EncounterDef[];
  clues: ClueDef[];
  mysteries: MysteryDef[];
  goals: GoalDef[];
  npcs: NpcDef[];
  stove: StoveDef;
  /** Hunger, warmth and rest of the heroes. */
  needs?: NeedsDef;
  weather?: WeatherSetDef;
  events?: EventSetDef;
  garden?: GardenDef;
  ambient?: AmbientDef;
  maps?: DelveMapDef[];
  /** Applied every time a new day starts (after a supper). */
  daily?: DailyDef[];
  start: {
    resources: Record<string, number>;
    hp: number;
    /** Where the heroes are when the game begins (default: home). */
    area?: string;
  };
  enemies: EnemyDef[];
  residents: ResidentDef[];
  perks: PerkDef[];
  traits: Record<TraitId, { name: string; text: string }>;
  hero: {
    base: Record<Role, Record<StatId, number>>;
    /** The branches of the perk tree. */
    branches: PerkBranchDef[];
    /** The hero level each step of the tree opens at (index 0 — step 1). */
    tiers: number[];
  };
  /** What residents eat (one an hour each). */
  food?: string;
  /** The dog that follows the hunter (once this flag is set). */
  dog?: {
    flag: string;
    name: string;
    /** Taught by the pack: stops a charge or a grab more often, smells ambushes on the road. */
    trained?: Cond;
    /** Bites harder. */
    collar?: Cond;
  };
  /** Side errands. */
  quests?: QuestDef[];
  /** Trades residents grow in (see `.design/residents2.md`). */
  trades?: TradeDef[];
  /** Residents work faster while these hold (multipliers). */
  workBonus?: Array<{ if: Cond; mult: number }>;
  /** Flag prefixes / names that mark story progress (solo play must never change them). */
  storyFlags: string[];
  actEnd: Record<number, string>;
  roleTitles: Record<Role, { m: string; f: string }>;
  ui: Record<string, string>;
}
