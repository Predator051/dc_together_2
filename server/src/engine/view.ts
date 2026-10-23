import type { ActionDef, ChoiceNode, DelveNode, Effect, PlayerId, PoolActionDef, SceneDef, StealthNode } from '../../../shared/src/content.js';
import type {
  NeedsView,
  QuestView,
  ClueView,
  CostView,
  DeltaItem,
  DelveRoomView,
  DelveView,
  StealthView,
  EntryView,
  GainView,
  GroupView,
  LogView,
  MateEntryView,
  OptionView,
  PlayerView,
  SceneBlock,
  SceneView,
  SummaryView,
  WelcomeView,
} from '../../../shared/src/protocol.js';
import type { Game } from './index.js';
import { questProgress } from './index.js';
import { resolveParas } from './text.js';
import { SKILLS, SLOTS, STATS } from '../../../shared/src/content.js';
import type { BagView, BeastView, FightView, HeroView, MapView, ResidentView, WeatherView } from '../../../shared/src/protocol.js';
import { skillLevel, skillXpFor, xpForLevel } from '../../../shared/src/rules.js';
import { bagCap, bagLoad, gearNote, heroOf, ownsCount, useNote } from './hero.js';
import { activeFoes, enemyOf, fightMoves, fightOf, holder } from './fight.js';
import { areaDef, areaKnown, areaOnMap, goBlock, linkTime, residentJobs, routeLegs, routeTo, travelTime, walkOf } from './travel.js';
import { byFire, campBlock, chillRate, comfortOf, dryOf, eatBlock, restBlock, restLength, tired } from './needs.js';
import { outside, weatherNow } from './weather.js';
import { eventsView } from './events.js';
import { bedCount, gardenView } from './garden.js';
import { NEED, coldLevel, mealFading } from '../../../shared/src/rules.js';

const LOG_SEND = 120;

/** The red cost line already explains a shortage, so the generic text is not repeated. */
function shownReason(g: Game, reason: string | null): string | undefined {
  if (!reason || reason === g.ix.ui('err_cost')) return undefined;
  return reason;
}

function costView(g: Game, cost: Record<string, number> | undefined, pid?: PlayerId): CostView[] | undefined {
  if (!cost) return undefined;
  return Object.entries(cost).map(([id, n]) => {
    const have = pid ? g.stockOf(pid, id) : g.stockAll(id);
    const def = g.ix.res.get(id);
    return { id, name: def?.name ?? id, n, have, ok: have >= n, stock: !!def?.hidden };
  });
}

/** Describe what an action gives: exact amounts, ranges, or "+?" when it depends on luck. */
function actionGains(g: Game, a: ActionDef, pid: PlayerId): GainView[] {
  const out: GainView[] = [];
  const seen = new Set<string>();
  const visibleRes = (r: string) => {
    const def = g.ix.res.get(r);
    return def && !def.hidden ? def : null;
  };
  if (a.gives) out.push({ text: g.render(a.gives, pid) });
  for (const [r, y] of Object.entries(a.yield ?? {})) {
    const def = visibleRes(r);
    if (!def) continue;
    seen.add(r);
    if (a.rollsPer) out.push({ text: `+? ${def.name}`, unsure: true });
    else if (Array.isArray(y)) out.push({ text: `+${y[0]}–${y[1]} ${def.name}` });
    else out.push({ text: `+${y} ${def.name}` });
  }
  const top: Effect[] = a.effects ?? [];
  for (const e of top) {
    if ('add' in e) {
      for (const [r, n] of Object.entries(e.add)) {
        const def = visibleRes(r);
        if (!def || n <= 0 || seen.has(r)) continue;
        seen.add(r);
        out.push({ text: `+${n} ${def.name}` });
      }
    }
    if ('stove' in e) out.push({ text: `+${Math.round((e.stove * g.ix.c.stove.perWood) / 60000)} ${g.ix.ui('gain_fire')}` });
  }
  for (const ch of a.chance ?? []) {
    if (ch.if && !g.test(ch.if, pid)) continue;
    for (const [r, n] of Object.entries(ch.add ?? {})) {
      const def = visibleRes(r);
      if (!def || n <= 0 || seen.has(r)) continue;
      seen.add(r);
      out.push({ text: `+? ${def.name}`, unsure: true });
    }
  }
  for (const r of g.ix.c.resources) {
    for (const b of r.capBonus ?? []) {
      if ('flag' in b.if && b.if.flag === `built:${a.id}`) out.push({ text: `${r.name}: ${g.ix.ui('gain_space')} +${b.add}` });
    }
  }
  if (out.length === 0 && ((a.effects?.length ?? 0) > 0 || (a.beats?.length ?? 0) > 0 || (a.chance?.length ?? 0) > 0)) {
    out.push({ text: g.ix.ui('gain_unknown'), unsure: true });
  }
  return out;
}

function sceneGains(g: Game, def: SceneDef | PoolActionDef, pid: PlayerId): GainView[] {
  if (def.gives) return [{ text: g.render(def.gives, pid) }];
  return [{ text: g.ix.ui('gain_unknown'), unsure: true }];
}

function paras(g: Game, p: Parameters<typeof resolveParas>[0], pid: PlayerId): string[] {
  return resolveParas(p, (c) => g.test(c, pid)).map((t) => g.render(t, pid));
}

function groups(g: Game, pid: PlayerId): GroupView[] {
  const out: GroupView[] = [];
  const locs = [...g.ix.c.locations].sort((a, b) => a.order - b.order);
  const here = g.p(pid).at;
  for (const loc of locs) {
    if ((loc.area ?? g.ix.homeArea) !== here) continue;
    if (!g.test(loc.visible, pid)) continue;
    const entries: EntryView[] = [];
    for (const sc of g.ix.c.scenes) {
      if (sc.group !== loc.id || sc.label === undefined) continue;
      if (!g.sceneOrPoolVisible(sc, pid)) continue;
      const reason = g.proposalBlock(sc, pid);
      entries.push({
        id: sc.id,
        kind: 'scene',
        label: g.render(sc.label, pid),
        enabled: reason === null,
        reason: shownReason(g, reason),
        cost: costView(g, sc.cost),
        gain: sceneGains(g, sc, pid),
        together: true,
        ...(sc.spot ? { spot: sc.spot } : {}),
        ...(sc.quest ? { quest: true } : {}),
      });
    }
    for (const pool of g.ix.c.pools) {
      if (pool.group !== loc.id) continue;
      if (!g.sceneOrPoolVisible(pool, pid)) continue;
      const reason = g.proposalBlock(pool, pid);
      entries.push({
        id: pool.id,
        kind: 'pool',
        label: g.render(pool.label, pid),
        enabled: reason === null,
        reason: shownReason(g, reason),
        hint: pool.hint ? g.render(pool.hint, pid) : undefined,
        cost: costView(g, pool.cost),
        gain: sceneGains(g, pool, pid),
        together: true,
        ...(pool.spot ? { spot: pool.spot } : {}),
      });
    }
    for (const a of g.ix.c.actions) {
      if (a.group !== loc.id) continue;
      if (!g.actionVisible(a, pid)) continue;
      const reason = g.actionBlock(a, pid);
      const cd = g.p(pid).cooldowns[a.id] ?? 0;
      entries.push({
        id: a.id,
        kind: 'act',
        label: g.render(a.label, pid),
        enabled: reason === null,
        reason: shownReason(g, reason),
        hint: a.why ? g.render(a.why, pid) : a.hint ? g.render(a.hint, pid) : undefined,
        cost: costView(g, a.cost, pid),
        gain: actionGains(g, a, pid),
        readyAt: cd > g.now ? cd : undefined,
        cooldown: g.actionTime(a, pid),
        ...(a.spot ? { spot: a.spot } : {}),
        ...(a.quest ? { quest: true } : {}),
      });
    }
    const partner = mateEntries(g, pid, loc.id);
    const progress = loc.progress
      ? { label: loc.progress.label, n: Math.min(loc.progress.max, g.flag(loc.progress.flag)), max: loc.progress.max }
      : undefined;
    out.push({
      id: loc.id,
      name: loc.name,
      desc: g.render(loc.desc, pid),
      base: !!loc.base,
      entries,
      ...(partner.length ? { partner } : {}),
      ...(progress ? { progress } : {}),
      ...(loc.plan ? { plan: loc.plan } : {}),
      ...(loc.spots?.length ? { spots: loc.spots } : {}),
    });
  }
  const paths = pathEntries(g, pid);
  if (paths.length) out.push({ id: 'paths', name: g.ix.ui('paths'), desc: '', base: false, entries: paths });
  return out;
}

