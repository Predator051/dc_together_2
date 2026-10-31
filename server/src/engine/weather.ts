// The weather: one sky over both heroes, turning every quarter of an hour or so of play.
// Its effects are trade-offs and count only outside: away from home and not under a roof.
import type { PlayerId, Season, WeatherDef } from '../../../shared/src/content.js';
import type { Game } from './index.js';
import { areaDef } from './travel.js';

export function weatherOn(g: Game): boolean {
  const w = g.ix.c.weather;
  return !!w && g.test(w.from);
}

/** The time of year (null before the weather begins). */
export function seasonNow(g: Game): Season | null {
  const w = g.ix.c.weather;
  if (!w || !weatherOn(g)) return null;
  return (w.seasons ?? []).find((x) => !x.if || g.test(x.if))?.season ?? 'spring';
}

function kindOf(g: Game, id: string): WeatherDef | undefined {
  return g.ix.c.weather?.kinds.find((k) => k.id === id);
}

/** The weather now (null before it begins). */
export function weatherNow(g: Game): WeatherDef | null {
  const st = g.s.weather;
  if (!st || !weatherOn(g)) return null;
  return kindOf(g, st.id) ?? null;
}

/** The hero is out in it: walking, or in a place away from home without a roof. */
export function outside(g: Game, pid: PlayerId): boolean {
  const p = g.p(pid);
  if (p.travel) return true;
  if (g.atHome(pid)) return false;
  return !areaDef(g, p.at)?.roof;
}

/** The weather as it touches this hero (null at home or under a roof). */
export function skyFor(g: Game, pid: PlayerId): WeatherDef | null {
  return outside(g, pid) ? weatherNow(g) : null;
}

/** The weather in a place (for attacks and residents' work there). */
export function skyAt(g: Game, area: string): WeatherDef | null {
  const a = areaDef(g, area);
  if (!a || a.home || a.roof) return null;
  return weatherNow(g);
}

function roll(g: Game, not: string): string {
  const pool = g.ix.c.weather!.kinds.filter((k) => k.id !== not && (!k.when || g.test(k.when)));
  if (!pool.length) return not;
  const total = pool.reduce((s, k) => s + k.weight, 0);
  let r = g.rng.next() * total;
  for (const k of pool) {
    r -= k.weight;
    if (r <= 0) return k.id;
  }
  return pool[pool.length - 1]!.id;
}

function span(g: Game): number {
  const [a, b] = g.ix.c.weather!.span;
  return g.rng.int(a, b);
}

function announce(g: Game): void {
  const w = weatherNow(g);
  if (w?.log.length) g.log({ all: g.rng.pick(w.log), kind: 'system' });
}

/** The weather turns now: what was forecast comes (if it still may), and a new forecast. */
export function turnWeather(g: Game): void {
  const st = g.s.weather;
  if (!st || !weatherOn(g)) return;
  const next = kindOf(g, st.next);
  st.id = next && (!next.when || g.test(next.when)) ? next.id : roll(g, st.id);
  st.next = roll(g, st.id);
  st.until = g.now + span(g);
  announce(g);
}

/** Start the weather once it may, and turn it when its time is up. True when it changed. */
export function settleWeather(g: Game): boolean {
  if (!weatherOn(g)) return false;
  const st = g.s.weather;
  if (!st) {
    const first = g.ix.c.weather!.first;
    g.s.weather = { id: first, until: g.now + span(g), next: roll(g, first) };
    announce(g);
    return true;
  }
  if (st.until > g.now) return false;
  // nobody plays: the sky waits (it turns once on return); a joint scene is not interrupted
  if (!g.joinedIds().some((pid) => g.p(pid).online) || g.sceneBlocksRoutine()) return false;
  turnWeather(g);
  return true;
}
