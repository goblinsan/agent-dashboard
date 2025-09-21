import { BugReport } from '../../../shared/types/index.js';

export interface BugCreateInput { title: string; severity: 'low' | 'medium' | 'high' | 'critical'; reproSteps: string[]; taskId?: string; proposedFix?: string }
export interface BugRepository {
  create(input: BugCreateInput): BugReport;
  list(): BugReport[];
  getById(id: string): BugReport | undefined;
  save(bug: BugReport): void;
}

export class InMemoryBugRepository implements BugRepository {
  private store = new Map<string, BugReport>();
  create(input: BugCreateInput): BugReport {
    const id = 'B-' + Math.random().toString(36).slice(2, 8);
  const now = Date.now();
  const bug: BugReport = { id, title: input.title, severity: input.severity as any, description: undefined, status: 'open', linkedTaskIds: input.taskId ? [input.taskId] : [], reproSteps: input.reproSteps, proposedFix: input.proposedFix, createdAt: now, updatedAt: now, reporter: undefined, version: 1 } as BugReport;
    this.store.set(id, bug);
    return bug;
  }
  list(): BugReport[] { return [...this.store.values()]; }
  getById(id: string) { return this.store.get(id); }
  save(bug: BugReport) { bug.updatedAt = Date.now(); this.store.set(bug.id, bug); }
}
