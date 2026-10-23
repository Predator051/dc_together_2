// A small happening waiting for an answer: a card at the top of the place with its choices.

import type { PlayerView } from '../../shared/src/protocol.js';
import { IconLock } from './icons.js';
import { net } from './net.js';
import { T } from './strings.js';

export function EventCards({ v, locked }: { v: PlayerView; locked: boolean }) {
  if (!v.events.length) return null;
  return (
    <>
      {v.events.map((e) => (
        <section key={e.uid} class={`panel event ${e.home ? 'home' : ''}`} aria-label={T.eventTitle}>
          {e.home && <p class="event-tag">{T.eventHome}</p>}
          {e.text.map((t) => (
            <p class="event-text">{t}</p>
          ))}
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
        </section>
      ))}
    </>
  );
}
