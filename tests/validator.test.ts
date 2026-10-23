import { describe, expect, it } from 'vitest';
import type { Content } from '../shared/src/content.js';
import { content } from '../content/index.js';
import { validateContent } from '../server/src/validate.js';

const clone = (): Content => structuredClone(content);

describe('content validator', () => {
  it('real content has no errors', () => {
    const r = validateContent(content);
    expect(r.errors).toEqual([]);
  });

  it('the weather is checked: known kinds, sane numbers, work it can favour', () => {
    const c = clone();
    const w = c.weather!;
    w.first = 'w_none';
    w.kinds[1]!.travel = 0;
    w.kinds[2]!.bonus = { fx: ['heart'], p: 0.3, text: 'х' };
    c.actions[0]!.visible = { weather: 'w_none' };
    const errs = validateContent(c).errors;
    expect(errs).toContain('weather: unknown first w_none');
    expect(errs.some((e) => e.includes(`weather ${w.kinds[1]!.id}: multipliers must be positive`))).toBe(true);
    expect(errs.some((e) => e.includes(`weather ${w.kinds[2]!.id}: no action has the favoured accent`))).toBe(true);
    expect(errs.some((e) => e.includes('unknown weather w_none'))).toBe(true);
  });

  it('the garden is checked: seeds, harvests, the tending job', () => {
    const c = clone();
    const gd = c.garden!;
    gd.crops[0]!.seed = 'r_none';
    gd.crops[1]!.yield = { r_nowhere: 1 };
    gd.tend = 'x_201';
    const errs = validateContent(c).errors;
    expect(errs).toContain(`crop ${gd.crops[0]!.id}: unknown seed r_none`);
    expect(errs.some((e) => e.includes(`crop ${gd.crops[1]!.id}: unknown resource r_nowhere`))).toBe(true);
    expect(errs).toContain('garden: the tending action x_201 is not a job');
  });

  it('happenings are checked: places, choices, costs', () => {
    const c = clone();
    const ev = c.events!.kinds;
    const card = ev.find((e) => e.choices)!;
    card.choices = card.choices!.slice(0, 1);
    const away = ev.find((e) => e.areas)!;
    away.areas = ['a_99'];
    const paid = ev.find((e) => e.choices?.some((ch) => ch.cost) && e !== card)!;
    paid.choices!.find((ch) => ch.cost)!.cost = { r_nothing: 1 };
    const errs = validateContent(c).errors;
    expect(errs).toContain(`event ${card.id}: a card needs at least two choices`);
    expect(errs).toContain(`event ${away.id}: unknown area a_99`);
    expect(errs.some((e) => e.startsWith(`event ${paid.id} choice`) && e.includes('unknown resource r_nothing'))).toBe(true);
  });

  it('every place at home has its own spot on the plan', () => {
    const c = clone();
    const home = c.areas.find((a) => a.home)!.id;
    const [a, b] = c.locations.filter((l) => l.area === home);
    delete a!.plan;
    b!.plan = { x: 50, y: 88, icon: 'home' };
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes(`${a!.id}: a place needs a plan spot`))).toBe(true);
    expect(errs.some((e) => e.includes(`${b!.id}: plan spot too close to gate`))).toBe(true);
  });

  it('every action away from home stands on a known spot, every foe has a portrait', () => {
    const c = clone();
    const a = c.actions.find((x) => x.spot)!;
    a.spot = 'nowhere';
    const b = c.actions.find((x) => x.spot && x !== a)!;
    delete b.spot;
    (c.enemies![0] as { icon: string }).icon = 'nobody';
    const area = c.areas.find((x) => x.scene && !x.home)!;
    delete area.scene;
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes(`action ${a.id}: unknown spot nowhere`))).toBe(true);
    expect(errs.some((e) => e.includes(`action ${b.id}: needs a spot`))).toBe(true);
    expect(errs.some((e) => e.includes('unknown icon nobody'))).toBe(true);
    expect(errs.some((e) => e.includes(`area ${area.id}: needs a scene`))).toBe(true);
  });

  it('detects duplicate ids', () => {
    const c = clone();
    c.actions.push({ ...c.actions[0]! });
    expect(validateContent(c).errors.some((e) => e.includes('Duplicate id'))).toBe(true);
  });

  it('detects broken scene links and unreachable nodes', () => {
    const c = clone();
    const s = c.scenes.find((x) => x.id === 's_03')!;
    (s.nodes.n1 as { next?: string }).next = 'nope';
    s.nodes.orphan = { text: 'Сирота', next: null };
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes('missing node nope'))).toBe(true);
    expect(errs.some((e) => e.includes('node orphan is unreachable'))).toBe(true);
  });

  it('detects flags that are read but never set (impossible conditions)', () => {
    const c = clone();
    c.scenes.find((x) => x.id === 's_03')!.visible = { flag: 'never_set_anywhere' };
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes('never_set_anywhere'))).toBe(true);
    expect(errs.some((e) => e.includes('scene s_03 is unreachable'))).toBe(true);
  });

  it('detects circular requirements', () => {
    const c = clone();
    const a = c.actions.find((x) => x.id === 'x_16')!;
    a.visible = { flag: 'loop_flag' };
    a.effects = [...(a.effects ?? []), { set: 'loop_flag' }];
    expect(validateContent(c).errors).toContain('action x_16 is unreachable');
  });

  it('detects costs above storage caps and unknown references', () => {
    const c = clone();
    c.actions.find((x) => x.id === 'x_16')!.cost = { r_01: 999, r_99: 1 };
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes('exceeds storage cap'))).toBe(true);
    expect(errs.some((e) => e.includes('unknown resource r_99'))).toBe(true);
  });

  it('detects joint choices without mismatch and role-locked joint options', () => {
    const c = clone();
    const s = c.scenes.find((x) => x.id === 's_01')!;
    const n = s.nodes.n6 as { mismatch?: string; options: Array<{ role?: string }> };
    delete n.mismatch;
    n.options[0]!.role = 'hunter';
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes('needs a mismatch node'))).toBe(true);
    expect(errs.some((e) => e.includes('can never be agreed on'))).toBe(true);
  });

  it('forbids starting together-scenes from solo actions', () => {
    const c = clone();
    c.actions.find((x) => x.id === 'x_10')!.effects = [{ scene: 's_03' }];
    expect(validateContent(c).errors.some((e) => e.includes('solo actions must not start'))).toBe(true);
  });

  it('knows the map, the foes and the tools', () => {
    const c = clone();
    c.areas.find((a) => a.id === 'a_02')!.links!.push({ to: 'a_99', time: 1000 });
    c.areas.find((a) => a.id === 'a_03')!.foes!.push({ enemy: 'e_99', w: 1 });
    c.actions.find((x) => x.id === 'x_06')!.tool = 'spoon';
    c.enemies.find((e) => e.id === 'e_08')!.calls = undefined;
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes('link to unknown area a_99'))).toBe(true);
    expect(errs.some((e) => e.includes('unknown enemy e_99'))).toBe(true);
    expect(errs.some((e) => e.includes('no gear provides tool spoon'))).toBe(true);
    expect(errs.some((e) => e.includes('calls nobody'))).toBe(true);
  });

  it('a place that can only be reached through a scouting nobody can do is caught', () => {
    const c = clone();
    c.scenes.find((x) => x.id === 's_07')!.visible = { flag: 'nobody_sets_this' };
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes('scene s_07 is unreachable'))).toBe(true);
    // the grove's own work cannot be reached any more either
    expect(errs.some((e) => e.includes('action x_37 is unreachable'))).toBe(true);
  });

  it('a needed resource without a renewable source is a dead end', () => {
    const c = clone();
    // the only bark: make it once-only
    c.actions.find((x) => x.id === 'x_37')!.once = true;
    expect(validateContent(c).errors.some((e) => e.includes('resource r_13') && e.includes('renewable'))).toBe(true);
  });

  it('the end of act one is reachable', () => {
    const r = validateContent(content);
    expect(r.reachable.flags.has('act:1')).toBe(true);
  });
});