/** Ways from here: walk to known places, propose scouting unknown ones. */
function pathEntries(g: Game, pid: PlayerId): EntryView[] {
  const p = g.p(pid);
  if (p.travel) return [];
  const out: EntryView[] = [];
  for (const a of g.ix.c.areas) {
    if (a.id === p.at || !a.pos || !areaOnMap(g, a.id) || linkTime(g, p.at, a.id) === null) continue;
    if (areaKnown(g, a.id)) {
      const block = goBlock(g, pid, a.id, true);
      out.push({
        id: `go:${a.id}`,
        kind: 'go',
        label: `${g.ix.ui('go_to')} ${a.name}`,
        enabled: block === null,
        ...(block && block !== g.ix.ui('err_busy') ? { reason: block } : {}),
        cooldown: travelTime(g, pid, p.at, a.id),
        ...(a.danger ? { hint: `${g.ix.ui('danger')} ${a.danger}` } : {}),
      });
    } else if (a.scout) {
      const sc = g.ix.scenes.get(a.scout);
      if (!sc || !g.sceneOrPoolVisible(sc, pid)) continue;
      const reason = g.proposalBlock(sc, pid);
      out.push({
        id: sc.id,
        kind: 'scene',
        label: sc.label ? g.render(sc.label, pid) : sc.title,
        enabled: reason === null,
        reason: shownReason(g, reason),
        cost: costView(g, sc.cost),
        gain: sceneGains(g, sc, pid),
        together: true,
      });
    }
  }
  return out;
}

/**
 * Actions here that only the partner's role can do: shown read-only, wherever the partner is,
 * so a player knows what the other one could make of the shared stores.
 */
function mateEntries(g: Game, pid: PlayerId, locId: string): MateEntryView[] {
  const other = g.other(pid);
  const o = g.p(other);
  const me = g.p(pid);
  if (!o.joined || !o.role || o.role === me.role) return [];
  const out: MateEntryView[] = [];
  for (const a of g.ix.c.actions) {
    if (a.group !== locId || a.role !== o.role) continue;
    // visible to the partner, as if they stood here
    if (a.once && g.flag(`built:${a.id}`)) continue;
    if (a.oncePerPlayer && o.flags[`built:${a.id}`]) continue;
    if (a.visible && !g.test(a.visible, other)) continue;
    const away = o.at !== g.ix.areaOf(a.group);
    const block = away || !o.online ? null : g.actionBlock(a, other);
    const reason = !o.online
      ? g.render(g.ix.ui('mate_offline'), pid)
      : away
        ? g.render(g.ix.ui('mate_away'), pid)
        : shownReason(g, block);
    out.push({
      id: a.id,
      label: g.render(a.label, other),
      ready: o.online && !away && block === null,
      ...(reason ? { reason } : {}),
      cost: costView(g, a.cost, other),
      gain: actionGains(g, a, other),
      ...(a.spot ? { spot: a.spot } : {}),
    });
  }
  return out;
}

function optionLabel(g: Game, def: SceneDef, nodeId: string, optId: string | undefined, pid: PlayerId): string {
  if (!optId) return '';
  const n = def.nodes[nodeId];
  if (!n || n.type !== 'choice') return '';
  const o = n.options.find((x) => x.id === optId);
  return o ? g.render(o.label, pid) : '';
}

