// A test player: looks at its own view (and, for planning, at what the world offers) and sends
// commands like a person would. Two of them play act one together.

import type { ActionDef, Cond, Content, PlayerId, Role } from '../shared/src/content.js';
import type { Command, PlayerView } from '../shared/src/protocol.js';
import { Rng } from '../shared/src/rng.js';
import type { Game } from '../server/src/engine/index.js';
import { areaDef, areaKnown, linkTime } from '../server/src/engine/travel.js';
import { heroOf, ownsCount } from '../server/src/engine/hero.js';

export interface BotOptions {
  /** Picks at random in fights and scenes, spends on whatever. */
  careless?: boolean;
  seed?: number;
}

/** Shillings of act two. */
const COIN = 'r_22';

const STAT_PLAN: Record<Role, string[]> = {
  hunter: ['agi', 'end', 'per', 'agi', 'end'],
  maker: ['str', 'end', 'end', 'str', 'agi'],
};

export class Bot {
  private rng: Rng;
  /** How many times a joint choice with these options came up (to try the next option). */
  private tries = new Map<string, number>();
  private lastSig = '';
  private lastBlocks = -1;
  private torchUsed = -1;
  private stepsSinceSupper = 0;

  constructor(
    readonly pid: PlayerId,
    readonly c: Content,
    readonly o: BotOptions = {},
  ) {
    this.rng = new Rng(o.seed ?? (pid === 'p1' ? 11 : 23));
  }

  decide(v: PlayerView, g: Game): Command | null {
    this.stepsSinceSupper++;
    if (v.summary) return { c: 'ack', what: 'summary' };
    if (v.welcome) return { c: 'ack', what: 'welcome' };
    if (v.fight) return this.fight(v);
    if (v.scene) return v.scene.paused ? null : this.scene(v);
    if (v.proposal && !v.proposal.mine) return { c: 'accept' };
    if (v.hero.perkChoice) return { c: 'perk', id: v.hero.perkChoice[0]!.id };
    if (v.hero.points > 0) {
      const plan = STAT_PLAN[v.me.role];
      const id = this.o.careless ? this.rng.pick(['str', 'agi', 'end', 'per', 'wil']) : plan[(v.hero.level - 2) % plan.length]!;
      return { c: 'stat', id };
    }
    if (v.proposal) return null; // mine: wait for the answer
    if (v.busyUntil > v.now || v.map.travel) return null;
    if (v.nearFight) return { c: 'help' };

    const idle = v.residents.find((r) => !r.job && r.jobs.some((j) => !j.reason) && !r.hurt);
    if (idle) {
      const ok = idle.jobs.filter((j) => !j.reason);
      const pick = ok.find((j) => this.wanted(g).has(this.jobRes(j.id))) ?? ok[0]!;
      return { c: 'job', who: idle.id, id: pick.id };
    }

    // ill: eat or go home
    if (v.me.hp < v.me.hpMax * 0.45) {
      const eat = v.atHome ? this.entry(v, 'x_13') : null;
      if (eat?.enabled) return { c: 'act', id: 'x_13' };
      // a dish heals by its slot, and only if there is room for it
      const edible = (id: string) => !g.ix.res.get(id)?.meal || !!v.needs?.edible.find((f) => f.id === id)?.can;
      const band = v.bag.items.find((i) => i.usable && i.id !== this.c.food && edible(i.id));
      if (band) return { c: 'use', id: band.id };
      if (!v.atHome) return this.goTowards(v, g, g.ix.homeArea);
      // at home: get the strength back before going out again (unless the cold keeps wounds open)
      if (v.needs && v.needs.level !== 'frozen') {
        if (v.needs.rest.can && v.needs.rested <= 0) return { c: 'rest' };
        return null;
      }
    }

    const needs = this.needs(v, g);
    if (needs) return needs;

    if (v.atHome) {
      // what did not fit into the store stays in the bag: throw it out (goods to sell excepted)
      const stuck = v.bag.items.find((i) => i.kind !== 'use' && i.kind !== 'food' && !this.isWare(g, i.id));
      if (stuck) return { c: 'drop', id: stuck.id, n: stuck.n };
      const gear = this.gear(v, g);
      if (gear) return gear;
      const pack = this.pack(v);
      if (pack) return pack;
    }

    const trade = this.trade(v, g);
    if (trade) return trade;
    const story = this.story(v, g);
    if (story) return story;
    // waiting for the partner at the place of the story: work here, do not wander off
    const s = this.storyArea(g);
    return this.work(v, g, !!s && s.area === v.me.area);
  }

