// Static content validator: IDs, references, scene graphs, flags, costs and reachability.

import type {
  ActionDef,
  Cond,
  Content,
  Effect,
  LogText,
  Para,
  Paras,
  PlanSpot,
  SceneDef,
  SceneNode,
  DelveMapDef,
  Text,
  TextVariant,
} from '../../shared/src/content.js';
import { PLAN_FIXED } from '../../shared/src/content.js';
import { fieldProblems } from './engine/terrain.js';
import { CROP_LOOKS, ITEM_ICONS, PORTRAITS, SCENES, SPOT_ICONS } from '../../shared/src/pictures.js';

export interface Report {
  errors: string[];
  warnings: string[];
  reachable: { scenes: Set<string>; actions: Set<string>; locations: Set<string>; clues: Set<string>; flags: Set<string>; areas: Set<string> };
}

// ---------- traversal helpers ----------

export function condsOf(c: Cond | undefined, out: Cond[] = []): Cond[] {
  if (!c) return out;
  out.push(c);
  if ('all' in c) c.all.forEach((x) => condsOf(x, out));
  if ('any' in c) c.any.forEach((x) => condsOf(x, out));
  if ('not' in c) condsOf(c.not, out);
  return out;
}

export function effectsOf(list: Effect[] | undefined, out: Effect[] = []): Effect[] {
  for (const e of list ?? []) {
    out.push(e);
    if ('if' in e) {
      effectsOf(e.then, out);
      effectsOf(e.else, out);
    }
  }
  return out;
}

function textConds(t: Text | Paras | Para | undefined, out: Cond[]): void {
  if (!t || typeof t === 'string') return;
  for (const x of t as Array<Para>) {
    if (typeof x === 'string') continue;
    if (Array.isArray(x)) textConds(x, out);
    else if ((x as TextVariant).if) condsOf((x as TextVariant).if, out);
  }
}

function logConds(l: LogText | undefined, out: Cond[]): void {
  if (!l) return;
  for (const f of [l.self, l.other, l.all]) {
    if (!f || typeof f === 'string') continue;
    for (const x of f) if (typeof x !== 'string' && x.if) condsOf(x.if, out);
  }
}

let MAPS = new Map<string, DelveMapDef>();

function nodeTargets(n: SceneNode): Array<string | null | undefined> {
  if (n.type === 'choice') return [...n.options.map((o) => o.next), n.mismatch, n.next];
  if (n.type === 'combat') return [n.win, n.lose];
  if (n.type === 'stealth') return [n.win, n.lose];
  if (n.type === 'operation') return [n.win.next, n.lose, n.fail];
  if (n.type === 'fight') return [n.win, n.lose];
  if (n.type === 'delve') {
    const beats = Object.values(MAPS.get(n.map)?.rooms ?? {}).flatMap((r) => (r.enter ?? []).map((e) => e.next));
    return [n.out, n.dark, ...beats];
  }
  const t = n as Extract<SceneNode, { goto?: unknown }>;
  return [t.next, ...(t.goto ?? []).map((g) => g.next)];
}

function nodeEffects(n: SceneNode): Effect[] {
  const list = [...(n.effects ?? [])];
  if (n.type === 'operation') {
    // tracks kept in flags are written by the operation itself
    for (const t of n.tracks) if (t.flag) list.push({ inc: t.flag, by: 0 });
  }
  if (n.type === 'delve')
    for (const r of Object.values(MAPS.get(n.map)?.rooms ?? {})) {
      list.push(...(r.first ?? []));
      for (const a of r.acts ?? []) list.push(...(a.effects ?? []));
    }
  if (n.type === 'choice') for (const o of n.options) list.push(...(o.effects ?? []));
  return effectsOf(list);
}

function sceneEffects(s: SceneDef): Effect[] {
  const out: Effect[] = [];
  for (const n of Object.values(s.nodes)) out.push(...nodeEffects(n));
  out.push(...effectsOf(s.onEnd));
  return out;
}

function actionEffects(a: ActionDef): Effect[] {
  const list = [...(a.effects ?? [])];
  for (const ch of a.chance ?? []) list.push(...(ch.effects ?? []));
  for (const b of a.beats ?? []) list.push(...(b.effects ?? []));
  return effectsOf(list);
}

// ---------- validation ----------

