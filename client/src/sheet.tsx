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

export function Sheet({
  desktop,
  label,
  bar,
  back,
  backIcon,
  bodyKey,
  onClose,
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
  return (
    <>
      {!desktop && <div class={`sheet-shade ${closing ? 'closing' : ''}`} onClick={close} />}
      <section class={`station-sheet ${desktop ? 'docked' : ''} ${closing ? 'closing' : ''}`} role="dialog" aria-label={label}>
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
        <div class="station-body" key={bodyKey}>
          {children}
        </div>
      </section>
    </>
  );
}