  // ------------------------------------------------------------------ needs

  /** Eat, warm up, rest — as a person would when the strip turns red (a careless one, now and then). */
  private needs(v: PlayerView, g: Game): Command | null {
    const n = v.needs;
    if (!n) return null;
    if (this.o.careless && this.rng.next() < 0.5) return null;
    // a dish when a slot is free (the best one first)
    if (n.meals.length < 2 || (n.meals.length < n.slots && v.atHome)) {
      // plain food only when there is nothing else in the belly: the store feeds the household too
      const dish = n.edible
        .filter((f) => f.can && (f.id !== this.c.food || !n.meals.length))
        .sort((a, b) => this.dishValue(g, b.id) - this.dishValue(g, a.id))[0];
      if (dish) return { c: 'eat', id: dish.id };
    }
    const bad = new Set(n.effects.filter((e) => !e.good).map((e) => e.id));
    if (bad.has('cold') || bad.has('frozen')) {
      const tea = n.drinks[0];
      if (tea) return { c: 'use', id: tea.id };
      if (n.camp?.can && !n.fire) return { c: 'camp' };
      // home is worth going to only if there is a fire there, or wood to light one
      const wood = g.ix.c.needs?.campWood ?? '';
      const homeFire = g.stoveState() !== 'cold' || g.stockAll(wood) > 0;
      if (!v.atHome && !n.fire && homeFire) return this.goTowards(v, g, g.ix.homeArea);
      if (v.atHome && g.stoveState() !== 'warm') {
        const stoke = this.entry(v, 'x_10');
        if (stoke?.enabled) return { c: 'act', id: 'x_10' };
        // no wood at home: unpack what is carried, else go and fetch some
        const carried = v.bag.items.find((i) => i.id === wood);
        if (carried) return { c: 'pack', id: wood, n: -carried.n };
      }
    }
    // tired, or home by the fire with nothing better to keep the head clear
    const tiredSoon = n.rested <= 0 && n.awake > n.tiredAfter * 0.75;
    if ((bad.has('tired') || (tiredSoon && v.atHome)) && n.rest.can) return { c: 'rest' };
    if (bad.has('tired') && !v.atHome && !n.fire && n.camp?.can) return { c: 'camp' };
    return null;
  }

  private dishValue(g: Game, id: string): number {
    const m = g.ix.res.get(id)?.meal;
    return m ? m.hp * 2 + (m.dmg ?? 0) * 3 + m.minutes / 6 : 0;
  }

  // ------------------------------------------------------------------ fights

  private fight(v: PlayerView): Command | null {
    const f = v.fight!;
    if (f.myPick || !f.moves.length) return null;
    const moves = f.moves.filter((m) => m.enabled);
    if (!moves.length) return null;
    const has = (id: string) => moves.find((m) => m.id === id);
    if (this.o.careless) return { c: 'fight', id: this.rng.pick(moves).id };
    if (has('free')) return { c: 'fight', id: 'free' };
    if (has('lift')) return { c: 'fight', id: 'lift' };
    if (has('struggle')) return { c: 'fight', id: 'struggle' };
    const pinch = moves.find((m) => m.id === `use:u_04`);
    if (pinch && f.foes.some((x) => !x.out && x.holds && x.traits.includes('Кровосос'))) return { c: 'fight', id: pinch.id };
    const me = f.party.find((p) => p.me)!;
    const use = (id: string) => moves.find((m) => m.id === `use:${id}`);
    if (me.poison > 0 && use('u_05')) return { c: 'fight', id: 'use:u_05' };
    if (me.hp < me.hpMax * 0.35 && use('u_02')) return { c: 'fight', id: 'use:u_02' };
    const live = f.foes.filter((x) => !x.out);
    if (live.some((x) => x.traits.includes('Боїться вогню')) && use('u_03') && this.torchUsed !== f.id) {
      this.torchUsed = f.id;
      return { c: 'fight', id: 'use:u_03' };
    }
    if (live.some((x) => x.traits.includes('Боїться гуку') && (x.intent?.includes('схопити') || x.holds)) && use('u_07')) return { c: 'fight', id: 'use:u_07' };
    if (live.some((x) => x.intent?.startsWith('набирає розгону на: тебе')) && has('guard')) return { c: 'fight', id: 'guard' };
    const calling = live.find((x) => x.intent?.startsWith('збирається гукнути'));
    const target = calling ?? [...live].sort((a, b) => a.hp - b.hp)[0];
    const hit = target ? moves.find((m) => m.id.endsWith(`:${target.uid}`) && (m.id.startsWith('hit:') || m.id.startsWith('shoot:'))) : undefined;
    if (hit) return { c: 'fight', id: hit.id };
    const any = moves.find((m) => m.group === 'hit');
    if (any) return { c: 'fight', id: any.id };
    return { c: 'fight', id: has('guard') ? 'guard' : moves[0]!.id };
  }

