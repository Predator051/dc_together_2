import type { AmbientKind, SkyKind, FxKind, Gender, PlayerId, Role, LogKind } from './content.js';

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
  /** A move in a fight: hit:<uid>, shoot:<uid>, guard, cover, free, lift, use:<item>, flee. */
  | { c: 'fight'; id: string }
  /** Join a fight going on where you stand. */
  | { c: 'help' }
  /** Set a resident to work (action id) or let them rest (null). */
  | { c: 'job'; who: string; id: string | null }
  /** Eat a dish (from the bag, or at home from the store). */
  | { c: 'eat'; id: string }
  /** Light a campfire where you stand (away from home). */
  | { c: 'camp' }
  /** Rest by a fire: at home or at a campfire. */
  | { c: 'rest' };

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
}

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
  perks: Array<{ id: string; name: string; text: string }>;
  perkChoice: Array<{ id: string; name: string; text: string }> | null;
  derived: { hpMax: number; armor: number; dodge: number; hit: number; dmg: [number, number]; carry: number; resist: string[]; tools: string[] };
  slots: SlotView[];
  outfits: Array<{ name: string; items: string[] }>;
  /** Gear can be changed only at home. */
  canChange: boolean;
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

export interface MapView {
  nodes: MapNodeView[];
  links: Array<[string, string]>;
  travel: { to: string; name: string; since: number; until: number } | null;
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
}

export interface FightView {
  id: number;
  round: number;
  scene: boolean;
  foes: FoeView[];
  party: Array<{ pid: PlayerId; name: string; hp: number; hpMax: number; down: boolean; held: boolean; poison: number; picked: boolean; me: boolean }>;
  dog?: string;
  moves: Array<{ id: string; label: string; enabled: boolean; reason?: string; group: 'hit' | 'self' | 'help' | 'item' | 'out' }>;
  myPick?: string;
  waiting: boolean;
  lines: string[];
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
  jobs: Array<{ id: string; label: string; place: string; rate: number; reason?: string }>;
  hurt: boolean;
  hungry: boolean;
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
  journal: { clues: ClueView[]; questions: QuestionView[]; people: PersonView[]; quests: QuestView[] };
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
  map: MapView;
  fight: FightView | null;
  /** A fight of the partner where you stand (you may join). */
  nearFight: { id: number; text: string } | null;
  residents: ResidentView[];
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