export function validateContent(c: Content): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const err = (m: string) => errors.push(m);
  MAPS = new Map((c.maps ?? []).map((m) => [m.id, m]));

  // IDs
  const all = new Map<string, string>();
  const reg = (kind: string, id: string) => {
    if (all.has(id)) err(`Duplicate id ${id} (${kind} and ${all.get(id)})`);
    all.set(id, kind);
  };
  c.resources.forEach((r) => reg('resource', r.id));
  c.actions.forEach((a) => reg('action', a.id));
  c.pools.forEach((p) => reg('pool', p.id));
  c.locations.forEach((l) => reg('location', l.id));
  c.scenes.forEach((s) => reg('scene', s.id));
  c.encounters.forEach((e) => reg('encounter', e.id));
  c.clues.forEach((x) => reg('clue', x.id));
  c.mysteries.forEach((x) => reg('mystery', x.id));
  c.goals.forEach((x) => reg('goal', x.id));
  c.npcs.forEach((x) => reg('npc', x.id));
  (c.enemies ?? []).forEach((x) => reg('enemy', x.id));
  (c.residents ?? []).forEach((x) => reg('resident', x.id));
  const areaIds = new Set<string>();
  for (const a of c.areas) {
    if (areaIds.has(a.id)) err(`Duplicate area ${a.id}`);
    areaIds.add(a.id);
  }
  const enemies = new Map((c.enemies ?? []).map((e) => [e.id, e]));
  const residentIds = new Set((c.residents ?? []).map((r) => r.id));
  const traitIds = new Set(Object.keys(c.traits ?? {}));
  /** Tool kinds some piece of gear provides. */
  const toolKinds = new Set<string>();
  for (const r of c.resources) for (const t of r.gear?.tools ?? []) toolKinds.add(t);

  const res = new Set(c.resources.map((r) => r.id));
  const locs = new Set(c.locations.map((l) => l.id));
  const scenes = new Map(c.scenes.map((s) => [s.id, s]));
  const clues = new Set(c.clues.map((x) => x.id));
  const mysteries = new Set(c.mysteries.map((x) => x.id));
  const npcs = new Set(c.npcs.map((x) => x.id));
  const encs = new Map(c.encounters.map((e) => [e.id, e]));
  const pools = new Set(c.pools.map((p) => p.pool));
  const areas = new Set(c.areas.map((a) => a.id));
  if (areas.size === 0) err('content: at least one area is required');
  for (const l of c.locations) if (l.area && !areas.has(l.area)) err(`location ${l.id}: unknown area ${l.area}`);

  const maxCap = (id: string): number => {
    const r = c.resources.find((x) => x.id === id);
    if (!r || r.cap === undefined) return Infinity;
    return r.cap + (r.capBonus ?? []).reduce((s, b) => s + b.add, 0);
  };
  const checkRes = (where: string, m: Record<string, unknown> | undefined) => {
    for (const k of Object.keys(m ?? {})) if (!res.has(k)) err(`${where}: unknown resource ${k}`);
  };
  /** Resources something asks for (outside fights, where every cost is optional): resource → where. */
  const required = new Map<string, string>();
  /** Errands may be skipped: what the rest asks for must come back without them. */
  const questOwned = new Set([...c.actions.filter((a) => a.quest).map((a) => a.id), ...c.scenes.filter((s) => s.quest).map((s) => s.id)]);
  const mainNeed = new Set<string>();
  const checkCost = (where: string, cost: Record<string, number> | undefined) => {
    checkRes(where, cost);
    if (!where.startsWith('encounter')) for (const k of Object.keys(cost ?? {})) if (!required.has(k)) required.set(k, where);
    const owner = /^\S+ ([a-z]_\d+)/.exec(where)?.[1];
    if (!where.startsWith('encounter') && !(owner && questOwned.has(owner))) for (const k of Object.keys(cost ?? {})) mainNeed.add(k);
    for (const [k, n] of Object.entries(cost ?? {})) {
      if (!Number.isInteger(n) || n <= 0) err(`${where}: bad cost ${k}=${n}`);
      if (n > maxCap(k)) err(`${where}: cost ${k}=${n} exceeds storage cap ${maxCap(k)}`);
    }
  };

  // Flags written anywhere (the engine itself writes a few).
  // the engine writes: an overflowed bag, the first soaking in a wet place
  const written = new Set<string>(['bag_full', ...(c.areas.some((a) => a.wet) ? ['wet_feet'] : [])]);
  for (const d of c.daily ?? []) if (d.flag) written.add(d.flag);
  const pwritten = new Set<string>();
  const collectWrites = (effs: Effect[]) => {
    for (const e of effs) {
      if ('set' in e) written.add(e.set);
      if ('inc' in e) written.add(e.inc);
      if ('pset' in e) pwritten.add(e.pset);
    }
  };
  for (const a of c.actions) {
    collectWrites(actionEffects(a));
    if (a.once) written.add(`built:${a.id}`);
    if (a.oncePerPlayer) pwritten.add(`built:${a.id}`);
    if (a.kind === 'craft' || a.kind === 'build') written.add(`made:${a.id}`);
  }
  for (const s of c.scenes) {
    collectWrites(sceneEffects(s));
    written.add(`done:${s.id}`);
    written.add(`count:${s.id}`);
    if (s.explores) written.add(`seen:${s.explores}`);
  }
  for (const ev of c.events?.kinds ?? []) {
    collectWrites(ev.effects ?? []);
    for (const ch of ev.choices ?? []) for (const o of ch.outcomes) collectWrites(o.effects ?? []);
  }
  for (const e of c.encounters) {
    written.add(`${e.id}:killed`);
    written.add(`${e.id}:fled`);
  }
  for (const m of c.maps ?? []) {
    for (const [id, r] of Object.entries(m.rooms)) {
      written.add(`known:${m.id}:${id}`);
      written.add(`found:${m.id}:${id}`);
      for (const a of r.acts ?? []) written.add(`dact:${m.id}:${a.id}`);
    }
  }

  // flags of the legacy are written by the server when part one is carried over
  const isWritten = (f: string) => written.has(f) || f.startsWith('legacy');
  const checkCond = (where: string, cond: Cond | undefined) => {
    for (const x of condsOf(cond)) {
      if ('flag' in x && !isWritten(x.flag)) err(`${where}: reads flag "${x.flag}" that is never set`);
      if ('noFlag' in x && !isWritten(x.noFlag)) err(`${where}: reads flag "${x.noFlag}" that is never set`);
      if ('pflag' in x && !pwritten.has(x.pflag)) err(`${where}: reads personal flag "${x.pflag}" that is never set`);
      if ('noPflag' in x && !pwritten.has(x.noPflag)) err(`${where}: reads personal flag "${x.noPflag}" that is never set`);
      if ('partnerPflag' in x && !pwritten.has(x.partnerPflag)) err(`${where}: reads personal flag "${x.partnerPflag}" that is never set`);
      if ('res' in x && !res.has(x.res)) err(`${where}: unknown resource ${x.res}`);
      if ('res' in x && x.gte !== undefined && x.gte > 0 && !required.has(x.res)) required.set(x.res, where);
      if (('clue' in x && !clues.has(x.clue)) || ('anyClue' in x && !clues.has(x.anyClue))) err(`${where}: unknown clue`);
      if ('rel' in x && !npcs.has(x.rel)) err(`${where}: unknown npc ${x.rel}`);
      if (('at' in x && !areas.has(x.at)) || ('partnerAt' in x && !areas.has(x.partnerAt))) err(`${where}: unknown area`);
      if ('owns' in x && !res.has(x.owns)) err(`${where}: unknown item ${x.owns}`);
      if ('worn' in x && !res.has(x.worn)) err(`${where}: unknown item ${x.worn}`);
      if ('tool' in x && !toolKinds.has(x.tool)) err(`${where}: no gear provides tool ${x.tool}`);
      if ('trait' in x && !traitIds.has(x.trait)) err(`${where}: unknown trait ${x.trait}`);
      if ('met' in x && !enemies.has(x.met)) err(`${where}: unknown enemy ${x.met}`);
      if ('weather' in x && !c.weather?.kinds.some((k) => k.id === x.weather)) err(`${where}: unknown weather ${x.weather}`);
      if ('resident' in x && !residentIds.has(x.resident)) err(`${where}: unknown resident ${x.resident}`);
      if ('seen' in x && !res.has(x.seen)) err(`${where}: unknown resource ${x.seen}`);
    }
  };
  const checkEffects = (where: string, effs: Effect[], inScene: boolean) => {
    for (const e of effs) {
      if ('if' in e) checkCond(where, e.if);
      if ('add' in e) checkRes(where, e.add);
      if ('take' in e) checkRes(where, e.take);
      if ('clue' in e && !clues.has(e.clue)) err(`${where}: unknown clue ${e.clue}`);
      if ('mystery' in e && !mysteries.has(e.mystery)) err(`${where}: unknown mystery ${e.mystery}`);
      if ('moveTo' in e && !areas.has(e.moveTo)) err(`${where}: unknown area ${e.moveTo}`);
      if (('rel' in e && !npcs.has(e.rel)) || ('meet' in e && !npcs.has(e.meet))) err(`${where}: unknown npc`);
      if ('scene' in e) {
        if (!scenes.has(e.scene)) err(`${where}: unknown scene ${e.scene}`);
        if (!inScene) err(`${where}: scenes may only be chained from scenes (solo actions must not start together-scenes)`);
      }
      if ('log' in e) {
        const cs: Cond[] = [];
        logConds(e.log, cs);
        cs.forEach((x) => checkCond(where, x));
      }
      if ('resident' in e && !residentIds.has(e.resident)) err(`${where}: unknown resident ${e.resident}`);
      if ('give' in e) checkRes(where, e.give);
      if ('wear' in e && !res.has(e.wear)) err(`${where}: unknown item ${e.wear}`);
      if ('eat' in e && !c.resources.find((r) => r.id === e.eat)?.meal) err(`${where}: ${e.eat} is not a dish`);
      if ('fight' in e) for (const f of e.fight) if (!enemies.has(f.enemy)) err(`${where}: unknown enemy ${f.enemy}`);
    }
  };

  // Daily rules
  for (const d of c.daily ?? []) {
    if (d.res && !res.has(d.res)) err(`daily: unknown resource ${d.res}`);
    if (d.per && !res.has(d.per)) err(`daily: unknown resource ${d.per}`);
    if (!d.res && !d.flag) err('daily: needs res or flag');
    checkCond('daily', d.if);
  }

  // Resources
  for (const r of c.resources) for (const b of r.capBonus ?? []) checkCond(`resource ${r.id}`, b.if);
  for (const r of c.resources) if (r.ware) checkCond(`resource ${r.id} ware`, r.ware);
  for (const [k] of Object.entries(c.start.resources)) if (!res.has(k)) err(`start: unknown resource ${k}`);
  if (c.needs) {
    const n = c.needs;
    if (n.snack && !c.resources.find((r) => r.id === n.snack)?.meal) err(`needs: snack ${n.snack} is not a dish`);
    if (!res.has(n.campWood)) err(`needs: unknown resource ${n.campWood}`);
    if (n.campLight && !res.has(n.campLight)) err(`needs: unknown resource ${n.campLight}`);
  }

  if (c.weather) {
    const w = c.weather;
    checkCond('weather', w.from);
    const ids = new Set<string>();
    for (const k of w.kinds) {
      if (ids.has(k.id)) err(`weather ${k.id}: duplicate id`);
      ids.add(k.id);
      if (!(k.weight > 0)) err(`weather ${k.id}: weight must be positive`);
      if (!k.log.length) err(`weather ${k.id}: needs a line for the log`);
      checkCond(`weather ${k.id}`, k.when);
      for (const m of [k.pace, k.travel, k.ambush, k.jobs, k.xp]) if (m !== undefined && !(m > 0)) err(`weather ${k.id}: multipliers must be positive`);
      if (k.bonus && !(k.bonus.p > 0 && k.bonus.p < 1)) err(`weather ${k.id}: bonus chance out of range`);
      if (k.bonus && !k.bonus.fx.some((fx) => Object.values(c.ambient?.actions ?? {}).includes(fx))) err(`weather ${k.id}: no action has the favoured accent`);
    }
    if (!ids.has(w.first)) err(`weather: unknown first ${w.first}`);
    if (w.kinds.length < 2) err('weather: needs at least two kinds to turn');
    if (!(w.span[0] > 0 && w.span[1] >= w.span[0])) err('weather: bad span');
  }

  // Locations
  for (const l of c.locations) {
    checkCond(`location ${l.id}`, l.visible);
    const cs: Cond[] = [];
    textConds(l.desc, cs);
    cs.forEach((x) => checkCond(`location ${l.id} desc`, x));
  }
  // Every area is drawn as a plan: each place there has its spot(s), clear of one another.
  const firstArea = c.areas[0]?.id;
  for (const a of c.areas) {
    const here = c.locations.filter((l) => (l.area ?? firstArea) === a.id);
    if (!here.length) continue;
    if (!a.scene) err(`area ${a.id}: needs a scene to draw its plan on`);
    else if (!(SCENES as readonly string[]).includes(a.scene)) err(`area ${a.id}: unknown scene ${a.scene}`);
    const taken: Array<[string, PlanSpot]> = Object.entries(PLAN_FIXED);
    const place = (who: string, at: PlanSpot) => {
      const { x, y } = at;
      if (!(SPOT_ICONS as readonly string[]).includes(at.icon)) err(`${who}: unknown icon ${at.icon}`);
      if (!(x >= 6 && x <= 94 && y >= 8 && y <= 90)) err(`${who}: plan spot off the plan`);
      for (const [other, o] of taken) {
        if (Math.abs(o.x - x) < 24 && Math.abs(o.y - y) < 22) err(`${who}: plan spot too close to ${other}`);
      }
      taken.push([who, at]);
    };
    for (const l of here) {
      if (!l.plan && !l.spots?.length) err(`location ${l.id}: a place needs a plan spot`);
      if (l.plan) place(`location ${l.id}`, l.plan);
      const ids = new Set<string>();
      for (const sp of l.spots ?? []) {
        if (ids.has(sp.id)) err(`location ${l.id}: spot ${sp.id} twice`);
        ids.add(sp.id);
        place(`location ${l.id} spot ${sp.id}`, sp);
      }
    }
  }
  // what names a spot names one of its place; with no `plan` to fall back on, it must name one
  const spotOf = (who: string, group: string | undefined, spot: string | undefined) => {
    if (!group) {
      if (spot) err(`${who}: a spot without a group`);
      return;
    }
    const l = c.locations.find((x) => x.id === group);
    if (!l) return;
    if (spot && !(l.spots ?? []).some((x) => x.id === spot)) err(`${who}: unknown spot ${spot} in ${group}`);
    if (!spot && !l.plan) err(`${who}: needs a spot in ${group}`);
  };
  for (const a of c.actions) spotOf(`action ${a.id}`, a.group, a.spot);
  for (const p of c.pools) spotOf(`pool action ${p.id}`, p.group, p.spot);
  for (const sc of c.scenes) if (sc.label !== undefined) spotOf(`scene ${sc.id}`, sc.group, sc.spot);
  for (const e of c.enemies ?? []) if (!(PORTRAITS as readonly string[]).includes(e.icon)) err(`enemy ${e.id}: unknown icon ${e.icon}`);
  for (const r of c.resources) {
    if (r.hidden || r.kind === 'people') continue;
    if (!r.icon) err(`resource ${r.id}: no icon`);
    else if (!(ITEM_ICONS as readonly string[]).includes(r.icon)) err(`resource ${r.id}: unknown icon ${r.icon}`);
  }

  // the yard of home: what is built there names a real build, its spot a real spot of home, people a real trade
  const homeIcons = new Set(c.locations.filter((l) => c.areas.find((a) => a.id === l.area)?.home).map((l) => l.plan?.icon));
  for (const y of c.yard ?? []) {
    if (y.when) checkCond(`yard ${y.key}`, y.when);
    if (y.spot && !homeIcons.has(y.spot as never)) err(`yard ${y.key}: no spot ${y.spot} at home`);
    if (y.trade && !c.trades?.some((t) => t.id === y.trade)) err(`yard ${y.key}: unknown trade ${y.trade}`);
    for (const m of JSON.stringify(y.when ?? {}).matchAll(/built:(x_\d+)/g)) {
      const a = c.actions.find((x) => x.id === m[1]);
      if (!a || a.kind !== 'build') err(`yard ${y.key}: ${m[1]} is not a build`);
    }
  }

  // Actions
  if (c.garden) {
    const gd = c.garden;
    if (!locs.has(gd.group)) err(`garden: unknown place ${gd.group}`);
    if (!res.has(gd.water)) err(`garden: unknown resource ${gd.water}`);
    for (const b of gd.beds) checkCond('garden beds', b.if);
    const ids = new Set<string>();
    for (const cr of gd.crops) {
      const w = `crop ${cr.id}`;
      if (ids.has(cr.id)) err(`${w}: duplicate id`);
      ids.add(cr.id);
      if (!res.has(cr.seed)) err(`${w}: unknown seed ${cr.seed}`);
      checkRes(w, cr.yield);
      if (!(cr.grows > 0)) err(`${w}: growing time must be positive`);
      if (!(CROP_LOOKS as readonly string[]).includes(cr.look)) err(`${w}: unknown look ${cr.look}`);
      if (cr.stages.length !== 4 || cr.stages.some((t) => !t.trim())) err(`${w}: four stages, each named`);
    }
    if (gd.tend && !c.actions.find((a) => a.id === gd.tend)?.job) err(`garden: the tending action ${gd.tend} is not a job`);
    if (!(gd.wet >= 1) || !(gd.wetFor > 0)) err('garden: bad watering');
  }

  if (c.events) {
    const ev = c.events;
    checkCond('events', ev.from);
    if (!(ev.gap[0] > 0 && ev.gap[1] >= ev.gap[0])) err('events: bad gap');
    for (const p of [ev.road, ev.place]) if (!(p >= 0 && p <= 1)) err('events: chance out of range');
    const ids = new Set<string>();
    for (const e of ev.kinds) {
      const w = `event ${e.id}`;
      if (ids.has(e.id)) err(`${w}: duplicate id`);
      ids.add(e.id);
      if (!(e.weight > 0)) err(`${w}: weight must be positive`);
      if (e.where === 'home' && e.areas) err(`${w}: a home event has no places`);
      for (const a of e.areas ?? []) if (!areas.has(a)) err(`${w}: unknown area ${a}`);
      checkCond(w, e.when);
      const tc: Cond[] = [];
      textConds(e.text, tc);
      tc.forEach((x) => checkCond(w, x));
      if (e.choices && e.effects) err(`${w}: effects of a card belong to its choices`);
      checkEffects(w, e.effects ?? [], false);
      for (const [i, ch] of (e.choices ?? []).entries()) {
        const cw = `${w} choice ${i}`;
        checkCond(cw, ch.if);
        checkCost(cw, ch.cost);
        if (!ch.outcomes.length) err(`${cw}: needs an outcome`);
        for (const o of ch.outcomes) checkEffects(cw, o.effects ?? [], false);
      }
      if (e.choices && e.choices.length < 2) err(`${w}: a card needs at least two choices`);
    }
  }

  for (const a of c.actions) {
    const w = `action ${a.id}`;
    if (!locs.has(a.group)) err(`${w}: unknown group ${a.group}`);
    if (!(a.cooldown > 0)) err(`${w}: cooldown must be positive`);
    checkCost(w, a.cost);
    checkRes(w, a.yield);
    if (a.rollsPer && !res.has(a.rollsPer)) err(`${w}: unknown rollsPer ${a.rollsPer}`);
    for (const ch of a.chance ?? []) {
      checkRes(w, ch.add);
      checkCond(w, ch.if);
      if (ch.p <= 0 || ch.p > 1) err(`${w}: bad chance ${ch.p}`);
    }
    for (const b of a.beats ?? []) checkCond(w, b.if);
    checkCond(w, a.visible);
    checkCond(w, a.enabled);
    checkEffects(w, actionEffects(a), false);
    const logs = Array.isArray(a.log) ? a.log : a.log ? [a.log] : [];
    const cs: Cond[] = [];
    logs.forEach((l) => logConds(l, cs));
    (a.beats ?? []).forEach((b) => logConds(b.log, cs));
    cs.forEach((x) => checkCond(w, x));
    if (!a.log && !(a.beats && a.beats.length)) warnings.push(`${w}: no log text`);
    if (a.tool && !toolKinds.has(a.tool)) err(`${w}: no gear provides tool ${a.tool}`);
    // tending the garden is the one job that yields nothing (residents water it from the store)
    if (a.job && a.id !== c.garden?.tend && (!a.yield || a.cost)) err(`${w}: a job must yield and cost nothing`);
    for (const id of Object.keys(a.yield ?? {})) {
      const def = c.resources.find((r) => r.id === id);
      if (def?.kind === 'gear' && a.kind !== 'craft' && a.kind !== 'trade') warnings.push(`${w}: yields gear but is not a craft`);
    }
  }

  // Map
  for (const a of c.areas) {
    const w = `area ${a.id}`;
    for (const l of a.links ?? []) {
      if (!areaIds.has(l.to)) err(`${w}: link to unknown area ${l.to}`);
      if (!(l.time > 0)) err(`${w}: link time must be positive`);
    }
    if (a.scout && !scenes.has(a.scout)) err(`${w}: unknown scout scene ${a.scout}`);
    if (a.scout && a.home) err(`${w}: home needs no scouting`);
    for (const f of a.foes ?? []) {
      if (!enemies.has(f.enemy)) err(`${w}: unknown enemy ${f.enemy}`);
      checkCond(w, f.if);
    }
    for (const cnd of a.cond ?? []) {
      if (!toolKinds.has(cnd.need) && !['venom', 'salt', 'cold'].includes(cnd.need)) err(`${w}: need ${cnd.need} is neither a tool nor a resist`);
    }
    checkCond(w, a.visible);
    if (a.foes?.length && !a.ambush) warnings.push(`${w}: has foes but no ambush chance`);
  }
  if (c.areas.filter((a) => a.home).length > 1) err('map: only one home');
  // every place is linked to the map
  if (c.areas.some((a) => a.pos)) {
    const seenA = new Set<string>([c.areas[0]!.id]);
    const st = [c.areas[0]!.id];
    while (st.length) {
      const id = st.pop()!;
      for (const b of c.areas) {
        const linked = (b.links ?? []).some((l) => l.to === id) || (c.areas.find((x) => x.id === id)?.links ?? []).some((l) => l.to === b.id);
        if (linked && !seenA.has(b.id)) (seenA.add(b.id), st.push(b.id));
      }
    }
    for (const a of c.areas) if (a.pos && !seenA.has(a.id)) err(`area ${a.id}: not linked to home`);
  }

  // Enemies
  for (const e of c.enemies ?? []) {
    const w = `enemy ${e.id}`;
    if (!e.ai.length) err(`${w}: no moves`);
    if (e.hp <= 0 || e.dmg[0] > e.dmg[1]) err(`${w}: bad numbers`);
    for (const t of [...e.traits, ...(e.hidden ?? [])]) if (!traitIds.has(t)) err(`${w}: unknown trait ${t}`);
    checkRes(w, e.loot);
    if (e.rare) checkRes(w, e.rare.loot);
    if (e.calls && !enemies.has(e.calls)) err(`${w}: calls unknown enemy ${e.calls}`);
    if (e.ai.some((m) => m.move === 'call') && !e.calls) err(`${w}: calls nobody`);
    for (const ph of e.phases ?? []) for (const x of ph.add ?? []) if (!enemies.has(x.enemy)) err(`${w}: phase adds unknown ${x.enemy}`);
  }

  // Gear and consumables
  for (const r of c.resources) {
    const w = `resource ${r.id}`;
    if (r.gear && r.kind !== 'gear') err(`${w}: gear must be of kind gear`);
    if (r.kind === 'gear' && !r.gear) err(`${w}: kind gear without gear stats`);
    if (r.gear?.ammo && !res.has(r.gear.ammo)) err(`${w}: unknown ammo ${r.gear.ammo}`);
    if (r.use && r.kind !== 'use' && r.kind !== 'food') err(`${w}: a consumable must be of kind use or food`);
    if (r.meal && (r.meal.hp <= 0 || r.meal.minutes <= 0)) err(`${w}: a dish must give health for some time`);
    if (r.meal && r.kind !== 'use' && r.kind !== 'food') err(`${w}: a dish must be of kind use or food`);
  }

  // Residents
  for (const r of c.residents ?? []) {
    for (const t of r.traits) {
      for (const k of Object.keys(t.mult ?? {})) if (!k.startsWith('skill:') && !c.actions.some((a) => a.id === k)) err(`resident ${r.id}: unknown action ${k}`);
      for (const k of t.avoid ?? []) if (!c.actions.some((a) => a.id === k)) err(`resident ${r.id}: unknown action ${k}`);
    }
  }
  if (c.food && !res.has(c.food)) err(`content: unknown food ${c.food}`);
  for (const role of ['hunter', 'maker'] as const) if (!c.hero?.base?.[role]) err(`hero: no base stats for ${role}`);

  // Pools
  for (const p of c.pools) {
    const w = `pool ${p.id}`;
    if (!locs.has(p.group)) err(`${w}: unknown group ${p.group}`);
    checkCost(w, p.cost);
    checkCond(w, p.visible);
    checkCond(w, p.enabled);
    if (!c.scenes.some((s) => s.pool === p.pool)) err(`${w}: no scenes in pool ${p.pool}`);
    if (!c.scenes.some((s) => s.pool === p.pool && s.once === false && !s.visible)) err(`${w}: pool ${p.pool} needs an always-available repeatable scene`);
  }

  // Scenes
  for (const s of c.scenes) {
    const w = `scene ${s.id}`;
    if (s.group && !locs.has(s.group)) err(`${w}: unknown group ${s.group}`);
    if (s.group && s.label === undefined) err(`${w}: has group but no label`);
    if (s.pool && !pools.has(s.pool)) err(`${w}: unknown pool ${s.pool}`);
    if (s.explores && !locs.has(s.explores)) err(`${w}: explores unknown location`);
    checkCost(w, s.cost);
    checkCond(w, s.visible);
    checkCond(w, s.enabled);
    if (!s.nodes[s.start]) err(`${w}: missing start node ${s.start}`);
    // graph
    const seenNodes = new Set<string>();
    const stack = [s.start];
    let canEnd = false;
    while (stack.length) {
      const id = stack.pop()!;
      if (seenNodes.has(id)) continue;
      seenNodes.add(id);
      const n = s.nodes[id];
      if (!n) {
        err(`${w}: link to missing node ${id}`);
        continue;
      }
      for (const t of nodeTargets(n)) {
        if (t === null || t === undefined) {
          if (n.type !== 'combat' && n.type !== 'fight') canEnd = true;
          continue;
        }
        if (!s.nodes[t]) err(`${w}.${id}: link to missing node ${t}`);
        else stack.push(t);
      }
    }
    if (!canEnd) err(`${w}: no path ends the scene`);
    for (const id of Object.keys(s.nodes)) if (!seenNodes.has(id)) err(`${w}: node ${id} is unreachable`);
    for (const [id, n] of Object.entries(s.nodes)) {
      const nw = `${w}.${id}`;
      const cs: Cond[] = [];
      textConds(n.text, cs);
      textConds(n.hunter, cs);
      textConds(n.maker, cs);
      cs.forEach((x) => checkCond(nw, x));
      checkEffects(nw, nodeEffects(n), true);
      if (n.type === 'choice') {
        if (n.options.length === 0) err(`${nw}: choice without options`);
        const ids = new Set<string>();
        for (const o of n.options) {
          if (ids.has(o.id)) err(`${nw}: duplicate option ${o.id}`);
          ids.add(o.id);
          checkCond(nw, o.visible);
          checkCond(nw, o.enabled);
          if (n.mode === 'joint' && o.role) err(`${nw}: joint choice option ${o.id} limited to a role can never be agreed on`);
          if (n.mode === 'each' && o.next !== undefined) warnings.push(`${nw}: option next ignored in 'each' mode`);
        }
        if (n.mode === 'joint' && !n.mismatch) err(`${nw}: joint choice needs a mismatch node`);
        if (n.mode === 'each' && n.next === undefined) warnings.push(`${nw}: 'each' choice ends the scene`);
        if (n.mode === 'joint' && n.options.every((o) => o.visible || o.enabled)) warnings.push(`${nw}: every option is conditional`);
      }
      if (n.type === 'combat' && !encs.has(n.enc)) err(`${nw}: unknown encounter ${n.enc}`);
      if (n.type === 'fight') for (const f of n.foes) if (!enemies.has(f.enemy)) err(`${nw}: unknown enemy ${f.enemy}`);
      if (n.type === 'fight' && n.field) for (const p of fieldProblems(n.field.rows)) err(`${nw}: field: ${p}`);
    }
    checkEffects(`${w}.onEnd`, effectsOf(s.onEnd), true);
  }

  // Encounters
  for (const e of c.encounters) {
    const w = `encounter ${e.id}`;
    const ids = new Set<string>();
    for (const o of [...e.options, e.downOption]) {
      if (ids.has(o.id)) err(`${w}: duplicate option ${o.id}`);
      ids.add(o.id);
      checkCost(`${w}.${o.id}`, o.cost);
      checkCond(`${w}.${o.id}`, o.visible);
    }
    if (e.ally) checkCond(w, e.ally.if);
    if (e.armor) checkCond(w, e.armor.if);
    if (!e.options.some((o) => !o.visible && !o.cost && (o.dmg || o.fear))) err(`${w}: needs an always-available attacking option`);
  }

  // Underground maps
  const usedMaps = new Set<string>();
  for (const s of c.scenes) for (const n of Object.values(s.nodes)) if (n.type === 'delve') usedMaps.add(n.map);
  for (const m of c.maps ?? []) {
    const w = `map ${m.id}`;
    if (!m.rooms[m.start]) err(`${w}: unknown start room ${m.start}`);
    if (!usedMaps.has(m.id)) warnings.push(`${w}: no scene uses it`);
    const seenRooms = new Set<string>([m.start]);
    const stack = [m.start];
    while (stack.length) {
      const id = stack.pop()!;
      for (const e of m.rooms[id]?.exits ?? []) if (!seenRooms.has(e.to) && m.rooms[e.to]) (seenRooms.add(e.to), stack.push(e.to));
    }
    for (const [id, r] of Object.entries(m.rooms)) {
      const rw = `${w}.${id}`;
      if (!seenRooms.has(id)) err(`${rw}: cannot be reached from the start`);
      const cs: Cond[] = [];
      textConds(r.text, cs);
      textConds(r.hunter, cs);
      textConds(r.maker, cs);
      cs.forEach((x) => checkCond(rw, x));
      checkEffects(rw, effectsOf(r.first), true);
      const actIds = new Set<string>();
      for (const e of r.exits) {
        if (!m.rooms[e.to]) err(`${rw}: exit to unknown room ${e.to}`);
        if (e.to === id) err(`${rw}: exit to itself`);
        checkCond(rw, e.visible);
        checkCond(rw, e.enabled);
        if (e.risk && (e.risk.p <= 0 || e.risk.p > 1)) err(`${rw}: bad risk ${e.risk.p}`);
      }
      for (const a of r.acts ?? []) {
        if (actIds.has(a.id)) err(`${rw}: duplicate act ${a.id}`);
        actIds.add(a.id);
        checkCond(`${rw}.${a.id}`, a.visible);
        checkCond(`${rw}.${a.id}`, a.enabled);
        checkCost(`${rw}.${a.id}`, a.cost);
        checkEffects(`${rw}.${a.id}`, effectsOf(a.effects), true);
      }
      for (const b of r.enter ?? []) checkCond(rw, b.if);
    }
  }
  for (const s of c.scenes)
    for (const [id, n] of Object.entries(s.nodes)) {
      const nw = `scene ${s.id}.${id}`;
      if (n.type === 'delve') {
        const m = MAPS.get(n.map);
        if (!m) {
          err(`${nw}: unknown map ${n.map}`);
          continue;
        }
        for (const st of n.starts ?? []) {
          checkCond(nw, st.if);
          if (!m.rooms[st.room]) err(`${nw}: unknown start room ${st.room}`);
        }
        for (const b of n.bonus ?? []) checkCond(nw, b.if);
        if (n.light < 1) err(`${nw}: no light to start with`);
      }
      if (n.type === 'operation') {
        const ids = new Set(n.tracks.map((t) => t.id));
        const known = (k: string) => ids.has(k) || err(`${nw}: unknown track ${k}`);
        if (!ids.has(n.win.track)) err(`${nw}: unknown win track`);
        if (!n.tracks.some((t) => t.bad)) warnings.push(`${nw}: nothing can go wrong`);
        const moveIds = new Set<string>();
        for (const m of n.moves) {
          if (moveIds.has(m.id)) err(`${nw}: duplicate move ${m.id}`);
          moveIds.add(m.id);
          Object.keys(m.delta ?? {}).forEach(known);
          if (m.transfer) [m.transfer.from, m.transfer.to].forEach(known);
          for (const b of m.bonus ?? []) {
            checkCond(nw, b.if);
            Object.keys(b.delta ?? {}).forEach(known);
          }
          checkCond(nw, m.visible);
          checkCond(nw, m.enabled);
          checkCost(`${nw}.${m.id}`, m.cost);
        }
        for (const role of ['hunter', 'maker'] as const)
          if (!n.moves.some((m) => (!m.role || m.role === role) && !m.visible && !m.enabled && !m.cost))
            err(`${nw}: the ${role} needs a move that is always available`);
        for (const ev of n.events) {
          Object.keys(ev.delta).forEach(known);
          checkCond(nw, ev.if);
        }
      }
      if (n.type === 'stealth') {
        if (!n.path.length || !n.watch.length) err(`${nw}: empty path or watch`);
        // perfect play must fit in time: every tile one turn, loose tiles two, every look a wait
        let turn = 0;
        let time = 0;
        for (let pos = 0; pos < n.path.length; ) {
          if (n.watch[turn % n.watch.length]) {
            time += 1;
          } else {
            time += n.path[pos] ? 2 : 1;
            pos += 1;
          }
          turn += 1;
          if (turn > 500) break;
        }
        if (time > n.time) err(`${nw}: needs ${time} time even when played perfectly, has ${n.time}`);
        if (n.alarm < 2) err(`${nw}: one slip must not end it (alarm ≥ 2)`);
        for (const b of n.bonus ?? []) checkCond(nw, b.if);
      }
    }

  // Goals, NPCs, clues
  for (const g of c.goals) checkCond(`goal ${g.id}`, g.when);
  if (c.goals.length && c.goals[c.goals.length - 1]!.when) err('goals: the last goal must be an unconditional fallback');
  for (const x of c.clues) if (x.mystery && !mysteries.has(x.mystery)) err(`clue ${x.id}: unknown mystery`);
  for (const n of c.npcs) {
    const cs: Cond[] = [];
    textConds(n.desc, cs);
    cs.forEach((x) => checkCond(`npc ${n.id}`, x));
  }

  // Errands
  const questIds = new Set<string>();
  for (const q of c.quests ?? []) {
    if (questIds.has(q.id)) err(`quest ${q.id}: duplicate id`);
    questIds.add(q.id);
    checkCond(`quest ${q.id} start`, q.start);
    if (q.fail) checkCond(`quest ${q.id} fail`, q.fail);
    if (!q.steps.length) err(`quest ${q.id}: no steps`);
    q.steps.forEach((st, i) => checkCond(`quest ${q.id} step ${i + 1}`, st.done));
  }
  for (const s of c.scenes) if (s.quest && !questIds.has(s.quest)) err(`scene ${s.id}: unknown quest ${s.quest}`);
  for (const a of c.actions) if (a.quest && !questIds.has(a.quest)) err(`action ${a.id}: unknown quest ${a.quest}`);

  // preparations: each readies a together scene that reads its flag, and is done by something
  const prepIds = new Set<string>();
  for (const p of c.preps ?? []) {
    if (prepIds.has(p.id)) err(`prep ${p.id}: duplicate id`);
    prepIds.add(p.id);
    if (!p.id.startsWith('prep_')) err(`prep ${p.id}: its flag must start with prep_ (not a story flag)`);
    const sc = c.scenes.find((x) => x.id === p.scene);
    if (!sc) {
      err(`prep ${p.id}: unknown scene ${p.scene}`);
      continue;
    }
    if (p.open) checkCond(`prep ${p.id} open`, p.open);
    if (p.done) checkCond(`prep ${p.id} done`, p.done);
    const maps = (c.maps ?? []).filter((m) => JSON.stringify(sc).includes(`"${m.id}"`));
    if (![sc, ...maps].some((x) => JSON.stringify(x).includes(`"${p.id}"`))) err(`prep ${p.id}: scene ${p.scene} never reads it`);
    const setters = c.actions.filter((a) => a.prep === p.id && JSON.stringify(a.effects ?? []).includes(`"${p.id}"`));
    if (!p.done && !setters.length) err(`prep ${p.id}: nothing does it`);
  }
  for (const a of c.actions) if (a.prep && !prepIds.has(a.prep)) err(`action ${a.id}: unknown prep ${a.prep}`);
  // every job of residents stands in exactly one trade, and a trade holds only jobs
  for (const a of c.actions) {
    if (!a.job) continue;
    const n = (c.trades ?? []).filter((t) => t.jobs.includes(a.id)).length;
    if (n !== 1) err(`job ${a.id}: in ${n} trades, want one`);
  }
  for (const r of c.resources) if (r.folkTool && !(c.trades ?? []).some((t) => t.id === r.folkTool)) err(`resource ${r.id}: tool of an unknown trade ${r.folkTool}`);
  for (const t of c.trades ?? []) {
    if (!t.teach.length) err(`trade ${t.id}: nobody to teach it`);
    for (const j of t.jobs) if (!c.actions.some((a) => a.id === j && a.job)) err(`trade ${t.id}: ${j} is not a job`);
  }
  const perkIds = new Set(c.perks.map((p) => p.id));
  // the tree: each step of each branch is a pair (one or the other), steps open at rising levels
  const branchIds = new Set(c.hero.branches.map((b) => b.id));
  for (const p of c.perks) {
    if (p.quest && p.branch) err(`perk ${p.id}: an errand's perk stands outside the tree`);
    if (!p.quest && (!p.branch || !branchIds.has(p.branch) || !p.tier || p.tier > c.hero.tiers.length)) err(`perk ${p.id}: no place in the tree`);
  }
  for (const b of c.hero.branches) {
    c.hero.tiers.forEach((_, i) => {
      const n = c.perks.filter((p) => p.branch === b.id && p.tier === i + 1).length;
      if (n !== 2) err(`perk branch ${b.id} step ${i + 1}: ${n} perks, want a pair`);
    });
  }
  c.hero.tiers.forEach((lv, i) => {
    if (i > 0 && lv <= c.hero.tiers[i - 1]!) err(`perk steps: levels must rise`);
  });
  const perkEffects = (effs: Effect[]) => {
    for (const e of effs) if ('perk' in e && !perkIds.has(e.perk)) err(`unknown perk ${e.perk}`);
  };
  for (const s of c.scenes) perkEffects(sceneEffects(s));
  for (const a of c.actions) perkEffects(actionEffects(a));
  for (const a of c.areas) for (const l of a.links ?? []) if (l.if) checkCond(`area ${a.id} link ${l.to}`, l.if);
  for (const b of c.workBonus ?? []) checkCond('workBonus', b.if);
  if (c.dog?.trained) checkCond('dog trained', c.dog.trained);
  if (c.dog?.collar) checkCond('dog collar', c.dog.collar);

  // Ambience (visual only)
  if (c.ambient) {
    const actionIds = new Set(c.actions.map((a) => a.id));
    for (const k of Object.keys(c.ambient.areas)) if (!areas.has(k)) err(`ambient: unknown area ${k}`);
    for (const k of Object.keys(c.ambient.fires ?? {})) if (!areas.has(k)) err(`ambient fires: unknown area ${k}`);
    for (const [k, cond] of Object.entries(c.ambient.fires ?? {})) checkCond(`ambient fire ${k}`, cond);
    (c.ambient.overrides ?? []).forEach((o, i) => checkCond(`ambient override ${i}`, o.when));
    for (const k of Object.keys(c.ambient.actions)) if (!actionIds.has(k)) err(`ambient: unknown action ${k}`);
  }

  const reachable = simulate(c);
  for (const s of c.scenes) if (!reachable.scenes.has(s.id)) err(`scene ${s.id} is unreachable`);
  for (const a of c.actions) if (!reachable.actions.has(a.id)) err(`action ${a.id} is unreachable`);
  for (const l of c.locations) if (!reachable.locations.has(l.id)) err(`location ${l.id} is never visible`);
  for (const x of c.clues) if (!reachable.clues.has(x.id)) err(`clue ${x.id} is never granted`);
  for (const act of Object.keys(c.actEnd)) if (!reachable.flags.has(`act:${act}`)) err(`act ${act} cannot be finished`);
  for (const gap of reachable.questGaps) err(gap);

  // Nothing a player may need can run out for good: everything asked for must have a renewable
  // source — a repeatable, reachable action that yields it and is itself fed by renewable things.
  // Unique items (tools, people) are exempt: they are given by the story and never spent at will.
  // Hidden reservoirs (a cellar, a scrap heap) are finite on purpose; what they hold must be
  // renewable elsewhere, and that is checked for the visible resource itself.
  const renew = renewable(c, reachable.actions, reachable.areas);
  const renewMain = renewable(c, new Set([...reachable.actions].filter((id) => !questOwned.has(id))), reachable.areas);
  for (const [r, where] of required) {
    const def = c.resources.find((x) => x.id === r);
    if (!def || def.kind === 'tool' || def.kind === 'people' || def.hidden) continue;
    if (mainNeed.has(r) && renew.has(r) && !renewMain.has(r)) err(`resource ${r} is renewable only through errands, which may be skipped`);
    else if (!renew.has(r)) err(`resource ${r} (needed by ${where}) has no renewable source: a careless player could run out for good`);
  }

  return { errors, warnings, reachable };
}

