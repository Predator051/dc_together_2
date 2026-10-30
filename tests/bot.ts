// A test player: looks at its own view (and, for planning, at what the world offers) and sends
// commands like a person would. Two of them play act one together.

import type { ActionDef, Cond, Content, PlayerId, Role, SceneDef } from '../shared/src/content.js';
import type { Command, PlayerView } from '../shared/src/protocol.js';
import { Rng } from '../shared/src/rng.js';
import type { Game } from '../server/src/engine/index.js';
import { areaDef, areaKnown, linkTime } from '../server/src/engine/travel.js';
import { heroOf, ownsCount } from '../server/src/engine/hero.js';
import { sees } from '../shared/src/field.js';

export interface BotOptions {
  /** Picks at random in fights and scenes, spends on whatever. */
  careless?: boolean;
  seed?: number;
  /** Takes up side errands too (by default only the story is played). */
  side?: boolean;
  /** Never readies a together scene alone (the scenes must go without it). */
  noPrep?: boolean;
}

/** Shillings of act two. */
const COIN = 'r_22';

/** Perks each role reaches for first (any other that can be taken comes after). */
export const PERK_PLAN: Record<Role, string[]> = {
  hunter: ['eye', 'tough', 'cold', 'legs', 'pinshot', 'flint', 'watch', 'flank', 'steady', 'opening', 'shove', 'hardy', 'desperate', 'will', 'double', 'master', 'volley', 'second', 'tireless', 'duel', 'rain', 'ambusher', 'unbroken', 'pathfinder', 'porter', 'dash', 'pierce', 'twin'],
  maker: ['first', 'tough', 'lunge', 'hands', 'flint', 'roll', 'shove', 'handy', 'master', 'eye', 'riposte', 'learner', 'cold', 'packer', 'arrows', 'watch', 'sweep', 'bulwark', 'thrifty', 'lore', 'ram', 'execute', 'taunt', 'rally', 'artisan', 'forager', 'shieldbreak', 'tempest'],
};

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
  private aimedIn = "";
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
    // a won fight's loot waits on the field: take it
    if (v.fightEnd?.loot) return { c: 'loot' };
    if (v.scene) return v.scene.paused ? null : this.scene(v);
    if (v.proposal && !v.proposal.mine) return { c: 'accept' };
    if (v.hero.perkPoints > 0) {
      const can = v.hero.branches.flatMap((b) => b.tiers.flatMap((t) => t.perks)).filter((x) => x.state === 'can').map((x) => x.id);
      if (can.length) {
        const plan = PERK_PLAN[v.me.role];
        const id = this.o.careless ? this.rng.pick(can) : (plan.find((x) => can.includes(x)) ?? can[0]!);
        return { c: 'perk', id };
      }
    }
    if (v.hero.points > 0) {
      const plan = STAT_PLAN[v.me.role];
      const id = this.o.careless ? this.rng.pick(['str', 'agi', 'end', 'per', 'wil']) : plan[(v.hero.level - 2) % plan.length]!;
      return { c: 'stat', id };
    }
    // past the act's ceiling: health first, then load, speed, and the rest for the store
    if (v.hero.temper && v.hero.temper.points > 0) {
      const k = ['hp', 'carry', 'pace', 'gift'].map((id) => v.hero.temper!.kinds.find((x) => x.id === id)!).find((x) => x.most === null || x.taken < x.most);
      if (k) return { c: 'temper', id: k.id };
    }
    if (v.proposal) return null; // mine: wait for the answer
    // a small happening: answer it (a careless player at random, a careful one the first that can be done)
    const ev = v.events[0];
    if (ev) {
      const ok = ev.choices.map((c, i) => ({ c, i })).filter((x) => x.c.enabled);
      if (ok.length) return { c: 'event', uid: ev.uid, choice: (this.o.careless ? this.rng.pick(ok) : ok[0]!).i };
    }
    if (v.busyUntil > v.now || v.map.travel) return null;
    if (v.nearFight) return { c: 'help' };
    // the garden: gather what is ripe, sow what there is seed for (keeping one of each back)
    if (v.garden) {
      const ripe = v.garden.beds.findIndex((b) => b.ready);
      if (ripe >= 0) return { c: 'harvest', bed: ripe };
      const empty = v.garden.beds.findIndex((b) => !b.crop);
      const seed = v.garden.seeds.find((x) => x.have > 1);
      if (empty >= 0 && seed) return { c: 'plant', bed: empty, crop: seed.crop };
    }

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
      const kept = this.packList(v, g);
      const stuck = v.bag.items.find((i) => i.kind !== 'use' && i.kind !== 'food' && !this.isWare(g, i.id) && !kept[i.id]);
      if (stuck) return { c: 'drop', id: stuck.id, n: stuck.n };
      const gear = this.gear(v, g);
      if (gear) return gear;
      const pack = this.pack(v, g);
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
    if (!f.myTurn || !f.moves.length) return null;
    const moves = f.moves.filter((m) => m.enabled);
    if (!moves.length) return { c: 'fight', id: 'end' };
    const has = (id: string) => moves.find((m) => m.id === id);
    const go = (c: [number, number]): Command => ({ c: 'fight', id: `go:${c[0]},${c[1]}` });
    if (this.o.careless) {
      if (f.reach.length && this.rng.chance(0.4)) return go(this.rng.pick(f.reach).c);
      return { c: 'fight', id: this.rng.pick(moves).id };
    }
    const me = f.party.find((p) => p.me)!;
    const at = me.pos!;
    const mate = f.party.find((p) => !p.me);
    const live = f.foes.filter((x) => !x.out && x.pos);
    // the partner first: lift, free, or go to them to do it
    if (has('lift')) return { c: 'fight', id: 'lift' };
    if (has('free')) return { c: 'fight', id: 'free' };
    const needsMe = f.moves.find((m) => (m.id === 'lift' || m.id === 'free') && !m.enabled && m.reason !== undefined);
    if (needsMe && mate?.pos && f.reach.length) {
      const close = this.toward(f, mate.pos, 1);
      if (close) return go(close);
    }
    if (has('struggle')) return { c: 'fight', id: 'struggle' };
    const pinch = moves.find((m) => m.id === `use:u_04`);
    if (pinch && f.foes.some((x) => !x.out && x.holds && x.traits.includes('Кровосос'))) return { c: 'fight', id: pinch.id };
    const use = (id: string) => moves.find((m) => m.id === `use:${id}`);
    if (me.poison > 0 && use('u_05')) return { c: 'fight', id: 'use:u_05' };
    if (me.hp < me.hpMax * 0.35 && use('u_02')) return { c: 'fight', id: 'use:u_02' };
    const near = (x: (typeof live)[number], r = 3) => Math.max(Math.abs(x.pos![0] - at[0]), Math.abs(x.pos![1] - at[1])) <= r;
    if (live.some((x) => x.traits.includes('Боїться вогню') && near(x)) && use('u_03') && this.torchUsed !== f.id) {
      this.torchUsed = f.id;
      return { c: 'fight', id: 'use:u_03' };
    }
    if (live.some((x) => x.traits.includes('Боїться гуку') && near(x) && (x.move === 'grab' || x.holds || x.move === 'call')) && use('u_07')) return { c: 'fight', id: 'use:u_07' };
    if (has('rout')) return { c: 'fight', id: 'rout' };
    const tech = (t: string, uid?: number) => moves.find((m) => m.tech === t && (uid === undefined || m.target === uid));
    // a charge marked at me: off the line, or take it on a stance
    const lane = live.find((x) => (x.move === 'charge' || x.move === 'sweep') && x.line?.some((c) => c[0] === at[0] && c[1] === at[1]));
    if (lane) {
      const off = f.reach
        .filter((r) => !lane.line!.some((c) => c[0] === r.c[0] && c[1] === r.c[1]))
        .sort((a, b) => a.cost - b.cost)[0];
      if (off && off.cost <= 1) return go(off.c);
      const stance = tech('block') ?? tech('keep');
      if (stance) return { c: 'fight', id: stance.id };
      if (off) return go(off.c);
    }
    // daze the one about to do something nasty
    const nasty = live.find((x) => !x.stunned && ['grab', 'drag', 'call'].includes(x.move ?? ''));
    const daze = nasty ? tech('stun', nasty.uid) : undefined;
    if (daze) return { c: 'fight', id: daze.id };
    // moves of perks when they fit: a volley, a desperate blow, closing in with a blow, pinning from afar
    const rain = tech('rain');
    if (rain) return { c: 'fight', id: rain.id };
    for (const t of ['desperate', 'ram', 'roll', 'lunge', 'pinshot']) {
      const m = moves.find((x) => x.tech === t);
      if (m) return { c: 'fight', id: m.id };
    }
    const calling = live.find((x) => x.move === 'call');
    const open = live.find((x) => x.open);
    const order = [calling, open, ...[...live].sort((a, b) => a.hp - b.hp)].filter((x): x is (typeof live)[number] => !!x);
    for (const target of order) {
      if (target.open) {
        const t = tech('thrust', target.uid) ?? tech('chop', target.uid);
        if (t) return { c: 'fight', id: t.id };
      }
      const strong = tech('chop', target.uid) ?? (f.ap >= 3 ? tech('flurry', target.uid) : undefined) ?? tech('thrust', target.uid);
      if (strong) return { c: 'fight', id: strong.id };
      const hit = moves.find((m) => m.target === target.uid && (m.tech === 'hit' || m.tech === 'shoot'));
      if (hit) return { c: 'fight', id: hit.id };
    }
    // nothing in reach: a shooter takes aim or finds a line; the rest close in
    const ranged = f.moves.some((m) => m.tech === 'shoot');
    const target = order[0];
    if (target && f.reach.length) {
      if (ranged) {
        const spot = this.shotSpot(f, live);
        if (spot) return go(spot);
      } else {
        const close = this.toward(f, target.pos!, 1);
        if (close) return go(close);
      }
    }
    if (tech('aim') && this.aimedIn !== `${f.id}:${f.round}`) {
      this.aimedIn = `${f.id}:${f.round}`;
      return { c: 'fight', id: tech('aim')!.id };
    }
    // the strongest one stands at me: up with the shield
    const myLevel = v.hero.level;
    const strongAtMe = live.some((x) => near(x, 1) && x.level >= myLevel - 1);
    if (strongAtMe && tech('block')) return { c: 'fight', id: tech('block')!.id };
    return { c: 'fight', id: 'end' };
  }

  /** The cheapest reachable cell from which `to` is within `r` (or, failing that, the one nearest to it). */
  private toward(f: NonNullable<PlayerView['fight']>, to: [number, number], r: number): [number, number] | null {
    const d = (c: [number, number]) => Math.max(Math.abs(c[0] - to[0]), Math.abs(c[1] - to[1]));
    const me = f.party.find((p) => p.me)!.pos!;
    const within = f.reach.filter((x) => d(x.c) <= r && d(x.c) >= 1).sort((a, b) => a.cost - b.cost)[0];
    if (within) return within.c;
    const best = [...f.reach].sort((a, b) => d(a.c) - d(b.c) || a.cost - b.cost)[0];
    return best && d(best.c) < d(me) ? best.c : null;
  }

  /** A cell to shoot from: a foe in sight, none right next to it, the further from them the better. */
  private shotSpot(f: NonNullable<PlayerView['fight']>, live: NonNullable<PlayerView['fight']>['foes']): [number, number] | null {
    const fld = f.field;
    let best: { c: [number, number]; score: number } | null = null;
    for (const r of f.reach) {
      const ds = live.map((x) => Math.max(Math.abs(x.pos![0] - r.c[0]), Math.abs(x.pos![1] - r.c[1])));
      const closest = Math.min(...ds);
      if (closest < 2 && live.length) continue;
      const seen = live.some((x, i) => ds[i]! <= 6 && sees(fld, r.c, x.pos!));
      if (!seen) continue;
      const score = Math.min(closest, 4) - r.cost * 0.3;
      if (!best || score > best.score) best = { c: r.c, score };
    }
    return best?.c ?? null;
  }

  // ------------------------------------------------------------------ scenes

  private scene(v: PlayerView): Command | null {
    const sc = v.scene!;
    if (sc.waiting) return null;
    if (sc.kind === 'text') return { c: 'next' };
    if (sc.kind === 'fight') return null;
    if (sc.kind === 'stealth' && sc.stealth) return this.stealth(v);
    if (sc.kind === 'operation' && sc.operation) return this.operation(v);
    if (sc.kind === 'delve' && sc.delve) return this.delve(v);
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

  /**
   * A descent or a road with a cart: mend what bars the way, take back store when it runs low, then go on
   * (east on the drawn map) by the cheapest way that does not empty the store. Both bots reckon the same.
   */
  private delve(v: PlayerView): Command | null {
    const d = v.scene!.delve!;
    const barred = d.exits.some((e) => !e.enabled);
    const act = d.acts.find((a) => a.enabled && ((a.light < 0 && d.light <= 3) || (a.light === 0 && barred)));
    if (act) return { c: 'choose', id: act.id };
    const here = d.rooms.find((r) => r.here);
    const x = (id: string) => d.rooms.find((r) => r.id === id)?.x ?? 0;
    const open = d.exits.filter((e) => e.enabled && e.light < d.light);
    if (!open.length) {
      if (d.canLeave) return { c: 'choose', id: 'leave' };
      // nothing that keeps some store: the cheapest way on (it may run the store out — then home)
      const last = d.exits.filter((e) => e.enabled && e.light <= d.light).sort((a, b) => a.light - b.light)[0];
      return last && !last.mine ? { c: 'choose', id: last.id } : null;
    }
    if (this.o.careless) return { c: 'choose', id: this.rng.pick(open).id };
    const best = [...open].sort((a, b) => x(b.to) - x(a.to) || a.light - b.light)[0]!;
    if (here && x(best.to) <= here.x && d.canLeave) return { c: 'choose', id: 'leave' };
    // a way picked stays picked while it is still the best (a mended bridge may make it another)
    if (best.mine) return null;
    return { c: 'choose', id: best.id };
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
    // a good track that is not the goal feeds it (the partner's move may be the one that moves it over)
    const feeds = new Set(op.tracks.filter((t) => !t.bad && t.id !== win).map((t) => t.id));
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
      if (sc.quest && !this.o.side) continue;
      if (sc.once !== false && g.flag(`done:${sc.id}`)) continue;
      if (sc.visible && !g.test(sc.visible, pid)) continue;
      if (sc.enabled && !g.test(sc.enabled, pid)) continue;
      if (!g.hasCostAll(sc.cost)) continue;
      if (!this.readyFor(sc, g)) continue;
      const area = g.ix.areaOf(sc.group);
      if (!areaKnown(g, area)) continue;
      return { area, id: sc.id };
    }
    // a story supper waiting
    const sup = g.pickFromPool('supper', true);
    const pool = this.c.pools.find((p) => p.id === 'p_01');
    if (sup && (sup.priority ?? 0) > 0 && !g.flag(`done:${sup.id}`) && this.stepsSinceSupper > 30 && g.hasCostAll(pool?.cost))
      return { area: g.ix.homeArea, id: 'p_01' };
    // an errand waits for days to pass: spend the evenings at home now and then
    if (this.o.side && this.stepsSinceSupper > 400 && g.hasCostAll(pool?.cost) && this.waitingForDays(g))
      return { area: g.ix.homeArea, id: 'p_01' };
    return null;
  }

  /** An operation is not begun before what its moves cost over half its turns is at hand. */
  private readyFor(sc: SceneDef, g: Game): boolean {
    for (const node of Object.values(sc.nodes)) {
      if (node.type !== 'operation') continue;
      const need: Record<string, number> = {};
      for (const m of node.moves) for (const [r, n] of Object.entries(m.cost ?? {})) need[r] = Math.max(need[r] ?? 0, n);
      for (const [r, n] of Object.entries(need)) if (g.stockAll(r) < n * Math.ceil(node.turns / 2)) return false;
    }
    return true;
  }

  /** Some open errand's next step is a count that only the evenings move on. */
  private waitingForDays(g: Game): boolean {
    const daily = new Set((this.c.daily ?? []).filter((d) => d.flag && (!d.if || g.test(d.if, this.pid))).map((d) => d.flag!));
    if (!daily.size) return false;
    return this.c.scenes.some((sc) => {
      if (!sc.quest || g.flag(`done:${sc.id}`) || !sc.visible) return false;
      const flag = 'flag' in sc.visible ? sc.visible.flag : null;
      return !!flag && daily.has(flag) && !g.test(sc.visible, this.pid);
    });
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
    // trust that is given, not sold for (feeding a camp): carry what it costs there and give it
    if (trust) {
      const gifts = this.c.actions.filter(
        (a) =>
          !a.yield?.[COIN] &&
          (a.effects ?? []).some((e) => 'inc' in e && e.inc === trust.flag && (e.max ?? Infinity) > g.flag(trust.flag)) &&
          (!a.visible || g.test(a.visible, this.pid)) &&
          areaKnown(g, g.ix.areaOf(a.group)),
      );
      for (const a of gifts) {
        const e = here.find((x) => x.id === a.id);
        if (e?.enabled) return { c: 'act', id: a.id };
      }
      for (const a of gifts) {
        const short = Object.entries(a.cost ?? {}).find(([r, n]) => (g.p(this.pid).bag[r] ?? 0) < n);
        if (short) {
          const [r, n] = short;
          if (v.atHome && (g.s.res[r] ?? 0) >= n && v.bag.load + n < v.bag.cap) return { c: 'pack', id: r, n: Math.min(g.s.res[r]!, n * 2) };
          continue;
        }
        const area = g.ix.areaOf(a.group);
        if (v.me.area !== area) return this.goTowards(v, g, area);
      }
    }
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
      if (a.quest && !this.o.side) continue;
      if (!this.worthMaking(a, g)) continue;
      if (a.visible && !g.test(a.visible, this.pid) && !g.test(a.visible, g.other(this.pid))) continue;
      if (a.once && g.flag(`built:${a.id}`)) continue;
      add(a.cost);
    }
    for (const sc of this.c.scenes) {
      if (sc.once !== false && g.flag(`done:${sc.id}`)) continue;
      if (sc.quest && !this.o.side) continue;
      if (sc.visible && !g.test(sc.visible, this.pid)) continue;
      add(sc.cost);
      // things the scene asks to have (a cart, oxen): wanted like a price
      const flat = (c: Cond | undefined): Cond[] => (!c ? [] : 'all' in c ? c.all.flatMap(flat) : 'any' in c ? c.any.flatMap(flat) : [c]);
      for (const c of flat(sc.enabled)) if ('owns' in c) add({ [c.owns]: c.gte ?? 1 });
      // what an operation's moves will cost
      for (const node of Object.values(sc.nodes)) {
        if (node.type !== 'operation') continue;
        for (const m of node.moves) for (const r of Object.keys(m.cost ?? {})) add({ [r]: this.reserve(g, r) });
      }
    }
    // an errand asks for something made: what it is made of is wanted too
    if (this.o.side)
      for (const r of [...out.keys()]) {
        const make = this.c.actions.find((a) => a.kind === 'craft' && a.yield?.[r] && (!a.visible || g.test(a.visible, this.pid)));
        if (make) add(make.cost);
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
      if (a.quest && !this.o.side) return 0;
      // readying a together scene: done while here, unless told not to
      if (a.prep) return this.o.noPrep ? 0 : 70;
      // an errand's own step (a search, a count, a build away from home): do it while here
      if (a.quest && this.questStep(a, g)) return a.kind === 'build' || a.kind === 'craft' ? 90 : 45;
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

  /** An errand's action that moves it on (searches, counts, builds) and can be done now. */
  private questStep(a: ActionDef, g: Game): boolean {
    if (!this.o.side || !a.quest) return false;
    if (a.visible && !g.test(a.visible, this.pid)) return false;
    if (a.once && g.flag(`built:${a.id}`)) return false;
    if (g.atLimit(a) || !g.hasCostAll(a.cost)) return false;
    if (a.tool && !heroOf(g, this.pid).tools.has(a.tool)) return false;
    // a count moves the errand on; a repeatable source (feathers, osier) is not a step by itself
    if (a.effects?.some((e) => 'inc' in e) || a.once || a.oncePerPlayer) return true;
    const y = Object.keys(a.yield ?? {});
    return !y.length || y.some((id) => g.ix.res.get(id)?.kind === 'tool' || g.ix.res.get(id)?.kind === 'gear');
  }

  private whereToGather(v: PlayerView, g: Game, want: Map<string, number>): string | null {
    const lvl = v.hero.level;
    let best: { area: string; s: number } | null = null;
    // the errands' own steps come when the story wants nothing gathered
    let errand: string | null = null;
    for (const a of this.c.actions) {
      if (errand || !this.questStep(a, g)) continue;
      const area = g.ix.areaOf(a.group);
      if (!areaKnown(g, area) || (areaDef(g, area)?.danger ?? 0) > lvl + 1) continue;
      if (a.kind === 'craft' || (a.kind === 'build' && area === g.ix.homeArea)) continue;
      errand = area;
    }
    for (const a of this.c.actions) {
      if (a.kind !== 'gather' || (a.role && a.role !== v.me.role)) continue;
      if (a.quest && !this.o.side) continue;
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
    // once the story is done, an errand that can move on comes first
    return this.o.side ? (errand ?? best?.area ?? null) : (best?.area ?? errand);
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

  private pack(v: PlayerView, g: Game): Command | null {
    const want = this.packList(v, g);
    for (const [id, n] of Object.entries(want)) {
      const inBag = v.bag.items.find((i) => i.id === id)?.n ?? 0;
      const stored = v.res.find((r) => r.id === id)?.n ?? 0;
      if (inBag < n && stored > 0 && v.bag.load + 1 < v.bag.cap) return { c: 'pack', id, n: Math.min(n - inBag, stored) };
    }
    return null;
  }

  /** What goes in the bag before leaving home, and how much. */
  private packList(v: PlayerView, g: Game): Record<string, number> {
    const want: Record<string, number> = { u_02: 2, u_05: 1, u_03: 2, u_04: 2, u_07: 1, u_01: 12, u_06: 12, [this.c.food!]: 2 };
    // food for the road and a hot drink once the needs count (a campfire burns driftwood picked up on the way)
    if (v.needs) Object.assign(want, { u_09: 3, u_10: 1, u_11: 1 });
    // what the next operation's moves are paid with goes in the bag
    const next = this.storyArea(g);
    const sc = next && this.c.scenes.find((x) => x.id === next.id);
    if (sc && next!.area !== g.ix.homeArea)
      for (const node of Object.values(sc.nodes)) {
        if (node.type !== 'operation') continue;
        for (const m of node.moves) for (const [id, n] of Object.entries(m.cost ?? {})) want[id] = Math.max(want[id] ?? 0, n * Math.ceil(node.turns / 2));
      }
    // what an errand away from home is paid with goes in the bag
    for (const a of this.c.actions) {
      if (!this.questStep(a, g) || g.ix.areaOf(a.group) === g.ix.homeArea) continue;
      for (const [id, n] of Object.entries(a.cost ?? {})) want[id] = Math.max(want[id] ?? 0, n);
    }
    return want;
  }
}

export function ownsAny(g: Game, id: string): boolean {
  return ownsCount(g, id) > 0;
}