  // ------------------------------------------------------------------ scenes

  private scene(v: PlayerView): Command | null {
    const sc = v.scene!;
    if (sc.waiting) return null;
    if (sc.kind === 'text') return { c: 'next' };
    if (sc.kind === 'fight') return null;
    if (sc.kind === 'stealth' && sc.stealth) return this.stealth(v);
    if (sc.kind === 'operation' && sc.operation) return this.operation(v);
    if (sc.kind === 'choice' && sc.options) {
      if (sc.myPick) return null;
      const opts = sc.options.filter((o) => o.enabled);
      if (!opts.length) return null;
      if (this.o.careless || sc.mode !== 'joint') return { c: 'choose', id: (this.o.careless ? this.rng.pick(opts) : opts[0]!).id };
      // a joint choice: both bots try the options in the same order until one goes forward
      const sig = sc.options.map((o) => o.id).join('|');
      if (sig !== this.lastSig || sc.blocks.length !== this.lastBlocks) {
        if (sig === this.lastSig) this.tries.set(sig, (this.tries.get(sig) ?? 0) + 1);
        this.lastSig = sig;
        this.lastBlocks = sc.blocks.length;
      }
      const n = this.tries.get(sig) ?? 0;
      return { c: 'choose', id: opts[n % opts.length]!.id };
    }
    return null;
  }

  private stealth(v: PlayerView): Command | null {
    const sc = v.scene!;
    const st = sc.stealth!;
    if (st.myPick) return null;
    const theirs = sc.signs?.fresh ? sc.signs.partner : undefined;
    if (v.me.role === 'hunter') {
      const want = st.look?.now ? 'stop' : 'go';
      // show the sign every turn (it counts for the turn it was shown)
      if (this.lastSign !== `${st.length}:${st.pos}:${st.time}:${want}`) {
        this.lastSign = `${st.length}:${st.pos}:${st.time}:${want}`;
        return { c: 'sign', id: want };
      }
      if (st.look?.now) return { c: 'choose', id: 'freeze' };
      return { c: 'choose', id: theirs === 'quiet' ? 'sneak' : 'step' };
    }
    // the maker waits for the hunter's sign, and tells about loose ground
    const loose = st.loose?.[st.pos];
    const want = loose ? 'quiet' : 'go';
    if (this.lastSign !== `${st.length}:${st.pos}:${st.time}:${want}`) {
      this.lastSign = `${st.length}:${st.pos}:${st.time}:${want}`;
      return { c: 'sign', id: want };
    }
    if (!theirs) return null;
    if (theirs === 'stop') return { c: 'choose', id: 'freeze' };
    return { c: 'choose', id: loose ? 'sneak' : 'step' };
  }
  private lastSign = '';

  /**
   * Two fronts: push the win bar (directly or by moving people onto it), feed what feeds it, and
   * pull a bad bar down when it is close to the top.
   */
  private operation(v: PlayerView): Command | null {
    const op = v.scene!.operation!;
    if (op.myPick) return null;
    const val = new Map(op.tracks.map((t) => [t.id, t.value]));
    const max = new Map(op.tracks.map((t) => [t.id, t.max]));
    const win = op.tracks.find((t) => t.goal !== undefined)?.id ?? op.tracks.find((t) => !t.bad)?.id;
    const feeds = new Set(op.moves.flatMap((m) => (m.transfer ? [m.transfer.from] : [])));
    const room = (id: string) => (max.get(id) ?? 0) - (val.get(id) ?? 0);
    let best: { id: string; s: number } | null = null;
    for (const m of op.moves) {
      if (!m.enabled) continue;
      let s = 0;
      for (const [k, d] of Object.entries(m.delta)) {
        const t = op.tracks.find((x) => x.id === k);
        if (!t) continue;
        if (t.bad) {
          const risky = (val.get(k) ?? 0) + 3 >= t.max;
          s -= d * (risky ? 8 : 1.5);
        } else if (k === win) s += Math.min(d, room(k)) * 6;
        else if (feeds.has(k)) s += Math.min(d, room(k)) * 3;
      }
      if (m.transfer && m.transfer.to === win) s += Math.min(m.transfer.n, val.get(m.transfer.from) ?? 0, room(win)) * 6;
      if (!best || s > best.s) best = { id: m.id, s };
    }
    return { c: 'choose', id: best?.id ?? op.moves[0]!.id };
  }

