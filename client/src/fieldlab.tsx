// Dev only (served by `npm run dev:client` at /fieldlab.html, never built): fields made for every kind of
// place, painted as in a fight — to judge the generator and the painter by eye.
import { render } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { SCENES } from '../../shared/src/pictures.js';
import { Rng } from '../../shared/src/rng.js';
import type { Field } from '../../shared/src/field.js';
import { makeField } from '../../server/src/engine/terrain.js';
import { paintField } from './fieldpaint.js';
import './styles.css';

function Painted({ f }: { f: Field }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void paintField(ref.current, f, 44);
  }, [f]);
  return <canvas ref={ref} style={{ width: `${f.w * 44}px`, height: `${f.h * 44}px`, borderRadius: '6px' }} />;
}

const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1);
const only = new URLSearchParams(location.search).get('scene');
const rng = new Rng(seed);
const rows = (only ? [only] : [...SCENES]).map((s) => ({ s, fields: [0, 1, 2].map(() => makeField(rng, s as (typeof SCENES)[number])) }));

render(
  <div style={{ padding: '16px', display: 'grid', gap: '18px', background: '#1d1710', minHeight: '100vh' }}>
    {rows.map((r) => (
      <section>
        <h3 style={{ margin: '0 0 6px', color: '#e6d9bc', fontFamily: 'sans-serif' }}>{r.s}</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {r.fields.map((f) => (
            <Painted f={f} />
          ))}
        </div>
      </section>
    ))}
  </div>,
  document.getElementById('app')!,
);
