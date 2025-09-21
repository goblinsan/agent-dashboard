import { Project } from '../../../shared/types/index.js';
import { getDb } from '../persistence/sqlite.js';

export class SqliteProjectRepository {
  private db = getDb();
  constructor(seedDefault = true) {
    if (seedDefault) {
      // Ensure default project exists (id 'default')
      try {
        const existing = this.db.prepare('SELECT id FROM projects WHERE id=?').get('default');
        if (!existing) {
          const now = Date.now();
          this.db.prepare('INSERT INTO projects (id,name,description,created_at) VALUES (?,?,?,?)')
            .run('default','Default Project','Initial project', now);
        }
      } catch { /* table may not exist pre-migration, ignore */ }
    }
  }
  create(input: { id?: string; name: string; description?: string }): Project {
    const id = input.id || 'P-' + Math.random().toString(36).slice(2,8);
    const now = Date.now();
    try {
      this.db.prepare('INSERT INTO projects (id,name,description,created_at) VALUES (?,?,?,?)')
        .run(id, input.name, input.description || null, now);
    } catch {
      // If table missing, throw a clearer error
      throw new Error('projects_table_missing_run_migrations');
    }
    return { id, name: input.name, description: input.description, createdAt: now };
  }
  getById(id: string): Project | undefined {
    try {
      const row = this.db.prepare('SELECT * FROM projects WHERE id=?').get(id);
      if (!row) return;
      return this.map(row);
    } catch { return; }
  }
  list(includeArchived = false): Project[] {
    try {
      const rows: any[] = this.db.prepare(`SELECT * FROM projects ${includeArchived ? '' : 'WHERE archived_at IS NULL'} ORDER BY created_at ASC`).all();
      return rows.map(r => this.map(r));
    } catch { return []; }
  }
  archive(id: string) {
    if (id === 'default') return; // default can’t be archived
    try { this.db.prepare('UPDATE projects SET archived_at=? WHERE id=? AND archived_at IS NULL').run(Date.now(), id); } catch {}
  }
  restore(id: string) {
    try { this.db.prepare('UPDATE projects SET archived_at=NULL WHERE id=?').run(id); } catch {}
  }
  private map(r: any): Project {
    return { id: r.id, name: r.name, description: r.description || undefined, createdAt: r.created_at, archivedAt: r.archived_at || undefined };
  }
}
