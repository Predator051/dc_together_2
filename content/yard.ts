import type { YardPieceDef } from '../shared/src/content.js';

const built = (id: string) => ({ flag: `built:${id}` });

/**
 * The yard of home grows on its painting as things are built (the spots of the places: `a1/places.ts`; the
 * store, the people and the way out stand at `PLAN_FIXED` — nothing small goes under them).
 */
export const yard: YardPieceDef[] = [
  { key: 'well_old', x: 88, y: 80, w: 12, spot: 'well', when: { noFlag: 'built:x_14' } },
  { key: 'well', x: 88, y: 79, w: 12, spot: 'well', when: built('x_14') },
  { key: 'bench', x: 12, y: 50, w: 15, spot: 'bench', when: { all: [built('x_16'), { noFlag: 'built:x_58' }] } },
  { key: 'bench2', x: 12, y: 50, w: 15, spot: 'bench', when: built('x_58') },
  { key: 'tannery', x: 88, y: 50, w: 15, spot: 'hides', when: built('x_24') },
  { key: 'kiln', x: 88, y: 16, w: 14, spot: 'kiln', when: built('x_50') },
  { key: 'woodpile', x: 92, y: 35, w: 6, when: built('x_50') },
  { key: 'forge', x: 12, y: 16, w: 15, spot: 'anvil', when: { all: [built('x_52'), { noFlag: 'built:x_93' }] } },
  { key: 'forge2', x: 12, y: 16, w: 16, spot: 'anvil', when: built('x_93') },
  { key: 'pan', x: 12, y: 80, w: 15, spot: 'pan', when: { flag: 'p2_pan_set' } },
  { key: 'settler', x: 27, y: 89, w: 7, when: built('x_128') },
  { key: 'rack', x: 12, y: 37, w: 10, when: built('x_109') },
  { key: 'barrels', x: 77, y: 67, w: 8, when: built('x_196') },
  { key: 'bell', x: 45, y: 56, w: 5, when: built('x_137') },
  { key: 'shelter', x: 70, y: 82, w: 13, when: built('x_103') },
  { key: 'palisade', x: 0, y: 0, w: 0, edge: true, when: built('x_104') },
  // the household at work
  { key: 'w_chop', x: 83, y: 37, w: 7, trade: 'wood' },
  { key: 'w_carry', x: 50, y: 75, w: 6, trade: 'herbs' },
  { key: 'w_stir', x: 25, y: 78, w: 7, trade: 'salt' },
  { key: 'w_scrape', x: 74, y: 58, w: 7, trade: 'catch' },
];
