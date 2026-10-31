// The household goes along: posts, and who stands at each. Either hero sets anyone; a change asks both to say
// they are ready again.

import type { PlayerView, SquadView } from '../../shared/src/protocol.js';
import { folkFace } from './folk.js';
import { IconCheck } from './icons.js';
import { net } from './net.js';
import { T } from './strings.js';

function Face({ id, name }: { id: string; name: string }) {
  const url = folkFace(id);
  return url ? (
    <span class="squad-face painted" style={{ backgroundImage: `url(${url})` }} aria-hidden="true" />
  ) : (
    <span class="squad-face" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function SquadBody({ sq, locked }: { sq: SquadView; locked: boolean }) {
  if (!sq.folk.length) return <p class="muted">{T.squadNobody}</p>;
  return (
    <div class="squad">
      <p class="squad-note">{T.squadNote}</p>
      {sq.posts.map((p) => (
        <div class={`squad-post ${p.who ? 'held' : ''}`}>
          <div class="squad-post-head">
            <b>{p.label}</b>
            <span>{p.text}</span>
          </div>
          <div class="squad-folk">
            {sq.folk.map((r) => {
              const here = p.who === r.id;
              const good = r.good.includes(p.id);
              return (
                <button
                  type="button"
                  class={`squad-chip ${here ? 'on' : ''} ${r.post && !here ? 'elsewhere' : ''}`}
                  disabled={locked || r.hurt}
                  aria-pressed={here}
                  title={r.hurt ? T.residentHurt : good ? T.squadGood : undefined}
                  onClick={() => net.send({ c: 'choose', id: here ? `clear:${p.id}` : `set:${p.id}:${r.id}` })}
                >
                  <Face id={r.id} name={r.name} />
                  <span class="squad-name">{r.name}</span>
                  {good && <i class="squad-good">✦</i>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SquadFoot({ sq, v, locked }: { sq: SquadView; v: PlayerView; locked: boolean }) {
  return (
    <div class="options">
      {sq.partnerReady && !sq.myReady && (
        <p class="partner-picked">
          <IconCheck />
          {v.partner.name}
        </p>
      )}
      {sq.myReady ? (
        <>
          <p class="muted waiting">{T.waiting}</p>
          <button class="btn wide" disabled={locked} onClick={() => net.send({ c: 'choose', id: 'unready' })}>
            {T.squadChange}
          </button>
        </>
      ) : (
        <button class="btn primary wide" disabled={locked} onClick={() => net.send({ c: 'choose', id: 'ready' })}>
          {T.squadReady}
        </button>
      )}
    </div>
  );
}