function sceneView(g: Game, pid: PlayerId): SceneView | null {
  const sc = g.s.scene;
  if (!sc) return null;
  const def = g.ix.scenes.get(sc.id)!;
  const role = g.p(pid).role;
  const other = g.other(pid);
  const blocks: SceneBlock[] = [];
  for (const t of sc.trail) {
    const n = def.nodes[t.node]!;
    const b: SceneBlock = {
      text: paras(g, n.text, pid),
      own: role === 'hunter' ? paras(g, n.hunter, pid) : role === 'maker' ? paras(g, n.maker, pid) : [],
    };
    if (t.picks && n.type === 'choice') {
      const mine = optionLabel(g, def, t.node, t.picks[pid], pid);
      const theirs = optionLabel(g, def, t.node, t.picks[other], pid);
      if (n.mode === 'any') {
        const who = t.picks[pid] ? g.ix.ui('pick_you') : g.render(g.ix.ui('pick_partner'), pid);
        b.picks = `${who}: ${mine || theirs}`;
      } else if (mine && theirs && mine === theirs) {
        b.picks = `${g.ix.ui('pick_both')}: ${mine}`;
      } else {
        b.picks = `${g.ix.ui('pick_you')}: ${mine} · ${g.render(g.ix.ui('pick_partner'), pid)}: ${theirs}`;
      }
    }
    if (t.combat) b.combat = t.combat[pid];
    blocks.push(b);
  }

  const n = def.nodes[sc.node]!;
  const view: SceneView = {
    id: sc.id,
    title: def.title,
    paused: sc.paused,
    pausedText: sc.paused ? g.render(g.ix.ui('scene_paused'), pid) : undefined,
    blocks,
    kind:
      n.type === 'choice' || n.type === 'combat' || n.type === 'delve' || n.type === 'stealth' || n.type === 'operation' || n.type === 'fight'
        ? n.type
        : 'text',
    mood:
      n.type === 'combat' || n.type === 'fight'
        ? 'fight'
        : n.type === 'delve' || n.type === 'stealth' || n.type === 'operation'
          ? 'deep'
          : def.pool
            ? 'hearth'
            : 'story',
    partnerPicked: false,
    waiting: false,
  };

  if (n.type === 'choice') {
    const cn = n as ChoiceNode;
    view.mode = cn.mode;
    view.options = cn.options
      .filter((o) => g.optionVisible(o, pid, sc.node))
      .map((o): OptionView => {
        const wrongRole = !!o.role && role !== o.role;
        const blocked = !!o.enabled && !g.test(o.enabled, pid);
        return {
          id: o.id,
          label: g.render(o.label, pid),
          enabled: !wrongRole && !blocked,
          reason: wrongRole
            ? `${g.ix.ui('only')} ${g.ix.c.roleTitles[o.role!][g.p(pid).gender]}`
            : blocked
              ? o.disabledHint ? g.render(o.disabledHint, pid) : g.ix.ui('err_not_now')
              : undefined,
        };
      });
    view.myPick = sc.picks[pid];
    view.partnerPicked = !!sc.picks[other];
    if (view.myPick && !view.partnerPicked) {
      view.waiting = true;
      view.waitingText = g.render(g.ix.ui('wait_choice'), pid);
    }
  } else if (n.type === 'combat' && sc.combat) {
    const cb = sc.combat;
    const enc = g.ix.enc.get(cb.enc)!;
    view.options = g.combatOptions(enc, pid).map((o) => {
      const wrongRole = !!o.role && role !== o.role;
      const affordable = g.hasCost(o.cost);
      return {
        id: o.id,
        label: g.render(o.label, pid),
        enabled: !wrongRole && affordable,
        reason: !affordable ? g.ix.ui('err_cost') : undefined,
      };
    });
    view.myPick = cb.picks[pid];
    view.partnerPicked = !!cb.picks[other];
    if (view.myPick && !view.partnerPicked) {
      view.waiting = true;
      view.waitingText = g.render(g.ix.ui('wait_choice'), pid);
    }
    view.combat = {
      enemy: enc.enemy.name,
      hp: Math.max(0, cb.hp),
      hpMax: enc.enemy.hp,
      fear: Math.min(cb.fear, enc.enemy.fear),
      fearMax: enc.enemy.fear,
      round: cb.round,
      lastRound: cb.lastRound[pid] ?? [],
      ...(enc.bars?.hp ? { hpLabel: enc.bars.hp } : {}),
      ...(enc.bars?.fear ? { fearLabel: enc.bars.fear } : {}),
    };
  } else if (n.type === 'delve' && sc.delve) {
    view.delve = delveView(g, pid, n);
    const d = sc.delve;
    view.myPick = d.picks[pid];
    view.partnerPicked = !!d.picks[other];
  } else if (n.type === 'stealth' && sc.stealth) {
    view.stealth = stealthView(g, pid, n);
  } else if (n.type === 'operation' && sc.operation) {
    const op = sc.operation;
    view.operation = {
      turn: op.turn,
      turns: n.turns,
      tracks: n.tracks.map((t) => ({
        id: t.id,
        label: t.label,
        value: op.tracks[t.id] ?? 0,
        max: t.max,
        bad: !!t.bad,
        ...(t.id === n.win.track ? { goal: n.win.gte } : {}),
      })),
      moves: g.operationMoves(n, pid).map((m) => {
        const block = g.operationBlock(m, pid);
        const eff = g.operationEffect(m, pid);
        return {
          id: m.id,
          label: g.render(m.label, pid),
          enabled: block === null,
          ...(block ? { reason: block } : {}),
          delta: eff.delta,
          ...(eff.transfer ? { transfer: eff.transfer } : {}),
          cost: costView(g, m.cost, undefined),
        };
      }),
      ...(op.picks[pid] ? { myPick: op.picks[pid] } : {}),
      partnerPicked: !!op.picks[other],
      lines: op.lines[pid] ?? [],
    };
    view.myPick = op.picks[pid];
    view.partnerPicked = !!op.picks[other];
  } else if (n.type === 'fight') {
    // the fight itself is shown by the fight panel
  } else {
    view.button = n.type !== 'combat' && 'button' in n && n.button ? g.render(n.button, pid) : undefined;
    if (sc.ready[pid]) {
      view.waiting = true;
      view.waitingText = g.render(g.ix.ui('wait_read'), pid);
    }
  }
  const signs = sc.signs ?? {};
  if (n.type === 'stealth' || signs[pid] || signs[other]) {
    const theirs = signs[other];
    view.signs = {
      mine: signs[pid]?.id,
      partner: theirs?.id,
      // a sign counts as fresh during the turn it was shown (or for half a minute outside turns)
      fresh: !!theirs && (sc.stealth ? theirs.turn === sc.stealth.turn : g.now - theirs.at < 30_000),
    };
  }
  return view;
}

function delveView(g: Game, pid: PlayerId, n: DelveNode): DelveView {
  const d = g.s.scene!.delve!;
  const map = g.ix.maps.get(d.map)!;
  const room = map.rooms[d.room]!;
  const role = g.p(pid).role;
  const other = g.other(pid);
  const known = (id: string) => !!g.flag(`known:${map.id}:${id}`);
  const rooms: DelveRoomView[] = [];
  const links: Array<[string, string]> = [];
  const shown = new Set<string>();
  const show = (id: string, unknown: boolean) => {
    if (shown.has(id)) return;
    shown.add(id);
    const r = map.rooms[id]!;
    rooms.push({ id, name: unknown ? '?' : r.name, x: r.pos[0], y: r.pos[1], here: id === d.room, unknown });
  };
  for (const [id, r] of Object.entries(map.rooms)) {
    if (!known(id)) continue;
    show(id, false);
    for (const e of r.exits) {
      if (!g.delveExitVisible(e)) continue;
      // a known room shows where its ways lead, even if nobody went there yet
      show(e.to, !known(e.to));
      if (id < e.to || !known(e.to)) links.push([id, e.to]);
    }
  }
  const exits = room.exits
    .filter((e) => g.delveExitVisible(e))
    .map((e) => {
      const note = role === 'hunter' ? e.hunter : role === 'maker' ? e.maker : undefined;
      const tone: 'warn' | 'lead' | undefined = role === 'maker' && e.risk ? 'warn' : role === 'hunter' && e.draft ? 'lead' : undefined;
      const enabled = !e.enabled || g.test(e.enabled, pid);
      return {
        id: `go:${e.to}`,
        to: e.to,
        label: g.render(e.label, pid),
        light: e.light ?? 1,
        ...(note ? { note: g.render(note, pid) } : {}),
        ...(tone ? { tone } : {}),
        enabled,
        ...(!enabled ? { reason: e.disabledHint ? g.render(e.disabledHint, pid) : g.ix.ui('err_not_now') } : {}),
        mine: d.picks[pid] === `go:${e.to}`,
        partner: d.picks[other] === `go:${e.to}`,
        known: known(e.to),
      };
    });
  const acts = (room.acts ?? [])
    .filter((a) => g.delveActVisible(map, a, pid))
    .map((a) => {
      const block = g.delveActBlock(a, pid);
      return {
        id: `act:${a.id}`,
        label: g.render(a.label, pid),
        light: a.light ?? 0,
        enabled: block === null,
        ...(block ? { reason: block } : {}),
        ...(a.gives ? { gives: g.render(a.gives, pid) } : {}),
      };
    });
  return {
    map: map.name,
    room: room.name,
    text: paras(g, room.text, pid),
    own: role === 'hunter' ? paras(g, room.hunter, pid) : role === 'maker' ? paras(g, room.maker, pid) : [],
    light: Math.max(0, d.light),
    lightMax: d.lightMax,
    rooms,
    links,
    exits,
    acts,
    canLeave: d.room === g.delveStart(map, n),
    lines: d.lines[pid] ?? [],
  };
}

