// Small happenings between the story's beats: at home (shared by both), on the road, at work away from home.
// They come now and then (a gap of ten minutes or so per hero and for the home), never in a fight
// or a joint scene. Each is a short scene in its own window: it waits for an answer, may go on for a step
// or two, and shows what came of it until the one who answered closes it.
import type { Effect, EventChoice, EventDef, EventOutcome, PlayerId, Text } from '../../../shared/src/content.js';
import type { EventView } from '../../../shared/src/protocol.js';
import type { Game, Result } from './index.js';

const HOUR = 3_600_000;
/** The key of the home's own timer. */
const HOME = 'home';

type EventsState = NonNullable<Game['s']['events']>;
type Open = EventsState['open'][number];

export function eventsOn(g: Game): boolean {
  const e = g.ix.c.events;
  return !!e && g.test(e.from);
}

function stateOf(g: Game): EventsState {
  return (g.s.events ??= { next: {}, last: {}, open: [], uid: 1 });
}

function defOf(g: Game, id: string): EventDef | undefined {
  return g.ix.c.events?.kinds.find((e) => e.id === id);
}

/** What is seen at the step a card has come to, and what can be done there. */
function stageOf(def: EventDef, o: Open): { text: Text; choices: EventChoice[] } | null {
  if (o.stage) return def.stages?.[o.stage] ?? null;
  return def.choices ? { text: def.text, choices: def.choices } : null;
}

/** What an answer brought and took, to be read with what came of it (the cost, then the effects). */
function tally(g: Game, cost: Record<string, number> | undefined, effects: Effect[] | undefined): Array<{ name: string; n: number }> {
  const sum = new Map<string, number>();
  const put = (name: string, n: number) => sum.set(name, (sum.get(name) ?? 0) + n);
  const res = (id: string) => g.ix.res.get(id)?.name ?? id;
  for (const [id, n] of Object.entries(cost ?? {})) put(res(id), -n);
  for (const e of effects ?? []) {
    if ('add' in e) for (const [id, n] of Object.entries(e.add)) put(res(id), n);
    else if ('give' in e) for (const [id, n] of Object.entries(e.give)) put(res(id), n);
    else if ('take' in e) for (const [id, n] of Object.entries(e.take)) put(res(id), -n);
    else if ('heal' in e && typeof e.heal === 'number') put(g.ix.ui('st_hp'), e.heal);
    else if ('xp' in e) put(g.ix.ui('xp_short'), e.xp);
  }
  return [...sum].filter(([, n]) => n !== 0).map(([name, n]) => ({ name, n }));
}

function gap(g: Game): number {
  const [a, b] = g.ix.c.events!.gap;
  return g.rng.int(a, b);
}

/** The timer of this hero (or of the home) has run out; the first look only starts it. */
function due(g: Game, key: string): boolean {
  const s = stateOf(g);
  const at = s.next[key];
  if (at === undefined) {
    s.next[key] = g.now + gap(g);
    return false;
  }
  return g.now >= at;
}

function eligible(g: Game, where: EventDef['where'], pid: PlayerId | undefined, area: string): EventDef[] {
  const s = stateOf(g);
  return g.ix.c.events!.kinds.filter((e) => {
    if (e.where !== where) return false;
    if (e.areas && !e.areas.includes(area)) return false;
    const last = s.last[e.id];
    if (last !== undefined && (e.once || g.now - last < (e.again ?? 2 * HOUR))) return false;
    if (s.open.some((o) => o.id === e.id)) return false;
    return !e.when || g.test(e.when, pid);
  });
}

function weighted<T extends { w?: number; weight?: number }>(g: Game, list: T[]): T {
  const w = (x: T) => x.w ?? x.weight ?? 1;
  let r = g.rng.next() * list.reduce((s, x) => s + w(x), 0);
  for (const x of list) {
    r -= w(x);
    if (r <= 0) return x;
  }
  return list[list.length - 1]!;
}

function fire(g: Game, e: EventDef, key: string, pid: PlayerId | null, area: string, actor: PlayerId): void {
  const s = stateOf(g);
  s.last[e.id] = g.now;
  s.next[key] = g.now + gap(g);
  if (e.choices?.length) {
    s.open.push({ uid: s.uid++, id: e.id, pid, area, at: g.now });
    return;
  }
  const kind = e.tone === 'bad' ? 'warn' : 'find';
  if (pid) g.log({ self: e.text, kind }, pid);
  else g.log({ all: e.text, kind });
  g.apply(e.effects, actor);
}

function tryAway(g: Game, where: 'road' | 'place', pid: PlayerId, chance: number): void {
  if (!eventsOn(g)) return;
  const p = g.p(pid);
  if (p.fight !== null || p.travel || !p.online || g.s.scene || g.atHome(pid)) return;
  if (stateOf(g).open.some((o) => o.pid === pid)) return;
  if (!due(g, pid) || !g.rng.chance(chance)) return;
  const list = eligible(g, where, pid, p.at);
  if (list.length) fire(g, weighted(g, list), pid, pid, p.at, pid);
}

