// The hard road: both agree, and the foes of the world (and of the story) are stronger, their spoils richer.
// One proposes, the other agrees; either can turn it off alone (an easier road harms nobody).
import type { PlayerId } from '../../../shared/src/content.js';
import type { HardView } from '../../../shared/src/protocol.js';
import type { Game, Result } from './index.js';

export function setHard(g: Game, pid: PlayerId, on: boolean): Result {
  const other = g.other(pid);
  if (!g.p(other).joined) return g.fail('err_not_now');
  const ask = g.s.hardAsk;
  if (!on) {
    if (ask?.by === pid) {
      g.s.hardAsk = null;
      return { ok: true };
    }
    if (!g.s.hard) return g.fail('err_not_now');
    g.s.hard = false;
    g.s.hardAsk = null;
    g.logRaw('system', { [pid]: g.ix.ui('hard_off_self'), [other]: g.render(g.ix.ui('hard_off_other'), other, pid) }, pid);
    return { ok: true };
  }
  if (g.s.hard) return g.fail('err_not_now');
  if (ask && ask.by === other) {
    g.s.hard = true;
    g.s.hardAsk = null;
    g.logRaw('find', { [pid]: g.ix.ui('hard_on'), [other]: g.ix.ui('hard_on') }, pid);
    return { ok: true };
  }
  g.s.hardAsk = { by: pid, at: g.now };
  g.logRaw('system', { [pid]: g.ix.ui('hard_asked_self'), [other]: g.render(g.ix.ui('hard_asked_other'), other, pid) }, pid);
  return { ok: true };
}

export function hardView(g: Game, pid: PlayerId): HardView | null {
  if (!g.p(g.other(pid)).joined) return null;
  const ask = g.s.hardAsk;
  return { on: !!g.s.hard, asked: ask ? (ask.by === pid ? 'me' : 'mate') : null };
}
