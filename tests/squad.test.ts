import { describe, expect, it } from 'vitest';
import type { PlayerId } from '../shared/src/content.js';
import type { FightState } from '../shared/src/state.js';
import { damageFoe, fightOf, nextTurn, startFight } from '../server/src/engine/fight.js';
import { pair, type World } from './world.js';

// The household goes along (a squad node sets residents to posts) and helps from the sides of a fight; those
// who feel no pain get up once after falling unless someone ties them.

const SILENT = 'e_25';

function atHide(seed = 3): { w: World; h: PlayerId; m: PlayerId } {
  const r = pair(seed);
  const s = r.w.state;
  for (const pid of [r.h, r.m]) {
    s.players[pid].at = 'a_16';
    s.players[pid].busy = null;
  }
  return r;
}

/** Let the round run out (everyone's turn passes). */
function endRound(w: World, f: FightState): void {
  const round = f.round;
  for (let i = 0; i < 40 && f.round === round && w.state.fights.includes(f); i++) {
    f.turn = f.order!.length - 1;
    nextTurn(w.g(), f);
  }
}

describe('posts before the siege', () => {
  it('both set residents to posts, a change asks again, and the posts held become flags', () => {
    const { w, h, m } = atHide();
    const s = w.state;
    for (const id of ['h_02', 'h_15', 'h_16']) s.residents[id] = { job: null, acc: {}, hurtUntil: 0, hungry: false, since: w.now } as never;
    s.residents['h_04'] = { job: null, acc: {}, hurtUntil: w.now + 3_600_000, hungry: false, since: w.now } as never;
    s.flags.post_mend = 1; // left from an earlier try: gone once the posts are set again
    w.g().startScene('s_128');
    s.scene!.node = 'n2';
    w.cmd(h, { c: 'next' });
    w.cmd(m, { c: 'next' });
    expect(s.scene!.node).toBe('posts');
    expect(w.view(h).scene!.kind).toBe('squad');

    expect(w.cmd(h, { c: 'choose', id: 'set:tie:h_04' }).ok).toBe(false); // hurt: stays home
    expect(w.cmd(h, { c: 'choose', id: 'set:walls:h_16' }).ok).toBe(true);
    expect(w.cmd(m, { c: 'choose', id: 'set:call:h_02' }).ok).toBe(true);
    expect(w.cmd(h, { c: 'choose', id: 'set:tie:h_16' }).ok).toBe(true); // moved: one post each
    expect(w.view(m).scene!.squad!.posts.find((p) => p.id === 'walls')!.who).toBeUndefined();

    w.cmd(h, { c: 'choose', id: 'ready' });
    expect(w.view(m).scene!.squad!.partnerReady).toBe(true);
    w.cmd(m, { c: 'choose', id: 'set:walls:h_15' }); // a change: both say ready again
    expect(w.view(m).scene!.squad!.partnerReady).toBe(false);
    w.cmd(h, { c: 'choose', id: 'ready' });
    w.cmd(m, { c: 'choose', id: 'ready' });

    expect(s.scene!.node).toBe('n3');
    expect(s.flags.post_walls).toBe(1);
    expect(s.flags.post_walls_good).toBeUndefined(); // Івась is not one for the walls
    expect(s.flags.post_call_good).toBe(1);
    expect(s.flags.post_tie_good).toBeUndefined(); // Захар is not one for tying
    expect(s.flags.post_tie).toBe(1);
    expect(s.flags.post_mend).toBeUndefined();
  });
});

describe('those who feel no pain', () => {
  it('get up a round after falling, once', () => {
    const { w, h, m } = atHide();
    const f = startFight(w.g(), 'a_16', [{ enemy: SILENT, n: 2 }], { party: [h, m] });
    const foe = f.foes[0]!;
    damageFoe(w.g(), f, foe, 999, h);
    expect(foe.out).toBe('down');
    endRound(w, f);
    expect(foe.out).toBe('down'); // the round it fell
    endRound(w, f);
    expect(foe.out).toBeNull();
    expect(foe.hp).toBe(Math.ceil(foe.hpMax * 0.4));
    expect(f.order).toContain(`f${foe.uid}`);
    damageFoe(w.g(), f, foe, 999, h);
    endRound(w, f);
    endRound(w, f);
    expect(foe.out).toBe('down'); // the second time for good
    expect(fightOf(w.g(), h)).toBe(f);
  });

  it('stay down when the household ties them, and the household helps from the sides', () => {
    const { w, h, m } = atHide();
    const text = { p1: 'В\'яжуть.', p2: 'В\'яжуть.' };
    const f = startFight(w.g(), 'a_16', [{ enemy: SILENT, n: 3 }], {
      party: [h, m],
      aid: [
        { do: 'tie', n: 0, from: 1, every: 1, text },
        { do: 'heal', n: 4, from: 1, every: 1, text: { p1: 'Перев\'язують.', p2: 'Перев\'язують.' } },
        { do: 'guard', n: 2, from: 1, every: 1, text: { p1: 'Прикривають.', p2: 'Прикривають.' } },
      ],
    });
    const foe = f.foes[0]!;
    damageFoe(w.g(), f, foe, 999, h);
    w.state.players[h].hp = 5;
    endRound(w, f);
    expect(w.state.players[h].hp).toBeGreaterThan(5);
    endRound(w, f);
    expect(foe.out).toBe('down');
    expect(foe.rose).toBe(true);
    expect(f.lines[h].join(' ')).toContain('В\'яжуть.');
    expect(f.lines[h].join(' ')).toContain('Перев\'язують.');
  });
});