function stealthView(g: Game, pid: PlayerId, n: StealthNode): StealthView {
  const st = g.s.scene!.stealth!;
  const role = g.p(pid).role;
  const lim = g.stealthLimits(n);
  const other = g.other(pid);
  const view: StealthView = {
    pos: st.pos,
    length: n.path.length,
    alarm: st.alarm,
    alarmMax: lim.alarm,
    time: st.time,
    timeMax: lim.time,
    ...(st.picks[pid] ? { myPick: st.picks[pid] } : {}),
    partnerPicked: !!st.picks[other],
    lines: st.lines[pid] ?? [],
  };
  if (role === 'hunter') {
    const look = (t: number) => g.render(n.watch[t % n.watch.length] ? n.sees.watching : n.sees.away, pid);
    view.now = look(st.turn);
    view.next = look(st.turn + 1);
    view.look = { now: !!n.watch[st.turn % n.watch.length], next: !!n.watch[(st.turn + 1) % n.watch.length] };
  } else if (role === 'maker') {
    const stone = (i: number) => (i < n.path.length ? g.render(n.path[i] ? n.sees.loose : n.sees.firm, pid) : undefined);
    view.now = stone(st.pos);
    const nx = stone(st.pos + 1);
    if (nx) view.next = nx;
    view.loose = n.path.map((x: boolean, i: number) => (i >= st.pos ? x : false));
  }
  return view;
}


// ----- part two panels ---------------------------------------------------------

function heroView(g: Game, pid: PlayerId): HeroView {
  const p = g.p(pid);
  const d = heroOf(g, pid);
  const ui = (k: string) => g.ix.ui(k);
  const perk = (id: string) => {
    const def = g.ix.c.perks.find((x) => x.id === id);
    return { id, name: def?.name ?? id, text: def?.text ?? '' };
  };
  const atHome = g.atHome(pid);
  const slots = SLOTS.map((slot) => {
    const id = p.equip[slot];
    const options: HeroView['slots'][number]['options'] = [];
    if (atHome) {
      for (const r of g.ix.c.resources) {
        if (r.gear?.slot !== slot || (g.s.res[r.id] ?? 0) <= 0 || r.id === id) continue;
        options.push({ id: r.id, name: r.name, note: gearNote(g, r.id), n: g.s.res[r.id] ?? 0, icon: r.icon });
      }
    }
    return {
      slot,
      name: ui(`slot_${slot}`),
      item: id ? { id, name: g.ix.res.get(id)?.name ?? id, note: gearNote(g, id), icon: g.ix.res.get(id)?.icon } : null,
      options,
    };
  });
  return {
    level: p.level,
    xp: p.xp,
    xpPrev: xpForLevel(p.level),
    xpNext: xpForLevel(p.level + 1),
    points: p.points,
    stats: STATS.map((id) => ({ id, name: ui(`stat_${id}`), value: p.stats[id], text: ui(`stat_${id}_text`) })),
    skills: SKILLS.map((id) => {
      const xp = p.skills[id] ?? 0;
      const lv = skillLevel(xp);
      const a = skillXpFor(lv);
      const b = skillXpFor(lv + 1);
      return { id, name: ui(`skill_${id}`), level: lv, p: Math.max(0, Math.min(1, (xp - a) / Math.max(1, b - a))) };
    }),
    perks: p.perks.map(perk),
    perkChoice: p.perkChoice ? p.perkChoice.map(perk) : null,
    derived: {
      hpMax: d.hpMax,
      armor: d.armor,
      dodge: Math.round(d.dodge * 100),
      hit: Math.round(Math.min(0.97, d.hit) * 100),
      dmg: d.dmg,
      carry: d.carry,
      resist: [...d.resist].map((r) => ui(`resist_${r}`)),
      tools: [...d.tools].map((t) => ui(`tool_${t}`)),
    },
    slots,
    outfits: ['fight', 'work'].map((name) => ({
      name,
      items: Object.values(p.sets[name] ?? {}).map((id) => g.ix.res.get(id!)?.name ?? id!),
    })),
    canChange: atHome && p.fight === null,
  };
}

function bagView(g: Game, pid: PlayerId): BagView {
  const p = g.p(pid);
  const items = Object.entries(p.bag)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      const def = g.ix.res.get(id);
      const note = def?.meal ? mealNote(g, id) : def?.use ? useNote(g, id) : def?.gear ? gearNote(g, id) : undefined;
      return {
        id,
        name: def?.name ?? id,
        n,
        weight: def?.weight ?? 1,
        kind: def?.kind ?? 'res',
        usable: !!def?.use?.anywhere,
        ...(note ? { note } : {}),
        ...(def?.icon ? { icon: def.icon } : {}),
      };
    });
  return { items, load: bagLoad(g, pid), cap: bagCap(g, pid) };
}

