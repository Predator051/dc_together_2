// Names of the pictures the client can draw. Content refers to them; the validator checks the names,
// the client must draw every one of them (its tables are typed by these lists).

/** Grounds of the drawn plans of places. */
export const SCENES = ['yard', 'shore', 'reeds', 'saltflat', 'brine', 'grove', 'dyke', 'causeway', 'road', 'town', 'bog'] as const;
export type SceneId = (typeof SCENES)[number];

/** Small pictures of spots on a plan. */
export const SPOT_ICONS = [
  'home',
  'gate',
  'store',
  'bag',
  'folk',
  'hearth',
  'well',
  'bench',
  'pan',
  'hides',
  'kiln',
  'anvil',
  'bed',
  'fish',
  'driftwood',
  'pebbles',
  'footprints',
  'reed',
  'nest',
  'tracks',
  'clay',
  'burrow',
  'salt',
  'brine',
  'bark',
  'resin',
  'moss',
  'sticks',
  'log',
  'stoneblock',
  'iron',
  'sluice',
  'stakes',
  'cart',
  'ford',
  'grass',
  'scales',
  'hall',
  'mug',
  'pier',
  'ore',
  'peat',
  'berry',
] as const;
export type SpotIcon = (typeof SPOT_ICONS)[number];

/** Portraits of foes. */
export const PORTRAITS = ['rat', 'viper', 'oldviper', 'dog', 'leech', 'boar', 'greyboar', 'catfish', 'hound', 'cloak', 'chief', 'wolf', 'snatcher', 'hook'] as const;
export type PortraitId = (typeof PORTRAITS)[number];
