// The asks board: one hero asks the other to bring home so much of a thing; what the other brings home
// (unloaded from the bag, or made at home) counts towards it. A filled ask is thanked with experience.
// Routine stays each one's own, but now and then it is done for the other.
import type { PlayerId } from '../../../shared/src/content.js';
import type { AskView } from '../../../shared/src/protocol.js';
import { ASK } from '../../../shared/src/rules.js';
import { gainXp } from './hero.js';
import type { Game, Result } from './index.js';

/** Things one can ask for: what the household knows of, raw or food. */
function askable(g: Game, id: string): boolean {
  const def = g.ix.res.get(id);
  return !!def && !def.hidden && (def.kind === 'res' || def.kind === 'food' || def.kind === undefined) && id in g.s.res;
}

export function ask(g: Game, pid: PlayerId, res: string, n: number): Result {
  if (!g.p(g.other(pid)).joined) return g.fail('err_not_now');
  if (!askable(g, res) || !Number.isInteger(n) || n < 1 || n > ASK.most) return g.fail('err_not_now');
  const asks = (g.s.asks ??= []);
  if (asks.filter((a) => a.by === pid).length >= ASK.open) return g.fail('err_asks_full');
  const same = asks.find((a) => a.by === pid && a.res === res);
  if (same) same.n = Math.max(same.got + 1, n);
  else asks.push({ id: (g.s.nextAskId = (g.s.nextAskId ?? 0) + 1), by: pid, res, n, got: 0, at: g.now });
  const name = g.ix.res.get(res)!.name;
  g.logRaw('system', { [pid]: `${g.ix.ui('ask_made_self')} ${name} ×${n}.`, [g.other(pid)]: `${g.render(g.ix.ui('ask_made_other'), g.other(pid), pid)} ${name} ×${n}.` }, pid);
  return { ok: true };
}

export function unask(g: Game, pid: PlayerId, id: number): Result {
  const asks = g.s.asks ?? [];
  const i = asks.findIndex((a) => a.id === id && a.by === pid);
  if (i < 0) return g.fail('err_not_now');
  asks.splice(i, 1);
  return { ok: true };
}

/** What a hero has just brought home counts towards the other's asks. */
export function credit(g: Game, pid: PlayerId, got: Record<string, number>): void {
  const asks = g.s.asks;
  if (!asks?.length) return;
  for (const a of [...asks]) {
    if (a.by === pid) continue;
    const n = Math.min(got[a.res] ?? 0, a.n - a.got);
    if (n <= 0) continue;
    a.got += n;
    if (a.got < a.n) continue;
    asks.splice(asks.indexOf(a), 1);
    const name = g.ix.res.get(a.res)?.name ?? a.res;
    const xp = Math.min(ASK.xpMost, a.n * ASK.xpEach);
    g.logRaw('find', {
      [pid]: `${g.render(g.ix.ui('ask_done_self'), pid, a.by)} ${name} ×${a.n}. (+${xp} ${g.ix.ui('ask_xp')})`,
      [a.by]: `${g.render(g.ix.ui('ask_done_other'), a.by, pid)} ${name} ×${a.n}.`,
    }, pid);
    gainXp(g, pid, xp);
  }
}

export function asksView(g: Game, pid: PlayerId): AskView[] {
  return (g.s.asks ?? []).map((a) => {
    const def = g.ix.res.get(a.res);
    return { id: a.id, mine: a.by === pid, res: a.res, name: def?.name ?? a.res, ...(def?.icon ? { icon: def.icon } : {}), n: a.n, got: a.got };
  });
}
