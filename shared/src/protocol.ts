import type { FightEvent } from './state.js';
import type { Field } from './field.js';
import type { AmbientKind, SkyKind, FxKind, Gender, PlayerId, Role, LogKind } from './content.js';
import type { CropLook } from './pictures.js';

// ---------- Client -> server ----------

export type Command =
  | { c: 'act'; id: string }
  | { c: 'accept' }
  | { c: 'decline' }
  | { c: 'cancel' }
  | { c: 'next' }
  | { c: 'choose'; id: string }
  /** Close a one-time panel: the return summary or the end-of-act summary. */
  | { c: 'ack'; what: 'welcome' | 'summary' }
  /** A hand sign to the partner during a scene. */
  | { c: 'sign'; id: string }
  /** Walk to a neighbouring place. */
  | { c: 'go'; to: string }
  /** Put on (id) or take off (null) something; at home only. */
  | { c: 'equip'; slot: string; id: string | null }
  /** Save the current outfit under a name, or put a saved one on. */
  | { c: 'outfit'; name: string; save: boolean }
  /** Take things from the home store into the bag (n > 0) or put them back (n < 0). */
  | { c: 'pack'; id: string; n: number }
  /** Throw things out of the bag. */
  | { c: 'drop'; id: string; n: number }
  /** Use a consumable outside a fight (eat, bandage). */
  | { c: 'use'; id: string }
  /** Spend a stat point / pick a perk. */
  | { c: 'stat'; id: string }
  | { c: 'perk'; id: string }
  /** Spend a rank of temper (past the act's level ceiling): hp, carry, pace or gift. */
  | { c: 'temper'; id: string }
  /** A move in a fight: hit:<uid>, shoot:<uid>, guard, cover, free, lift, use:<item>, flee. */
  | { c: 'fight'; id: string }
  /** Join a fight going on where you stand. */
  | { c: 'help' }
  | { c: 'loot' }
  /** Set a resident to work (action id) or let them rest (null). */
  | { c: 'job'; who: string; id: string | null }
  | { c: 'feed'; dishes: boolean }
  | { c: 'teach'; who: string }
  | { c: 'folkgear'; who: string; slot: 'tool' | 'wear'; id: string | null }
  /** Eat a dish (from the bag, or at home from the store). */
  | { c: 'eat'; id: string }
  /** Light a campfire where you stand (away from home). */
  | { c: 'camp' }
  /** Rest by a fire: at home or at a campfire. */
  | { c: 'rest' }
  /** Answer a small happening (the card's uid and the choice's index). */
  | { c: 'event'; uid: number; choice: number }
  /** The home garden: sow a seed into an empty bed, gather a ripe one. */
  | { c: 'plant'; bed: number; crop: string }
  /** bed -1: every ripe bed. */
  | { c: 'harvest'; bed: number }
  /** The asks board: ask the other to bring n of a thing home; take an ask of mine back. */
  | { c: 'ask'; res: string; n: number }
  /** Go into one's own past (memories) from the fire at home, or come back. */
  | { c: 'remember'; on: boolean }
  /** Propose / agree to the hard road, or turn it off. */
  | { c: 'hard'; on: boolean }
  | { c: 'unask'; id: number };

export type ClientMsg =
  | { t: 'hello'; token: string }
  | { t: 'lobby'; code: string }
  | { t: 'join'; code: string; name: string; gender: Gender; role: Role }
  | { t: 'claim'; code: string; pid: PlayerId }
  | { t: 'cmd'; cmd: Command; seq?: number }
  | { t: 'sync' }
  | { t: 'ping' };

// ---------- Server -> client ----------

export interface LobbySlot {
  pid: PlayerId;
  joined: boolean;
  name?: string;
  role?: Role;
  roleTitle?: string;
}

export type ServerMsg =
  | { t: 'lobby'; slots: LobbySlot[]; freeRoles: Role[] }
  | { t: 'welcome'; token: string; pid: PlayerId }
  | { t: 'view'; v: PlayerView; rev: number }
  | { t: 'err'; code: ErrCode; text: string }
  | { t: 'ack'; seq?: number; ok: boolean; text?: string; rev: number }
  | { t: 'pong' }
  /** What changed in the shared stock after someone's command (shown as a popup to both). */
  | { t: 'delta'; by: PlayerId; together: boolean; items: DeltaItem[] };

