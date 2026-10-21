import { mkdtempSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { content } from '../content/index.js';
import { STATE_VERSION } from '../shared/src/state.js';
import { newWorld } from '../server/src/engine/index.js';
import { GameServer } from '../server/src/game-server.js';
import { extractLegacy, isPartOneWorld, legacyFlags } from '../server/src/legacy.js';
import { MigrationError, migrateState, type Migration } from '../server/src/migrations.js';
import { Storage } from '../server/src/storage.js';
import { autoplay } from './harness.js';

/** A world as part one leaves it (only what the import reads). */
function partOne(ending = 1): Record<string, unknown> {
  return {
    version: 3,
    flags: {
      [`ending_${ending}`]: 1,
      a5_done: 1,
      a1_panas_stays: 1,
      a5_panas_goes: 1,
      a3_onysym_left: 1,
      a4_hammer: 1,
      a5_savka_woke: 1,
      rescued: 52,
      'done:scn_01': 1,
      beat_x: 1,
    },
    players: {
      p1: { joined: true, name: 'Марко', gender: 'm', role: 'hunter', flags: { bg_sang: 1, other: 1 } },
      p2: { joined: true, name: 'Оксана', gender: 'f', role: 'maker', flags: { bg_home: 1 } },
    },
    npcs: { npc_04: { met: true, rel: 3 } },
  };
}

describe('world state migrations', () => {
  it('current version passes through unchanged and normalises runtime fields', () => {
    const s = newWorld(content, 1, 0);
    s.players.p1.online = true;
    const { state, migrated } = migrateState(JSON.parse(JSON.stringify(s)), content, 5);
    expect(migrated).toBe(false);
    expect(state.players.p1.online).toBe(false);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.part).toBe(2);
  });

  it('applies a chain of migrations in order', () => {
    const registry: Record<number, Migration> = {
      10: (x) => ({ ...x, version: 11, renamed: x.old }),
      11: (x) => ({ ...x, version: 12, flags: { ...x.flags, migrated_twice: 1 } }),
    };
    const old = { ...newWorld(content, 1, 0), version: 10, old: 'value' } as never;
    const { state, from } = migrateState(old, content, 0, registry, 12);
    expect(from).toBe(10);
    expect(state.version).toBe(12);
    expect((state as unknown as { renamed: string }).renamed).toBe('value');
    expect(state.flags['migrated_twice']).toBe(1);
  });

  it('rejects worlds from a newer server and missing steps', () => {
    const s = { ...newWorld(content, 1, 0), version: STATE_VERSION + 5 };
    expect(() => migrateState(s, content, 0)).toThrow(MigrationError);
    const t = { ...newWorld(content, 1, 0), version: 10 };
    expect(() => migrateState(t, content, 0, {}, 11)).toThrow(MigrationError);
  });

  it('a part-two world missing newer hero fields gets them, nobody stays stuck in a vanished fight', () => {
    const s = newWorld(content, 1, 0) as unknown as Record<string, any>;
    delete s.players.p1.regenAt;
    delete s.players.p1.skills;
    s.players.p2.fight = 77;
    s.fights = [{ id: 77, foes: [{ enemy: 'e_gone' }], party: ['p2'] }];
    const { state } = migrateState(JSON.parse(JSON.stringify(s)), content, 0);
    expect(state.players.p1.regenAt).toBe(0);
    expect(state.players.p1.skills.melee).toBe(0);
    expect(state.fights).toEqual([]);
    expect(state.players.p2.fight).toBeNull();
  });

  it('drops an in-progress scene that no longer exists, keeping the world playable', () => {
    const s = newWorld(content, 1, 0);
    s.scene = { id: 'scn_removed', node: 'n1', paused: false, ready: {}, picks: {}, used: {}, trail: [], combat: null, startedAt: 0 };
    const { state } = migrateState(JSON.parse(JSON.stringify(s)), content, 0);
    expect(state.scene).toBeNull();
  });

  it('a mid-game world saved to SQLite loads back identically', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bezgomin-'));
    const db = join(dir, 'world.db');
    const r = autoplay({}, {}, { seed: 4, until: (w) => !!w.state.flags['done:s_07'] });
    expect(r.done).toBe(true);
    const st = new Storage(db);
    const live = r.world.state;
    st.saveWorld(live.version, JSON.stringify(live));
    st.close();

    const st2 = new Storage(db);
    const gs = new GameServer({ content, storage: st2, clock: () => 123 });
    expect(gs.state.flags).toEqual(live.flags);
    expect(gs.state.players.p1.level).toBe(live.players.p1.level);
    expect(gs.state.players.p2.equip).toEqual(live.players.p2.equip);
    expect(gs.state.meta.day).toBe(live.meta.day);
    st2.backupTo(join(dir, 'b.db'));
    expect(existsSync(join(dir, 'b.db'))).toBe(true);
    st2.close();
  });

  it('archives the old state before migrating and saves the new one', () => {
    const st = new Storage(':memory:');
    const old = { ...newWorld(content, 1, 0), version: STATE_VERSION - 1 };
    st.saveWorld(old.version, JSON.stringify(old));
    const registry: Record<number, Migration> = { [STATE_VERSION - 1]: (x) => ({ ...x, version: STATE_VERSION }) };
    const gs = new GameServer({ content, storage: st, migrations: registry });
    expect(st.archiveCount()).toBe(1);
    expect(st.loadWorld()!.version).toBe(STATE_VERSION);
    expect(gs.state.version).toBe(STATE_VERSION);
    st.close();
  });

  it('refuses to start on a world it cannot migrate instead of overwriting it', () => {
    const st = new Storage(':memory:');
    st.saveWorld(STATE_VERSION + 1, JSON.stringify({ ...newWorld(content, 1, 0), version: STATE_VERSION + 1, part: 2 }));
    expect(() => new GameServer({ content, storage: st })).toThrow(MigrationError);
    expect(st.loadWorld()!.version).toBe(STATE_VERSION + 1);
    st.close();
  });
});

