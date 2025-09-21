-- Initial schema
CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  version INTEGER NOT NULL,
  priority TEXT,
  assignees TEXT, -- JSON array
  rationale_log TEXT, -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

CREATE TABLE IF NOT EXISTS bugs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL,
  repro_steps TEXT, -- JSON array
  proposed_fix TEXT,
  linked_task_ids TEXT, -- JSON array
  version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON bugs(severity);

CREATE TABLE IF NOT EXISTS status_updates (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  task_id TEXT,
  message TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_status_updates_task ON status_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_status_updates_created ON status_updates(created_at);

CREATE TABLE IF NOT EXISTS design_notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  context TEXT NOT NULL,
  decision TEXT NOT NULL,
  consequences TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  superseded_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_design_notes_created ON design_notes(created_at);
