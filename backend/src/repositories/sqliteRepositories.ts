import { randomUUID } from 'node:crypto';
import { getDb } from '../persistence/sqlite.js';
import { Task, BugReport } from '../../../shared/types/index.js';

const now = () => Date.now();

function parseJson<T>(v: any, fallback: T): T {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

export class SqliteTaskRepository {
  private db = getDb();
  create(data: { title: string; priority?: string }): Task {
    const id = 'T-' + Math.random().toString(36).slice(2,8);
    const ts = now();
    const task: Task = { id, title: data.title, status: 'todo', version: 1, assignees: [], priority: data.priority as any, rationaleLog: [], createdAt: ts, updatedAt: ts } as Task;
    this.db.prepare(`INSERT INTO tasks (id,title,status,version,priority,assignees,rationale_log,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?, ?)`)
      .run(task.id, task.title, task.status, task.version, task.priority || null, JSON.stringify(task.assignees), JSON.stringify(task.rationaleLog), task.createdAt, task.updatedAt);
    return task;
  }
  getById(id: string): Task | undefined {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id=?').get(id);
    if (!row) return;
    return this.map(row);
  }
  list(filter?: { status?: Task['status'] }): Task[] {
    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    if (filter?.status) { sql += ' WHERE status=?'; params.push(filter.status); }
  const rows: any[] = this.db.prepare(sql).all(...params);
  return rows.map((r: any) => this.map(r));
  }
  save(task: Task) {
    task.updatedAt = now();
    this.db.prepare(`UPDATE tasks SET title=?, status=?, version=?, priority=?, assignees=?, rationale_log=?, updated_at=? WHERE id=?`).run(
      task.title, task.status, task.version, task.priority || null, JSON.stringify(task.assignees), JSON.stringify(task.rationaleLog), task.updatedAt, task.id
    );
  }
  private map(r: any): Task {
    return { id: r.id, title: r.title, status: r.status, version: r.version, assignees: parseJson<string[]>(r.assignees, []), priority: r.priority || undefined, rationaleLog: parseJson<string[]>(r.rationale_log, []), createdAt: r.created_at, updatedAt: r.updated_at } as Task;
  }
}

export class SqliteBugRepository {
  private db = getDb();
  create(data: { title: string; severity: 'low'|'medium'|'high'|'critical'; reproSteps: string[]; taskId?: string; proposedFix?: string }): BugReport {
    const id = 'B-' + Math.random().toString(36).slice(2,8);
    const ts = now();
    const bug: BugReport = { id, title: data.title, severity: data.severity, description: undefined, status: 'open', linkedTaskIds: data.taskId ? [data.taskId] : [], reproSteps: data.reproSteps, proposedFix: data.proposedFix, createdAt: ts, updatedAt: ts, reporter: undefined, version: 1 } as BugReport;
    this.db.prepare(`INSERT INTO bugs (id,title,severity,status,repro_steps,proposed_fix,linked_task_ids,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
      bug.id, bug.title, bug.severity, bug.status, JSON.stringify(bug.reproSteps), bug.proposedFix || null, JSON.stringify(bug.linkedTaskIds), bug.version, bug.createdAt, bug.updatedAt
    );
    return bug;
  }
  list(): BugReport[] {
  const rows: any[] = this.db.prepare('SELECT * FROM bugs').all();
  return rows.map((r: any) => this.map(r));
  }
  getById(id: string): BugReport | undefined {
    const row = this.db.prepare('SELECT * FROM bugs WHERE id=?').get(id);
    if (!row) return;
    return this.map(row);
  }
  save(bug: BugReport) {
    bug.updatedAt = now();
    this.db.prepare(`UPDATE bugs SET title=?, severity=?, status=?, repro_steps=?, proposed_fix=?, linked_task_ids=?, version=?, updated_at=? WHERE id=?`).run(
      bug.title, bug.severity, bug.status, JSON.stringify(bug.reproSteps), bug.proposedFix || null, JSON.stringify(bug.linkedTaskIds), bug.version, bug.updatedAt, bug.id
    );
  }
  private map(r: any): BugReport {
    return { id: r.id, title: r.title, severity: r.severity, status: r.status, reproSteps: parseJson<string[]>(r.repro_steps, []), proposedFix: r.proposed_fix || undefined, linkedTaskIds: parseJson<string[]>(r.linked_task_ids, []), version: r.version, createdAt: r.created_at, updatedAt: r.updated_at } as BugReport;
  }
}
