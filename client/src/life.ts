// What lives around a place and is heard now: real recordings (CC0, `sounds/life/SOURCES.md`) chosen by
// the place, the time of year, the weather and the evening. Clear days have birds; rain silences them
// but the frogs; a storm leaves nothing; fog and frost keep only the crows. Pure: the sound engine plays it.
import type { AmbientView } from '../../shared/src/protocol.js';

export type Voice =
  | 'chaffinch'
  | 'blackbird'
  | 'skylark'
  | 'cuckoo'
  | 'nightingale'
  | 'crow'
  | 'rook'
  | 'tit'
  | 'geese'
  | 'woodpecker'
  | 'warbler'
  | 'duck'
  | 'frogs'
  | 'crickets'
  | 'owl'
  | 'bee'
  | 'ice';

/** How loud each one is heard (linear, before the distance), and how many takes it has. */
export const VOICES: Record<Voice, { gain: number; takes: number }> = {
  chaffinch: { gain: 0.4, takes: 2 },
  blackbird: { gain: 0.38, takes: 2 },
  skylark: { gain: 0.3, takes: 2 },
  cuckoo: { gain: 0.25, takes: 2 },
  nightingale: { gain: 0.4, takes: 1 },
  crow: { gain: 0.4, takes: 2 },
  rook: { gain: 0.35, takes: 1 },
  tit: { gain: 0.3, takes: 1 },
  geese: { gain: 0.3, takes: 1 },
  woodpecker: { gain: 0.35, takes: 1 },
  warbler: { gain: 0.35, takes: 1 },
  duck: { gain: 0.33, takes: 2 },
  frogs: { gain: 0.4, takes: 2 },
  crickets: { gain: 0.25, takes: 1 },
  owl: { gain: 0.35, takes: 2 },
  bee: { gain: 0.2, takes: 1 },
  ice: { gain: 0.35, takes: 1 },
};

export interface LifeNow {
  /** Who may call next, by weight. */
  voices: Array<[Voice, number]>;
  /** Seconds between two calls. */
  gap: [number, number];
  /** Crickets as a steady chorus under the rest. */
  chorus: boolean;
  /** Heard through walls or fog: muffled. */
  muffled: boolean;
  /** How strong the place's own wind is (0..1): calm on a clear day, full in a gale. */
  air: number;
}

const WET = new Set(['marsh', 'river', 'fog']);
const OPEN = new Set(['hill', 'salt']);
const WOOD = new Set(['grove']);
const ALIVE = new Set([...WET, ...OPEN, ...WOOD]);

type Here = Pick<AmbientView, 'kind' | 'weather' | 'under' | 'season'>;

/** How strong the wind of the place is under this sky (before the weather begins: as it always was). */
export function airOf(a: Pick<AmbientView, 'weather' | 'under'>): number {
  const w = a.weather;
  if (!w) return 1;
  const k = w === 'wind' ? 1 : w === 'storm' ? 0.8 : w === 'rain' ? 0.45 : w === 'frost' ? 0.35 : w === 'fog' ? 0.12 : w === 'heat' ? 0.15 : 0.22;
  return a.under ? k * 0.5 : k;
}

export function lifeNow(a: Here, dusk: number): LifeNow {
  const air = airOf(a);
  const none: LifeNow = { voices: [], gap: [8, 14], chorus: false, muffled: false, air };
  const season = a.season;
  const sky = a.weather;
  if (!season || !sky || !ALIVE.has(a.kind) || sky === 'storm') return none;
  const under = a.under;
  const evening = dusk > 0.45;
  const warm = season === 'spring' || season === 'summer';
  const wet = WET.has(a.kind);
  const open = OPEN.has(a.kind);
  const wood = WOOD.has(a.kind);
  const v: Array<[Voice, number]> = [];
  const add = (voice: Voice, w: number, ok = true) => {
    if (ok && w > 0) v.push([voice, w]);
  };

  if (!evening) {
    if (warm) {
      add('chaffinch', 3, !wet || wood);
      add('blackbird', 3, wood || a.kind === 'hill');
      add('skylark', 4, open);
      add('cuckoo', season === 'spring' ? 2 : 0.5, wood || wet);
      add('warbler', 4, wet);
      add('duck', 2, wet);
      add('frogs', 1, wet);
      add('tit', 1, wood);
      add('woodpecker', 1, wood);
      add('bee', sky === 'heat' ? 3 : 0, true);
    } else {
      add('crow', 3);
      add('rook', 2, !wet);
      add('tit', season === 'winter' ? 3 : 2, wood || a.kind === 'hill');
      add('geese', season === 'autumn' ? 1 : 0);
      add('woodpecker', 1.5, wood);
      add('duck', season === 'autumn' ? 2 : 0, wet);
    }
  } else {
    if (warm) {
      add('nightingale', season === 'spring' ? 4 : 1, wood || wet);
      add('frogs', 5, wet);
      add('owl', 1.5, wood);
      add('cuckoo', season === 'spring' ? 0.7 : 0, wood);
    } else {
      add('owl', 2, wood || open);
      add('crow', 1);
      add('geese', season === 'autumn' ? 0.5 : 0);
    }
  }

  let gap: [number, number] = [4, 11];
  let keep = (_: Voice) => true;
  if (sky === 'rain') {
    keep = (x) => x === 'frogs' || x === 'duck';
    gap = [8, 18];
  } else if (sky === 'wind') {
    keep = (x) => x === 'crow' || x === 'rook' || x === 'geese' || x === 'skylark' || x === 'duck';
    gap = [9, 20];
  } else if (sky === 'fog') {
    keep = (x) => x === 'crow' || x === 'rook' || x === 'duck' || x === 'geese' || x === 'owl' || x === 'frogs';
    gap = [9, 20];
  } else if (sky === 'frost') {
    keep = (x) => x === 'crow' || x === 'rook' || x === 'tit' || x === 'owl';
    if (wet) v.push(['ice', 2]);
    gap = [10, 22];
  }
  const voices = v.filter(([x]) => keep(x) || x === 'ice');
  if (under) gap = [gap[0] * 1.5, gap[1] * 1.5];
  // crickets: summer and early autumn evenings in the open and the woods, not in rain or wind
  const chorus = evening && (season === 'summer' || season === 'autumn') && !wet && (sky === 'clear' || sky === 'heat') && !under;
  return { voices, gap, chorus, muffled: under || sky === 'fog', air };
}
