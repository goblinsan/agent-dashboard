import { randomUUID } from 'node:crypto';
import { getDb } from '../persistence/sqlite.js';
import { Task, BugReport, StatusUpdate, DesignNote } from '../../../shared/types/index.js';

const now = () => Date.now();

function parseJson<T>(v: any, fallback: T): T {
  if (!v) return fallback;
  try { return JSON.parse(v); } catch { return fallback; }
}

export class SqliteTaskRepository {
  private db = getDb();
  create(data: { title: string; priority?: string; projectId?: string; phaseId?: string }): Task {
    const id = 'T-' + Math.random().toString(36).slice(2,8);
    const ts = now();
    const projectId = (data as any).projectId || 'default';
    const task: Task = { id, projectId, phaseId: (data as any).phaseId, title: data.title, status: 'todo', version: 1, assignees: [], priority: data.priority as any, rationaleLog: [], createdAt: ts, updatedAt: ts } as Task;
    // Attempt insert with project_id if column exists; fallback silently if not (pre-migration runtime)
    try {
      // Try including phase columns if present
      try {
        this.db.prepare(`INSERT INTO tasks (id,title,status,version,priority,assignees,rationale_log,created_at,updated_at,project_id,phase_id,phase_priority) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
          .run(task.id, task.title, task.status, task.version, task.priority || null, JSON.stringify(task.assignees), JSON.stringify(task.rationaleLog), task.createdAt, task.updatedAt, projectId, task.phaseId || null, null);
      } catch {
        this.db.prepare(`INSERT INTO tasks (id,title,status,version,priority,assignees,rationale_log,created_at,updated_at,project_id) VALUES (?,?,?,?,?,?,?,?,?,?)`)
          .run(task.id, task.title, task.status, task.version, task.priority || null, JSON.stringify(task.assignees), JSON.stringify(task.rationaleLog), task.createdAt, task.updatedAt, projectId);
      }
    } catch {
      this.db.prepare(`INSERT INTO tasks (id,title,status,version,priority,assignees,rationale_log,created_at,updated_at) VALUES (?,?,?,?,?,?,?, ?, ?)`)
        .run(task.id, task.title, task.status, task.version, task.priority || null, JSON.stringify(task.assignees), JSON.stringify(task.rationaleLog), task.createdAt, task.updatedAt);
    }
    return task;
  }
  getById(id: string, includeDeleted = false): Task | undefined {
    const row = this.db.prepare(`SELECT * FROM tasks WHERE id=?${includeDeleted ? '' : ' AND deleted_at IS NULL'}`).get(id);
    if (!row) return;
    return this.map(row);
  }
  list(filter?: { status?: Task['status']; includeDeleted?: boolean; projectId?: string }): Task[] {
    let sql = 'SELECT * FROM tasks';
    const params: any[] = [];
    const clauses: string[] = [];
    if (filter?.status) { clauses.push('status=?'); params.push(filter.status); }
    if (!filter?.includeDeleted) { clauses.push('deleted_at IS NULL'); }
    if (filter?.projectId) { clauses.push('project_id=?'); params.push(filter.projectId); }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    const rows: any[] = this.db.prepare(sql).all(...params);
    return rows.map((r: any) => this.map(r));
  }
  save(task: Task) {
    task.updatedAt = now();
    this.db.prepare(`UPDATE tasks SET title=?, status=?, version=?, priority=?, assignees=?, rationale_log=?, updated_at=? WHERE id=?`).run(
      task.title, task.status, task.version, task.priority || null, JSON.stringify(task.assignees), JSON.stringify(task.rationaleLog), task.updatedAt, task.id
    );
  }
  softDelete(id: string) { this.db.prepare('UPDATE tasks SET deleted_at=? WHERE id=? AND deleted_at IS NULL').run(Date.now(), id); }
  restore(id: string) { this.db.prepare('UPDATE tasks SET deleted_at=NULL WHERE id=?').run(id); }
  private map(r: any): Task {
    return { id: r.id, projectId: r.project_id || 'default', phaseId: r.phase_id || undefined, phasePriority: r.phase_priority || undefined, title: r.title, status: r.status, version: r.version, assignees: parseJson<string[]>(r.assignees, []), priority: r.priority || undefined, rationaleLog: parseJson<string[]>(r.rationale_log, []), createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at || undefined } as Task;
  }
  setPhase(taskId: string, phaseId: string, phasePriority: number) {
    try {
      this.db.prepare('UPDATE tasks SET phase_id=?, phase_priority=?, updated_at=? WHERE id=?')
        .run(phaseId, phasePriority, Date.now(), taskId);
      const row = this.db.prepare('SELECT * FROM tasks WHERE id=?').get(taskId);
      if (!row) return;
      return this.map(row);
    } catch { return; }
  }
}

export class SqliteBugRepository {
  private db = getDb();
  create(data: { title: string; severity: 'low'|'medium'|'high'|'critical'; reproSteps: string[]; taskId?: string; proposedFix?: string; projectId?: string }): BugReport {
    const id = 'B-' + Math.random().toString(36).slice(2,8);
    const ts = now();
    const projectId = (data as any).projectId || 'default';
    const bug: BugReport = { id, projectId, title: data.title, severity: data.severity, description: undefined, status: 'open', linkedTaskIds: data.taskId ? [data.taskId] : [], reproSteps: data.reproSteps, proposedFix: data.proposedFix, createdAt: ts, updatedAt: ts, reporter: undefined, version: 1 } as BugReport;
    try {
      this.db.prepare(`INSERT INTO bugs (id,title,severity,status,repro_steps,proposed_fix,linked_task_ids,version,created_at,updated_at,project_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(
        bug.id, bug.title, bug.severity, bug.status, JSON.stringify(bug.reproSteps), bug.proposedFix || null, JSON.stringify(bug.linkedTaskIds), bug.version, bug.createdAt, bug.updatedAt, projectId
      );
    } catch {
      this.db.prepare(`INSERT INTO bugs (id,title,severity,status,repro_steps,proposed_fix,linked_task_ids,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(
        bug.id, bug.title, bug.severity, bug.status, JSON.stringify(bug.reproSteps), bug.proposedFix || null, JSON.stringify(bug.linkedTaskIds), bug.version, bug.createdAt, bug.updatedAt
      );
    }
    return bug;
  }
  list(opts?: { includeDeleted?: boolean; projectId?: string }): BugReport[] {
  let sql = 'SELECT * FROM bugs';
  const clauses: string[] = [];
  const params: any[] = [];
  if (!opts?.includeDeleted) clauses.push('deleted_at IS NULL');
  if (opts?.projectId) { clauses.push('project_id=?'); params.push(opts.projectId); }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  const rows: any[] = this.db.prepare(sql).all(...params);
  return rows.map((r: any) => this.map(r));
  }
  getById(id: string, includeDeleted = false): BugReport | undefined {
    const row = this.db.prepare(`SELECT * FROM bugs WHERE id=?${includeDeleted ? '' : ' AND deleted_at IS NULL'}`).get(id);
    if (!row) return;
    return this.map(row);
  }
  save(bug: BugReport) {
    bug.updatedAt = now();
    this.db.prepare(`UPDATE bugs SET title=?, severity=?, status=?, repro_steps=?, proposed_fix=?, linked_task_ids=?, version=?, updated_at=? WHERE id=?`).run(
      bug.title, bug.severity, bug.status, JSON.stringify(bug.reproSteps), bug.proposedFix || null, JSON.stringify(bug.linkedTaskIds), bug.version, bug.updatedAt, bug.id
    );
  }
  softDelete(id: string) { this.db.prepare('UPDATE bugs SET deleted_at=? WHERE id=? AND deleted_at IS NULL').run(Date.now(), id); }
  restore(id: string) { this.db.prepare('UPDATE bugs SET deleted_at=NULL WHERE id=?').run(id); }
  private map(r: any): BugReport {
    return { id: r.id, projectId: r.project_id || 'default', title: r.title, severity: r.severity, status: r.status, reproSteps: parseJson<string[]>(r.repro_steps, []), proposedFix: r.proposed_fix || undefined, linkedTaskIds: parseJson<string[]>(r.linked_task_ids, []), version: r.version, createdAt: r.created_at, updatedAt: r.updated_at, deletedAt: r.deleted_at || undefined } as BugReport;
  }
}

export class SqliteStatusUpdateRepository {
  private db = getDb();
  create(data: { actor: string; message: string; taskId?: string; projectId?: string }): StatusUpdate {
    const id = 'SU-' + Math.random().toString(36).slice(2,10);
    const createdAt = now();
    const projectId = (data as any).projectId || 'default';
    try {
      this.db.prepare(`INSERT INTO status_updates (id,actor,message,task_id,created_at,project_id) VALUES (?,?,?,?,?,?)`).run(
        id, data.actor, data.message, data.taskId || null, createdAt, projectId
      );
    } catch {
      this.db.prepare(`INSERT INTO status_updates (id,actor,message,task_id,created_at) VALUES (?,?,?,?,?)`).run(
        id, data.actor, data.message, data.taskId || null, createdAt
      );
    }
    return { id, projectId, actor: data.actor, message: data.message, taskId: data.taskId, createdAt } as StatusUpdate;
  }
  list(limit = 50, taskId?: string, opts?: { projectId?: string }): StatusUpdate[] {
    let sql = 'SELECT * FROM status_updates';
    const clauses: string[] = [];
    const params: any[] = [];
    if (taskId) { clauses.push('task_id=?'); params.push(taskId); }
    if (opts?.projectId) { clauses.push('project_id=?'); params.push(opts.projectId); }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    sql += ' ORDER BY created_at ASC';
    const rows: any[] = this.db.prepare(sql).all(...params);
    return rows.slice(-limit).map(r => this.map(r));
  }
  private map(r: any): StatusUpdate {
    return { id: r.id, projectId: r.project_id || 'default', actor: r.actor, message: r.message, taskId: r.task_id || undefined, createdAt: r.created_at } as StatusUpdate;
  }
}

export class SqliteDesignNoteRepository {
  private db = getDb();
  create(data: { title: string; context: string; decision: string; consequences: string; actor: string; projectId?: string }): DesignNote {
    const id = 'DN-' + Math.random().toString(36).slice(2,10);
    const createdAt = now();
    const projectId = (data as any).projectId || 'default';
    try {
      this.db.prepare(`INSERT INTO design_notes (id,title,context,decision,consequences,actor,created_at,project_id) VALUES (?,?,?,?,?,?,?,?)`).run(
        id, data.title, data.context, data.decision, data.consequences, data.actor, createdAt, projectId
      );
    } catch {
      this.db.prepare(`INSERT INTO design_notes (id,title,context,decision,consequences,actor,created_at) VALUES (?,?,?,?,?,?,?)`).run(
        id, data.title, data.context, data.decision, data.consequences, data.actor, createdAt
      );
    }
    return { id, projectId, title: data.title, context: data.context, decision: data.decision, consequences: data.consequences, actor: data.actor, createdAt } as DesignNote;
  }
  list(limit = 50, opts?: { includeDeleted?: boolean; projectId?: string }): DesignNote[] {
    let sql = 'SELECT * FROM design_notes';
    const clauses: string[] = [];
    const params: any[] = [];
    if (!opts?.includeDeleted) clauses.push('deleted_at IS NULL');
    if (opts?.projectId) { clauses.push('project_id=?'); params.push(opts.projectId); }
    if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
    sql += ' ORDER BY created_at ASC';
    const rows: any[] = this.db.prepare(sql).all(...params);
    return rows.slice(-limit).map(r => this.map(r));
  }
  softDelete(id: string) { this.db.prepare('UPDATE design_notes SET deleted_at=? WHERE id=? AND deleted_at IS NULL').run(Date.now(), id); }
  restore(id: string) { this.db.prepare('UPDATE design_notes SET deleted_at=NULL WHERE id=?').run(id); }
  private map(r: any): DesignNote {
    return { id: r.id, projectId: r.project_id || 'default', title: r.title, context: r.context, decision: r.decision, consequences: r.consequences, actor: r.actor, createdAt: r.created_at, supersededBy: r.superseded_by || undefined, deletedAt: r.deleted_at || undefined } as DesignNote;
  }
}
