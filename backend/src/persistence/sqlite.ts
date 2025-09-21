// better-sqlite3 is an optionalDependency; declare type lightly and require at runtime.
// eslint-disable-next-line @typescript-eslint/no-var-requires
let BetterSqlite: any;
try { BetterSqlite = require('better-sqlite3'); } catch { /* optional */ }
import path from 'node:path';
import fs from 'node:fs';

let db: any | null = null;

export interface SqliteOptions { file?: string; }

export function getDb(opts: SqliteOptions = {}) {
  if (db) return db;
  const file = opts.file || path.join(process.cwd(), 'backend', 'data', 'agent-dashboard.db');
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!BetterSqlite) throw new Error('better-sqlite3 not installed');
  db = new BetterSqlite(file);
  try { db.pragma('journal_mode = WAL'); } catch {}
  try { db.pragma('foreign_keys = ON'); } catch {}
  return db;
}

export function dbHealthCheck(): boolean {
  try {
    getDb().prepare('SELECT 1').get();
    return true;
  } catch {
    return false;
  }
}
