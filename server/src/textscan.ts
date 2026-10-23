// Collects every player-visible string from content and checks that it is proper Ukrainian.

import type { Content, LogLine, LogText, Paras, Text } from '../../shared/src/content.js';

export interface Found {
  where: string;
  text: string;
}

function pushText(out: Found[], where: string, t: Text | Paras | LogLine | undefined): void {
  if (t === undefined) return;
  if (typeof t === 'string') {
    out.push({ where, text: t });
    return;
  }
  t.forEach((x, i) => {
    if (typeof x === 'string') out.push({ where: `${where}[${i}]`, text: x });
    else if (Array.isArray(x)) pushText(out, `${where}[${i}]`, x);
    else out.push({ where: `${where}[${i}]`, text: x.text });
  });
}

function pushLog(out: Found[], where: string, l: LogText | LogText[] | undefined): void {
  if (!l) return;
  const list = Array.isArray(l) ? l : [l];
  list.forEach((x, i) => {
    pushText(out, `${where}#${i}.self`, x.self);
    pushText(out, `${where}#${i}.other`, x.other);
    pushText(out, `${where}#${i}.all`, x.all);
  });
}

function pushEffects(out: Found[], where: string, effs: unknown): void {
  if (!Array.isArray(effs)) return;
  for (const e of effs as Array<Record<string, unknown>>) {
    if ('log' in e) pushLog(out, `${where}.log`, e.log as LogText);
    if ('if' in e) {
      pushEffects(out, `${where}.then`, e.then);
      pushEffects(out, `${where}.else`, e.else);
    }
  }
}

