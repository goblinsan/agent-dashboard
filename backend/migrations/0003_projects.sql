-- Projects multi-tenancy introduction
-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL,
  archived_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_projects_created ON projects(created_at);

-- 2. Add project_id columns to existing entity tables with DEFAULT 'default'
ALTER TABLE tasks ADD COLUMN project_id TEXT;
ALTER TABLE bugs ADD COLUMN project_id TEXT;
ALTER TABLE status_updates ADD COLUMN project_id TEXT;
ALTER TABLE design_notes ADD COLUMN project_id TEXT;
ALTER TABLE _audit_log ADD COLUMN project_id TEXT; -- if audit persistence added later (ignore if table absent)

-- 3. Backfill existing rows to 'default' project id
UPDATE tasks SET project_id='default' WHERE project_id IS NULL;
UPDATE bugs SET project_id='default' WHERE project_id IS NULL;
UPDATE status_updates SET project_id='default' WHERE project_id IS NULL;
UPDATE design_notes SET project_id='default' WHERE project_id IS NULL;

-- 4. Seed default project (id='default') if not present
INSERT INTO projects (id,name,description,created_at) VALUES ('default','Default Project','Backfilled default singleton project', strftime('%s','now')*1000)
  ON CONFLICT(id) DO NOTHING;
