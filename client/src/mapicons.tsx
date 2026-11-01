// Marks of places on the map: a few strokes each, drawn inside the round map node.

import type { JSX } from 'preact';
import type { SceneId } from '../../shared/src/pictures.js';

/** Paths in a 24×24 box, centred on 12,12. */
const DRAW: Record<SceneId, () => JSX.Element> = {
  yard: () => (
    <>
      <path d="M4 12l8-7 8 7" />
      <path d="M6 10.5V20h12v-9.5" />
      <path d="M10.5 20v-5h3v5" />
      <path class="thin" d="M16 7V4.5" />
    </>
  ),
  shore: () => (
    <>
      <path d="M3 14c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path class="thin" d="M3 18.5c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0" />
      <path d="M6 9.5l9-3" />
      <path class="thin" d="M11 8l1.5 2.5" />
    </>
  ),
  reeds: () => (
    <>
      <path d="M7 20c0-4 .5-8 2-11M12 20V10M17 20c0-4-.5-7-2-10" />
      <rect class="fill" x="10.8" y="4" width="2.4" height="6.5" rx="1.2" />
      <path class="thin" d="M3 20h18" />
    </>
  ),
  saltflat: () => (
    <>
      <circle class="thin" cx="17.5" cy="6" r="2.2" />
      <path d="M3 13.5h18" />
      <path class="thin" d="M3 18l5-2 5 2.5 5-2.5 3 1M8 16l-1-2.5M13 18.5l.5 2M18 16l.5-2.5" />
    </>
  ),
  brine: () => (
    <>
      <path d="M6 13h12v7H6z" />
      <path d="M7.5 13V5M16.5 13V5M5.5 5h13" />
      <path class="thin" d="M12 5v3.5" />
      <path d="M10.5 8.5h3v2.5h-3z" />
    </>
  ),
  grove: () => (
    <>
      <path d="M8 16V10M15.5 16V8.5" />
      <circle cx="8" cy="7.5" r="3" />
      <circle cx="15.5" cy="6" r="3.5" />
      <path class="thin" d="M3 17.5c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0M5 20.5c1.5-.8 3-.8 4.5 0s3 .8 4.5 0" />
    </>
  ),
  dyke: () => (
    <>
      <path d="M3 9h18v4.5H3z" />
      <path class="thin" d="M8 9v4.5M13.5 9v4.5M18 9v4.5" />
      <path class="thin" d="M10 13.5c0 2-1 3-1 4.5M14 13.5c0 1.5.8 2.5.8 4" />
      <path class="thin" d="M4 19.5c2-1.2 4-1.2 6 0s4 1.2 6 0 3-1 4-.5" />
    </>
  ),
  causeway: () => (
    <>
      <path d="M4 7.5h16M3 12h18M4 16.5h16" />
      <path class="thin" d="M8 6v3M15 10.5v3M10 15v3" />
      <path class="thin" d="M3 20.5c2-1 4-1 6 0s4 1 6 0 4-1 6 0" />
    </>
  ),
  road: () => (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle class="fill" cx="12" cy="12" r="1.8" />
      <path class="thin" d="M12 4.5v5.7M12 13.8v5.7M4.5 12h5.7M13.8 12h5.7M6.7 6.7l4 4M13.3 13.3l4 4M17.3 6.7l-4 4M10.7 13.3l-4 4" />
    </>
  ),
  quarry: () => (
    <>
      <path d="M3 9c3 9 15 9 18 0" />
      <path d="M7 15l3-4 3 4M13 15l2.5-3 2.5 3" />
      <path class="thin" d="M3 9h18" />
    </>
  ),
  workshop: () => (
    <>
      <path d="M3 20V11l9-6 9 6v9" />
      <path d="M2.5 20h19" />
      <path d="M8 20v-4h8v4" />
      <path class="thin" d="M12 7.5v3M10.5 10.5h3" />
    </>
  ),
  hutir: () => (
    <>
      <path d="M2.5 17c3-1.5 6-1.5 9.5 0s6.5 1.5 9.5 0" />
      <path d="M7 15v-4.5l5-4 5 4V15" />
      <path class="thin" d="M3 20c2.5-1 4.5-1 7 0M14 20c2.5-1 4.5-1 7 0" />
    </>
  ),
  ashisle: () => (
    <>
      <path d="M2.5 17c3-1.5 6-1.5 9.5 0s6.5 1.5 9.5 0" />
      <path d="M7 15v-4.5l5-4 5 4V15" />
      <path class="thin" d="M3 20c2.5-1 4.5-1 7 0M14 20c2.5-1 4.5-1 7 0" />
    </>
  ),
  ashtown: () => (
    <>
      <path d="M4 20v-6l3-2.5 3 2.5v6M13 20V11l3.5-3 3.5 3v9" />
      <path d="M16.5 8V4.5" />
      <circle class="thin" cx="16.5" cy="4" r="1.2" />
      <path d="M2.5 20h19" />
    </>
  ),
  // the village across the ford
  yhouse: () => (
    <>
      <path d="M3.5 12.5l8.5-7.5 8.5 7.5" />
      <path d="M6 11v9h12v-9" />
      <path d="M10.5 20v-4.5h3V20" />
      <path class="thin" d="M2.5 20h19M15 8.5V6" />
    </>
  ),
  ysquare: () => (
    <>
      <path d="M9 20V8l3-3.5L15 8v12" />
      <path class="thin" d="M10.5 11.5a1.5 1.5 0 0 1 3 0v2h-3z" />
      <path d="M3 20v-5l2.5-2 2.5 2v5M16 20v-5l2.5-2 2.5 2v5" />
      <path d="M2.5 20h19" />
    </>
  ),
  ymill: () => (
    <>
      <circle cx="15" cy="13" r="5" />
      <path class="thin" d="M15 8v10M10 13h10M11.5 9.5l7 7M18.5 9.5l-7 7" />
      <path d="M3 20V11l4-3 3 2.5" />
      <path class="thin" d="M2.5 20c3-1 6-1 9 0s6 1 9 0" />
    </>
  ),
  yapiary: () => (
    <>
      <path d="M5 20v-8.5a2.5 2.5 0 0 1 5 0V20M14 20v-8.5a2.5 2.5 0 0 1 5 0V20" />
      <path class="thin" d="M5 14.5h5M14 14.5h5M12 6.5l1 1M10.5 4.5l.8.8" />
      <path d="M2.5 20h19" />
    </>
  ),
  ypines: () => (
    <>
      <path d="M7 20V16M7 4l-4 6h2.5L3 14h8l-2.5-4H11z" />
      <path d="M17 20V15M17 6l-3.5 5h2L13.5 15h7L18.5 11h2z" />
      <path class="thin" d="M2.5 20h19" />
    </>
  ),
  yhill: () => (
    <>
      <path d="M2.5 20c3-6 6-9 9.5-9s6.5 3 9.5 9" />
      <path d="M12 11V6.5M11 6.5h2" />
      <path class="thin" d="M6.5 15.5V13M17.5 15.5V13" />
    </>
  ),
  brid: () => (
    <>
      <path d="M2.5 12h19" />
      <path d="M5 15h14l-1.5 2.5h-11z" />
      <path class="thin" d="M3 20c3-1 6-1 9 0s6 1 9 0M8 15v-3M16 15v-3" />
    </>
  ),
  kryvets: () => (
    <>
      <path d="M4 20v-6l3-2.5 3 2.5v6M13 20V11l3.5-3 3.5 3v9" />
      <path d="M16.5 8V4.5" />
      <circle class="thin" cx="16.5" cy="4" r="1.2" />
      <path d="M2.5 20h19" />
    </>
  ),
  town: () => (
    <>
      <path d="M3 20V12.5l4-3 4 3V20" />
      <path d="M11 20V9l5-4.5L21 9v11" />
      <path d="M2.5 20h19" />
      <path class="thin" d="M14.5 12h3M14.5 15.5h3M6 15h2" />
    </>
  ),
  bog: () => (
    <>
      <path d="M3 16c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0" />
      <path d="M8 15c0-3 .5-5 2-7M10.5 14.5c.3-2 1.5-3.5 3.5-4.5M6.5 15c-.5-2-1.5-3-3-3.5" />
      <circle class="thin" cx="16.5" cy="7" r="1.3" />
      <circle class="thin" cx="19" cy="10" r=".9" />
      <path class="thin" d="M5 20c1.5-.8 3-.8 4.5 0s3 .8 4.5 0" />
    </>
  ),
  isle: () => (
    <>
      <path class="fill" d="M5 14c1-3 4-4.5 7-4.5s6 1.5 7 4.5z" />
      <path d="M9 10V5M9 5c1.5 0 2.5 1 3 2" />
      <path class="thin" d="M3 17.5c2-1.2 4-1.2 6 0s4 1.2 6 0 4-1.2 6 0M5 20.5c1.5-.8 3-.8 4.5 0s3 .8 4.5 0" />
    </>
  ),
  willow: () => (
    <>
      <path d="M12 20V9" />
      <path d="M12 9c-2-3-5-4-7-3M12 9c2-3 5-4 7-3M12 11c-3 0-5 2-6 6M12 11c3 0 5 2 6 6" />
      <path class="thin" d="M5 6v6M19 6v6M8 7.5v5M16 7.5v5" />
      <path class="thin" d="M3 20.5h18" />
    </>
  ),
};

/** A place's mark, scaled to fit a node of radius `r`. */
export function MapIcon({ scene, r }: { scene?: string; r: number }) {
  const draw = scene ? (DRAW as Record<string, () => JSX.Element>)[scene] : undefined;
  if (!draw) return null;
  const k = (r * 1.25) / 24;
  return (
    <g class="map-ico" transform={`scale(${k}) translate(-12,-12)`} aria-hidden="true">
      {draw()}
    </g>
  );
}
