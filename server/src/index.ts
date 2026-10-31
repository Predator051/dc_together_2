import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { content } from '../../content/index.js';
import { pasts, sharedPast } from '../../content/past/index.js';
import { startServer } from './main.js';
import { pruneBackups, Storage } from './storage.js';

const dataDir = resolve(process.env.DATA_DIR ?? './data');
const dbPath = join(dataDir, 'world.db');
const port = Number(process.env.PORT ?? 8080);
const clientDir = resolve(process.env.CLIENT_DIR ?? './client/dist');
const inviteCode = process.env.INVITE_CODE?.trim() || undefined;
// Part one's world, if given: its heroes and ending come along into a new world.
const legacyPath = process.env.LEGACY_DB?.trim() || join(dataDir, 'part1.db');

function log(msg: string): void {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// Snapshot the world before anything (including migrations) touches it.
try {
  const pre = new Storage(dbPath);
  if (pre.loadWorld()) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    pre.backupTo(join(dataDir, 'backups', `auto-${stamp}.db`));
    pruneBackups(join(dataDir, 'backups'), 'auto-', 10);
  }
  pre.close();
} catch (e) {
  log(`Startup backup failed: ${(e as Error).message}`);
}

let legacy: unknown;
if (existsSync(legacyPath)) {
  try {
    const old = new Storage(legacyPath);
    const w = old.loadWorld();
    old.close();
    if (w) legacy = JSON.parse(w.json);
    log(`Part one world found at ${legacyPath}`);
  } catch (e) {
    log(`Could not read part one world: ${(e as Error).message}`);
  }
}

// PAST_DEMO=1 (a local check of the way into memories): the main story stands in for both pasts
const demo = process.env.PAST_DEMO ? { hunter: { ...content, pastTitle: 'Спогади (перевірка)' }, maker: { ...content, pastTitle: 'Спогади (перевірка)' } } : undefined;
const running = await startServer({ content, dbPath, port, clientDir, inviteCode, log, legacy, pasts: demo ?? pasts, pastShared: sharedPast });
log(`Server listening on port ${running.port}`);
log(`Invite code: ${running.game.formattedCode}`);

let stopping = false;
async function shutdown(): Promise<void> {
  if (stopping) return;
  stopping = true;
  log('Shutting down…');
  await running.stop();
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// anything that slips past the guards is logged; the world stays up and saved
process.on('uncaughtException', (e) => log(`Uncaught: ${e.stack ?? e}`));
process.on('unhandledRejection', (e) => log(`Unhandled: ${(e as Error)?.stack ?? e}`));
