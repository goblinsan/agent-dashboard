import { nanoid } from 'nanoid';

export interface StatusUpdateRecord {
  id: string;
  actor: string;
  taskId?: string;
  message: string;
  createdAt: number;
}

export interface StatusUpdateCreateInput {
  actor: string;
  taskId?: string;
  message: string;
}

export class InMemoryStatusUpdateRepository {
  private items: StatusUpdateRecord[] = [];

  create(input: StatusUpdateCreateInput): StatusUpdateRecord {
    const record: StatusUpdateRecord = { id: nanoid(10), createdAt: Date.now(), ...input };
    this.items.push(record);
    return record;
  }

  list(limit = 50, taskId?: string): StatusUpdateRecord[] {
    const source = taskId ? this.items.filter(i => i.taskId === taskId) : this.items;
    return source.slice(-limit);
  }
}
