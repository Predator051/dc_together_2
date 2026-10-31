// Neutral ids of the maker's past (`.design/past-maker.md`). Every id begins with pm_: the main story's are
// a_, r_, x_…, and the client keeps what it has seen by id.

export const PA = { shop: 'pm_a1', market: 'pm_a2', bank: 'pm_a3', oaks: 'pm_a4' } as const;
export const PL = { shop: 'pm_l1', market: 'pm_l2', bank: 'pm_l3', oaks: 'pm_l4' } as const;

export const PR = {
  oak: 'pm_r1',
  osier: 'pm_r2',
  clay: 'pm_r3',
  iron: 'pm_r4',
  coal: 'pm_r5',
  coin: 'pm_r6',
  food: 'pm_r7',
  leather: 'pm_r8',
} as const;

/** Things made to order (one each, handed over). */
export const PT = { bolt: 'pm_t1', hoops: 'pm_t2', cradle: 'pm_t3', knife: 'pm_t4', key: 'pm_t5', grate: 'pm_t6', chest: 'pm_t7', hinges: 'pm_t8' } as const;

export const PG = { hammer: 'pm_g1', apron: 'pm_g2', blade: 'pm_g3' } as const;

export const PE = { rat: 'pm_e1', dog: 'pm_e2', boar: 'pm_e3', tramp: 'pm_e4' } as const;

export const PS = { gate: 'pm_s01', night: 'pm_s03', clerk: 'pm_s04', supper: 'pm_s05' } as const;

export const PN = { gordiy: 'pm_n1', yavdokha: 'pm_n2', luka: 'pm_n3', tymko: 'pm_n4' } as const;

export const PM = { numbers: 'pm_m1' } as const;