  // ------------------------------------------------------------------ the story

  /** Where the next scene is, if there is one this bot can see from the world. */
  private storyArea(g: Game): { area: string; id: string } | null {
    const pid = this.pid;
    for (const sc of this.c.scenes) {
      if (sc.pool) continue;
      const scouted = g.ix.scoutOf.get(sc.id);
      if (scouted) {
        if (areaKnown(g, scouted)) continue;
        if (sc.visible && !g.test(sc.visible, pid)) continue;
        // the hunter proposes: what counts is what the hunter can start
        const lead = g.pidByRole('hunter') ?? pid;
        if (sc.enabled && !g.test(sc.enabled, lead)) continue;
        const from = this.c.areas.find((a) => areaKnown(g, a.id) && linkTime(g, a.id, scouted) !== null && a.pos);
        if (from) return { area: from.id, id: sc.id };
        continue;
      }
      if (!sc.group) continue;
      if (sc.once !== false && g.flag(`done:${sc.id}`)) continue;
      if (sc.visible && !g.test(sc.visible, pid)) continue;
      if (sc.enabled && !g.test(sc.enabled, pid)) continue;
      if (!g.hasCostAll(sc.cost)) continue;
      const area = g.ix.areaOf(sc.group);
      if (!areaKnown(g, area)) continue;
      return { area, id: sc.id };
    }
    // a story supper waiting
    const sup = g.pickFromPool('supper', true);
    const pool = this.c.pools.find((p) => p.id === 'p_01');
    if (sup && (sup.priority ?? 0) > 0 && !g.flag(`done:${sup.id}`) && this.stepsSinceSupper > 30 && g.hasCostAll(pool?.cost))
      return { area: g.ix.homeArea, id: 'p_01' };
    return null;
  }

  private story(v: PlayerView, g: Game): Command | null {
    const s = this.storyArea(g);
    if (!s) return null;
    if (v.me.area !== s.area) {
      // the hunter leads: go only when the scene is worth walking to
      return this.goTowards(v, g, s.area);
    }
    // both here? propose (the hunter proposes, the maker answers)
    if (v.partner.area !== s.area || !v.partner.online) return null;
    if (v.me.role !== 'hunter') return null;
    const all = v.groups.flatMap((gr) => gr.entries);
    const e = all.find((x) => x.id === s.id);
    if (e?.enabled) {
      if (s.id === 'p_01') this.stepsSinceSupper = 0;
      return { c: 'act', id: s.id };
    }
    const node = v.map.nodes.find((n) => n.scout?.id === s.id);
    if (node?.scout?.enabled) return { c: 'act', id: s.id };
    return null;
  }

  // ------------------------------------------------------------------ trade

  private isWare(g: Game, id: string): boolean {
    const def = g.ix.res.get(id);
    return !!def?.ware && g.test(def.ware, this.pid);
  }

  /** Flags that trading raises (trust), and how far the story needs them. */
  private trustNeed(g: Game): { flag: string; n: number } | null {
    // how high trading alone can raise each flag
    const raised = new Map<string, number>();
    for (const a of this.c.actions)
      for (const e of a.effects ?? [])
        if ('inc' in e && (a.kind === 'trade' || a.kind === 'home')) raised.set(e.inc, Math.max(raised.get(e.inc) ?? 0, e.max ?? Infinity));
    const flat = (c: Cond | undefined): Cond[] => (!c ? [] : 'all' in c ? c.all.flatMap(flat) : 'any' in c ? c.any.flatMap(flat) : [c]);
    for (const sc of this.c.scenes) {
      if (sc.pool || (sc.once !== false && g.flag(`done:${sc.id}`))) continue;
      if (sc.visible && !g.test(sc.visible, this.pid)) continue;
      for (const c of flat(sc.enabled)) {
        if (!('flag' in c) || c.gte === undefined || !raised.has(c.flag)) continue;
        // beyond what trade can give, the story (an errand) has to raise it
        const reach = Math.min(c.gte, raised.get(c.flag)!);
        if (g.flag(c.flag) < reach) return { flag: c.flag, n: reach - g.flag(c.flag) };
      }
    }
    return null;
  }