/** Optimistic fixpoint: what can ever become available. */
/** Resources that can be produced again and again by reachable, repeatable actions. */
export function renewable(c: Content, reachableActions: Set<string>, reachableAreas?: Set<string>): Set<string> {
  const out = new Set<string>();
  const kindOf = new Map(c.resources.map((r) => [r.id, r.kind]));
  const usable = (k: string) => out.has(k) || kindOf.get(k) === 'tool' || kindOf.get(k) === 'people';
  // beasts keep coming where they live: their loot is renewable
  const enemies = new Map((c.enemies ?? []).map((e) => [e.id, e]));
  for (const a of c.areas) {
    if (reachableAreas && !reachableAreas.has(a.id)) continue;
    if (!a.ambush) continue;
    for (const f of a.foes ?? []) for (const [k, [, z]] of Object.entries(enemies.get(f.enemy)?.loot ?? {})) if (z > 0) out.add(k);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const a of c.actions) {
      if (a.once || a.oncePerPlayer || !reachableActions.has(a.id)) continue;
      if (!Object.keys(a.cost ?? {}).every(usable)) continue;
      const made = [
        ...Object.entries(a.yield ?? {}).filter(([, y]) => (Array.isArray(y) ? y[1] : y) > 0).map(([k]) => k),
        ...(a.chance ?? []).flatMap((ch) => Object.entries(ch.add ?? {}).filter(([, n]) => n > 0).map(([k]) => k)),
      ];
      for (const k of made)
        if (!out.has(k)) {
          out.add(k);
          changed = true;
        }
    }
    // a crop keeps going as long as its seed can be had again (most give their seed back)
    for (const cr of c.garden?.crops ?? []) {
      if (!usable(cr.seed)) continue;
      for (const k of Object.keys(cr.yield))
        if (!out.has(k)) {
          out.add(k);
          changed = true;
        }
    }
  }
  return out;
}