describe('carrying part one over', () => {
  it('recognises a part-one world and reads what matters', () => {
    expect(isPartOneWorld(partOne())).toBe(true);
    expect(isPartOneWorld(newWorld(content, 1, 0))).toBe(false);
    const l = extractLegacy(partOne(1))!;
    expect(l.ending).toBe(1);
    expect(l.rescued).toBe(52);
    expect(l.players.map((p) => [p.name, p.role])).toEqual([
      ['Марко', 'hunter'],
      ['Оксана', 'maker'],
    ]);
    expect(l.players[0]!.flags).toEqual({ bg_sang: 1 });
    expect(l.flags.beat_x).toBeUndefined();
    const f = legacyFlags(l);
    expect(f.legacy_ending_1).toBe(1);
    expect(f.legacy_a4_hammer).toBe(1);
    expect(f.legacy_savka_alive).toBe(1);
    expect(f.legacy_panas_alive).toBeUndefined();
  });

  it('a database holding part one starts part two from it: heroes waiting, the old world archived', () => {
    const st = new Storage(':memory:');
    st.saveWorld(3, JSON.stringify(partOne(3)));
    const gs = new GameServer({ content, storage: st, clock: () => 1000 });
    expect(gs.state.part).toBe(2);
    expect(gs.state.version).toBe(STATE_VERSION);
    expect(st.archiveCount()).toBe(1);
    const p1 = gs.state.players.p1;
    expect(p1.joined).toBe(true);
    expect(p1.name).toBe('Марко');
    expect(p1.role).toBe('hunter');
    expect(p1.stats.agi).toBe(content.hero.base.hunter.agi);
    expect(p1.flags.bg_sang).toBe(1);
    expect(p1.at).toBe(content.start.area);
    expect(gs.state.flags.legacy_ending_3).toBe(1);
    expect(gs.state.flags.legacy).toBe(1);
    st.close();
  });

  it('without part one a middle way is assumed and the heroes join anew', () => {
    const st = new Storage(':memory:');
    const gs = new GameServer({ content, storage: st });
    expect(gs.state.players.p1.joined).toBe(false);
    expect(gs.state.flags.legacy_ending_2).toBe(1);
    expect(gs.state.flags.legacy).toBeUndefined();
    st.close();
  });

  it('every ending of part one gives a playable opening', () => {
    for (const ending of [1, 2, 3, 4]) {
      const st = new Storage(':memory:');
      const gs = new GameServer({ content, storage: st, legacy: partOne(ending) });
      expect(gs.state.flags[`legacy_ending_${ending}`]).toBe(1);
      st.close();
    }
  });
});