  private storyNeedsCoins(g: Game): boolean {
    return this.c.scenes.some(
      (sc) => !!sc.cost?.[COIN] && !(sc.once !== false && g.flag(`done:${sc.id}`)) && (!sc.visible || g.test(sc.visible, this.pid)) && g.stockAll(COIN) < sc.cost[COIN]!,
    );
  }

  /** Buy actions this hero could use: what they give, for how much. */
  private buys(g: Game): ActionDef[] {
    return this.c.actions.filter((a) => a.kind === 'trade' && a.cost?.[COIN] && !Object.keys(a.yield ?? {}).includes(COIN));
  }

  /** Shillings the plans call for (to buy what cannot be gathered, and for the story's prices). */
  private coinNeed(g: Game, want: Map<string, number>): number {
    let need = want.get(COIN) ?? 0;
    for (const [r, short] of want) {
      if (r === COIN) continue;
      const gathered = this.c.actions.some((a) => a.kind === 'gather' && Object.keys(a.yield ?? {}).includes(r));
      if (gathered) continue;
      const buy = this.buys(g).find((a) => Object.keys(a.yield ?? {}).includes(r) && (!a.visible || g.test(a.visible, this.pid)));
      if (!buy) continue;
      const per = Number(buy.yield![r]) || 1;
      need += buy.cost![COIN]! * Math.ceil(short / per);
    }
    return Math.max(0, need - g.stockAll(COIN));
  }

  /** Carry goods to a buyer when the story or the shopping list asks for shillings or trust. */
  private trade(v: PlayerView, g: Game): Command | null {
    // careless players work at random, but money they earn and spend with a plan (or they never would)
    const want = this.wanted(g, true);
    const coins = this.coinNeed(g, want);
    const trust = this.trustNeed(g);
    const here = v.groups.flatMap((gr) => gr.entries);
    // buy what is wanted, if we stand where it is sold
    for (const a of this.buys(g)) {
      const e = here.find((x) => x.id === a.id);
      if (!e?.enabled) continue;
      if (Object.keys(a.yield ?? {}).some((r) => want.has(r))) return { c: 'act', id: a.id };
    }
    // go and buy what is wanted and cannot be gathered, with shillings in the bag
    const myCoins = g.p(this.pid).bag[COIN] ?? 0;
    // the cheapest first: two buys at different prices must not pass the purse back and forth
    for (const b of [...this.buys(g)].sort((x, y) => x.cost![COIN]! - y.cost![COIN]!)) {
      if (b.visible && !g.test(b.visible, this.pid)) continue;
      const area = g.ix.areaOf(b.group);
      if (!areaKnown(g, area)) continue;
      const r = Object.keys(b.yield ?? {}).find((x) => want.has(x));
      if (!r || this.c.actions.some((a) => a.kind === 'gather' && Object.keys(a.yield ?? {}).includes(r))) continue;
      const price = b.cost![COIN]!;
      if (myCoins < price) {
        // money split between two purses: pool it in the store, then one of us takes it all
        const stored = g.s.res[COIN] ?? 0;
        if (v.atHome && stored + myCoins >= price && stored > 0) return { c: 'pack', id: COIN, n: stored };
        if (v.atHome && myCoins > 0 && g.stockAll(COIN) >= price) return { c: 'pack', id: COIN, n: -myCoins };
        continue;
      }
      if (v.me.area !== area) return this.goTowards(v, g, area);
    }
    if (coins <= 0 && !trust) return null;
    const sells = this.c.actions.filter((a) => {
      if (a.kind !== 'trade' || !a.yield?.[COIN]) return false;
      if (a.visible && !g.test(a.visible, this.pid)) return false;
      if (!areaKnown(g, g.ix.areaOf(a.group))) return false;
      if (trust && coins <= 0) return (a.effects ?? []).some((e) => 'inc' in e && e.inc === trust.flag);
      return true;
    });
    // sell what is in the bag where we stand
    for (const a of sells) {
      const e = here.find((x) => x.id === a.id);
      if (e?.enabled) return { c: 'act', id: a.id };
    }
    // choose a sale: goods we have and do not need ourselves
    const pick = sells
      .map((a) => {
        const [ware, n] = Object.entries(a.cost ?? {})[0] ?? ['', 0];
        const inBag = g.p(this.pid).bag[ware] ?? 0;
        const stored = g.s.res[ware] ?? 0;
        return { a, ware, n, inBag, stored };
      })
      .filter((x) => x.ware && !want.has(x.ware) && (x.inBag >= x.n || (v.atHome && x.stored >= x.n)))
      .sort((x, y) => Number(y.a.yield![COIN]) / y.n - Number(x.a.yield![COIN]) / x.n)[0];
    if (!pick) return null;
    const area = g.ix.areaOf(pick.a.group);
    if (pick.inBag < pick.n) {
      const n = Math.min(pick.stored, pick.n * 3);
      if (v.atHome && v.bag.load + n < v.bag.cap) return { c: 'pack', id: pick.ware, n };
      return null;
    }
    if (v.me.area !== area) return this.goTowards(v, g, area);
    return null;
  }

