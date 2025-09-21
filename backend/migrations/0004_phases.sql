-- Phases introduction & task linkage (Slice 1)
-- 1. Create phases table
CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  archived_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_phases_project_order ON phases(project_id, order_index);

-- 2. Add phase_id & phase_priority columns to tasks (nullable for transitional backfill)
ALTER TABLE tasks ADD COLUMN phase_id TEXT;
ALTER TABLE tasks ADD COLUMN phase_priority INTEGER;

-- 3. Seed a default phase for each existing project (deterministic id pattern phase_<projectId>)
INSERT INTO phases (id, project_id, name, order_index, created_at)
SELECT 'phase_' || p.id, p.id, 'Default Phase', 0, strftime('%s','now')*1000
FROM projects p
WHERE NOT EXISTS (SELECT 1 FROM phases ph WHERE ph.project_id = p.id);

-- 4. Backfill tasks missing phase_id to their project's default phase
UPDATE tasks SET phase_id = 'phase_' || project_id WHERE phase_id IS NULL;

-- (NOTE) A later migration will enforce NOT NULL and potentially drop legacy priority in favor of phase_priority.
