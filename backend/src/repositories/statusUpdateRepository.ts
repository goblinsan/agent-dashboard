import { nanoid } from 'nanoid';

export interface StatusUpdateRecord {
  id: string;
  projectId?: string;
  actor: string;
  taskId?: string;
  message: string;
  createdAt: number;
}

export interface StatusUpdateCreateInput {
  actor: string;
  taskId?: string;
  message: string;
  projectId?: string;
}

export class InMemoryStatusUpdateRepository {
  private items: StatusUpdateRecord[] = [];

  create(input: StatusUpdateCreateInput): StatusUpdateRecord {
    const record: StatusUpdateRecord = { id: nanoid(10), projectId: input.projectId || 'default', createdAt: Date.now(), ...input };
    this.items.push(record);
    return record;
  }

  list(limit = 50, taskId?: string, opts?: { projectId?: string }): StatusUpdateRecord[] {
    let source = taskId ? this.items.filter(i => i.taskId === taskId) : this.items;
    if (opts?.projectId) source = source.filter(i => i.projectId === opts.projectId);
    return source.slice(-limit);
  }
}