  // ------------------------------------------------------------------ work

  private jobRes(actionId: string): string {
    const a = this.c.actions.find((x) => x.id === actionId);
    return Object.keys(a?.yield ?? {})[0] ?? '';
  }

  private entry(v: PlayerView, id: string) {
    return v.groups.flatMap((g) => g.entries).find((e) => e.id === id) ?? null;
  }

  /** What the visible-but-too-dear things of the world ask for (resource → how many short). */
  private wanted(g: Game, noCoins = false): Map<string, number> {
    const out = new Map<string, number>();
    const add = (cost: Record<string, number> | undefined) => {
      for (const [r, n] of Object.entries(cost ?? {})) {
        const short = n - g.stockAll(r);
        if (short > 0) out.set(r, Math.max(out.get(r) ?? 0, short));
      }
    };
    for (const a of this.c.actions) {
      if (a.kind !== 'craft' && a.kind !== 'build') continue;
      if (!this.worthMaking(a, g)) continue;
      if (a.visible && !g.test(a.visible, this.pid) && !g.test(a.visible, g.other(this.pid))) continue;
      if (a.once && g.flag(`built:${a.id}`)) continue;
      add(a.cost);
    }
    for (const sc of this.c.scenes) {
      if (sc.once !== false && g.flag(`done:${sc.id}`)) continue;
      if (sc.visible && !g.test(sc.visible, this.pid)) continue;
      add(sc.cost);
      // what an operation's moves will cost
      for (const node of Object.values(sc.nodes)) {
        if (node.type !== 'operation') continue;
        for (const m of node.moves) for (const r of Object.keys(m.cost ?? {})) add({ [r]: this.reserve(g, r) });
      }
    }
    // always keep some food, and wood for the hearth once it matters for warmth and rest
    if (g.stockAll(this.c.food!) < 6) out.set(this.c.food!, 6);
    const wood = g.ix.c.needs?.campWood;
    if (wood && g.p(this.pid).needs && g.stoveState() !== 'warm' && (g.s.res[wood] ?? 0) < 6) out.set(wood, 6);
    // trust is bought with goods: keep something to sell
    const trust = this.trustNeed(g);
    if (trust) {
      const salt = this.c.resources.find((r) => r.name === 'Сіль')?.id;
      if (salt && g.stockAll(salt) < 8) out.set(salt, 8 - g.stockAll(salt));
    }
    if (!noCoins) {
      const coins = this.coinNeed(g, out);
      if (coins > 0) out.set(COIN, coins);
    }
    return out;
  }

  /**
   * What the next story steps ask for at once — the scene's price and what its operation's moves
   * cost over half its turns (a supper's food too): cooking must not eat into it.
   */
  private reserve(g: Game, r: string): number {
    let need = r === this.c.food ? 2 : 0;
    for (const sc of this.c.scenes) {
      if (sc.once !== false && g.flag(`done:${sc.id}`)) continue;
      if (sc.visible && !g.test(sc.visible, this.pid)) continue;
      let n = sc.cost?.[r] ?? 0;
      for (const node of Object.values(sc.nodes)) {
        if (node.type !== 'operation') continue;
        const per = Math.max(0, ...node.moves.map((m) => m.cost?.[r] ?? 0));
        n += per * Math.ceil(node.turns / 2);
      }
      need = Math.max(need, n);
    }
    return need;
  }

