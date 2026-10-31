// Names of the pictures the client can draw. Content refers to them; the validator checks the names,
// the client must draw every one of them (its tables are typed by these lists).

/** Grounds of the drawn plans of places. */
export const SCENES = ['yard', 'shore', 'reeds', 'saltflat', 'brine', 'grove', 'dyke', 'causeway', 'road', 'town', 'bog', 'isle', 'willow', 'quarry', 'workshop', 'kryvets'] as const;
export type SceneId = (typeof SCENES)[number];

/** The heroes as the players see them: role and gender (a look for each pair the game may meet). */
export const HEROES = ['maker-m', 'hunter-f', 'maker-f', 'hunter-m'] as const;

/** Residents with a painted face, in the order of their pictures. */
export const FOLK = ['h_01', 'h_02', 'h_03', 'h_04', 'h_05', 'h_06', 'h_07', 'h_08', 'h_09', 'h_10', 'h_11', 'h_12', 'h_13', 'h_14', 'h_15', 'h_16', 'pm_h1'] as const;

/** Key shared scenes with a painting of their own moment (no faces: places, things, figures from afar). */
export const MOMENTS = ['s_01', 's_06', 's_07', 's_15', 's_16', 's_31', 's_37', 's_42', 's_47', 's_104', 's_108'] as const;

/** Places seen at eye level (the head of a scene, the card of a place): every ground, and suppers by the fire. */
export const VIEWS = [...SCENES, 'hearth1', 'hearth2'] as const;

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
  'garden',
  'tents',
] as const;
export type SpotIcon = (typeof SPOT_ICONS)[number];

/** Portraits of foes. */
export const PORTRAITS = ['rat', 'viper', 'oldviper', 'dog', 'leech', 'boar', 'greyboar', 'catfish', 'hound', 'cloak', 'chief', 'wolf', 'snatcher', 'hook', 'matka', 'elder', 'shewolf', 'rider', 'captain'] as const;
export type PortraitId = (typeof PORTRAITS)[number];

/** How a crop looks on its bed, from sowing to ripe. */
export const CROP_LOOKS = ['garlic', 'thyme', 'beet', 'flax', 'pumpkin'] as const;
export type CropLook = (typeof CROP_LOOKS)[number];

/** Small marks of things: materials, things to take along, gear. */
export const ITEM_ICONS = [
  'wood', 'reed', 'rope', 'water', 'food', 'hide', 'saltraw', 'brine', 'salt', 'clay', 'leather', 'bone', 'bark', 'oak',
  'resin', 'moss', 'stone', 'iron', 'coal', 'tusk', 'flint',
  'pebble', 'bandage', 'torch', 'pinch', 'brew', 'arrow', 'rattle',
  'knife', 'club', 'spear', 'sling', 'cape', 'boots', 'gloves', 'jacket', 'hood', 'shield', 'basket', 'axe', 'bow', 'pry',
  'furcoat', 'helm',
  'coin', 'ore', 'peat', 'wax', 'cloth', 'felt', 'bloom', 'meat', 'mask', 'pincers', 'plugs',
  'pick', 'cleaver', 'bracers', 'robe', 'sabre', 'quilt',
  'thyme', 'soup', 'driedfish', 'tea', 'tarboots', 'millet', 'porridge',
  'feather', 'osier', 'viperskin', 'fat', 'oar', 'boat', 'block', 'mark', 'level', 'grapnel', 'buckle', 'bighook', 'lamp',
  'key', 'lyre', 'paw', 'bag', 'book', 'ladle', 'whistle', 'honey',
  'garlic', 'beet', 'seeds', 'flax', 'pumpkin', 'borscht',
  'billhook', 'mattock', 'rake', 'weir', 'sickle', 'hoe',
  'hay', 'axle', 'wagon', 'oxen', 'burka', 'pike',
] as const;
export type ItemIcon = (typeof ITEM_ICONS)[number];
