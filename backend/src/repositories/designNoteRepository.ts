import { nanoid } from 'nanoid';

export interface DesignNoteRecord {
  id: string;
  title: string;
  context: string;
  decision: string;
  consequences: string;
  createdAt: number;
  supersededBy?: string;
  actor: string;
}

export interface DesignNoteCreateInput {
  title: string;
  context: string;
  decision: string;
  consequences: string;
  actor: string;
}

export class InMemoryDesignNoteRepository {
  private items: DesignNoteRecord[] = [];

  create(input: DesignNoteCreateInput): DesignNoteRecord {
    const rec: DesignNoteRecord = { id: nanoid(10), createdAt: Date.now(), ...input };
    this.items.push(rec);
    return rec;
  }

  list(limit = 50): DesignNoteRecord[] {
    return this.items.slice(-limit);
  }
}