  private worthMaking(a: ActionDef, g: Game): boolean {
    if (g.atLimit(a)) return false;
    // dishes and the like must not eat what the story will ask for
    if (Object.keys(a.yield ?? {}).some((y) => g.ix.res.get(y)?.kind === 'use')) {
      for (const [r, n] of Object.entries(a.cost ?? {})) if (g.stockAll(r) - n < this.reserve(g, r)) return false;
    }
    const y = Object.keys(a.yield ?? {});
    for (const id of y) {
      const def = g.ix.res.get(id);
      if (def?.kind === 'use') return (g.s.res[id] ?? 0) < 4;
    }
    if (!y.length) return true;
    return y.some((id) => {
      const def = g.ix.res.get(id);
      return def?.kind === 'gear' || (g.s.res[id] ?? 0) < Math.min(10, g.cap(id));
    });
  }

  private work(v: PlayerView, g: Game, stay = false): Command | null {
    const want = this.wanted(g);
    const here = v.groups.flatMap((gr) => gr.entries).filter((e) => e.kind === 'act' && e.enabled && !(e.readyAt && e.readyAt > v.now));
    const score = (id: string): number => {
      const a = g.ix.actions.get(id);
      if (!a) return 0;
      if (this.o.careless) {
        if (a.kind === 'trade') return 0;
        // at random, but what the story is short of comes to mind more often
        const short = Object.keys(a.yield ?? {}).some((r) => want.has(r));
        return this.rng.next() * 10 + (short ? 15 : 0);
      }
      if (a.kind === 'build') return 120;
      if (a.kind === 'craft') return this.worthMaking(a, g) ? 90 : 0;
      if (a.kind === 'train') return 2;
      if (a.kind === 'trade') return 0;
      if (a.kind === 'home') return id === 'x_10' && g.stoveState() !== 'warm' ? 30 : 0;
      let s = 0;
      for (const [r] of Object.entries(a.yield ?? {})) {
        if (want.has(r)) s += 60;
        else if ((g.s.res[r] ?? 0) < g.cap(r) * 0.5) s += 8;
      }
      for (const ch of a.chance ?? []) for (const r of Object.keys(ch.add ?? {})) if (want.has(r)) s += 40;
      if (a.effects?.length && !a.yield) s += 20;
      return s;
    };
    const ranked = here.map((e) => ({ e, s: score(e.id) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);

    if (stay) {
      const best = ranked[0];
      return best ? { c: 'act', id: best.e.id } : null;
    }
    const goods = v.bag.items.some((i) => i.kind !== 'use' && i.kind !== 'food');
    let target = this.whereToGather(v, g, want);
    // the story waits for strength: go where the fights are
    if (!target && this.levelGated(g)) target = this.huntingGround(v, g);
    if (!target && !v.atHome && this.levelGated(g) && (areaDef(g, v.me.area)?.danger ?? 0) > 0) {
      const any = ranked[0];
      if (any) return { c: 'act', id: any.e.id };
    }
    // away: carry home when full; go on to where the wanted things are; home when the trip is done
    if (!v.atHome) {
      if (v.bag.load >= v.bag.cap * 0.8) return this.goTowards(v, g, g.ix.homeArea);
      const best = ranked[0];
      // a careless player, having walked somewhere, mostly does something there
      if (this.o.careless && best && this.rng.next() < 0.7) return { c: 'act', id: best.e.id };
      if (best && best.s >= 40) return { c: 'act', id: best.e.id };
      if (target && target !== v.me.area) return this.goTowards(v, g, target) ?? this.goTowards(v, g, g.ix.homeArea);
      if (goods) return this.goTowards(v, g, g.ix.homeArea);
      if (best) return { c: 'act', id: best.e.id };
      return this.goTowards(v, g, g.ix.homeArea);
    }
    const best = ranked[0];
    if (best && best.s >= 60) return { c: 'act', id: best.e.id };
    if (target && target !== v.me.area) return this.goTowards(v, g, target);
    if (best) return { c: 'act', id: best.e.id };
    return null;
  }

  /** A story scene is there but asks for a higher level. */
  private levelGated(g: Game): boolean {
    for (const sc of this.c.scenes) {
      if (sc.pool || !sc.enabled || !('level' in sc.enabled)) continue;
      if (g.flag(`done:${sc.id}`)) continue;
      if (sc.visible && !g.test(sc.visible, this.pid)) continue;
      if (!g.test(sc.enabled, this.pid)) return true;
    }
    return false;
  }

  /** The most dangerous explored place the hero can still stand. */
  private huntingGround(v: PlayerView, g: Game): string | null {
    let best: { id: string; d: number } | null = null;
    for (const a of this.c.areas) {
      if (a.home || !areaKnown(g, a.id) || !a.foes?.length) continue;
      const d = a.danger ?? 0;
      if (d > v.hero.level + 1) continue;
      if (!best || d > best.d) best = { id: a.id, d };
    }
    return best?.id ?? null;
  }

  private whereToGather(v: PlayerView, g: Game, want: Map<string, number>): string | null {
    const lvl = v.hero.level;
    let best: { area: string; s: number } | null = null;
    for (const a of this.c.actions) {
      if (a.kind !== 'gather' || (a.role && a.role !== v.me.role)) continue;
      const area = g.ix.areaOf(a.group);
      if (!areaKnown(g, area)) continue;
      if (a.visible && !g.test(a.visible, this.pid)) continue;
      if (a.tool && !heroOf(g, this.pid).tools.has(a.tool)) continue;
      const danger = areaDef(g, area)?.danger ?? 0;
      if (danger > lvl + 1) continue;
      let s = 0;
      for (const r of Object.keys(a.yield ?? {})) if (want.has(r)) s += 10 + (want.get(r) ?? 0);
      for (const ch of a.chance ?? []) for (const r of Object.keys(ch.add ?? {})) if (want.has(r)) s += 6;
      if (s > 0 && (!best || s > best.s)) best = { area, s };
    }
    return best?.area ?? null;
  }

  private goTowards(v: PlayerView, g: Game, area: string): Command | null {
    const from = v.me.area;
    if (from === area) return null;
    // breadth-first over known places
    const prev = new Map<string, string>();
    const queue = [from];
    const seen = new Set([from]);
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === area) break;
      for (const a of this.c.areas) {
        if (seen.has(a.id) || linkTime(g, cur, a.id) === null || !areaKnown(g, a.id)) continue;
        seen.add(a.id);
        prev.set(a.id, cur);
        queue.push(a.id);
      }
    }
    if (!seen.has(area)) return null;
    let step = area;
    while (prev.get(step) !== from) step = prev.get(step)!;
    return { c: 'go', to: step };
  }