function simulate(c: Content) {
  const flags = new Set<string>(['built:none', 'bag_full']);
  const pflags = new Set<string>();
  const have = new Set<string>(Object.entries(c.start.resources).filter(([, n]) => n > 0).map(([k]) => k));
  const gotClues = new Set<string>();
  const scenes = new Set<string>();
  const actions = new Set<string>();
  const locations = new Set<string>();
  const areas = new Set<string>();
  const met = new Set<string>();
  const enemies = new Map((c.enemies ?? []).map((e) => [e.id, e]));
  const toolOf = (t: string) => c.resources.some((r) => r.gear?.tools?.includes(t) && have.has(r.id));
  const homeArea = c.areas.find((a) => a.home)?.id ?? c.areas[0]?.id;

  const ok = (cond: Cond | undefined): boolean => {
    if (!cond) return true;
    if ('all' in cond) return cond.all.every(ok);
    if ('any' in cond) return cond.any.some(ok);
    if ('not' in cond) return true;
    if ('flag' in cond) return (cond.lt !== undefined && cond.gte === undefined) || flags.has(cond.flag);
    if ('pflag' in cond) return pflags.has(cond.pflag);
    if ('partnerPflag' in cond) return pflags.has(cond.partnerPflag);
    if ('res' in cond) return cond.gte === undefined || cond.gte <= 0 || have.has(cond.res);
    if ('clue' in cond) return gotClues.has(cond.clue);
    if ('anyClue' in cond) return gotClues.has(cond.anyClue);
    if ('stove' in cond) return cond.stove === 'never' || flags.has('stove');
    if ('owns' in cond) return have.has(cond.owns);
    if ('worn' in cond) return have.has(cond.worn);
    if ('tool' in cond) return toolOf(cond.tool);
    if ('met' in cond) return met.has(cond.met);
    if ('seen' in cond) return have.has(cond.seen);
    if ('trait' in cond) return [...met].some((id) => [...(enemies.get(id)?.traits ?? []), ...(enemies.get(id)?.hidden ?? [])].includes(cond.trait as never));
    return true;
  };
  const canPay = (cost: Record<string, number> | undefined) => Object.keys(cost ?? {}).every((k) => have.has(k));
  const absorb = (effs: Effect[]) => {
    let changed = false;
    const add = (set: Set<string>, v: string) => {
      if (!set.has(v)) {
        set.add(v);
        changed = true;
      }
    };
    for (const e of effs) {
      if ('set' in e) add(flags, e.set);
      if ('inc' in e) add(flags, e.inc);
      if ('pset' in e) add(pflags, e.pset);
      if ('add' in e) for (const [k, n] of Object.entries(e.add)) if (n > 0) add(have, k);
      if ('give' in e) for (const [k, n] of Object.entries(e.give)) if (n > 0) add(have, k);
      if ('wear' in e) add(have, e.wear);
      if ('clue' in e) add(gotClues, e.clue);
      if ('stove' in e) add(flags, 'stove');
      if ('actDone' in e) add(flags, `act:${e.actDone}`);
      if ('fight' in e) for (const f of e.fight) changed = meetEnemy(f.enemy) || changed;
    }
    return changed;
  };
  const meetEnemy = (id: string): boolean => {
    let changed = false;
    if (!met.has(id)) {
      met.add(id);
      changed = true;
    }
    const e = enemies.get(id);
    for (const [k, [, z]] of Object.entries(e?.loot ?? {})) if (z > 0 && !have.has(k)) (have.add(k), (changed = true));
    for (const k of Object.keys(e?.rare?.loot ?? {})) if (!have.has(k)) (have.add(k), (changed = true));
    if (e?.calls && !met.has(e.calls)) changed = meetEnemy(e.calls) || changed;
    for (const ph of e?.phases ?? []) for (const x of ph.add ?? []) if (!met.has(x.enemy)) changed = meetEnemy(x.enemy) || changed;
    return changed;
  };
  const areaOf = (group: string | undefined): string | undefined => {
    if (!group) return homeArea;
    return c.locations.find((l) => l.id === group)?.area ?? homeArea;
  };

  let changed = true;
  while (changed) {
    changed = false;
    const mark = (set: Set<string>, v: string) => {
      if (!set.has(v)) {
        set.add(v);
        changed = true;
      }
    };
    for (const a of c.areas) {
      const open = a.home || (a.scout ? flags.has(`done:${a.scout}`) : ok(a.visible));
      if (!open || areas.has(a.id)) continue;
      mark(areas, a.id);
      if (a.wet) mark(flags, 'wet_feet');
      if (a.ambush) for (const f of a.foes ?? []) if (ok(f.if)) changed = meetEnemy(f.enemy) || changed;
    }
    for (const l of c.locations) if (ok(l.visible) && areas.has(l.area ?? homeArea!)) mark(locations, l.id);
    for (const d of c.daily ?? []) if (d.flag && ok(d.if)) mark(flags, d.flag);
    for (const a of c.actions) {
      if (!locations.has(a.group) || !ok(a.visible) || !ok(a.enabled) || !canPay(a.cost)) continue;
      if (a.tool && !toolOf(a.tool)) continue;
      mark(actions, a.id);
      for (const [k] of Object.entries(a.yield ?? {})) mark(have, k);
      for (const ch of a.chance ?? []) for (const [k, n] of Object.entries(ch.add ?? {})) if (n > 0) mark(have, k);
      if (a.once) mark(flags, `built:${a.id}`);
      if (a.oncePerPlayer) mark(pflags, `built:${a.id}`);
      if (a.kind === 'craft' || a.kind === 'build') mark(flags, `made:${a.id}`);
      if (absorb(actionEffects(a))) changed = true;
    }
    // the garden: once there are beds, every crop whose seed is at hand gives its harvest
    if (c.garden && c.garden.beds.some((b) => ok(b.if)))
      for (const cr of c.garden.crops) if (have.has(cr.seed)) for (const k of Object.keys(cr.yield)) mark(have, k);
    const poolOpen = new Set<string>();
    for (const p of c.pools) if (locations.has(p.group) && ok(p.visible) && ok(p.enabled) && canPay(p.cost)) poolOpen.add(p.pool);
    for (const s of c.scenes) {
      // a scouting scene is proposed from a place next to the unknown one
      const scouted = c.areas.find((a) => a.scout === s.id);
      const scoutOk = scouted
        ? c.areas.some((b) => areas.has(b.id) && ((b.links ?? []).some((l) => l.to === scouted.id) || (scouted.links ?? []).some((l) => l.to === b.id)))
        : true;
      const startable =
        scenes.has(s.id) ||
        (s.pool
          ? poolOpen.has(s.pool) && ok(s.visible)
          : s.group
            ? locations.has(s.group) && ok(s.visible) && ok(s.enabled) && canPay(s.cost) && scoutOk
            : scouted
              ? scoutOk && ok(s.visible) && ok(s.enabled) && canPay(s.cost)
              : false);
      if (!startable) continue;
      mark(scenes, s.id);
      if (absorb(sceneEffects(s))) changed = true;
      mark(flags, `done:${s.id}`);
      mark(flags, `count:${s.id}`);
      if (s.explores) mark(flags, `seen:${s.explores}`);
      for (const n of Object.values(s.nodes)) {
        if (n.type === 'combat') {
          mark(flags, `${n.enc}:killed`);
          mark(flags, `${n.enc}:fled`);
        }
        if (n.type === 'fight') for (const f of n.foes) if (meetEnemy(f.enemy)) changed = true;
      }
      // Scenes chained by effects become reachable too.
      for (const e of sceneEffects(s)) if ('scene' in e && scenes.has(e.scene) === false && c.scenes.some((x) => x.id === e.scene)) mark(scenes, e.scene);
    }
    void areaOf;
  }
  // every errand can begin and every step of it can be done
  const questGaps: string[] = [];
  for (const q of c.quests ?? []) {
    if (!ok(q.start)) questGaps.push(`quest ${q.id} can never begin`);
    q.steps.forEach((st, i) => {
      if (!ok(st.done)) questGaps.push(`quest ${q.id} step ${i + 1} can never be done`);
    });
  }
  return { scenes, actions, locations, clues: gotClues, flags, areas, questGaps };
}