export interface DeltaItem {
  id: string;
  name: string;
  n: number;
  /** Its small mark (see ITEM_ICONS). */
  icon?: string;
}

export type ErrCode = 'bad_code' | 'bad_token' | 'slots_full' | 'role_taken' | 'bad_input' | 'rate_limited' | 'not_authed';

export interface CostView {
  name: string;
  n: number;
  have: number;
  ok: boolean;
  id: string;
  /** Internal stock (cellar, scrap pile): show how much is left, not a price. */
  stock?: boolean;
}

/** What a button gives. `unsure` = depends on luck or is unknown ("+?"). */
export interface GainView {
  text: string;
  unsure?: boolean;
}

export interface EntryView {
  id: string;
  kind: 'act' | 'scene' | 'pool' | 'go';
  label: string;
  enabled: boolean;
  hint?: string;
  reason?: string;
  cost?: CostView[];
  gain?: GainView[];
  /** Server time (ms) when this player's cooldown ends. */
  readyAt?: number;
  cooldown?: number;
  together?: boolean;
  fresh?: boolean;
  /** Named spot of its place on the plan. */
  spot?: string;
  /** Part of a side errand. */
  quest?: boolean;
  /** Readies a together scene. */
  prep?: boolean;
  /** A together scene that can be readied: how much of it is. */
  readied?: { n: number; of: number };
  /** What it is for, so a long workplace can be laid out in sections: done together, upkeep, or what it makes. */
  sort?: EntrySort;
  /** The mark for its button: a thing's icon, `spot:` + a spot icon, or (a way out) `@` + the scene it leads to. */
  icon?: string;
}

export type EntrySort =
  | 'pair'
  | 'keep'
  | 'build'
  | 'train'
  | 'sell'
  | 'buy'
  | 'arms'
  | 'wear'
  | 'tool'
  | 'food'
  | 'use'
  | 'make';

export interface GroupView {
  id: string;
  name: string;
  desc: string;
  base: boolean;
  entries: EntryView[];
  /** A shared piece of work in progress. */
  progress?: { label: string; n: number; max: number };
  /** What only the partner's role can do here (read-only, so the two can plan together). */
  partner?: MateEntryView[];
  /** Where it stands on the drawn plan of its area. */
  plan?: { x: number; y: number; icon: string };
  /** Named spots inside it (entries pick one by `spot`). */
  spots?: Array<{ id: string; name: string; x: number; y: number; icon: string }>;
}

export interface MateEntryView {
  id: string;
  label: string;
  /** The partner could do it right now. */
  ready: boolean;
  reason?: string;
  cost?: CostView[];
  gain?: GainView[];
  spot?: string;
}

export interface PartnerView {
  pid: PlayerId;
  joined: boolean;
  name: string;
  gender: Gender;
  role: Role | null;
  roleTitle: string;
  online: boolean;
  /** In their own past (memories). */
  remembering?: boolean;
  area: string;
  where: string;
  busy: { text: string; from: number; until: number } | null;
  hp: number;
  hpMax: number;
}

export interface MeView {
  pid: PlayerId;
  area: string;
  where: string;
  name: string;
  gender: Gender;
  role: Role;
  roleTitle: string;
  hp: number;
  hpMax: number;
}

export interface OptionView {
  id: string;
  label: string;
  enabled: boolean;
  reason?: string;
}

export interface SceneBlock {
  /** Shared paragraphs. */
  text: string[];
  /** Personal paragraphs, seen by this player only. */
  own: string[];
  /** What was decided at this step, if anything. */
  picks?: string;
  combat?: string[];
}

