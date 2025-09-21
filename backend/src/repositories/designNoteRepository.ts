import { nanoid } from 'nanoid';

export interface DesignNoteRecord {
  id: string;
  projectId?: string;
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
  projectId?: string;
}

export class InMemoryDesignNoteRepository {
  private items: DesignNoteRecord[] = [];

  create(input: DesignNoteCreateInput): DesignNoteRecord {
	const rec: DesignNoteRecord = { id: nanoid(10), projectId: input.projectId || 'default', createdAt: Date.now(), ...input };
    this.items.push(rec);
    return rec;
  }

  list(limit = 50, opts?: { includeDeleted?: boolean; projectId?: string }): DesignNoteRecord[] {
    let arr = this.items;
    if (!opts?.includeDeleted) arr = arr.filter(i => !(i as any).deletedAt);
    if (opts?.projectId) arr = arr.filter(i => i.projectId === opts.projectId);
    return arr.slice(-limit);
  }
  getById(id: string, includeDeleted = false): DesignNoteRecord | undefined {
    const dn = this.items.find(i => i.id === id);
    if (!dn) return;
    if (!includeDeleted && (dn as any).deletedAt) return;
    return dn;
  }
  softDelete(id: string) {
    const dn = this.items.find(i => i.id === id);
    if (dn && !(dn as any).deletedAt) (dn as any).deletedAt = Date.now();
  }
  restore(id: string) {
    const dn = this.items.find(i => i.id === id);
    if (dn && (dn as any).deletedAt) delete (dn as any).deletedAt;
  }
}