  // ------------------------------------------------------------------ home chores

  private gear(v: PlayerView, g: Game): Command | null {
    const h = v.hero;
    if (!h.canChange) return null;
    const keepKnife = v.me.role === 'maker';
    for (const s of h.slots) {
      if (!s.options.length) continue;
      const cur = s.item?.id;
      const score = (id: string | undefined) => {
        if (!id) return 0;
        const gr = g.ix.res.get(id)?.gear;
        if (!gr) return 0;
        let x = (gr.armor ?? 0) * 3 + (gr.hp ?? 0) + (gr.carry ?? 0) * 0.5 + (gr.resist?.length ?? 0) * 3 + (gr.dodge ?? 0) * 20;
        if (gr.dmg) x += (gr.dmg[0] + gr.dmg[1]) * 1.5;
        if (gr.tools?.includes('blade') && keepKnife) x += 30;
        if (gr.ammo && (g.s.res[gr.ammo] ?? 0) + (g.p(this.pid).bag[gr.ammo] ?? 0) < 3) x -= 20;
        return x;
      };
      const best = [...s.options].sort((a, b) => score(b.id) - score(a.id))[0]!;
      if (score(best.id) > score(cur) + 0.5) return { c: 'equip', slot: s.slot, id: best.id };
    }
    return null;
  }

  private pack(v: PlayerView): Command | null {
    const want: Record<string, number> = { u_02: 2, u_05: 1, u_03: 2, u_04: 2, u_07: 1, u_01: 12, u_06: 12, [this.c.food!]: 2 };
    // food for the road and a hot drink once the needs count (a campfire burns driftwood picked up on the way)
    if (v.needs) Object.assign(want, { u_09: 3, u_10: 1, u_11: 1 });
    for (const [id, n] of Object.entries(want)) {
      const inBag = v.bag.items.find((i) => i.id === id)?.n ?? 0;
      const stored = v.res.find((r) => r.id === id)?.n ?? 0;
      if (inBag < n && stored > 0 && v.bag.load + 1 < v.bag.cap) return { c: 'pack', id, n: Math.min(n - inBag, stored) };
    }
    return null;
  }
}

export function ownsAny(g: Game, id: string): boolean {
  return ownsCount(g, id) > 0;
}
