// Things laid out as cells, the way a bag is looked into: the mark, how many, the name under it.
// A cell with `onPick` is a button; what can be done with the picked thing shows under the cells.
import { Thing, hasMark } from './items.js';

export function Cell({
  icon,
  name,
  n,
  cap,
  cls = '',
  sel = false,
  id,
  fresh,
  onPick,
}: {
  icon?: string;
  name: string;
  /** Left out for a single thing, where a count says nothing. */
  n?: number;
  cap?: number;
  cls?: string;
  sel?: boolean;
  /** With `fresh`: the thing's id, to take the mark off once it is looked at. */
  id?: string;
  /** How much of it has just come in: a small mark and a "+N" that floats up. */
  fresh?: number;
  onPick?: () => void;
}) {
  const body = (
    <>
      <span class="cell-pic" aria-hidden="true">
        {hasMark(icon) ? <Thing icon={icon} /> : <span class="cell-ph">{name.slice(0, 1)}</span>}
      </span>
      {n !== undefined && (
        <span class="cell-n">
          {n}
          {cap !== undefined && <small>/{cap}</small>}
        </span>
      )}
      <span class="cell-name">{name}</span>
      {fresh !== undefined && (
        <span class="cell-plus" key={fresh} aria-hidden="true">
          +{fresh}
        </span>
      )}
    </>
  );
  if (!onPick)
    return (
      <li class={`cell ${cls} ${fresh ? 'fresh' : ''}`} data-icon={icon} data-fresh={fresh ? id : undefined}>
        {body}
      </li>
    );
  return (
    <li>
      <button type="button" class={`cell ${cls} ${sel ? 'sel' : ''} ${fresh ? 'fresh' : ''}`} data-icon={icon} data-fresh={fresh ? id : undefined} aria-pressed={sel} onClick={onPick}>
        {body}
      </button>
    </li>
  );
}