function mapView(g: Game, pid: PlayerId): MapView {
  const p = g.p(pid);
  const o = g.p(g.other(pid));
  const nodes: MapView['nodes'] = [];
  const links: MapView['links'] = [];
  for (const a of g.ix.c.areas) {
    if (!areaOnMap(g, a.id) || !a.pos) continue;
    const known = areaKnown(g, a.id);
    const node: MapView['nodes'][number] = {
      id: a.id,
      name: known ? a.name : '?',
      x: a.pos[0],
      y: a.pos[1],
      known,
      here: p.at === a.id && !p.travel,
      partner: o.joined && o.at === a.id && !o.travel,
      home: !!a.home,
      ...(known && a.scene ? { icon: a.scene } : {}),
      danger: known ? (a.danger ?? 0) : 0,
      foes: known
        ? [...new Set((a.foes ?? []).filter((f) => (g.s.bestiary[f.enemy]?.seen ?? 0) > 0).map((f) => f.enemy))].map((id) => {
            const e = enemyOf(g, id);
            return { name: e.name, icon: e.icon };
          })
        : [],
      ...(known && a.desc ? { desc: g.render(a.desc, pid) } : {}),
    };
    const route = known && a.id !== p.at ? routeTo(g, p.at, a.id) : null;
    if (route) {
      // further places are reached through the near ones: the walks add up
      const block = goBlock(g, pid, a.id, true);
      node.go = {
        time: routeLegs(g, pid, p.at, route).reduce((s, [, t]) => s + t, 0),
        enabled: block === null,
        ...(block ? { reason: block } : {}),
        ...(route.length > 1 ? { via: route.slice(0, -1) } : {}),
      };
    } else if (!known && a.id !== p.at && linkTime(g, p.at, a.id) !== null) {
      if (a.scout) {
        const sc = g.ix.scenes.get(a.scout);
        if (sc && g.sceneOrPoolVisible(sc, pid)) {
          const block = g.proposalBlock(sc, pid);
          node.scout = {
            id: sc.id,
            label: sc.label ? g.render(sc.label, pid) : sc.title,
            enabled: block === null,
            ...(block ? { reason: block } : {}),
          };
        }
      }
    }
    nodes.push(node);
    for (const l of a.links ?? []) {
      if (l.if && !g.test(l.if)) continue;
      if (!areaOnMap(g, l.to) || !(known || areaKnown(g, l.to))) continue;
      // a way written down at both ends is still one way
      if (!links.some(([x, y]) => (x === a.id && y === l.to) || (x === l.to && y === a.id))) links.push([a.id, l.to]);
    }
  }
  const tr = p.travel ? walkOf(p.travel) : null;
  return {
    nodes,
    links,
    travel: tr ? { to: tr.to, name: areaDef(g, tr.to)?.name ?? tr.to, since: tr.since, until: tr.until } : null,
  };
}

function intentText(g: Game, f: NonNullable<ReturnType<typeof fightOf>>, it: { move: string; target?: PlayerId } | null, viewer: PlayerId): string | undefined {
  if (!it) return undefined;
  const who = it.target ? (it.target === viewer ? g.ix.ui('intent_you') : g.p(it.target).name) : '';
  const t = g.ix.c.ui[`intent_${it.move}`];
  if (!t) return undefined;
  return t.replace('{who}', who);
}

function fightView(g: Game, pid: PlayerId): FightView | null {
  const f = fightOf(g, pid);
  if (!f) return null;
  const role = g.p(pid).role;
  const foes = f.foes
    .filter((x) => !x.out || f.round - x.joined < 99)
    .map((foe) => {
      const def = enemyOf(g, foe.enemy);
      const known = g.s.bestiary[foe.enemy]?.known ?? [];
      const beast = def.morale !== undefined && !def.humane;
      const same = f.foes.filter((x) => x.enemy === foe.enemy);
      const v: FightView['foes'][number] = {
        uid: foe.uid,
        icon: def.icon,
        name: `${def.name}${same.length > 1 ? ` ·${same.indexOf(foe) + 1}` : ''}`,
        hp: Math.max(0, foe.hp),
        hpMax: foe.hpMax,
        out: foe.out,
        level: def.level,
        traits: known.map((t) => g.ix.c.traits[t as keyof typeof g.ix.c.traits]?.name ?? t),
      };
      if (def.morale !== undefined) {
        v.fear = Math.min(foe.fear, def.morale);
        v.morale = def.morale;
      }
      if (!foe.out) {
        const it = intentText(g, f, foe.intent, pid);
        if (it) v.intent = it;
        // the hunter reads a beast's next move
        if (role === 'hunter' && beast) {
          const nx = intentText(g, f, foe.next, pid);
          if (nx) v.next = nx;
        }
        if (role === 'maker' && (def.armor ?? 0) > 0) v.weak = g.ix.ui('fight_weak');
        if (foe.holds) v.holds = foe.holds === pid ? g.ix.ui('intent_you') : g.p(foe.holds).name;
        if (foe.calling > 0) v.calling = foe.calling;
      }
      return v;
    });
  const party = f.party.map((x) => {
    const p = g.p(x);
    return {
      pid: x,
      name: x === pid ? g.ix.ui('you') : p.name,
      hp: p.hp,
      hpMax: p.hpMax,
      down: f.down.includes(x) || f.fled.includes(x),
      held: !!holder(f, x),
      poison: p.poison,
      picked: !!f.picks[x],
      me: x === pid,
    };
  });
  const moves = fightMoves(g, f, pid).map((m) => ({ ...m }));
  const myPick = f.picks[pid];
  const others = f.party.filter((x) => x !== pid && g.p(x).online && !f.down.includes(x) && !f.fled.includes(x));
  return {
    id: f.id,
    round: f.round,
    scene: f.scene,
    foes,
    party,
    ...(f.dog && g.ix.c.dog ? { dog: g.ix.c.dog.name } : {}),
    moves,
    ...(myPick ? { myPick } : {}),
    waiting: !!myPick && others.some((x) => !f.picks[x]),
    lines: f.lines[pid] ?? [],
  };
}

function nearFight(g: Game, pid: PlayerId): PlayerView['nearFight'] {
  const p = g.p(pid);
  if (p.fight !== null || p.travel) return null;
  const o = g.p(g.other(pid));
  if (o.fight === null) return null;
  const f = g.s.fights.find((x) => x.id === o.fight);
  if (!f || f.scene || f.area !== p.at) return null;
  const names = activeFoes(f).map((x) => enemyOf(g, x.enemy).name);
  return { id: f.id, text: `${g.render(g.ix.ui('near_fight'), pid)} ${[...new Set(names)].join(', ')}` };
}

function residentsView(g: Game, pid: PlayerId): ResidentView[] {
  return g.ix.c.residents
    .filter((r) => g.s.residents[r.id])
    .map((r) => {
      const st = g.s.residents[r.id]!;
      const jobs = residentJobs(g, r.id).map((j) => {
        const a = g.ix.actions.get(j.id)!;
        let mult = 1;
        for (const t of r.traits) mult *= t.mult?.[a.id] ?? 1;
        const per = Object.values(a.yield ?? {}).reduce((s: number, y) => s + (Array.isArray(y) ? (y[0] + y[1]) / 2 : y), 0);
        return {
          id: j.id,
          label: g.render(a.label, pid),
          place: areaDef(g, j.area)?.name ?? j.area,
          // at the garden: water a hour, not a yield
          rate: a.id === g.ix.c.garden?.tend ? a.job!.rate : Math.round(a.job!.rate * per * mult),
          ...(j.missing ? { reason: `${g.ix.ui('job_needs')} ${g.ix.ui(`tool_${j.missing}`)}` } : {}),
        };
      });
      const cur = st.job ? g.ix.actions.get(st.job) : undefined;
      return {
        id: r.id,
        name: g.render(r.name, pid),
        desc: g.render(r.desc, pid),
        traits: r.traits.map((t) => ({ name: t.name, text: g.render(t.text, pid) })),
        job: st.job,
        ...(cur ? { jobLabel: g.render(cur.label, pid) } : {}),
        jobs,
        hurt: st.hurtUntil > g.now,
        hungry: st.hungry,
      };
    });
}

