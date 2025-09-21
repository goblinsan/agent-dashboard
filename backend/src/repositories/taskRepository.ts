import { Task, TaskStatus } from '../../../shared/types/index.js';

export interface TaskCreateInput { title: string; priority?: string; phaseId?: string }
export interface TaskRepository {
  create(input: TaskCreateInput & { projectId?: string }): Task;
  getById(id: string, includeDeleted?: boolean): Task | undefined;
  list(filter?: { status?: TaskStatus; includeDeleted?: boolean; projectId?: string }): Task[];
  save(task: Task): void; // persist updates
  softDelete?(id: string): void;
  setPhase?(taskId: string, phaseId: string, phasePriority: number): Task | undefined;
}

export class InMemoryTaskRepository implements TaskRepository {
  private store = new Map<string, Task>();

  create(input: TaskCreateInput & { projectId?: string }): Task {
    const id = 'T-' + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
	const task: Task = { id, projectId: input.projectId || 'default', phaseId: input.phaseId, title: input.title, status: 'todo', version: 1, assignees: [], priority: input.priority as any, rationaleLog: [], createdAt: now, updatedAt: now } as Task;
    this.store.set(id, task);
    return task;
  }
  getById(id: string) { return this.store.get(id); }
  list(filter?: { status?: TaskStatus; includeDeleted?: boolean; projectId?: string }): Task[] {
    let values = [...this.store.values()];
    if (!filter?.includeDeleted) values = values.filter(t => !(t as any).deletedAt);
    if (filter?.status) values = values.filter(t => t.status === filter.status);
    if (filter?.projectId) values = values.filter(t => (t as any).projectId === filter.projectId);
    return values;
  }
  save(task: Task) { this.store.set(task.id, task); }
  softDelete(id: string) {
    const t = this.store.get(id);
    if (t && !(t as any).deletedAt) { (t as any).deletedAt = Date.now(); this.store.set(id, t); }
  }
  restore(id: string) {
    const t = this.store.get(id);
    if (t && (t as any).deletedAt) { delete (t as any).deletedAt; this.store.set(id, t); }
  }
  setPhase(taskId: string, phaseId: string, phasePriority: number) {
    const t = this.store.get(taskId);
    if (!t) return;
    (t as any).phaseId = phaseId;
    (t as any).phasePriority = phasePriority;
    t.updatedAt = Date.now();
    this.store.set(taskId, t);
    return t;
  }
}
