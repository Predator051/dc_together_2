import { describe, expect, it } from 'vitest';
import type { ChoiceNode, Content, OptionDef } from '../shared/src/content.js';
import type { WorldState } from '../shared/src/state.js';
import { content } from '../content/index.js';
import { pasts } from '../content/past/index.js';
import { validateContent } from '../server/src/validate.js';
import { ContentIndex, Game } from '../server/src/engine/index.js';
import { enterPast } from '../server/src/past.js';
import { resolveParas } from '../server/src/engine/text.js';
import { pair } from './world.js';

/** A past that remembers these flags (only its flags matter to the main story). */
const remembered = (flags: Record<string, number>) => ({ flags }) as unknown as WorldState;

describe('the past shows in the present', () => {
  it('a flag of one\'s past: mine, the partner\'s, either\'s, both\'s', () => {
    const { w, h, m } = pair(3);
    w.state.past = { [h]: remembered({ ph_knew: 1 }) };
    const g = w.g();
    expect(g.test({ past: 'ph_knew' }, h)).toBe(true);
    expect(g.test({ past: 'ph_knew' }, m)).toBe(false);
    expect(g.test({ past: 'ph_knew', who: 'mate' }, m)).toBe(true);
    expect(g.test({ past: 'ph_knew', who: 'either' })).toBe(true);
    expect(g.test({ past: 'ph_knew', who: 'both' })).toBe(false);
  });

  it('only the one who remembers reads the line and sees the option', () => {
    const { w, h, m } = pair(3);
    w.state.past = { [h]: remembered({ ph_knew: 1 }) };
    const g = w.g();
    const line = [{ if: { past: 'ph_knew' }, text: 'Ти знаєш цей голос.' }, { text: 'Чужий голос.' }];
    expect(g.render(line, h)).toBe('Ти знаєш цей голос.');
    expect(g.render(line, m)).toBe('Чужий голос.');
    const opt: OptionDef = { id: 'name', label: 'Назвати його на ім\'я', visible: { past: 'ph_knew' } };
    expect(g.optionVisible(opt, h, 'n1')).toBe(true);
    expect(g.optionVisible(opt, m, 'n1')).toBe(false);
  });

  it('a past reflects the story as it stood when the hero came in', () => {
    const { w, h } = pair(3);
    w.state.flags.p2_act3 = 1;
    w.state.flags.prep_ford = 1;
    const ix = new ContentIndex(content);
    const s = enterPast(w.state, h, ix, w.now, content.storyFlags);
    expect(s.mainFlags).toMatchObject({ p2_act3: 1 });
    expect(s.mainFlags!.prep_ford).toBeUndefined();
    const g = new Game(ix, s, w.now);
    expect(g.test({ mainFlag: 'p2_act3' }, h)).toBe(true);
    expect(g.test({ mainFlag: 'p2_act2_done' }, h)).toBe(false);
  });
});

describe('the story remembers in act three', () => {
  const scene = (id: string) => content.scenes.find((x) => x.id === id)!;
  const own = (g: Game, p: Parameters<typeof resolveParas>[0], pid: string) => resolveParas(p, (c) => g.test(c, pid as never)).join(' ');

  it('one\'s own line shows only to the one who remembers; the partner reads the story as it is', () => {
    const { w, h, m } = pair(3);
    const g = w.g();
    const arrive = scene('s_108').nodes.arrive!;
    expect(own(g, arrive.hunter, h)).toBe('Ти береш людей: будити, вести до возів.');
    w.state.past = { [h]: remembered({ ph_andriy: 1, ph_andriy_called: 1 }), [m]: remembered({ pm_yarema: 1 }) };
    expect(own(g, arrive.hunter, h)).toContain('пором');
    expect(own(g, scene('s_108').nodes.win!.maker, m)).toContain('Ярема');
    expect(own(g, scene('s_108').nodes.win!.maker, h)).toBe('');
  });

  it('a private word to the deserter of the recruiters, only for one who led a runaway out', () => {
    const { w, h, m } = pair(3);
    const node = scene('s_102').nodes.n4 as ChoiceNode;
    const opt = node.options.find((o) => o.id === 'runaway')!;
    expect(node.mode).not.toBe('joint');
    w.state.past = { [h]: remembered({ ph_deserter_saved: 1 }) };
    const g = w.g();
    expect(g.optionVisible(opt, h, 'n4')).toBe(true);
    expect(g.optionVisible(opt, m, 'n4')).toBe(false);
  });

  it('calling by name wakes a little more for one who once called and was heard — and only for them', () => {
    const { w, h } = pair(3);
    const op = scene('s_108').nodes.op as unknown as { moves: Parameters<Game['operationEffect']>[0][] };
    const name = op.moves.find((x) => x.id === 'name')!;
    const base = w.g().operationEffect(name, h).delta.awake!;
    w.state.past = { [h]: remembered({ ph_andriy_called: 1 }) };
    expect(w.g().operationEffect(name, h).delta.awake).toBe(base + 1);
  });
});

describe('the validator keeps memories honest', () => {
  it('a remembered option in a joint choice can never be agreed on; a past flag is named for its hero', () => {
    const c: Content = structuredClone(content);
    const sc = c.scenes.find((x) => Object.values(x.nodes).some((n) => n.type === 'choice' && n.mode === 'joint'))!;
    const node = Object.values(sc.nodes).find((n) => n.type === 'choice' && n.mode === 'joint') as ChoiceNode;
    node.options[0]!.visible = { past: 'ph_knew' };
    sc.nodes[sc.start]!.effects = [...(sc.nodes[sc.start]!.effects ?? []), { if: { past: 'knew' }, then: [] }];
    const errs = validateContent(c).errors;
    expect(errs.some((e) => e.includes('seen by one who remembers'))).toBe(true);
    expect(errs.some((e) => e.includes('a past\'s flag is named'))).toBe(true);
  });

  it('every flag of a past the story reads is set somewhere in that past', () => {
    const json = JSON.stringify(content);
    const read = [...json.matchAll(/"past":"([^"]+)"/g)].map((m) => m[1]!);
    for (const f of read) {
      const role = f.startsWith('ph_') ? 'hunter' : 'maker';
      const past = pasts[role];
      expect(past, `${f}: the ${role}'s past is not written yet`).toBeDefined();
      expect(JSON.stringify(past).includes(`"${f}"`), f).toBe(true);
    }
    for (const p of Object.values(pasts)) expect(validateContent(p!).errors).toEqual([]);
  });
});