export interface SceneView {
  id: string;
  title: string;
  /** Sound and light of the scene: by the fire, a fight, or the story itself. */
  mood: 'hearth' | 'fight' | 'story' | 'deep';
  /** The ground of the place it happens at (its picture). */
  place?: string;
  paused: boolean;
  pausedText?: string;
  blocks: SceneBlock[];
  kind: 'text' | 'choice' | 'combat' | 'delve' | 'stealth' | 'operation' | 'fight';
  mode?: 'joint' | 'each' | 'any';
  button?: string;
  options?: OptionView[];
  myPick?: string;
  partnerPicked: boolean;
  waiting: boolean;
  waitingText?: string;
  combat?: {
    enemy: string;
    hp: number;
    hpMax: number;
    fear: number;
    fearMax: number;
    round: number;
    lastRound: string[];
    /** Bar names when they mean something else than strength and fear. */
    hpLabel?: string;
    fearLabel?: string;
  };
  delve?: DelveView;
  stealth?: StealthView;
  operation?: OperationView;
  /** Hand signs: mine and the partner's latest. */
  signs?: { mine?: string; partner?: string; fresh: boolean };
}

export interface DelveRoomView {
  id: string;
  name: string;
  x: number;
  y: number;
  here: boolean;
  /** Not been there yet: only seen as a way leading somewhere. */
  unknown: boolean;
}

export interface DelveView {
  map: string;
  /** A road with a cart: the light is the caravan's store. */
  trek?: boolean;
  room: string;
  /** The room as everyone sees it, and what only this player notices. */
  text: string[];
  own: string[];
  light: number;
  lightMax: number;
  rooms: DelveRoomView[];
  links: Array<[string, string]>;
  exits: Array<{
    id: string;
    to: string;
    label: string;
    light: number;
    /** What this player notices about the way (their role only). */
    note?: string;
    tone?: 'warn' | 'lead';
    enabled: boolean;
    reason?: string;
    mine: boolean;
    partner: boolean;
    known: boolean;
  }>;
  acts: Array<{ id: string; label: string; light: number; enabled: boolean; reason?: string; gives?: string }>;
  canLeave: boolean;
  lines: string[];
}

export interface OperationView {
  turn: number;
  turns: number;
  tracks: Array<{ id: string; label: string; value: number; max: number; bad: boolean; goal?: number }>;
  moves: Array<{
    id: string;
    label: string;
    enabled: boolean;
    reason?: string;
    /** What it does, for the label and for planning: track id → change. */
    delta: Record<string, number>;
    transfer?: { from: string; to: string; n: number };
    cost?: CostView[];
  }>;
  myPick?: string;
  partnerPicked: boolean;
  lines: string[];
}

export interface StealthView {
  pos: number;
  length: number;
  alarm: number;
  alarmMax: number;
  time: number;
  timeMax: number;
  /** What this player perceives now and on the next turn (their role only). */
  now?: string;
  next?: string;
  /** Which tiles this player knows to be loose (maker), or nothing. */
  loose?: boolean[];
  /** Whether the watchers look now / on the next turn (hunter), or nothing. */
  look?: { now: boolean; next: boolean };
  myPick?: string;
  partnerPicked: boolean;
  lines: string[];
}

export interface ProposalView {
  title: string;
  label: string;
  mine: boolean;
  text: string;
}

export interface ResView {
  id: string;
  name: string;
  n: number;
  cap?: number;
  kind: 'res' | 'tool' | 'people' | 'gear' | 'use' | 'food';
  weight?: number;
  /** One line about it (gear stats, what a consumable does). */
  note?: string;
  /** Goods: can be taken along to sell. */
  ware?: boolean;
  icon?: string;
}

export interface StatView {
  id: string;
  name: string;
  value: number;
  /** What it does, short. */
  text: string;
}

export interface SkillView {
  id: string;
  name: string;
  level: number;
  /** Progress to the next level 0..1. */
  p: number;
  /** What it gives now (empty at 0). */
  text: string;
}

/** A perk on the hero screen: where it stands for this hero (see `perkState`). */
export interface PerkView {
  id: string;
  name: string;
  text: string;
  state: 'have' | 'can' | 'wait' | 'closed' | 'locked';
  /** A move of its own in a fight. */
  active?: boolean;
}

export interface PerkBranchView {
  id: string;
  name: string;
  text: string;
  /** Perks taken in it. */
  taken: number;
  /** Steps top-down: the level it opens at and its pair. */
  tiers: Array<{ level: number; perks: PerkView[] }>;
}

export interface SlotView {
  slot: string;
  name: string;
  item: { id: string; name: string; note: string; icon?: string } | null;
  /** What could go here from the home store. */
  options: Array<{ id: string; name: string; note: string; n: number; icon?: string }>;
}

