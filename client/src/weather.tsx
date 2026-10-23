// The weather in the top bar: a small sign with its name; a tap shows what it does and what comes next.

import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { PlayerView, WeatherView } from '../../shared/src/protocol.js';
import { T } from './strings.js';

function Pic({ children }: { children: ComponentChildren }) {
  return (
    <svg class="ico wx-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/** The sign of each sky (clear weather has a sun). */
export function WeatherPic({ sky }: { sky: WeatherView['sky'] }) {
  switch (sky) {
    case 'rain':
      return (
        <Pic>
          <path d="M7 14h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.1 6.6 3.75 3.75 0 0 0 7 14z" />
          <path d="M9 17l-1 3M13 17l-1 3M17 17l-1 3" />
        </Pic>
      );
    case 'storm':
      return (
        <Pic>
          <path d="M7 14h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.1 6.6 3.75 3.75 0 0 0 7 14z" />
          <path d="M12.5 14l-2 3.5h3l-2 3.5" />
        </Pic>
      );
    case 'wind':
      return (
        <Pic>
          <path d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h7" />
        </Pic>
      );
    case 'frost':
      return (
        <Pic>
          <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M10 4.5l2 2 2-2M10 19.5l2-2 2 2" />
        </Pic>
      );
    case 'heat':
      return (
        <Pic>
          <circle cx="12" cy="10" r="4" />
          <path d="M12 2.5v1.5M4.5 10H3M21 10h-1.5M6.7 4.7l1 1M17.3 4.7l-1 1M5 18c2-1.2 3-1.2 5 0s3 1.2 5 0 3-1.2 4 0" />
        </Pic>
      );
    case 'fog':
      return (
        <Pic>
          <path d="M7 14h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.1 6.6 3.75 3.75 0 0 0 7 14z" />
          <path d="M4 18h16M7 21h10" />
        </Pic>
      );
    default:
      return (
        <Pic>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </Pic>
      );
  }
}

export function WeatherChip({ v, offset }: { v: PlayerView; offset: number }) {
  const w = v.weather;
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', key);
    };
  }, [open]);
  if (!w) return null;
  const left = Math.max(1, Math.round((w.until - (Date.now() + offset)) / 60_000));
  return (
    <div class="wx" ref={box}>
      <button type="button" class={`wx-chip ${open ? 'on' : ''}`} aria-expanded={open} aria-label={`${T.wxTitle}: ${w.name}`} title={w.name} onClick={() => setOpen(!open)}>
        <WeatherPic sky={w.sky} />
        <span class="wx-name">{w.name}</span>
      </button>
      {open && (
        <div class="wx-pop" role="dialog" aria-label={T.wxTitle}>
          <p class="wx-head">
            <WeatherPic sky={w.sky} />
            <b>{w.name}</b>
          </p>
          {w.effects.length ? (
            <>
              <p class="wx-note">{w.outside ? T.wxOutside : T.wxRoof}</p>
              <ul class="wx-effects">
                {w.effects.map((e) => (
                  <li class={e.good ? 'good' : 'bad'}>{e.text}</li>
                ))}
              </ul>
            </>
          ) : (
            <p class="wx-note">{T.wxCalm}</p>
          )}
          {w.next && (
            <p class="wx-next">
              {T.wxNext} <b>{w.next}</b>, {T.wxIn} {left} {T.min}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