export function collectStrings(c: Content): Found[] {
  const out: Found[] = [];
  for (const r of c.resources) if (!r.hidden) {
    pushText(out, `res ${r.id}`, r.name);
    pushText(out, `res ${r.id}.desc`, r.desc);
  }
  for (const a of c.actions) {
    pushText(out, `act ${a.id}.label`, a.label);
    pushText(out, `act ${a.id}.busy`, a.busy);
    pushText(out, `act ${a.id}.hint`, a.hint);
    pushText(out, `act ${a.id}.gives`, a.gives);
    pushText(out, `act ${a.id}.disabledHint`, a.disabledHint);
    pushLog(out, `act ${a.id}.log`, a.log);
    (a.chance ?? []).forEach((ch, i) => {
      pushLog(out, `act ${a.id}.chance${i}`, ch.log);
      pushEffects(out, `act ${a.id}.chance${i}`, ch.effects);
    });
    (a.beats ?? []).forEach((b, i) => {
      pushLog(out, `act ${a.id}.beat${i}`, b.log);
      pushEffects(out, `act ${a.id}.beat${i}`, b.effects);
    });
    pushEffects(out, `act ${a.id}`, a.effects);
  }
  for (const p of c.pools) {
    pushText(out, `pool ${p.id}.label`, p.label);
    pushText(out, `pool ${p.id}.hint`, p.hint);
    pushText(out, `pool ${p.id}.gives`, p.gives);
    pushText(out, `pool ${p.id}.disabledHint`, p.disabledHint);
  }
  for (const l of c.locations) {
    pushText(out, `loc ${l.id}.name`, l.name);
    pushText(out, `loc ${l.id}.desc`, l.desc);
  }
  for (const s of c.scenes) {
    pushText(out, `scene ${s.id}.title`, s.title);
    pushText(out, `scene ${s.id}.label`, s.label);
    pushText(out, `scene ${s.id}.disabledHint`, s.disabledHint);
    pushText(out, `scene ${s.id}.gives`, s.gives);
    pushLog(out, `scene ${s.id}.summary`, s.summary);
    pushEffects(out, `scene ${s.id}.onEnd`, s.onEnd);
    for (const [id, n] of Object.entries(s.nodes)) {
      const w = `scene ${s.id}.${id}`;
      pushText(out, `${w}.text`, n.text);
      pushText(out, `${w}.hunter`, n.hunter);
      pushText(out, `${w}.maker`, n.maker);
      pushEffects(out, w, n.effects);
      if (n.type === 'choice')
        for (const o of n.options) {
          pushText(out, `${w}.${o.id}`, o.label);
          pushText(out, `${w}.${o.id}.hint`, o.disabledHint);
          pushEffects(out, `${w}.${o.id}`, o.effects);
        }
      if ((n.type === undefined || n.type === 'text') && 'button' in n) pushText(out, `${w}.button`, n.button);
    }
  }
  for (const e of c.encounters) {
    pushText(out, `enc ${e.id}.name`, e.name);
    pushText(out, `enc ${e.id}.enemy`, e.enemy.name);
    for (const o of [...e.options, e.downOption]) {
      pushText(out, `enc ${e.id}.${o.id}`, o.label);
      pushLog(out, `enc ${e.id}.${o.id}.log`, o.log);
      pushLog(out, `enc ${e.id}.${o.id}.miss`, o.miss);
    }
    pushLog(out, `enc ${e.id}.ally`, e.ally?.log);
    pushLog(out, `enc ${e.id}.enemyLog`, e.enemyLog);
    pushLog(out, `enc ${e.id}.enemyMiss`, e.enemyMissLog);
  }
  for (const x of c.clues) {
    pushText(out, `clue ${x.id}.title`, x.title);
    pushText(out, `clue ${x.id}.text`, x.text);
  }
  for (const m of c.mysteries) pushText(out, `mys ${m.id}`, m.question);
  for (const g of c.goals) pushText(out, `goal ${g.id}`, g.text);
  for (const n of c.npcs) {
    pushText(out, `npc ${n.id}.name`, n.name);
    pushText(out, `npc ${n.id}.desc`, n.desc);
  }
  for (const a of c.areas) {
    pushText(out, `area ${a.id}.name`, a.name);
    pushText(out, `area ${a.id}.where`, a.where);
    pushText(out, `area ${a.id}.desc`, a.desc);
    (a.cond ?? []).forEach((x, i) => pushText(out, `area ${a.id}.cond${i}`, x.text));
  }
  for (const e of c.enemies ?? []) {
    for (const k of ['name', 'acc', 'gen', 'verb'] as const) pushText(out, `enemy ${e.id}.${k}`, e[k]);
    pushText(out, `enemy ${e.id}.desc`, e.desc);
    (e.phases ?? []).forEach((ph, i) => pushText(out, `enemy ${e.id}.phase${i}`, ph.text));
  }
  for (const r of c.residents ?? []) {
    pushText(out, `resident ${r.id}.name`, r.name);
    pushText(out, `resident ${r.id}.desc`, r.desc);
    r.traits.forEach((t, i) => {
      pushText(out, `resident ${r.id}.trait${i}`, t.name);
      pushText(out, `resident ${r.id}.trait${i}.text`, t.text);
    });
  }
  for (const [k, t] of Object.entries(c.traits ?? {})) {
    pushText(out, `trait ${k}`, t.name);
    pushText(out, `trait ${k}.text`, t.text);
  }
  for (const p of c.perks ?? []) {
    pushText(out, `perk ${p.id}`, p.name);
    pushText(out, `perk ${p.id}.text`, p.text);
  }
  for (const r of c.resources) {
    if (!r.use) continue;
    pushText(out, `res ${r.id}.use`, r.use.label);
    pushLog(out, `res ${r.id}.use.log`, r.use.log);
  }
  for (const a of c.actions) pushText(out, `act ${a.id}.why`, a.why);
  for (const s of c.scenes)
    for (const [id, n] of Object.entries(s.nodes)) {
      const w = `scene ${s.id}.${id}`;
      if (n.type === 'stealth') for (const [k, v] of Object.entries(n.sees)) pushText(out, `${w}.sees.${k}`, v);
      if (n.type === 'operation') {
        n.tracks.forEach((t) => pushText(out, `${w}.track.${t.id}`, t.label));
        n.moves.forEach((m) => {
          pushText(out, `${w}.move.${m.id}`, m.label);
          pushLog(out, `${w}.move.${m.id}.log`, m.log);
        });
        n.events.forEach((e, i) => pushText(out, `${w}.event${i}`, e.text));
      }
    }
  for (const [k, v] of Object.entries(c.actEnd)) pushText(out, `actEnd ${k}`, v);
  for (const [r, t] of Object.entries(c.roleTitles)) {
    out.push({ where: `role ${r}.m`, text: t.m });
    out.push({ where: `role ${r}.f`, text: t.f });
  }
  for (const [k, v] of Object.entries(c.ui)) out.push({ where: `ui ${k}`, text: v });
  for (const w of c.weather?.kinds ?? []) {
    out.push({ where: `weather ${w.id}.name`, text: w.name });
    w.log.forEach((t, i) => out.push({ where: `weather ${w.id}.log${i}`, text: t }));
    if (w.bonus) out.push({ where: `weather ${w.id}.bonus`, text: w.bonus.text });
  }
  return out;
}