export interface HeroView {
  level: number;
  xp: number;
  xpPrev: number;
  xpNext: number;
  points: number;
  stats: StatView[];
  skills: SkillView[];
  /** Unspent perk points. */
  perkPoints: number;
  /** The perk tree. */
  branches: PerkBranchView[];
  /** Perks from outside the tree (errands). */
  special: Array<{ id: string; name: string; text: string }>;
  derived: { hpMax: number; armor: number; dodge: number; hit: number; dmg: [number, number]; carry: number; resist: string[]; tools: string[] };
  slots: SlotView[];
  outfits: Array<{ name: string; items: string[] }>;
  /** Gear can be changed only at home. */
  canChange: boolean;
  /** The highest level of this act (when there is one) and whether it is reached. */
  cap?: { level: number; reached: boolean };
  /** Past the ceiling: ranks, experience toward the next, what each kind gives and how much of it is taken. */
  temper?: {
    rank: number;
    points: number;
    xp: number;
    next: number;
    kinds: Array<{ id: string; name: string; text: string; taken: number; most: number | null }>;
  };
  /** Experience still counted double (the one behind, back after being away). */
  catchUp?: number;
}

export interface BagView {
  items: Array<{ id: string; name: string; n: number; weight: number; kind: string; usable: boolean; note?: string; icon?: string }>;
  load: number;
  cap: number;
}

/** Times are ms of play left at `now`; they run only while the player is in the game outside joint scenes. */
export interface NeedsView {
  /** The clock is stopped (a joint scene holds everyone). */
  paused: boolean;
  slots: number;
  meals: Array<{ id: string; name: string; icon?: string; left: number; full: number; fadeAt: number; hp: number; dmg?: number }>;
  /** 0 = frozen, 100 = warm; it changes by `rate` points a minute. */
  warmth: number;
  rate: number;
  level: 'warm' | 'ok' | 'cold' | 'frozen';
  wet: number;
  /** Clothes dry this many times faster now (by a fire). */
  dry: number;
  drink: number;
  rested: number;
  /** Play since the last rest, and when that makes the hero tired. */
  awake: number;
  tiredAfter: number;
  fire: 'home' | 'low' | 'camp' | null;
  /** Buffs and troubles in effect now. */
  effects: Array<{ id: string; name: string; text: string; good: boolean }>;
  /** Dishes at hand (bag, and at home the store). */
  edible: Array<{ id: string; name: string; icon?: string; n: number; note: string; can: boolean; reason?: string }>;
  /** Hot drinks at hand. */
  drinks: Array<{ id: string; name: string; icon?: string; n: number; note: string }>;
  /** Away from home: a campfire to light here. */
  camp: { can: boolean; reason?: string; wood: number; need: number; until: number | null } | null;
  rest: { can: boolean; reason?: string; minutes: number };
  /** What makes home cosy (only what is there). */
  comfort: string[];
}

/** A side errand in the journal. */
export interface QuestView {
  id: string;
  title: string;
  from: string;
  state: 'on' | 'done' | 'closed';
  /** Steps done so far, and the one to do now (while it is open). */
  done: string[];
  now: string | null;
  /** What came of it (done or closed). */
  outcome?: string;
}

/** What can be done alone before a together scene (the journal, «До зустрічі»). */
export interface PrepView {
  scene: string;
  title: string;
  /** Where the scene is begun (a place name), when it has one. */
  where?: string;
  items: Array<{ id: string; text: string; role?: Role; mine: boolean; done: boolean; gives?: string }>;
}

export interface HardView {
  on: boolean;
  asked: 'me' | 'mate' | null;
}

export interface MapNodeView {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Explored (can be entered alone). */
  known: boolean;
  here: boolean;
  partner: boolean;
  home: boolean;
  /** Its mark (the ground it is drawn on), once known. */
  icon?: string;
  danger: number;
  /** Known foes of the place. */
  foes: Array<{ name: string; icon: string }>;
  /** Can walk there from here now, and how long it takes. */
  go?: { time: number; enabled: boolean; reason?: string; via?: string[] };
  /** A joint scouting scene to propose from here. */
  scout?: { id: string; label: string; enabled: boolean; reason?: string };
  desc?: string;
}

