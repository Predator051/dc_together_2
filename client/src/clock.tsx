// The server's clock on screen and small hooks shared by the screens.
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlayerView } from '../../shared/src/protocol.js';
import { T } from './strings.js';


/** A button unlocks this long after the server says it may (absorbs clock jitter). */
export const SAFETY_MS = 150;

/**
 * Current server time. Instead of ticking constantly, the component re-renders exactly when
 * something visible changes: a countdown second rolls over or a lock ends. Progress bars are
 * pure CSS animations, so they run at the display's refresh rate without re-rendering.
 */
export function useServerClock(offset: number, moments: number[]): number {
  const [, force] = useState(0);
  const now = Date.now() + offset;
  useEffect(() => {
    let dt = Infinity;
    for (const t of moments) {
      const left = t - now;
      if (left <= 0) continue;
      dt = Math.min(dt, left, left % 1000 || 1000);
    }
    if (!Number.isFinite(dt)) return;
    const id = window.setTimeout(() => force((x) => x + 1), dt + 10);
    return () => window.clearTimeout(id);
  });
  useEffect(() => {
    const onShow = () => force((x) => x + 1);
    document.addEventListener('visibilitychange', onShow);
    return () => document.removeEventListener('visibilitychange', onShow);
  }, []);
  return now;
}

/**
 * Progress fill animated by CSS (transform: scaleX), started from the current fraction.
 * Re-key it by `until` so a new task starts a fresh animation.
 */
export function Fill({ from, until, offset, cls }: { from: number; until: number; offset: number; cls: string }) {
  const [start] = useState(() => {
    const now = Date.now() + offset;
    const span = Math.max(1, until - from);
    return { p: Math.max(0, Math.min(1, (now - from) / span)), left: Math.max(0, until - now) };
  });
  return <span class={`anim-fill ${cls}`} style={{ '--p0': String(start.p), animationDuration: `${start.left}ms` }} />;
}

export function useMedia(query: string): boolean {
  const [hit, setHit] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const m = window.matchMedia(query);
    const on = () => setHit(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, [query]);
  return hit;
}

export function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function secsLeft(until: number, now: number): string {
  return `${Math.max(1, Math.ceil((until - now) / 1000))} ${T.sec}`;
}

export interface Ctx {
  v: PlayerView;
  now: number;
  offset: number;
  locked: boolean;
}

/** A one-off "echo" ring when a task this tile was running comes to an end. */
export function useEcho(running: boolean): number {
  const [ring, setRing] = useState(0);
  const was = useRef(running);
  useEffect(() => {
    if (was.current && !running) setRing(Date.now());
    was.current = running;
  }, [running]);
  useEffect(() => {
    if (!ring) return;
    const id = window.setTimeout(() => setRing(0), 1200);
    return () => window.clearTimeout(id);
  }, [ring]);
  return ring;
}

