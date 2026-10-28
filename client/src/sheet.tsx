// The panel that opens what was tapped: it slides up on a phone and takes the room in place on a computer.

import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { T } from './strings.js';

/** How long the panel takes to go away (the CSS animation is as long). */
const OUT_MS = 200;

function calm(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Close with Escape; on a phone keep the page behind the sheet still. */
function useSheetKeys(still: boolean, close: () => void): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    if (still) document.body.classList.add('sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('sheet-open');
    };
  }, [still]);
}

/**
 * A quick sideways swipe (not a scroll, not a slow drag): calls `go` with -1 for a swipe to the right
 * (the one before) and 1 for a swipe to the left (the next one).
 */
function useSwipe(go: (dir: -1 | 1) => void) {
  const start = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      start.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x;
      const dy = e.clientY - s.y;
      if (Math.abs(dx) > 56 && Math.abs(dx) > 1.6 * Math.abs(dy) && Date.now() - s.t < 700) go(dx < 0 ? 1 : -1);
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}

export function Sheet({
  desktop,
  label,
  bar,
  back,
  backIcon,
  bodyKey,
  onClose,
  low = false,
  onSwipe,
  children,
}: {
  desktop: boolean;
  label: string;
  /** What heads the panel: chips to switch, or a title. */
  bar: ComponentChildren;
  /** The way back on a computer, e.g. «До плану». */
  back: string;
  backIcon?: ComponentChildren;
  bodyKey: string;
  onClose: () => void;
  /** On a phone the head goes to the bottom, under the thumb. */
  low?: boolean;
  /** A sideways swipe over the body: -1 to the one before, 1 to the next. */
  onSwipe?: (dir: -1 | 1) => void;
  children: ComponentChildren;
}) {
  // it slides away before it is gone
  const [closing, setClosing] = useState(false);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const close = () => {
    if (closing) return;
    if (calm()) return onClose();
    setClosing(true);
    timer.current = window.setTimeout(onClose, OUT_MS);
  };
  useSheetKeys(!desktop, close);
  // which way the body came in from, after a swipe
  const [came, setCame] = useState<-1 | 1 | 0>(0);
  const cameTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(cameTimer.current), []);
  const swipe = useSwipe((dir) => {
    setCame(dir);
    window.clearTimeout(cameTimer.current);
    cameTimer.current = window.setTimeout(() => setCame(0), 400);
    onSwipe?.(dir);
  });
  return (
    <>
      {!desktop && <div class={`sheet-shade ${closing ? 'closing' : ''}`} onClick={close} />}
      <section class={`station-sheet ${desktop ? 'docked' : ''} ${closing ? 'closing' : ''} ${low ? 'low' : ''}`} role="dialog" aria-label={label}>
        <header class="station-bar">
          {bar}
          {desktop ? (
            <button type="button" class="btn small ghost station-back" onClick={close}>
              {backIcon}
              {back}
            </button>
          ) : (
            <button type="button" class="station-close" aria-label={T.planClose} onClick={close}>
              ×
            </button>
          )}
        </header>
        <div class={`station-body ${came ? (came > 0 ? 'came-right' : 'came-left') : ''}`} key={bodyKey} {...(onSwipe && !desktop ? swipe : {})}>
          {children}
        </div>
      </section>
    </>
  );
}
