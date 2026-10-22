// The panel that opens what was tapped: it slides up on a phone and takes the room in place on a computer.

import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { T } from './strings.js';

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
  useSheetKeys(!desktop, onClose);
  return (
    <>
      {!desktop && <div class="sheet-shade" onClick={onClose} />}
      <section class={`station-sheet ${desktop ? 'docked' : ''}`} role="dialog" aria-label={label}>
        <header class="station-bar">
          {bar}
          {desktop ? (
            <button type="button" class="btn small ghost station-back" onClick={onClose}>
              {backIcon}
              {back}
            </button>
          ) : (
            <button type="button" class="station-close" aria-label={T.planClose} onClick={onClose}>
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