/** The ground of the plan where the player stands (none on the road). */
function sceneOf(g: Game, pid: PlayerId): string | undefined {
  const p = g.p(pid);
  if (p.travel) return undefined;
  return areaDef(g, p.at)?.scene;
}

function bestiaryView(g: Game, pid: PlayerId): BeastView[] {
  return (g.ix.c.enemies ?? [])
    .filter((e) => (g.s.bestiary[e.id]?.seen ?? 0) > 0)
    .map((e) => {
      const b = g.s.bestiary[e.id]!;
      return {
        id: e.id,
        name: e.name,
        icon: e.icon,
        level: e.level,
        desc: g.render(e.desc, pid),
        traits: b.known.map((t) => {
          const tr = g.ix.c.traits[t as keyof typeof g.ix.c.traits];
          return { name: tr?.name ?? t, text: tr?.text ?? '' };
        }),
        beaten: b.beaten,
      };
    });
}

/** Panels open as the game opens up. */
function tabsOf(g: Game, pid: PlayerId): string[] {
  const t = ['here'];
  if (g.ix.c.areas.filter((a) => areaOnMap(g, a.id) && a.pos).length > 1) t.push('map');
  const p = g.p(pid);
  if (p.level > 1 || Object.keys(p.equip).length > 0 || g.ix.c.resources.some((r) => r.gear && (g.s.res[r.id] ?? 0) > 0)) t.push('hero');
  return t;
}

export function buildView(g: Game, pid: PlayerId): PlayerView {
  const me = g.p(pid);
  const other = g.other(pid);
  const o = g.p(other);
  const ui = (k: string): string => g.ix.ui(k);

  const res = g.ix.c.resources
    .filter((r) => !r.hidden && ((g.s.res[r.id] ?? 0) > 0 || g.s.seenRes[r.id]))
    .sort((a, b) => a.order - b.order)
    .map((r) => {
      const cap = g.cap(r.id);
      const note = r.gear ? gearNote(g, r.id) : r.meal ? mealNote(g, r.id) : r.use ? useNote(g, r.id) : '';
      return {
        id: r.id,
        name: r.name,
        n: g.s.res[r.id] ?? 0,
        cap: Number.isFinite(cap) && r.kind !== 'tool' && r.kind !== 'gear' ? cap : undefined,
        kind: r.kind ?? 'res',
        ...(r.weight !== undefined ? { weight: r.weight } : {}),
        ...(note ? { note } : {}),
        ...(r.ware && g.test(r.ware, pid) ? { ware: true } : {}),
        ...(r.icon ? { icon: r.icon } : {}),
      };
    });

  const stoveState = g.stoveState();
  // The stove is in Ясенець: elsewhere its state is not shown.
  const stoveText = stoveState === 'never' || me.at !== g.ix.homeArea ? '' : ui(`stove_${stoveState}`);

  const amb = g.ix.c.ambient;
  const here = me.at;
  let ambKind = (amb?.areas[here] ?? 'snow') as PlayerView['ambient']['kind'];
  for (const o2 of amb?.overrides ?? [])
    if (g.test(o2.when, pid)) {
      ambKind = o2.kind;
      break;
    }
  let fire: PlayerView['ambient']['fire'] = 'none';
  if (here === g.ix.homeArea) fire = stoveState === 'never' ? 'none' : stoveState;
  else if (amb?.fires?.[here] && g.test(amb.fires[here]!, pid)) fire = 'warm';
  if (ambKind === 'cellar' || ambKind === 'candle') fire = 'none';
  const fxOf = (pl: typeof me) =>
    pl.busy && pl.busy.until > g.now ? (amb?.actions[pl.busy.action] ?? null) : null;
  const fx = fxOf(me);
  const partnerFx = o.joined && o.online && o.at === here ? fxOf(o) : null;
  const roofed = ambKind === 'cellar' || ambKind === 'candle' || ambKind === 'cave' || (!me.travel && !!areaDef(g, here)?.roof);
  const ambient: PlayerView['ambient'] = {
    kind: ambKind,
    sky: roofed ? null : (weatherNow(g)?.sky ?? null),
    fire,
    fx,
    partnerFx,
    fxUntil: fx ? me.busy!.until : 0,
    partnerFxUntil: partnerFx ? o.busy!.until : 0,
  };

  let partnerBusy: { text: string; from: number; until: number } | null = null;
  if (o.fight !== null) {
    partnerBusy = { text: g.render(ui('partner_fighting'), pid, other), from: g.now, until: g.now };
  } else if (o.travel) {
    const walk = walkOf(o.travel);
    const to = areaDef(g, walk.to);
    partnerBusy = { text: `${g.render(ui('partner_walks'), pid, other)} ${to?.name ?? ''}`.trim(), from: walk.since, until: walk.until };
  } else if (o.busy && o.busy.until > g.now) {
    const a = g.ix.actions.get(o.busy.action);
    if (a?.busy) {
      const dur = g.actionTime(a, other);
      const text = g.render(a.busy, pid, other);
      partnerBusy = { text: text.charAt(0).toLowerCase() + text.slice(1), from: o.busy.until - dur, until: o.busy.until };
    } else if (o.busy.action.startsWith('rest:')) {
      partnerBusy = { text: g.render(ui('partner_resting'), pid, other), from: o.busy.until - 60_000, until: o.busy.until };
    }
  }

  const pr = g.s.proposal;
  let proposal: PlayerView['proposal'] = null;
  if (pr) {
    const sc = g.ix.scenes.get(pr.scene)!;
    const via = g.ix.entry(pr.via);
    const label = via && via.kind !== 'act' ? g.render(via.def.label, pid) : sc.title;
    proposal = {
      title: sc.title,
      label,
      mine: pr.by === pid,
      text: g.render(pr.by === pid ? ui('proposal_mine') : ui('proposal_theirs'), pid),
    };
  }

  const clues: ClueView[] = [];
  for (const [id, rec] of Object.entries(g.s.clues)) {
    if (!rec.who.includes(pid)) continue;
    const def = g.ix.clues.get(id);
    if (!def) continue;
    clues.push({ id, title: def.title, text: g.render(def.text, pid), personal: def.to !== 'both', at: rec.at, mystery: def.mystery });
  }
  clues.sort((a, b) => b.at - a.at);

  const questions = g.ix.c.mysteries
    .filter((m) => (g.s.mysteries[m.id] ?? 0) > 0)
    .sort((a, b) => a.order - b.order)
    .map((m) => {
      const level = g.s.mysteries[m.id] ?? 0;
      return { id: m.id, question: m.question, level, levelText: ui(`level_${level}`) };
    });

  const people = g.ix.c.npcs
    .filter((n) => g.s.npcs[n.id]?.met)
    .map((n) => ({ id: n.id, name: g.render(n.name, pid), desc: g.render(n.desc, pid) }));

  const log: LogView[] = [];
  for (let i = g.s.log.length - 1; i >= 0 && log.length < LOG_SEND; i--) {
    const e = g.s.log[i]!;
    const text = e.text[pid];
    if (!text) continue;
    log.push({ id: e.id, t: e.t, kind: e.kind, mine: e.actor === pid, partner: e.actor === other, text });
  }
  log.reverse();

  const goalDef = g.s.goal ? g.ix.goals.get(g.s.goal) : undefined;
  // The "end of act" banner only makes sense while no later act exists in this build.
  const lastAct = Math.max(0, ...Object.keys(g.ix.c.actEnd).map(Number));
  const actDone = g.s.meta.actDone > 0 && g.s.meta.actDone >= lastAct && g.ix.c.actEnd[g.s.meta.actDone]
    ? { act: g.s.meta.actDone, text: g.render(g.ix.c.actEnd[g.s.meta.actDone], pid) }
    : null;

  return {
    now: g.now,
    me: {
      pid,
      area: me.at,
      where: g.ix.areaWhere(me.at),
      name: me.name,
      gender: me.gender,
      role: me.role!,
      roleTitle: g.roleTitle(pid),
      hp: me.hp,
      hpMax: me.hpMax,
    },
    partner: {
      pid: other,
      joined: o.joined,
      name: o.joined ? o.name : '',
      gender: o.gender,
      role: o.role,
      roleTitle: o.joined ? g.roleTitle(other) : '',
      online: o.joined && o.online,
      area: o.at,
      where: g.ix.areaWhere(o.at),
      busy: partnerBusy,
      hp: o.hp,
      hpMax: o.hpMax,
    },
    day: g.s.meta.day,
    act: g.s.meta.act,
    goal: goalDef ? g.render(goalDef.text, pid) : null,
    stove: { state: stoveState, text: stoveText },
    ambient,
    status: [],
    res,
    groups: groups(g, pid),
    proposal,
    scene: sceneView(g, pid),
    log,
    journal: { clues, questions, people, quests: questsView(g, pid) },
    actDone,
    busyUntil: me.busy && me.busy.until > g.now ? me.busy.until : 0,
    busyFrom: busyFrom(g, pid),
    busyAction: me.busy && me.busy.until > g.now ? me.busy.action : null,
    hero: heroView(g, pid),
    bag: bagView(g, pid),
    needs: needsView(g, pid),
    weather: weatherView(g, pid),
    events: eventsView(g, pid, (c) => costView(g, c, pid)),
    garden: gardenView(g, pid),
    map: mapView(g, pid),
    fight: fightView(g, pid),
    nearFight: nearFight(g, pid),
    residents: residentsView(g, pid),
    bestiary: bestiaryView(g, pid),
    tabs: tabsOf(g, pid),
    atHome: g.atHome(pid),
    ...(sceneOf(g, pid) ? { ground: sceneOf(g, pid) } : {}),
    welcome: welcomeView(g, pid),
    summary: summaryView(g, pid),
    dayAt: g.s.meta.dayAt,
  };
}

