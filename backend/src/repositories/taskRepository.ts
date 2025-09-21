import { Task, TaskStatus } from '../../../shared/types/index.js';

export interface TaskCreateInput { title: string; priority?: string }
export interface TaskRepository {
  create(input: TaskCreateInput): Task;
  getById(id: string): Task | undefined;
  list(filter?: { status?: TaskStatus }): Task[];
  save(task: Task): void; // persist updates
}

export class InMemoryTaskRepository implements TaskRepository {
  private store = new Map<string, Task>();

  create(input: TaskCreateInput): Task {
    const id = 'T-' + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  const task: Task = { id, title: input.title, status: 'todo', version: 1, assignees: [], priority: input.priority as any, rationaleLog: [], createdAt: now, updatedAt: now } as Task;
    this.store.set(id, task);
    return task;
  }
  getById(id: string) { return this.store.get(id); }
  list(filter?: { status?: TaskStatus }): Task[] {
    let values = [...this.store.values()];
    if (filter?.status) values = values.filter(t => t.status === filter.status);
    return values;
  }
  save(task: Task) { this.store.set(task.id, task); }
}
