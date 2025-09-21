import { BugReport } from '../../../shared/types/index.js';

export interface BugCreateInput { title: string; severity: 'low' | 'medium' | 'high' | 'critical'; reproSteps: string[]; taskId?: string; proposedFix?: string }
export interface BugRepository {
  create(input: BugCreateInput): BugReport;
  list(opts?: { includeDeleted?: boolean }): BugReport[];
  getById(id: string, includeDeleted?: boolean): BugReport | undefined;
  save(bug: BugReport): void;
  softDelete?(id: string): void;
}

export class InMemoryBugRepository implements BugRepository {
  private store = new Map<string, BugReport>();
  create(input: BugCreateInput): BugReport {
    const id = 'B-' + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  const bug: BugReport = { id, projectId: 'default', title: input.title, severity: input.severity as any, description: undefined, status: 'open', linkedTaskIds: input.taskId ? [input.taskId] : [], reproSteps: input.reproSteps, proposedFix: input.proposedFix, createdAt: now, updatedAt: now, reporter: undefined, version: 1 } as BugReport;
    this.store.set(id, bug);
    return bug;
  }
  list(opts?: { includeDeleted?: boolean }): BugReport[] {
    let vals = [...this.store.values()];
    if (!opts?.includeDeleted) vals = vals.filter(b => !(b as any).deletedAt);
    return vals;
  }
  getById(id: string) { return this.store.get(id); }
  save(bug: BugReport) { bug.updatedAt = Date.now(); this.store.set(bug.id, bug); }
  softDelete(id: string) {
    const b = this.store.get(id);
    if (b && !(b as any).deletedAt) { (b as any).deletedAt = Date.now(); this.store.set(id, b); }
  }
  restore(id: string) {
    const b = this.store.get(id);
    if (b && (b as any).deletedAt) { delete (b as any).deletedAt; this.store.set(id, b); }
  }
}
