// Small marks of things: a few strokes in the hand of the plans, quiet next to the words.

import type { ComponentChildren, JSX } from 'preact';
import type { ItemIcon } from '../../shared/src/pictures.js';

function Ink({ children }: { children: ComponentChildren }) {
  return (
    <svg
      class="item-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const DRAW: Record<ItemIcon, () => JSX.Element> = {
  // ----- materials -----
  wood: () => (
    <Ink>
      <path d="M3 17c4-.5 6-3.5 9.5-4.5S18 9 21 6" />
      <path d="M9 14.5L7 11M14 12l1.5 3.5M18 9.5l-1.5-3" />
    </Ink>
  ),
  reed: () => (
    <Ink>
      <path d="M7 21c0-4 .5-8 2-11M12 21V11M17 21c0-4-.5-7-2-10" />
      <rect class="fill" x="10.8" y="4" width="2.4" height="7" rx="1.2" />
      <path class="thin" d="M12 4V2.5M9 10c-1-2-3-3-5-3M15 11c1-2 3-3 5-3" />
    </Ink>
  ),
  rope: () => (
    <Ink>
      <ellipse cx="11" cy="12" rx="8" ry="5" />
      <ellipse cx="11" cy="12" rx="4" ry="2.2" />
      <path d="M18 15c1.5 1.5 2 3.5 1 6" />
    </Ink>
  ),
  water: () => (
    <Ink>
      <path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z" />
      <path class="thin" d="M9 15.5a3 3 0 0 0 2.5 2.8" />
    </Ink>
  ),
  food: () => (
    <Ink>
      <path d="M4 12h16c0 4-3.6 7-8 7s-8-3-8-7z" />
      <path class="thin" d="M9.5 9.5c-1-1.5 1-2.5 0-4.5M14.5 9.5c-1-1.5 1-2.5 0-4.5" />
    </Ink>
  ),
  hide: () => (
    <Ink>
      <path d="M8 4l1.5 2.5h5L16 4l2.5 4-1.5 3 2 4.5-3 4-2.5-1.5h-3L8 19.5l-3-4 2-4.5-1.5-3z" />
    </Ink>
  ),
  saltraw: () => (
    <Ink>
      <path d="M3.5 18l2.5-5 4 .5 2-4 4.5 1.5 4 7z" />
      <path class="thin" d="M10 13.5l1.5 4.5M16 11l-1 3" />
    </Ink>
  ),
  brine: () => (
    <Ink>
      <path d="M5.5 9h13l-1.5 11h-10z" />
      <path d="M5.5 9c0-5 13-5 13 0" />
      <path class="thin" d="M7.5 13c1.5 1 3 1 4.5 0s3-1 4.5 0" />
    </Ink>
  ),
  salt: () => (
    <Ink>
      <path d="M3 19c2-6 5-9 9-9s7 3 9 9z" />
      <circle class="dot" cx="12" cy="5" r=".9" />
      <circle class="dot" cx="8.5" cy="7" r=".8" />
      <circle class="dot" cx="15.5" cy="7" r=".8" />
    </Ink>
  ),
  clay: () => (
    <Ink>
      <path d="M5 16c-1-4 1.5-8 6-8.5s9 .5 9.5 4.5-1.5 6.5-5 6.5H8c-2 0-3-1-3-2.5z" />
      <path class="thin" d="M10 12.5c1.2 1 3 1 4.2 0" />
    </Ink>
  ),
  leather: () => (
    <Ink>
      <rect x="4.5" y="5.5" width="15" height="13" rx="2" />
      <rect class="thin dash" x="7" y="8" width="10" height="8" rx="1" />
    </Ink>
  ),
  bone: () => (
    <Ink>
      <path d="M8 8l8 8" />
      <circle cx="6" cy="8.5" r="2" />
      <circle cx="8.5" cy="6" r="2" />
      <circle cx="15.5" cy="18" r="2" />
      <circle cx="18" cy="15.5" r="2" />
    </Ink>
  ),
  bark: () => (
    <Ink>
      <path d="M6 4c3 1 4 4 4 8s1 7 4 8" />
      <path d="M11 4c3 1 4 4 4 8s1 7 4 8" />
      <path class="thin" d="M9.5 8.5h3M10.5 13h3M12.5 17h3" />
    </Ink>
  ),
  oak: () => (
    <Ink>
      <ellipse cx="7" cy="12" rx="3" ry="5" />
      <ellipse class="thin" cx="7" cy="12" rx="1.2" ry="2" />
      <path d="M7 7h11c2 0 3 2 3 5s-1 5-3 5H7" />
    </Ink>
  ),
  resin: () => (
    <Ink>
      <path d="M4 5h16" />
      <path class="fill" d="M12 5c0 3 3 5 3 8.5a3 3 0 0 1-6 0C9 10 12 8 12 5z" />
      <path class="thin" d="M17 5c0 1.5 1 2 1 3" />
    </Ink>
  ),
  moss: () => (
    <Ink>
      <path d="M3 18c1-3 3-3 4-1 1-4 4-4 5-1 1-3 4-3 5 0 1-2 3-1 4 2z" />
      <path class="thin" d="M7 14v-2M12 12.5V10M17 13v-2" />
    </Ink>
  ),
  stone: () => (
    <Ink>
      <path d="M4 17l2-7 5-3 6 2 3 6-3 3H7z" />
      <path class="thin" d="M11 7l1 5-3 4" />
    </Ink>
  ),
  iron: () => (
    <Ink>
      <path d="M3.5 17h17l-3-6.5h-11z" />
      <path class="thin" d="M6.5 10.5L8 8h8l1.5 2.5" />
    </Ink>
  ),
  coal: () => (
    <Ink>
      <path class="fill" d="M4 18l2-5 4-1 2 3-1 3z" />
      <path class="fill" d="M11 18l1.5-4 4-2.5 3.5 2 .5 4.5z" />
      <path class="fill" d="M8 11.5l1.5-4 4-1 1.5 4-3 2z" />
    </Ink>
  ),
  tusk: () => (
    <Ink>
      <path d="M5 20c0-8 5-14 14-16-5 4-8 9-9 16z" />
      <path class="thin" d="M8 15.5c.8.5 1.6.7 2.6.7" />
    </Ink>
  ),
  flint: () => (
    <Ink>
      <path d="M4 13c0-2.5 1.5-4 4-4h8c2.5 0 4 1.5 4 4s-1.5 4-4 4H9" />
      <path class="thin" d="M6 4.5l1 2M10 3.5v2.5M14 4.5l-1 2" />
    </Ink>
  ),

  // ----- things to take along -----
  pebble: () => (
    <Ink>
      <ellipse cx="8" cy="15" rx="4" ry="3" />
      <ellipse cx="16" cy="16" rx="3" ry="2.3" />
      <ellipse cx="13" cy="9.5" rx="3" ry="2.3" />
    </Ink>
  ),
  bandage: () => (
    <Ink>
      <circle cx="9" cy="12" r="5" />
      <circle class="thin" cx="9" cy="12" r="1.5" />
      <path d="M9 17h11l-2-2.5 2-2.5h-6" />
    </Ink>
  ),
  torch: () => (
    <Ink>
      <path d="M12 21v-8.5" />
      <path class="thin" d="M10 12.5h4M10.5 14.5h3" />
      <path d="M12 3c2 3 4 4 4 6.5a4 4 0 0 1-8 0c0-1.8 1.4-3 2-4.5.8 1 1.5 1.8 2 3" />
    </Ink>
  ),
  pinch: () => (
    <Ink>
      <path d="M4.5 13h15c-.5 4-3.5 6.5-7.5 6.5S5 17 4.5 13z" />
      <circle class="dot" cx="12" cy="9" r=".9" />
      <circle class="dot" cx="9" cy="10.5" r=".8" />
      <circle class="dot" cx="15" cy="10.5" r=".8" />
      <circle class="dot" cx="12" cy="5.5" r=".7" />
    </Ink>
  ),
  brew: () => (
    <Ink>
      <path d="M10 3.5h4M10.5 3.5v4l-4 6c-1.5 3 .5 7 5.5 7s7-4 5.5-7l-4-6v-4" />
      <path class="thin" d="M7.5 14.5h9" />
    </Ink>
  ),
  arrow: () => (
    <Ink>
      <path d="M4 20L19 5" />
      <path d="M14 5h5v5" />
      <path class="thin" d="M4 20l.8-4M4 20l4-.8M6.5 17.5l.6-3.2M6.5 17.5l3.2-.6" />
    </Ink>
  ),
  rattle: () => (
    <Ink>
      <rect x="4" y="4" width="11" height="10" rx="1.5" />
      <path d="M9.5 14v7" />
      <path class="thin" d="M7 7.5h5M7 10.5h5M18 6c1.2 1.2 1.6 3 1 5M20.5 4c2 2 2.5 5 1.4 8" />
    </Ink>
  ),

  // ----- gear -----
  knife: () => (
    <Ink>
      <path class="thick" d="M4 20l5-5" />
      <path d="M9 15L19 4c1 4-2 9-7.5 12.5z" />
    </Ink>
  ),
  club: () => (
    <Ink>
      <path class="thick" d="M4.5 19.5l7-7" />
      <path d="M11.5 12.5c-1-4 2-8.5 6-8.5 2 0 3 2 2 4-1 3-4 4.5-8 4.5z" />
    </Ink>
  ),
  spear: () => (
    <Ink>
      <path d="M3.5 20.5L15 9" />
      <path d="M15 9l1.5-5 3.5 0 0 3.5-5 1.5z" />
      <path class="thin" d="M12 10.5l1.5 1.5" />
    </Ink>
  ),
  sling: () => (
    <Ink>
      <path d="M4 4c4 5 5 9 6 13M20 4c-4 5-5 9-6 13" />
      <path d="M9.5 16.5c1 3.5 4 3.5 5 0" />
      <circle class="fill" cx="12" cy="16.5" r="1.4" />
    </Ink>
  ),
  cape: () => (
    <Ink>
      <path d="M9 4h6l4.5 16h-15z" />
      <path class="thin" d="M10 8l-1.5 12M14 8l1.5 12M12 6v14" />
    </Ink>
  ),
  boots: () => (
    <Ink>
      <path d="M8 3.5V14l-4 3v3h13.5v-3c0-2-2-3-5-3V3.5z" />
      <path class="thin" d="M4 18h13.5" />
    </Ink>
  ),
  gloves: () => (
    <Ink>
      <path d="M8 17c-2-1-4-3-4-6 0-1 1-2 2-1l2 2V7a4 4 0 0 1 8 0v10" />
      <path d="M8 17h8v4H8z" />
    </Ink>
  ),
  jacket: () => (
    <Ink>
      <path d="M8.5 4L4 7v13h16V7l-4.5-3" />
      <path d="M8.5 4c1 2 2.5 3 3.5 3s2.5-1 3.5-3" />
      <path class="thin" d="M12 7v13" />
    </Ink>
  ),
  hood: () => (
    <Ink>
      <path d="M5 20c0-10 3-16 7-16s7 6 7 16z" />
      <path d="M8.5 20c0-5.5 1.5-8.5 3.5-8.5s3.5 3 3.5 8.5" />
    </Ink>
  ),
  shield: () => (
    <Ink>
      <circle cx="12" cy="12" r="8.5" />
      <path class="thin" d="M8.5 4.5v15M12 3.5v17M15.5 4.5v15" />
    </Ink>
  ),
  basket: () => (
    <Ink>
      <path d="M4 10.5h16l-2 9.5H6z" />
      <path d="M7.5 10.5c0-6 9-6 9 0" />
      <path class="thin" d="M5 14.5h14M10 10.5l-.5 9.5M14 10.5l.5 9.5" />
    </Ink>
  ),
  axe: () => (
    <Ink>
      <path class="thick" d="M6 21l8.5-12.5" />
      <path d="M12.5 5.5c2.5-1 6 .5 7.5 4l-3.5 2.5-4.5-3.5z" />
    </Ink>
  ),
  bow: () => (
    <Ink>
      <path d="M4.5 3.5Q22 2 20.5 19.5" />
      <path class="thin" d="M4.5 3.5l16 16" />
    </Ink>
  ),
  pry: () => (
    <Ink>
      <path class="thick" d="M6 19L17.5 6.5c1-1 3-.5 3 1" />
      <path class="thick" d="M6 19c-1.5.5-3 0-2.5-2" />
    </Ink>
  ),
  furcoat: () => (
    <Ink>
      <path d="M8.5 4L4 7.5V21h16V7.5L15.5 4" />
      <path class="thick" d="M8 4c0 3 2 5 4 5s4-2 4-5" />
      <path class="thin" d="M4 17.5c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0" />
    </Ink>
  ),
  helm: () => (
    <Ink>
      <path d="M4 16c0-7 4-11 8-11s8 4 8 11z" />
      <path d="M12 16v4" />
      <path class="thin" d="M12 5v11" />
    </Ink>
  ),

  // ----- act two -----
  coin: () => (
    <Ink>
      <ellipse cx="12" cy="7.5" rx="7" ry="3" />
      <path d="M5 7.5v4.5c0 1.7 3 3 7 3s7-1.3 7-3V7.5" />
      <path d="M5 12v4.5c0 1.7 3 3 7 3s7-1.3 7-3V12" />
    </Ink>
  ),
  ore: () => (
    <Ink>
      <path d="M4 16c0-5 4-9 8-9s8 3 8 8c0 2-2 4-4 4H7c-2 0-3-1-3-3z" />
      <circle class="dot" cx="10" cy="12" r="1" />
      <circle class="dot" cx="14.5" cy="11" r=".9" />
      <circle class="dot" cx="13" cy="15.5" r="1" />
    </Ink>
  ),
  peat: () => (
    <Ink>
      <rect x="3.5" y="13" width="8.5" height="5.5" rx=".8" />
      <rect x="12" y="13" width="8.5" height="5.5" rx=".8" />
      <rect x="7.75" y="7.5" width="8.5" height="5.5" rx=".8" />
    </Ink>
  ),
  wax: () => (
    <Ink>
      <path d="M12 3l7.5 4.3v8.6L12 20.2l-7.5-4.3V7.3z" />
      <path class="thin" d="M12 8.5l3.2 1.8v3.7L12 15.8 8.8 14v-3.7z" />
    </Ink>
  ),
  cloth: () => (
    <Ink>
      <ellipse cx="7" cy="9" rx="3" ry="4" />
      <path d="M7 5h10c1.7 0 3 1.8 3 4s-1.3 4-3 4H7" />
      <path d="M16 13v7l-2.5-1.5L11 20v-7" />
    </Ink>
  ),
  felt: () => (
    <Ink>
      <path d="M3.5 9l8.5-3.5L20.5 9 12 12.5z" />
      <path d="M3.5 9v5l8.5 3.5 8.5-3.5V9M12 12.5v5" />
    </Ink>
  ),
  bloom: () => (
    <Ink>
      <path d="M5 15c-1-4 2-8 7-8s8 3 7 7c0 3-3 5-7 5s-6-1-7-4z" />
      <circle class="thin" cx="10" cy="12" r="1.2" />
      <circle class="thin" cx="14.5" cy="11.5" r="1" />
      <circle class="thin" cx="12.5" cy="15.5" r="1.1" />
    </Ink>
  ),
  meat: () => (
    <Ink>
      <path d="M14 4c4 0 6 3 5 7-1 5-6 7-10 7-1-6 1-14 5-14z" />
      <path d="M9 18l-3 3" />
      <circle cx="5" cy="19.5" r="1.6" />
      <path class="thin" d="M13 9c1 1 1.5 2.5 1 4" />
    </Ink>
  ),
  mask: () => (
    <Ink>
      <path d="M5 9h14l-7 10z" />
      <path class="thin" d="M5 9L2.5 7M19 9l2.5-2M12 3.5c1 1.5 2 2.3 2 3.3a2 2 0 0 1-4 0c0-1 1-1.8 2-3.3z" />
    </Ink>
  ),
  pincers: () => (
    <Ink>
      <path d="M6 21l7-9.5c.8-1.5.5-4-1-7.5" />
      <path d="M18 21l-7-9.5c-.8-1.5-.5-4 1-7.5" />
      <circle class="fill" cx="12" cy="13" r="1.2" />
    </Ink>
  ),
  plugs: () => (
    <Ink>
      <rect x="5" y="8" width="5" height="9" rx="2.5" />
      <rect x="14" y="8" width="5" height="9" rx="2.5" />
      <path class="thin" d="M7.5 8V5.5c0-1.5 9-1.5 9 0V8" />
    </Ink>
  ),
  pick: () => (
    <Ink>
      <path class="thick" d="M12 8.5V21" />
      <path d="M3 10c5-4.5 13-4.5 18 0" />
    </Ink>
  ),
  cleaver: () => (
    <Ink>
      <path class="thick" d="M4 20l4.5-4.5" />
      <path d="M8.5 15.5l9.5-11c2.5 2 2.5 5.5.5 7.5l-6 7z" />
    </Ink>
  ),
  bracers: () => (
    <Ink>
      <path d="M6.5 5h11l-1.5 14H8z" />
      <path class="thin" d="M7 9.5h10M7.5 14.5h9" />
      <circle class="dot" cx="12" cy="7.2" r=".8" />
      <circle class="dot" cx="12" cy="12" r=".8" />
      <circle class="dot" cx="12" cy="16.8" r=".8" />
    </Ink>
  ),
  robe: () => (
    <Ink>
      <path d="M8.5 3.5L5 6.5 4 21h16l-1-14.5-3.5-3" />
      <path d="M8.5 3.5L12 8l3.5-4.5M12 8l-2.5 13" />
      <path class="thick" d="M4.5 12.5h15" />
    </Ink>
  ),
  sabre: () => (
    <Ink>
      <path class="thick" d="M4 20.5l2.5-2.5" />
      <path d="M4.5 15.5l4 4" />
      <path d="M6.5 17.5C13 16 18.5 11 20 3.5c-3 6-7.5 10-12 12" />
    </Ink>
  ),
  quilt: () => (
    <Ink>
      <path d="M8.5 4L4 7v13h16V7l-4.5-3c-1 2-2.5 3-3.5 3s-2.5-1-3.5-3z" />
      <path class="thin" d="M4 11.5h16M4 15.5h16M8 7.5V20M16 7.5V20" />
    </Ink>
  ),
};

/** A thing's small mark; nothing at all when the thing has none. */
export function Thing({ icon }: { icon?: string }) {
  const draw = icon ? (DRAW as Record<string, () => JSX.Element>)[icon] : undefined;
  return draw ? draw() : null;
}
