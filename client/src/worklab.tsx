// Dev only (served by `npm run dev:client` at /worklab.html, never built): every motion of the work
// vignette at once, over and over — to judge them by eye. `?ms=` sets the length of one run.
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { WorkVerb } from '../../shared/src/work.js';
import { WORK_PROGRAMS, loopWork } from './workfx.js';
import './styles.css';

/** A thing each motion is likely to make (only for the lab). */
const SAMPLE: Partial<Record<WorkVerb, string>> = {
  forge: 'knife', chop: 'wood', carve: 'oar', rope: 'rope', sew: 'jacket', steam: 'borscht', whet: 'sickle', fish: 'driedfish',
  salt: 'meat', sift: 'millet', rummage: 'cloth', bowl: 'millet', wax: 'wax', hive: 'honey', trade: 'salt', arrow: 'arrow', string: 'bow',
  twigs: 'wood', snare: 'hide', pick: 'garlic', harvest: 'beet', plant: 'g_sprout', scrap: 'iron', care: 'brew',
};
const ms = Number(new URLSearchParams(location.search).get('ms') ?? 6000);

function Cell({ verb }: { verb: WorkVerb }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? loopWork(ref.current, { verb, ...(SAMPLE[verb] ? { icon: SAMPLE[verb] } : {}) }, ms) : undefined), []);
  return (
    <figure style={{ margin: 0, textAlign: 'center' }}>
      <div ref={ref} class="workfx big on" style={{ position: 'relative', left: 'auto', top: 'auto', transform: 'none', '--wf': '200px' }} />
      <figcaption style={{ color: '#a89777', fontFamily: 'sans-serif', fontSize: '13px', marginTop: '4px' }}>{verb}</figcaption>
    </figure>
  );
}

render(
  <div style={{ padding: '16px', display: 'flex', flexWrap: 'wrap', gap: '14px', background: 'var(--page)', minHeight: '100vh' }}>
    {(Object.keys(WORK_PROGRAMS) as WorkVerb[]).map((v) => (
      <Cell key={v} verb={v} />
    ))}
  </div>,
  document.getElementById('app')!,
);
