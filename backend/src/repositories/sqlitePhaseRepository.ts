import { Phase } from '../../../shared/types/index.js';
import { getDb } from '../persistence/sqlite.js';

export class SqlitePhaseRepository {
  private db = getDb();

  create(input: { projectId: string; name: string; description?: string }): Phase {
    const id = 'PH-' + Math.random().toString(36).slice(2, 10);
    const now = Date.now();
    // Determine next order_index
    let orderIndex = 0;
    try {
      const row: any = this.db.prepare('SELECT COUNT(*) as cnt FROM phases WHERE project_id=?').get(input.projectId);
      orderIndex = row?.cnt || 0;
      this.db.prepare('INSERT INTO phases (id, project_id, name, description, order_index, created_at) VALUES (?,?,?,?,?,?)')
        .run(id, input.projectId, input.name, input.description || null, orderIndex, now);
    } catch (e) {
      throw new Error('phases_table_missing_run_migrations');
    }
    return { id, projectId: input.projectId, name: input.name, description: input.description, orderIndex, createdAt: now };
  }

  getById(id: string): Phase | undefined {
    try {
      const row = this.db.prepare('SELECT * FROM phases WHERE id=?').get(id);
      return row ? this.map(row) : undefined;
    } catch { return; }
  }

  list(projectId: string, includeArchived = false): Phase[] {
    try {
      const rows: any[] = this.db.prepare(`SELECT * FROM phases WHERE project_id=? ${includeArchived ? '' : 'AND archived_at IS NULL'} ORDER BY order_index ASC`).all(projectId);
      return rows.map(r => this.map(r));
    } catch { return []; }
  }

  archive(id: string) {
    try { this.db.prepare('UPDATE phases SET archived_at=? WHERE id=? AND archived_at IS NULL').run(Date.now(), id); } catch {}
  }
  restore(id: string) {
    try { this.db.prepare('UPDATE phases SET archived_at=NULL WHERE id=?').run(id); } catch {}
  }
  reorder(updates: { id: string; orderIndex: number }[]) {
    const tx = this.db.transaction((rows: { id: string; orderIndex: number }[]) => {
      for (const r of rows) {
        this.db.prepare('UPDATE phases SET order_index=? WHERE id=?').run(r.orderIndex, r.id);
      }
    });
    try { tx(updates); } catch {}
    // Normalize: reselect by project and reassign dense indices
    try {
      const projects: any[] = this.db.prepare('SELECT DISTINCT project_id FROM phases').all();
      for (const p of projects) {
        const rows: any[] = this.db.prepare('SELECT id FROM phases WHERE project_id=? ORDER BY order_index ASC').all(p.project_id);
        rows.forEach((r, idx) => this.db.prepare('UPDATE phases SET order_index=? WHERE id=?').run(idx, r.id));
      }
    } catch {}
  }

  ensureDefaultPhase(projectId: string, phaseId: string, name = 'Default Phase') {
    try {
      const existing = this.db.prepare('SELECT id FROM phases WHERE project_id=?').get(projectId);
      if (existing) return;
      const now = Date.now();
      this.db.prepare('INSERT INTO phases (id, project_id, name, order_index, created_at) VALUES (?,?,?,?,?)')
        .run(phaseId, projectId, name, 0, now);
    } catch {/* ignore */}
  }

  private map(r: any): Phase {
    return { id: r.id, projectId: r.project_id, name: r.name, description: r.description || undefined, orderIndex: r.order_index, createdAt: r.created_at, archivedAt: r.archived_at || undefined };
  }
}
