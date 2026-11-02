// A small happening: a window over the game with its picture that waits for an answer (it cannot be put
// aside), goes on for a step or two, and then shows what came of it until it is closed.

import { useEffect, useRef } from 'preact/hooks';
import type { EventView, PlayerView } from '../../shared/src/protocol.js';
import { IconLock } from './icons.js';
import { net } from './net.js';
import { eventUrl } from './pictures.js';
import { T } from './strings.js';

function plus(n: number): string {
  return n > 0 ? `+${n}` : `−${-n}`;
}

function Choices({ e, locked }: { e: EventView; locked: boolean }) {
  return (
    <div class="event-choices">
      {e.choices.map((c, i) => (
        <button class="btn event-choice" disabled={locked || !c.enabled} onClick={() => net.send({ c: 'event', uid: e.uid, choice: i })}>
          <span>{c.label}</span>
          {(c.cost?.length || (!c.enabled && c.reason)) && (
            <span class="event-meta">
              {c.cost?.map((x) => (
                <span class={`m cost ${x.ok ? '' : 'short'}`}>
                  −{x.n} {x.name}
                  {!x.ok && ` (${T.have} ${x.have})`}
                </span>
              ))}
              {!c.enabled && c.reason && !c.cost?.some((x) => !x.ok) && (
                <span class="m reason">
                  <IconLock />
                  {c.reason}
                </span>
              )}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** The first happening waiting for this hero, as a window; nothing while a scene or a fight is on. */
export function EventModal({ v, locked, hidden }: { v: PlayerView; locked: boolean; hidden: boolean }) {
  const e = v.events[0];
  const box = useRef<HTMLElement>(null);
  const step = e ? `${e.uid}:${e.done}:${e.lead.join()}` : '';
  // every new step starts at its top, with the focus inside the window
  useEffect(() => {
    if (!box.current) return;
    box.current.scrollTop = 0;
    box.current.focus({ preventScroll: true });
  }, [step, hidden]);
  if (!e || hidden) return null;
  const pic = eventUrl(e.art);
  return (
    <div class="sheet-wrap event-wrap" role="dialog" aria-modal="true" aria-label={T.eventTitle}>
      <section class={`sheet event-sheet ${e.home ? 'home' : ''} ${e.done ? 'done' : ''}`} ref={box} tabIndex={-1}>
        {pic && (
          <div class="event-pic">
            <img src={pic} alt="" decoding="async" />
          </div>
        )}
        <div class="event-body">
          <p class="event-tag">{e.home ? T.eventHome : T.eventTitle}</p>
          {e.lead.map((t) => (
            <p class="event-lead">{t}</p>
          ))}
          {e.text.map((t) => (
            <p class={e.done ? 'event-text outcome' : 'event-text'}>{t}</p>
          ))}
          {e.done ? (
            <>
              {e.gains.length > 0 && (
                <p class="event-gains">
                  {e.gains.map((g) => (
                    <span class={g.n > 0 ? 'plus' : 'minus'}>
                      {g.name} {plus(g.n)}
                    </span>
                  ))}
                </p>
              )}
              <button class="btn primary event-on" disabled={locked} onClick={() => net.send({ c: 'event', uid: e.uid, choice: -1 })}>
                {T.eventOn}
              </button>
            </>
          ) : (
            <>
              <Choices e={e} locked={locked} />
              {e.home && v.partner.online && v.partner.area === v.me.area && !v.partner.remembering && <p class="event-note">{T.eventMate}</p>}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
