// Neutral ids of the past the two share (`.design/pasts-later.md` §5–7, §12). Every id begins with ps_.

export const SA = {
  oak: 'ps_a1',
  abbey: 'ps_a2',
  ford: 'ps_a3',
  house: 'ps_a4',
  square: 'ps_a5',
  mill: 'ps_a6',
  apiary: 'ps_a7',
  wood: 'ps_a8',
  hill: 'ps_a9',
} as const;
export const SL = {
  oak: 'ps_l1',
  abbey: 'ps_l2',
  ford: 'ps_l3',
  house: 'ps_l4',
  yard: 'ps_l5',
  square: 'ps_l6',
  smithy: 'ps_l7',
  elder: 'ps_l8',
  widow: 'ps_l9',
  mill: 'ps_l10',
  apiary: 'ps_l11',
  wood: 'ps_l12',
  common: 'ps_l13',
  hill: 'ps_l14',
  trader: 'ps_l15',
} as const;

export const SR = { food: 'ps_r1', wood: 'ps_r2', coin: 'ps_r3', hide: 'ps_r4', goods: 'ps_r5', reed: 'ps_r6' } as const;

/** Things kept for a purpose. */
export const ST = {
  coat: 'ps_t1',
  bellows: 'ps_t2',
  paddles: 'ps_t3',
  shoes: 'ps_t4',
  horn: 'ps_t5',
  elder: 'ps_t6',
  fat: 'ps_t7',
  sinew: 'ps_t8',
  bone: 'ps_t9',
  treadle: 'ps_t10',
  latch: 'ps_t11',
  candle: 'ps_t12',
  wheel: 'ps_t13',
  furs: 'ps_t14',
} as const;

/** What is worn or fought with. */
export const SG = { bow: 'ps_g1', hammer: 'ps_g2' } as const;

export const SE = { wolf: 'ps_e1', rider: 'ps_e2', robber: 'ps_e3', mute: 'ps_e4', badger: 'ps_e5', drover: 'ps_e6' } as const;

export const SS = {
  oak: 'ps_s01',
  carts: 'ps_s02',
  ford: 'ps_s03',
  strangers: 'ps_s04',
  elder: 'ps_s05',
  feast: 'ps_s06',
  bells: 'ps_s07',
  night: 'ps_s08',
  gathering: 'ps_s09',
  bowls: 'ps_s10',
  snow: 'ps_s11',
} as const;

export const SM = { carts: 'ps_m1', village: 'ps_m2' } as const;
