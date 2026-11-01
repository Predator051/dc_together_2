// Small happenings between the story's beats: at home (shared by both), on the road, at work away from home.
// They come rarely (a gap of a quarter of an hour or so per hero and for the home), never in a fight
// or a joint scene, and never stop anything: a card waits for an answer, or it simply happens.
import type { EventDef, EventOutcome, PlayerId } from '../../../shared/src/content.js';
import type { EventView } from '../../../shared/src/protocol.js';
import type { Game, Result } from './index.js';

const HOUR = 3_600_000;
/** The key of the home's own timer. */
const HOME = 'home';

type EventsState = NonNullable<Game['s']['events']>;

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
  // a card from the road or from work goes away when its hero walks off
  s.open = s.open.filter((o) => o.pid === null || (g.p(o.pid).at === o.area && !g.p(o.pid).travel));
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
  if (o.pid !== null ? o.pid !== pid : !g.atHome(pid)) return null;
  return o;
}

export function answerEvent(g: Game, pid: PlayerId, uid: number, choice: number): Result {
  const o = cardFor(g, pid, uid);
  const def = o && defOf(g, o.id);
  const ch = def?.choices?.[choice];
  if (!o || !ch) return g.fail('err_not_now');
  if (g.p(pid).fight !== null) return g.fail('err_in_fight');
  if (g.sceneBlocksRoutine()) return g.fail('err_in_scene');
  if (ch.if && !g.test(ch.if, pid)) return { ok: false, err: ch.why ? g.render(ch.why, pid) : g.ix.ui('err_not_now') };
  if (!g.hasCostFor(pid, ch.cost)) return g.fail('err_cost');
  g.payCostFor(pid, ch.cost);
  const s = stateOf(g);
  s.open = s.open.filter((x) => x.uid !== uid);
  const out: EventOutcome = ch.outcomes.length > 1 ? weighted(g, ch.outcomes) : ch.outcomes[0]!;
  // at home both see what came of it; away only the one who was there
  if (o.pid === null) g.log({ all: out.log, kind: 'find' });
  else g.log({ self: out.log, kind: 'find' }, pid);
  g.apply(out.effects, pid);
  return { ok: true };
}

export function eventsView(g: Game, pid: PlayerId, cost: (c: Record<string, number> | undefined) => EventView['choices'][number]['cost']): EventView[] {
  const s = g.s.events;
  if (!s || !eventsOn(g)) return [];
  const out: EventView[] = [];
  for (const o of s.open) {
    if (!cardFor(g, pid, o.uid)) continue;
    const def = defOf(g, o.id);
    if (!def?.choices) continue;
    out.push({
      uid: o.uid,
      text: g.render(def.text, pid).split('\n'),
      home: o.pid === null,
      choices: def.choices.map((ch) => {
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
