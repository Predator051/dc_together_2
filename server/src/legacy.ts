// Reading what part one left behind: heroes, their choices, the ending.
import type { Gender, PlayerId, Role } from '../../shared/src/content.js';
import type { Legacy } from '../../shared/src/state.js';

/** A part-one world is a world without `part` and with version ≤ 3. */
export function isPartOneWorld(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as { part?: unknown; version?: unknown };
  return s.part === undefined && Number(s.version ?? 0) <= 3;
}

/** Story flags of part one worth carrying over (endings, fates, choices). */
const KEEP = /^(ending_\d|a\d_|rescued$|done:scn_)/;

export function extractLegacy(raw: unknown): Legacy | null {
  if (!isPartOneWorld(raw)) return null;
  const s = raw as {
    flags?: Record<string, number>;
    players?: Record<string, { joined?: boolean; name?: string; gender?: string; role?: string; flags?: Record<string, number> }>;
    npcs?: Record<string, { rel?: number }>;
  };
  const flags: Record<string, number> = {};
  for (const [k, v] of Object.entries(s.flags ?? {})) if (KEEP.test(k) && typeof v === 'number') flags[k] = v;
  let ending = 0;
  for (let i = 1; i <= 4; i++) if (flags[`ending_${i}`]) ending = i;
  const players: Legacy['players'] = [];
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = s.players?.[pid];
    if (!p?.joined || !p.name) continue;
    const pf: Record<string, number> = {};
    for (const [k, v] of Object.entries(p.flags ?? {})) if (k.startsWith('bg_') && typeof v === 'number') pf[k] = v;
    players.push({
      pid,
      name: String(p.name).slice(0, 24),
      gender: p.gender === 'f' ? 'f' : ('m' as Gender),
      role: p.role === 'hunter' || p.role === 'maker' ? (p.role as Role) : null,
      flags: pf,
    });
  }
  const npcs: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.npcs ?? {})) if (typeof n?.rel === 'number') npcs[id] = n.rel;
  return { ending, flags, players, rescued: flags.rescued ?? 0, npcs };
}

/** Flags of the new world that tell the story how part one ended (`legacy_*`). */
export function legacyFlags(l: Legacy): Record<string, number> {
  const out: Record<string, number> = { legacy: 1 };
  out[`legacy_ending_${l.ending || 2}`] = 1;
  const f = l.flags;
  const pass = [
    'a1_panas_stays',
    'a1_panas_goes',
    'a3_panas_forgiven',
    'a5_panas_goes',
    'a3_onysym_home',
    'a3_onysym_left',
    'a3_onysym_atone',
    'a4_myroslava_coming',
    'a5_myroslava_present',
    'a5_savka_woke',
    'a5_master_stopped',
    'a4_hammer',
    'a5_final_now',
    'a5_final_wait',
  ];
  for (const k of pass) if (f[k]) out[`legacy_${k}`] = 1;
  // in the best ending the old beekeeper stayed at the last pillar instead of Savka
  if (f.ending_1 && f.a5_panas_goes) out.legacy_savka_alive = 1;
  // the old man is alive unless he stayed at the pillar
  if (!(f.ending_1 && f.a5_panas_goes)) out.legacy_panas_alive = 1;
  out.legacy_rescued = l.rescued;
  return out;
}

/** What to assume when part one cannot be read: a middle way through. */
export const DEFAULT_LEGACY: Legacy = {
  ending: 2,
  flags: { ending_2: 1, a1_panas_stays: 1, a3_onysym_home: 1, a4_hammer: 1, a5_master_stopped: 1, rescued: 38 },
  players: [],
  rescued: 38,
  npcs: {},
};
