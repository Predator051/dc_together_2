// Dev helper: bots play to the end of act two (cached per seed in DATA), then act three; prints the pace.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { autoplay, describe as show } from '../tests/harness.js';
import { World } from '../tests/world.js';

const seed = Number(process.argv[2] ?? 1);
const dir = process.env.DATA ?? '.';
const file = `${dir}/act2-${seed}.json`;
let w: World;
if (existsSync(file)) {
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  w = new World(seed);
  w.state = saved.state;
  w.now = saved.now;
} else {
  const a1 = autoplay({}, {}, { seed, until: (x) => !!x.state.flags['p2_act1_done'] && !x.state.scene });
  const a2 = autoplay({}, {}, { from: a1.world, until: (x) => !!x.state.flags['p2_act2_done'] && !x.state.scene, maxSteps: 150000, stallLimit: 15000 });
  if (!a2.done) throw new Error(`act two: ${a2.reason}\n${show(a2.world)}`);
  w = a2.world;
  writeFileSync(file, JSON.stringify({ state: w.state, now: w.now }));
}
const start = w.now;
const careless = process.argv[3];
const r = autoplay(careless === 'p1' ? { careless: true } : {}, careless === 'p2' ? { careless: true, seed: 5 } : {}, {
  from: w,
  until: (x) => !!x.state.flags['p2_act3_done'] && !x.state.scene,
  maxSteps: Number(process.env.STEPS ?? 200000),
  stallLimit: 20000,
});
console.log('done', r.done, r.reason ?? '', 'minutes', ((r.world.now - start) / 60000).toFixed(1), 'fights', r.fights, 'defeats', r.defeats);
for (const t of r.timeline) console.log(`  ${(t.at / 60000).toFixed(1).padStart(6)} ${t.scene}`);
if (!r.done) console.log(show(r.world));
console.log('levels', r.world.state.players.p1.level, r.world.state.players.p2.level, 'residents', Object.keys(r.world.state.residents).length);
if (!r.done && r.world.state.scene) {
  for (const pid of ['p1', 'p2'] as const) {
    const v = r.world.view(pid);
    console.log(pid, JSON.stringify({ kind: v.scene?.kind, waiting: v.scene?.waiting, paused: v.scene?.paused, delve: v.scene?.delve && { room: v.scene.delve.room, light: v.scene.delve.light, exits: v.scene.delve.exits, acts: v.scene.delve.acts } }));
  }
  console.log(JSON.stringify(r.world.state.scene.delve));
}
const before = JSON.parse(readFileSync(file, 'utf8')).state.bestiary as Record<string, { beaten: number; seen: number }>;
const after = r.world.state.bestiary;
console.log('beaten in act 3:', Object.entries(after).map(([k, b]) => `${k}:${b.beaten - (before[k]?.beaten ?? 0)}/${b.seen - (before[k]?.seen ?? 0)}`).join(' '));