/** On arriving somewhere away from home (when no beast jumped out). */
export function roadEvent(g: Game, pid: PlayerId): void {
  tryAway(g, 'road', pid, g.ix.c.events?.road ?? 0);
}

/** After work away from home (when no beast jumped out). */
export function placeEvent(g: Game, pid: PlayerId): void {
  tryAway(g, 'place', pid, g.ix.c.events?.place ?? 0);
}

/** Cards left behind go away; at home, a happening when its time comes. True when something changed. */
export function settleEvents(g: Game): boolean {
  if (!eventsOn(g)) return false;
  const s = stateOf(g);
  const before = s.open.length;
  // a card from the road or from work goes away when its hero walks off (and one no longer in the game)
  s.open = s.open.filter((o) => defOf(g, o.id) && (o.pid === null || (g.p(o.pid).at === o.area && !g.p(o.pid).travel)));
  const changed = s.open.length !== before;
  if (g.s.scene || s.open.some((o) => o.pid === null)) return changed;
  const home = g.joinedIds().filter((pid) => g.p(pid).online && g.atHome(pid) && g.p(pid).fight === null);
  if (!home.length || !due(g, HOME)) return changed;
  const list = eligible(g, 'home', undefined, g.homeArea);
  if (!list.length) {
    s.next[HOME] = g.now + gap(g);
    return changed;
  }
  fire(g, weighted(g, list), HOME, null, g.homeArea, home[0]!);
  return true;
}

function cardFor(g: Game, pid: PlayerId, uid: number) {
  const o = g.s.events?.open.find((x) => x.uid === uid);
  if (!o) return null;
  // what came of it is for the one who answered
  if (o.done) return o.done.by === pid ? o : null;
  if (o.pid !== null ? o.pid !== pid : !g.atHome(pid)) return null;
  return o;
}

export function answerEvent(g: Game, pid: PlayerId, uid: number, choice: number): Result {
  const o = cardFor(g, pid, uid);
  const s = stateOf(g);
  if (o?.done) {
    if (choice !== -1) return g.fail('err_not_now');
    s.open = s.open.filter((x) => x.uid !== uid);
    return { ok: true };
  }
  const def = o && defOf(g, o.id);
  const ch = def && stageOf(def, o)?.choices[choice];
  if (!o || !ch) return g.fail('err_not_now');
  if (g.p(pid).fight !== null) return g.fail('err_in_fight');
  if (g.sceneBlocksRoutine()) return g.fail('err_in_scene');
  if (ch.if && !g.test(ch.if, pid)) return { ok: false, err: ch.why ? g.render(ch.why, pid) : g.ix.ui('err_not_now') };
  if (!g.hasCostFor(pid, ch.cost)) return g.fail('err_cost');
  g.payCostFor(pid, ch.cost);
  const out: EventOutcome = ch.outcomes.length > 1 ? weighted(g, ch.outcomes) : ch.outcomes[0]!;
  // at home both read what came of it in the log; away only the one who was there
  if (o.pid === null) g.log({ all: out.log, kind: 'find' });
  else g.log({ self: out.log, kind: 'find' }, pid);
  g.apply(out.effects, pid);
  const text = g.render(out.log, pid);
  if (g.p(pid).fight !== null) {
    // a fight broke out: the fight itself is what came of it
    s.open = s.open.filter((x) => x.uid !== uid);
  } else if (out.next && def.stages?.[out.next]) {
    o.stage = out.next;
    o.lead = text;
  } else {
    delete o.lead;
    const gains = tally(g, ch.cost, out.effects);
    o.done = { by: pid, text, ...(gains.length ? { gains } : {}) };
  }
  return { ok: true };
}

export function eventsView(g: Game, pid: PlayerId, cost: (c: Record<string, number> | undefined) => EventView['choices'][number]['cost']): EventView[] {
  const s = g.s.events;
  if (!s || !eventsOn(g)) return [];
  const out: EventView[] = [];
  for (const o of s.open) {
    if (!cardFor(g, pid, o.uid)) continue;
    const def = defOf(g, o.id);
    if (!def) continue;
    const base = { uid: o.uid, art: def.art ?? def.id, home: o.pid === null };
    if (o.done) {
      out.push({ ...base, lead: [], text: o.done.text.split('\n'), done: true, gains: o.done.gains ?? [], choices: [] });
      continue;
    }
    const st = stageOf(def, o);
    if (!st) continue;
    out.push({
      ...base,
      lead: o.lead ? o.lead.split('\n') : [],
      text: g.render(st.text, pid).split('\n'),
      done: false,
      gains: [],
      choices: st.choices.map((ch) => {
        const locked = ch.if && !g.test(ch.if, pid) ? (ch.why ? g.render(ch.why, pid) : g.ix.ui('err_not_now')) : null;
        const broke = !g.hasCostFor(pid, ch.cost);
        const c = cost(ch.cost);
        return {
          label: g.render(ch.label, pid),
          enabled: !locked && !broke,
          ...(locked ? { reason: locked } : broke ? { reason: g.ix.ui('err_cost') } : {}),
          ...(c ? { cost: c } : {}),
        };
      }),
    });
  }
  return out;
}