function busyFrom(g: Game, pid: PlayerId): number {
  const me = g.p(pid);
  if (!me.busy || me.busy.until <= g.now) return 0;
  if (me.travel) return walkOf(me.travel).since;
  const a = g.ix.actions.get(me.busy.action);
  if (a) return me.busy.until - g.actionTime(a, pid);
  if (me.busy.action.startsWith('rest:')) return me.busy.until - 60_000;
  return g.now;
}

function visibleDelta(g: Game, before: Record<string, number>, after: Record<string, number>): DeltaItem[] {
  const out: DeltaItem[] = [];
  for (const r of g.ix.c.resources) {
    if (r.hidden || r.kind === 'tool') continue;
    const n = (after[r.id] ?? 0) - (before[r.id] ?? 0);
    if (n !== 0) out.push({ id: r.id, name: r.name, n, icon: r.icon });
  }
  return out;
}

function welcomeView(g: Game, pid: PlayerId): WelcomeView | null {
  const w = g.p(pid).welcome;
  if (!w) return null;
  const other = g.other(pid);
  const lines = g.s.log
    .filter((e) => e.id >= w.log && e.actor === other && e.text[pid])
    .map((e) => e.text[pid]!)
    .slice(-8);
  const clues = Object.values(g.s.clues).filter((c) => c.at > w.at && c.who.includes(pid)).length;
  const view = { days: g.s.meta.day - w.day, res: visibleDelta(g, w.res, g.s.res), lines, clues };
  return view.days || view.res.length || view.lines.length || view.clues ? view : null;
}

function summaryView(g: Game, pid: PlayerId): SummaryView | null {
  const act = g.s.meta.actDone;
  if (act <= g.p(pid).seenSummary) return null;
  const f = Object.keys(g.s.flags);
  const other = g.other(pid);
  const pool = new Set(g.ix.c.scenes.filter((s) => s.pool).map((s) => s.id));
  const clues = Object.entries(g.s.clues);
  const gathered = Object.entries(g.s.stats.gathered)
    .map(([id, n]) => ({ id, name: g.ix.res.get(id)?.name ?? id, n, def: g.ix.res.get(id) }))
    .filter((x) => x.def && !x.def.hidden && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 6)
    .map(({ id, name, n, def }) => ({ id, name, n, icon: def?.icon }));
  return {
    act,
    final: f.some((k) => k.startsWith('ending_')),
    days: g.s.meta.day,
    places: f.filter((k) => k.startsWith('seen:')).length,
    clues: clues.length,
    cluesMine: clues.filter(([id, c]) => c.who.includes(pid) && g.ix.clues.get(id)?.to !== 'both').length,
    solved: Object.values(g.s.mysteries).filter((lv) => lv >= 4).length,
    people: Object.values(g.s.npcs).filter((n) => n.met).length,
    scenes: f.filter((k) => k.startsWith('done:') && !pool.has(k.slice(5))).length,
    suppers: g.s.stats.suppers,
    fights: g.ix.c.encounters.filter((e) => g.flag(`${e.id}:killed`) || g.flag(`${e.id}:fled`)).length,
    crafted: g.s.stats.crafted,
    trips: g.s.stats.trips,
    actions: { me: g.s.stats.actions[pid] ?? 0, partner: g.s.stats.actions[other] ?? 0 },
    gathered,
  };
}

/** One line about a dish: «+4 здоров'я · 12 хв · гріє». */
export function mealNote(g: Game, id: string): string {
  const m = g.ix.res.get(id)?.meal;
  if (!m) return '';
  const parts = [`+${m.hp} ${g.ix.ui('st_hp_word')}`];
  if (m.dmg) parts.push(`+${m.dmg} ${g.ix.ui('st_dmg_word')}`);
  parts.push(`${m.minutes} ${g.ix.ui('min_short')}`);
  if (m.warm) parts.push(g.ix.ui('meal_warm'));
  return parts.join(' · ');
}