const RUSSIAN_LETTERS = /[ыэъёЫЭЪЁ]/;
const PLACEHOLDER = /\{(?:p:)?[^{}|]*\|[^{}|]*\}|\{(?:name|partner|role|p:role|foe|foeAcc|foeGen|foes|n|item|verb|who)\}/g;

/**
 * Russian words and typical russisms/calques. Each entry is a regex source; a whole-word match
 * (Unicode-aware) is required. Use `\\p{L}*` for open endings.
 */
const RUSSISM_SOURCES = [
  'приймати участь',
  'прийняти участь',
  'на протязі',
  'являєть\\p{L}*',
  'слідуюч\\p{L}*',
  'получа\\p{L}*',
  'кушати',
  'вибачаюсь',
  'співпада\\p{L}*',
  'міроприєм\\p{L}*',
  'на рахунок',
  'відкри\\p{L}* двері',
  'закри\\p{L}* двері',
  'двері відкри\\p{L}*',
  'двері закри\\p{L}*',
  'прийшлось',
  'начина\\p{L}*',
  'конечно',
  'тоже',
  'пока',
  'нужно',
  'лишь',
  'сейчас',
  'когда',
  'если',
  'задавати питання',
  'задати питання',
  'в залежності',
  'дякуючи',
  'наступаюч\\p{L}*',
  'по крайній мірі',
  'знаходиться',
  'приймати рішення',
  'вірно',
  'любий',
  'відмінити',
  'ким-небудь',
];
const RUSSISMS = RUSSISM_SOURCES.map((src) => new RegExp(`(?<![\\p{L}'’])(?:${src})(?!\\p{L})`, 'iu'));

const UKR = /[а-щьюяіїєґА-ЩЬЮЯІЇЄҐ]/;

export function checkUkrainian(text: string, allowLatin: RegExp[] = []): string[] {
  const problems: string[] = [];
  if (!text || !text.trim()) return ['empty'];
  // Substitute placeholders with plausible words so punctuation checks see real text.
  let bare = text.replace(PLACEHOLDER, (m) => (m.includes('|') ? m.slice(m.indexOf(':') >= 0 && m.startsWith('{p:') ? 3 : 1, m.indexOf('|')) || 'в' : 'Хтось'));
  for (const a of allowLatin) bare = bare.replace(a, '');
  if (/[{}|]/.test(bare)) problems.push('broken placeholder');
  if (!UKR.test(bare) && /\p{L}/u.test(bare)) problems.push('no Ukrainian letters');
  if (RUSSIAN_LETTERS.test(bare)) problems.push('Russian letters');
  if (/[A-Za-z]/.test(bare)) problems.push('Latin letters');
  for (const r of RUSSISMS) if (r.test(bare)) problems.push(`russism ${r.source}`);
  if (/ {2,}/.test(text)) problems.push('double space');
  if (/\s[,.;:!?]/.test(bare)) problems.push('space before punctuation');
  return problems;
}