/** The stretch of road a hero walks right now, and the stops still ahead after it. */
export interface MapLegView {
  from: string;
  to: string;
  since: number;
  until: number;
  next: string[];
}

export interface MapView {
  nodes: MapNodeView[];
  links: Array<[string, string]>;
  travel: { to: string; name: string; since: number; until: number } | null;
  /** Where on the road each hero is (the partner only while in the game). */
  legs: { me: MapLegView | null; mate: MapLegView | null };
}

export interface YardPieceView {
  key: string;
  x: number;
  y: number;
  w: number;
  spot?: string;
  edge?: boolean;
}

export interface FoeView {
  uid: number;
  name: string;
  icon: string;
  hp: number;
  hpMax: number;
  fear?: number;
  morale?: number;
  out: null | 'dead' | 'fled' | 'down';
  level: number;
  intent?: string;
  /** What it does next round (the hunter reads beasts). */
  next?: string;
  traits: string[];
  /** The maker sees where the armour gives. */
  weak?: string;
  holds?: string;
  calling?: number;
  /** The kind of its move this round and whom it is for (for the mark over it and the line to the hero). */
  move?: string;
  aim?: PlayerId;
  /** The kind of its next move (seen by the hunter). */
  nextMove?: string;
  /** Open to blows; dazed (loses its move). */
  open?: boolean;
  stunned?: boolean;
  /** Where it stands; the run of a charge it has marked. */
  pos?: [number, number];
  line?: Array<[number, number]>;
  guarding?: boolean;
  /** A seasoned one (its mark is first among the traits). */
  elite?: boolean;
  /** The one a story fight is about (it has phases): its words open the fight. */
  boss?: { desc: string };
}

export interface FightMoveView {
  id: string;
  label: string;
  enabled: boolean;
  reason?: string;
  group: 'hit' | 'self' | 'help' | 'item' | 'out';
  /** A move of a hand: its name alone, which hand, price in breath, damage, a short note. */
  tech?: string;
  name?: string;
  note?: string;
  hand?: 'main' | 'off';
  cost?: number;
  dmg?: [number, number];
  /** Aimed at this foe. */
  target?: number;
  /** A move a perk gives. */
  perk?: boolean;
  /** The item it uses (icon), for the belt of a fight. */
  icon?: string;
}

/** What a hero holds in a hand, for the fight's hand cards. */
export interface HandView {
  name: string;
  icon?: string;
  dmg?: [number, number];
}

export interface FightView {
  id: number;
  round: number;
  scene: boolean;
  foes: FoeView[];
  party: Array<{
    pid: PlayerId;
    name: string;
    hp: number;
    hpMax: number;
    down: boolean;
    held: boolean;
    poison: number;
    picked: boolean;
    me: boolean;
    pos?: [number, number];
    /** Cut of the blows until their next turn (0..0.6), a stance held. */
    guard: number;
    stance?: string;
  }>;
  dog?: string;
  dogPos?: [number, number];
  /** The ground. */
  field: Field;
  /** Who moves in what order this round; whose turn it is. */
  order: Array<{ id: string; name: string; kind: 'hero' | 'foe' | 'dog'; icon?: string; me?: boolean }>;
  active?: string;
  myTurn: boolean;
  /** Action points left to you (on your turn) and of a full turn. */
  ap: number;
  apMax: number;
  /** Cells you can walk to now and what each costs. */
  reach: Array<{ c: [number, number]; cost: number }>;
  moves: FightMoveView[];
  /** What is in your hands. */
  hands: { main: HandView; off: HandView | null };
  /** The place, for the painted ground of the fight. */
  place?: string;
  /** The last round, beat by beat. */
  events: FightEvent[];
  myPick?: string;
  waiting: boolean;
  lines: string[];
  /** Set on a fight that has just ended (shown a moment so the last blow is seen). */
  ended?: 'win' | 'lose' | 'fled';
  /** A won fight's loot waiting on the field for you to take (empty: nothing to take, only to end it). */
  loot?: Array<{ id: string; name: string; icon?: string; n: number }>;
  /** The partner is fighting here and you could join. */
  canHelp?: boolean;
}

