// The asks board: what one asked the other to bring home, and how much of it is here already.
// A strip at the top of «Тут» (only the asks, or one quiet button), a sheet to ask for something.

import { useState } from 'preact/hooks';
import type { AskView, PlayerView } from '../../shared/src/protocol.js';
import { ASK } from '../../shared/src/rules.js';
import { Cell } from './cells.js';
import { Thing } from './items.js';
import { net } from './net.js';
import { Sheet } from './sheet.js';
import { T } from './strings.js';

const AMOUNTS = [5, 10, 20];

function AskRow({ a, mate, locked }: { a: AskView; mate: string; locked: boolean }) {
  return (
    <li class={`ask ${a.mine ? 'mine' : 'theirs'}`}>
      <span class="ask-pic" aria-hidden="true">
        <Thing icon={a.icon} />
      </span>
      <span class="ask-body">
        <span class="ask-line">
          <span class="ask-who">{a.mine ? T.asksMine : `${mate} ${T.asksTheirs}`}</span> {a.name}{' '}
          <b>
            {a.got}/{a.n}
          </b>
        </span>
        <span class="ask-bar" aria-hidden="true">
          <span style={{ width: `${(a.got / a.n) * 100}%` }} />
        </span>
      </span>
      {a.mine && (
        <button type="button" class="ask-back" disabled={locked} aria-label={`${T.asksBack}: ${a.name}`} onClick={() => net.send({ c: 'unask', id: a.id })}>
          ×
        </button>
      )}
    </li>
  );
}

function AskSheet({ v, desktop, onClose }: { v: PlayerView; desktop: boolean; onClose: () => void }) {
  const can = v.res.filter((r) => r.kind === 'res' || r.kind === 'food');
  const [pick, setPick] = useState<string | null>(null);
  const [n, setN] = useState(10);
  const chosen = can.find((r) => r.id === pick);
  return (
    <Sheet desktop={desktop} label={T.asksTitle} bar={<h2 class="sheet-title">{T.asksAskFull}</h2>} back={T.planBack} bodyKey="asks" onClose={onClose}>
      <div class="ask-sheet">
        <p class="ask-q">{T.asksWhat}</p>
        <ul class="cells ask-cells">
          {can.map((r) => (
            <Cell key={r.id} icon={r.icon} name={r.name} n={r.n} sel={r.id === pick} onPick={() => setPick(r.id)} />
          ))}
        </ul>
        <div class="ask-amount">
          <span>{T.asksHowMany}</span>
          <button type="button" class="btn small ghost" disabled={n <= 1} onClick={() => setN(Math.max(1, n - 1))} aria-label="−1">
            −
          </button>
          <b>{n}</b>
          <button type="button" class="btn small ghost" disabled={n >= ASK.most} onClick={() => setN(Math.min(ASK.most, n + 1))} aria-label="+1">
            +
          </button>
          {AMOUNTS.map((k) => (
            <button type="button" class={`btn small ${k === n ? '' : 'ghost'}`} onClick={() => setN(k)}>
              {k}
            </button>
          ))}
        </div>
        <p class="muted ask-hint">{T.asksHint}</p>
        <button
          type="button"
          class="btn"
          disabled={!chosen}
          onClick={() => {
            if (!chosen) return;
            net.send({ c: 'ask', res: chosen.id, n });
            onClose();
          }}
        >
          {T.asksAsk}
          {chosen ? `: ${chosen.name} ×${n}` : ''}
        </button>
      </div>
    </Sheet>
  );
}

export function AsksStrip({ v, locked, desktop }: { v: PlayerView; locked: boolean; desktop: boolean }) {
  const [open, setOpen] = useState(false);
  if (!v.partner.joined) return null;
  const mine = v.asks.filter((a) => a.mine).length;
  const full = mine >= ASK.open;
  // the other's asks first: they are what there is to do
  const asks = [...v.asks].sort((a, b) => Number(a.mine) - Number(b.mine));
  return (
    <section class={`asks ${asks.length ? '' : 'quiet'}`} aria-label={T.asksTitle}>
      {asks.length > 0 && (
        <ul class="ask-list">
          {asks.map((a) => (
            <AskRow key={a.id} a={a} mate={v.partner.name} locked={locked} />
          ))}
        </ul>
      )}
      <button type="button" class="btn small ghost ask-open" disabled={locked || full} title={full ? T.asksFull : undefined} onClick={() => setOpen(true)}>
        <span aria-hidden="true">✎</span> {asks.length ? T.asksAsk : T.asksAskFull}
      </button>
      {open && <AskSheet v={v} desktop={desktop} onClose={() => setOpen(false)} />}
    </section>
  );
}