/** The weather and what it does, in words (only what the players can already meet). */
function weatherView(g: Game, pid: PlayerId): WeatherView | null {
  const w = weatherNow(g);
  const st = g.s.weather;
  if (!w || !st) return null;
  const effects: WeatherView['effects'] = [];
  const pct = (x: number) => `${Math.round(Math.abs(x - 1) * 100)} %`;
  const add = (key: string, good: boolean, n?: string) => effects.push({ text: g.ix.ui(key).replace('{n}', n ?? ''), good });
  const k = (x: number | undefined) => x !== undefined && x !== 1;
  if (k(w.pace)) add(w.pace! > 1 ? 'wx_pace_slow' : 'wx_pace_fast', w.pace! < 1, pct(w.pace!));
  if (k(w.travel)) add(w.travel! > 1 ? 'wx_travel_slow' : 'wx_travel_fast', w.travel! < 1, pct(w.travel!));
  if (k(w.ambush)) add(w.ambush! > 1 ? 'wx_ambush_more' : 'wx_ambush_less', w.ambush! < 1, pct(w.ambush!));
  if (k(w.xp)) add(w.xp! > 1 ? 'wx_xp_more' : 'wx_xp_less', w.xp! > 1, pct(w.xp!));
  if (w.bonus) effects.push({ text: w.bonus.text, good: true });
  if (g.p(pid).needs) {
    if (w.chill) add(w.chill > 0 ? 'wx_cold' : 'wx_warm', w.chill < 0);
    if (k(w.dry)) add(w.dry === 0 ? 'wx_no_dry' : w.dry! > 1 ? 'wx_dry_fast' : 'wx_dry_slow', w.dry! > 1);
    if (w.frozen && g.flag('wet_feet')) add('wx_frozen', true);
  }
  if (bedCount(g) > 0) {
    if (w.waters) add('wx_garden_rain', true);
    if (k(w.grow)) add(w.grow! > 1 ? 'wx_garden_fast' : 'wx_garden_slow', w.grow! > 1, pct(w.grow!));
  }
  if (k(w.jobs) && Object.keys(g.s.residents).length) add(w.jobs! < 1 ? 'wx_jobs_slow' : 'wx_jobs_fast', w.jobs! > 1, pct(w.jobs!));
  const next = g.ix.c.weather!.kinds.find((x) => x.id === st.next);
  return { id: w.id, name: w.name, sky: w.sky ?? null, until: st.until, next: next?.name ?? '', outside: outside(g, pid), effects };
}

function needsView(g: Game, pid: PlayerId): NeedsView | null {
  const p = g.p(pid);
  const n = p.needs;
  if (!n) return null;
  const ui = (k: string) => g.ix.ui(k);
  const MIN = 60_000;
  const meals = n.meals.flatMap((m) => {
    const def = g.ix.res.get(m.id);
    if (!def?.meal) return [];
    const full = def.meal.minutes * MIN;
    return [{ id: m.id, name: def.name, ...(def.icon ? { icon: def.icon } : {}), left: m.left, full, fadeAt: full * NEED.fade, hp: def.meal.hp, ...(def.meal.dmg ? { dmg: def.meal.dmg } : {}) }];
  });
  const level = coldLevel(n.chill);
  const fire = byFire(g, pid);
  const effects: NeedsView['effects'] = [];
  const fx = (id: string, good: boolean, text?: string) => effects.push({ id, name: ui(`need_${id}_name`), text: text ?? ui(`need_${id}_text`), good });
  if (meals.length) {
    let hp = 0;
    let dmg = 0;
    for (const m of meals) {
      const half = m.left < m.fadeAt;
      hp += half ? Math.ceil(m.hp / 2) : m.hp;
      if (m.dmg && !half) dmg += m.dmg;
    }
    fx('fed', true, [`+${hp} ${ui('st_hp_word')}`, dmg ? `+${dmg} ${ui('st_dmg_word')}` : ''].filter(Boolean).join(', '));
  } else fx('hungry', false);
  if (level === 'warm') fx('warm', true);
  if (level === 'cold') fx('cold', false);
  if (level === 'frozen') fx('frozen', false);
  if (n.wet > 0) fx('wet', false);
  if (n.drink > 0) fx('drink', true);
  if (n.rested > 0) fx('rested', true);
  else if (tired(n)) fx('tired', false);
  const home = g.atHome(pid);
  const edible: NeedsView['edible'] = [];
  const drinks: NeedsView['drinks'] = [];
  for (const r of g.ix.c.resources) {
    const count = (p.bag[r.id] ?? 0) + (home ? (g.s.res[r.id] ?? 0) : 0);
    if (count <= 0) continue;
    const icon = r.icon ? { icon: r.icon } : {};
    if (r.meal) {
      const block = eatBlock(g, pid, r.id);
      edible.push({ id: r.id, name: r.name, ...icon, n: count, note: mealNote(g, r.id), can: !block && p.fight === null, ...(block ? { reason: block } : {}) });
    } else if (r.use?.warm && r.use.anywhere) {
      drinks.push({ id: r.id, name: r.name, ...icon, n: count, note: useNote(g, r.id) });
    }
  }
  const c = g.ix.c.needs!;
  const campB = home ? null : campBlock(g, pid);
  const fireUntil = g.s.fires?.[p.at] ?? 0;
  const restB = restBlock(g, pid);
  return {
    paused: g.sceneBlocksRoutine() || !p.online,
    slots: NEED.slots,
    meals,
    warmth: Math.round(100 - n.chill),
    rate: -chillRate(g, pid),
    level,
    wet: n.wet,
    dry: dryOf(g, pid),
    drink: n.drink,
    rested: n.rested,
    awake: n.awake,
    tiredAfter: NEED.tiredAfter,
    fire,
    effects,
    edible,
    drinks,
    camp: home
      ? null
      : {
          can: !campB,
          ...(campB ? { reason: campB } : {}),
          wood: p.bag[c.campWood] ?? 0,
          need: NEED.campWood,
          until: fireUntil > g.now ? fireUntil : null,
        },
    rest: { can: !restB, ...(restB ? { reason: restB } : {}), minutes: restLength(g, pid) },
    comfort: home ? comfortOf(g, pid).filter((x) => x.on).map((x) => x.name) : [],
  };
}

function questsView(g: Game, pid: PlayerId): QuestView[] {
  const st = g.s.quests ?? {};
  const out: QuestView[] = [];
  for (const q of g.ix.c.quests ?? []) {
    const state = st[q.id];
    if (!state) continue;
    const k = questProgress(g, q, pid);
    const done = q.steps.slice(0, k).map((s) => g.render(s.text, pid));
    const now = k < q.steps.length ? g.render(q.steps[k]!.text, pid) : null;
    out.push({
      id: q.id,
      title: q.title,
      from: g.render(q.from, pid),
      state,
      done,
      now: state === 'on' ? now : null,
      ...(state === 'done' ? { outcome: g.render(q.reward, pid) } : state === 'closed' && q.failText ? { outcome: g.render(q.failText, pid) } : {}),
    });
  }
  // open ones first, newest last within each
  return [...out.filter((q) => q.state === 'on'), ...out.filter((q) => q.state !== 'on')];
}