export interface ResidentView {
  id: string;
  name: string;
  desc: string;
  traits: Array<{ name: string; text: string }>;
  job: string | null;
  jobLabel?: string;
  /** What each can be set to; `icon` is the mark of what it brings. `rate` — a hour at the pace they would
   * work now; `food` — how the household's plain food an hour would stand (brought minus eaten) with this one at it. */
  jobs: Array<{ id: string; label: string; icon?: string; place: string; rate: number; reason?: string; food?: number; rank?: number }>;
  hurt: boolean;
  hungry: boolean;
  /** fed — full; low — a little slower; hungry — half; weak — does not work. */
  state: 'fed' | 'low' | 'hungry' | 'weak';
  /** Hours of work left in the belly; hours until they eat again (0: at the next chance). */
  fed: number;
  eatsIn: number;
  /** Plain food they eat an hour now. */
  eats: number;
  /** A cooked dish keeps them working better. */
  good: boolean;
  /** What they bring in an hour now at their job, and why it is that much (multipliers). */
  rate?: number;
  why?: Array<{ name: string; x: number }>;
  /** Plain food the household gets/loses an hour as it is now (for the job list). */
  food: number;
  /** Their step in the trade of the job they are at: progress to the next step by work (absent at the top). */
  trade?: { name: string; rank: number; rankName: string; x: number; p?: number; left?: number };
  /** Every trade they have some hand in. */
  trades: Array<{ name: string; rank: number; rankName: string }>;
  /** The last step of their trade is taught by a hero: why this one cannot now (absent: can). */
  teach?: { reason?: string };
  /** What they have on, and what the store holds for them (changed at home only). */
  gear: FolkGearView;
}

export interface FolkGarment {
  id: string;
  name: string;
  icon?: string;
  guard: boolean;
  warm: boolean;
  heavy: boolean;
}

export interface FolkGearView {
  tool: { id: string; name: string; icon?: string; trade: string; fits: boolean } | null;
  wear: FolkGarment | null;
  tools: Array<{ id: string; name: string; icon?: string; n: number; trade: string; fits: boolean }>;
  wears: Array<FolkGarment & { n: number }>;
  canChange: boolean;
}

export interface AskView {
  id: number;
  mine: boolean;
  res: string;
  name: string;
  icon?: string;
  n: number;
  got: number;
}

/** The household's food: eaten and brought in an hour, the store, how long it lasts. */
export interface LarderView {
  eat: number;
  gain: number;
  stock: number;
  cap: number;
  /** Hours until it runs out at this pace (absent: it does not). */
  lasts?: number;
  /** Cooked dishes in the store, and whether residents may eat them. */
  dishes: number;
  feedDishes: boolean;
  /** Residents not fed now. */
  hungry: number;
}

export interface BeastView {
  id: string;
  name: string;
  icon: string;
  level: number;
  desc: string;
  traits: Array<{ name: string; text: string }>;
  beaten: number;
}

export interface LogView {
  id: number;
  t: number;
  kind: LogKind;
  mine: boolean;
  partner: boolean;
  text: string;
}

export interface ClueView {
  id: string;
  title: string;
  text: string;
  personal: boolean;
  at: number;
  /** The question this clue belongs to (notes are grouped by it). */
  mystery?: string;
}

export interface QuestionView {
  id: string;
  question: string;
  level: number;
  levelText: string;
}

export interface PersonView {
  id: string;
  name: string;
  desc: string;
}

export interface AmbientView {
  kind: AmbientKind;
  /** The weather over the place (null under a roof or before the weather begins). */
  sky: SkyKind | null;
  fire: 'none' | 'warm' | 'low' | 'cold';
  /** Accent of this player's running action. */
  fx: FxKind | null;
  /** Accent of the partner's running action, only when the partner is here and online. */
  partnerFx: FxKind | null;
  /** Server time when each accent ends (the view is not resent when an action just runs out). */
  fxUntil: number;
  partnerFxUntil: number;
}

/** "While you were away": what changed since this player left. */
export interface WelcomeView {
  days: number;
  res: DeltaItem[];
  /** The partner's own log lines from that time, oldest first. */
  lines: string[];
  clues: number;
}

