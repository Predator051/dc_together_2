// The hero's growth: strengths with their points, the perk tree branch by branch, skills with what they give.

import type { JSX } from 'preact';
import { useState } from 'preact/hooks';
import type { HeroView, PerkBranchView, PerkView, PlayerView } from '../../shared/src/protocol.js';
import { net } from './net.js';
import { T } from './strings.js';
import painted from './art/perks.json';

// Painted marks (scripts/art.ts perks): 4×3 atlases; keys — perk ids, `branch_<id>`, `stat_<id>`, `skill_<id>`.
const PAINTED = painted as unknown as Record<string, [number, number]>;

function atlas(n: number): string {
  return new URL(`./art/perks/k${n}.webp`, import.meta.url).href;
}

function load(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function Ink({ children }: { children: JSX.Element | JSX.Element[] }) {
  return (
    <svg class="mark-ink" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

/** Drawn stand-ins for a branch (a perk without its painting takes its branch's). */
const INK: Record<string, () => JSX.Element> = {
  blade: () => (
    <Ink>
      <path d="M24 5l3 3-14 14-3-3z" />
      <path d="M9 20l-3 3 3 3 3-3M5 27l2-2" />
    </Ink>
  ),
  sight: () => (
    <Ink>
      <path d="M3 16c4-6 8-9 13-9s9 3 13 9c-4 6-8 9-13 9s-9-3-13-9z" />
      <circle cx="16" cy="16" r="4" />
    </Ink>
  ),
  guard: () => (
    <Ink>
      <path d="M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8z" />
      <path d="M16 9v14" />
    </Ink>
  ),
  craft: () => (
    <Ink>
      <path d="M6 26l11-11M14 8l5-3 8 8-3 5-4-1-6-6z" />
    </Ink>
  ),
};

/** A painted mark, else the drawn one, else a letter in a ring. */
function Mark({ k, ink, letter, cls = '' }: { k: string; ink?: string; letter?: string; cls?: string }) {
  const p = PAINTED[k];
  if (p) {
    const [n, i] = p;
    return (
      <span
        class={`mark painted ${cls}`}
        style={{ backgroundImage: `url(${atlas(n)})`, backgroundPosition: `${((i % 4) / 3) * 100}% ${(Math.floor(i / 4) / 2) * 100}%` }}
        aria-hidden="true"
      />
    );
  }
  const draw = ink ? INK[ink] : undefined;
  return (
    <span class={`mark ${cls}`} aria-hidden="true">
      {draw ? draw() : <b>{letter}</b>}
    </span>
  );
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

function branchOf(h: HeroView, id: string | null): PerkBranchView {
  return h.branches.find((b) => b.id === id) ?? h.branches.find((b) => b.tiers.some((t) => t.perks.some((x) => x.state === 'can'))) ?? h.branches[0]!;
}

function PerkCard({ p, branch, sel, onSel, locked, level }: { p: PerkView; branch: string; sel: boolean; onSel: () => void; locked: boolean; level: number }) {
  const note =
    p.state === 'have' ? T.perkHave : p.state === 'closed' ? T.perkClosed : p.state === 'wait' ? T.perkWait : p.state === 'locked' ? (level > 0 ? `${T.perkFrom} ${level}` : T.perkNeedPrev) : '';
  return (
    <div class={`perk-card s-${p.state} ${sel ? 'sel' : ''}`}>
      <button type="button" class="perk-face" aria-pressed={sel} aria-label={`${p.name}. ${p.text}${note ? `. ${note}` : ''}`} onClick={onSel}>
        <Mark k={p.id} ink={branch} cls="perk-mark" />
        <span class="perk-words">
          {p.active && <span class="perk-kind">{T.perkActive}</span>}
          <b>{p.name}</b>
          <small>{p.text}</small>
          {note && <em class="perk-note">{note}</em>}
        </span>
      </button>
      {p.state === 'can' && sel && (
        <button type="button" class="btn small primary perk-take" disabled={locked} onClick={() => net.send({ c: 'perk', id: p.id })}>
          {T.perkTake}
        </button>
      )}
    </div>
  );
}

function Tree({ h, locked }: { h: HeroView; locked: boolean }) {
  const [want, setWant] = useState<string | null>(() => load('bezgomin.perkBranch'));
  const [sel, setSel] = useState<string | null>(null);
  const b = branchOf(h, want);
  const pick = (id: string) => {
    setWant(id);
    setSel(null);
    store('bezgomin.perkBranch', id);
  };
  const steps = b.tiers.length;
  return (
    <section class="growth-block perk-tree">
      <h3>
        {T.perks}
        {h.perkPoints > 0 && (
          <span class="pill new">
            {T.perkPoints}: {h.perkPoints}
          </span>
        )}
      </h3>
      <p class="meta">{T.perkHint}</p>
      <div class="branch-tabs" role="tablist">
        {h.branches.map((x) => {
          const can = x.tiers.some((t) => t.perks.some((p) => p.state === 'can'));
          return (
            <button type="button" role="tab" aria-selected={x.id === b.id} class={`branch-tab ${x.id === b.id ? 'on' : ''}`} onClick={() => pick(x.id)}>
              <Mark k={`branch_${x.id}`} ink={x.id} cls="branch-mark" />
              <span class="branch-name">{x.name}</span>
              <span class="branch-steps" aria-label={`${x.taken} / ${steps}`}>
                {x.tiers.map((_, i) => (
                  <i class={i < x.taken ? 'on' : ''} />
                ))}
              </span>
              {can && h.perkPoints > 0 && <span class="badge" />}
            </button>
          );
        })}
      </div>
      <p class="branch-text">{b.text}</p>
      <ol class="tiers" key={b.id}>
        {b.tiers.map((t, i) => {
          const have = t.perks.some((p) => p.state === 'have');
          const open = t.perks.some((p) => p.state === 'can' || p.state === 'wait');
          const [x, y] = t.perks;
          return (
            <li class={`tier ${have ? 'done' : open ? 'open' : 'shut'}`} style={{ '--i': String(i) }}>
              <span class="tier-mark">
                <b>{ROMAN[i]}</b>
                <small>
                  {t.level} {T.perkLevel}
                </small>
              </span>
              <div class="pair">
                {x && <PerkCard p={x} branch={b.id} sel={sel === x.id} onSel={() => setSel(sel === x.id ? null : x.id)} locked={locked} level={lockLevel(h, b, i)} />}
                <span class="perk-or">{T.perkOr}</span>
                {y && <PerkCard p={y} branch={b.id} sel={sel === y.id} onSel={() => setSel(sel === y.id ? null : y.id)} locked={locked} level={lockLevel(h, b, i)} />}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Why a step is shut: the level it opens at (when that is the reason), else 0 — the step above comes first. */
function lockLevel(h: HeroView, b: PerkBranchView, i: number): number {
  const t = b.tiers[i]!;
  if (h.level < t.level) return t.level;
  return 0;
}

function Stats({ h, locked }: { h: HeroView; locked: boolean }) {
  return (
    <section class="growth-block">
      <h3>
        {T.stats}
        {h.points > 0 && (
          <span class="pill new">
            {T.points}: {h.points}
          </span>
        )}
      </h3>
      {h.points > 0 && <p class="meta">{T.pointsHint}</p>}
      <ul class="stat-cards">
        {h.stats.map((s) => (
          <li class="stat-card">
            <Mark k={`stat_${s.id}`} letter={s.name.slice(0, 1)} cls="stat-mark" />
            <span class="stat-name">
              <b>{s.name}</b>
              <small>{s.text}</small>
            </span>
            <span class="stat-value">{s.value}</span>
            {h.points > 0 && (
              <button class="btn small plus" disabled={locked} aria-label={`+ ${s.name}`} onClick={() => net.send({ c: 'stat', id: s.id })}>
                +
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Skills({ h }: { h: HeroView }) {
  return (
    <section class="growth-block">
      <h3>{T.skills}</h3>
      <ul class="skill-cards">
        {h.skills.map((s) => (
          <li class="skill-card">
            <Mark k={`skill_${s.id}`} letter={s.name.slice(0, 1)} cls="skill-mark" />
            <span class="skill-words">
              <span class="skill-head">
                <b>{s.name}</b>
                <span class="skill-level">{s.level}</span>
              </span>
              <span class="bar skill" role="img" aria-label={`${T.skillNext}: ${Math.round(s.p * 100)}%`}>
                <span style={{ width: `${s.p * 100}%` }} />
              </span>
              <small>{s.text || T.skillNone}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Growth({ v, locked }: { v: PlayerView; locked: boolean }) {
  const h = v.hero;
  return (
    <>
      <Stats h={h} locked={locked} />
      <Tree h={h} locked={locked} />
      <Skills h={h} />
      {h.special.length > 0 && (
        <section class="growth-block">
          <h3>{T.perkSpecial}</h3>
          <ul class="skill-cards special-cards">
            {h.special.map((p) => (
              <li class="skill-card">
                <Mark k={p.id} ink="guard" cls="skill-mark" />
                <span class="skill-words">
                  <b>{p.name}</b>
                  <small>{p.text}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
