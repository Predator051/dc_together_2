// Small inline line icons (no external assets). Decorative: hidden from screen readers.

import type { ComponentChildren } from 'preact';

type P = { class?: string };

function Svg({ children, class: cls }: P & { children: ComponentChildren }) {
  return (
    <svg
      class={`ico ${cls ?? ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconWork = (p: P) => (
  <Svg {...p}>
    <path d="M14 4l6 6-3 3-6-6z" />
    <path d="M11 7L4 14a2 2 0 0 0 0 3l3 3a2 2 0 0 0 3 0l7-7" />
  </Svg>
);

export const IconNotes = (p: P) => (
  <Svg {...p}>
    <path d="M5 4h10l4 4v12H5z" />
    <path d="M9 12h6M9 16h6M9 8h3" />
  </Svg>
);

export const IconLog = (p: P) => (
  <Svg {...p}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="0.6" fill="currentColor" />
    <circle cx="4" cy="12" r="0.6" fill="currentColor" />
    <circle cx="4" cy="18" r="0.6" fill="currentColor" />
  </Svg>
);

export const IconPair = (p: P) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 14.5c3 0 6 1.5 6 4.5" />
  </Svg>
);

export const IconFlame = (p: P) => (
  <Svg {...p}>
    <path d="M12 3c3 4 6 6.5 6 11a6 6 0 0 1-12 0c0-3 1.5-5 3-6.5.5 2 1.5 3 3 3-1-3 0-5.5 0-7.5z" />
  </Svg>
);

/** A cart: the store of a caravan on the road. */
export const IconCart = (p: P) => (
  <Svg {...p}>
    <path d="M3 8h13l-1.5 7H5zM16 10h3l2 3v2h-6" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Svg>
);

export const IconSnow = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
  </Svg>
);

export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z" />
    <circle cx="12" cy="10" r="2" />
  </Svg>
);

export const IconTarget = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.5" />
  </Svg>
);

export const IconLock = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);

export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
);

export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4.5 4.5" />
  </Svg>
);

export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const IconDown = (p: P) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);

export const IconSound = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
  </Svg>
);

export const IconMute = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </Svg>
);

/** A hammer with a motion line: the work shown in motion. */
export const IconMotion = (p: P) => (
  <Svg {...p}>
    <path d="M13 11l6.5 6.5" />
    <path d="M8.5 4.5l5 5-2.5 2.5-5-5z" />
    <path d="M3.5 14.5a6 6 0 0 0 4 4.5" />
  </Svg>
);

export const IconMotionOff = (p: P) => (
  <Svg {...p}>
    <path d="M13 11l6.5 6.5" />
    <path d="M8.5 4.5l5 5-2.5 2.5-5-5z" />
    <path d="M4 20L20 4" />
  </Svg>
);

export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Svg>
);

export const IconBellOff = (p: P) => (
  <Svg {...p}>
    <path d="M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8" />
    <path d="M10 20.5a2 2 0 0 0 4 0M4 4l16 16" />
  </Svg>
);

export const IconMap = (p: P) => (
  <Svg {...p}>
    <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" />
    <path d="M9 4v14M15 6v14" />
  </Svg>
);

export const IconHero = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="7" r="3.2" />
    <path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6" />
  </Svg>
);

// Hand signs to the partner: the same line as the other marks, not emoji that differ on every phone.
export const IconSignStop = (p: P) => (
  <Svg {...p}>
    <path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6.5a1.5 1.5 0 0 1 3 0V14c0 3.6-2.4 6.5-6 6.5-2.6 0-4.2-1.4-5.4-3.6L4.2 14a1.5 1.5 0 0 1 2.6-1.5L8 14" />
  </Svg>
);

export const IconSignGo = (p: P) => (
  <Svg {...p}>
    <path d="M12 20V5M6 11l6-6 6 6" />
  </Svg>
);

export const IconSignQuiet = (p: P) => (
  <Svg {...p}>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </Svg>
);

export const IconSignDanger = (p: P) => (
  <Svg {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17v.01" />
  </Svg>
);

export const IconSignHere = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="2.5" />
  </Svg>
);