/** End-of-act summary: numbers only, no story. */
export interface SummaryView {
  act: number;
  /** The story has reached an ending: the numbers cover the whole game. */
  final: boolean;
  days: number;
  places: number;
  clues: number;
  cluesMine: number;
  solved: number;
  people: number;
  scenes: number;
  suppers: number;
  fights: number;
  crafted: number;
  trips: number;
  actions: { me: number; partner: number };
  gathered: DeltaItem[];
}

/** The home garden (at home, once there are beds). Growth is counted on by the client from `rate`. */
export interface GardenView {
  group: string;
  beds: Array<{
    crop: { id: string; name: string; icon?: string; look: CropLook; stages: [string, string, string, string]; gives: string } | null;
    grown: number;
    grows: number;
    ready: boolean;
  }>;
  /** How many times as fast it grows right now (water, weather). */
  rate: number;
  /** What makes it grow faster or slower now, with how many times. */
  why: Array<{ text: string; x: number; icon: string }>;
  /** Server time until the beds stay moist (0: dry). */
  wetUntil: number;
  /** Rain does the watering now. */
  rain: boolean;
  /** Seeds in the store, by crop. */
  seeds: Array<{ crop: string; name: string; icon?: string; look: CropLook; have: number; grows: number; gives: string }>;
}

/** A small happening waiting for an answer. */
export interface EventView {
  uid: number;
  text: string[];
  /** A home one: either hero at home may answer. */
  home: boolean;
  choices: Array<{ label: string; enabled: boolean; reason?: string; cost?: CostView[] }>;
}

/** The weather now and the forecast; effects count only outside. */
export interface WeatherView {
  id: string;
  name: string;
  sky: SkyKind | null;
  /** Server time when it turns. */
  until: number;
  next: string;
  /** This hero is out in it now. */
  outside: boolean;
  effects: Array<{ text: string; good: boolean }>;
}

export interface PlayerView {
  now: number;
  /** In the main world: whether one can go into one's past now (absent: there is no past for this hero). */
  memories?: { can: boolean; reason?: string };
  /** In one's past: its name (the screen is the same, the world is another). */
  past?: { title: string };
  me: MeView;
  partner: PartnerView;
  day: number;
  act: number;
  goal: string | null;
  stove: { state: 'never' | 'warm' | 'low' | 'cold'; text: string } ;
  /** Purely visual backdrop: weather of this place, its fire, running action accents. */
  ambient: AmbientView;
  status: string[];
  res: ResView[];
  groups: GroupView[];
  proposal: ProposalView | null;
  scene: SceneView | null;
  log: LogView[];
  journal: { clues: ClueView[]; questions: QuestionView[]; people: PersonView[]; quests: QuestView[]; preps: PrepView[] };
  actDone: { act: number; text: string } | null;
  welcome: WelcomeView | null;
  summary: SummaryView | null;
  /** Server time when the current day began: evening falls as it gets long. */
  dayAt: number;
  hero: HeroView;
  bag: BagView;
  /** Hunger, warmth and rest (null until they begin). */
  needs: NeedsView | null;
  weather: WeatherView | null;
  events: EventView[];
  garden: GardenView | null;
  /** What is built in the yard of home (and its people at work), to draw on its plan; empty away from home. */
  yard: YardPieceView[];
  map: MapView;
  fight: FightView | null;
  /** The fight that has just ended, after its last blow; only to be seen, never answered. */
  fightEnd: FightView | null;
  /** A fight of the partner where you stand (you may join). */
  nearFight: { id: number; text: string } | null;
  residents: ResidentView[];
  larder: LarderView | null;
  /** The asks board: what each asked the other to bring. */
  asks: AskView[];
  /** The hard road: on, and who proposed it if it waits for an answer (null before the partner joins). */
  hard: HardView | null;
  bestiary: BeastView[];
  /** Panels opened so far (the interface grows with the game). */
  tabs: string[];
  atHome: boolean;
  /** The ground the plan of where I stand is drawn on. */
  ground?: string;
  /** Busy state of this player: all routine actions wait until then. */
  busyUntil: number;
  busyFrom: number;
  busyAction: string | null;
}
