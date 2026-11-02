import { join, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { Storage } from '../server/src/storage.js';
import { autoplay } from '../tests/harness.js';

const flag = process.argv[2] ?? 'done:s_09';
const ev = process.argv[3] ?? 'ev_108';
const dataDir = resolve(process.env.DATA_DIR ?? './data');
mkdirSync(dataDir, { recursive: true });
const r = autoplay({}, {}, { seed: 5, until: (w) => !!w.state.flags[flag] && !w.state.scene });
if (!r.done) throw new Error('could not reach ' + flag);
const s = r.world.state;
for (const pid of ['p1', 'p2'] as const) {
  s.players[pid].at = 'a_01';
  s.players[pid].busy = null;
  s.players[pid].fight = null;
  s.players[pid].travel = null as never;
}
s.events ??= { next: {}, last: {}, open: [], uid: 1 };
s.events.open = [{ uid: 500, id: ev, pid: null, area: 'a_01', at: Date.now() }];
s.events.next = { home: Date.now() + 3_600_000, p1: Date.now() + 3_600_000, p2: Date.now() + 3_600_000 };
const st = new Storage(join(dataDir, 'world.db'));
st.saveWorld(s.version, JSON.stringify(s));
st.addSession('dev-p1', 'p1');
st.addSession('dev-p2', 'p2');
st.close();
console.log(`World saved at ${flag} with ${ev} open`);
