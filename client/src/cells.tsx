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
  onPick,
}: {
  icon?: string;
  name: string;
  /** Left out for a single thing, where a count says nothing. */
  n?: number;
  cap?: number;
  cls?: string;
  sel?: boolean;
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
    </>
  );
  if (!onPick) return <li class={`cell ${cls}`}>{body}</li>;
  return (
    <li>
      <button type="button" class={`cell ${cls} ${sel ? 'sel' : ''}`} aria-pressed={sel} onClick={onPick}>
        {body}
      </button>
    </li>
  );
}
