import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let db: Database.Database | null = null;

export interface SqliteOptions { file?: string; }

export function getDb(opts: SqliteOptions = {}) {
  if (db) return db;
  const file = opts.file || path.join(process.cwd(), 'backend', 'data', 'agent-dashboard.db');
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
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
