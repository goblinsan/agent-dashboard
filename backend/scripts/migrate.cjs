#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const migrationsDir = path.join(process.cwd(), 'backend', 'migrations');
const dbFile = process.env.DB_FILE || path.join(process.cwd(), 'backend', 'data', 'agent-dashboard.db');
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.prepare(`CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
)`).run();

const applied = new Set(db.prepare('SELECT name FROM _migrations').all().map(r => r.name));
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

for (const file of files) {
  if (applied.has(file)) continue;
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name, applied_at) VALUES (?, ?)').run(file, Date.now());
  });
  tx();
  console.log('Applied migration', file);
}
console.log('Migrations complete');
