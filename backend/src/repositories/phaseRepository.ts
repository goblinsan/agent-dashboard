import { Phase } from '../../../shared/types/index.js';

export interface PhaseCreateInput { projectId: string; name: string; description?: string }
export interface PhaseRepository {
  create(input: PhaseCreateInput): Phase;
  getById(id: string): Phase | undefined;
  list(projectId: string, includeArchived?: boolean): Phase[];
  archive(id: string): void;
  restore(id: string): void;
  reorder(updates: { id: string; orderIndex: number }[]): void;
}

export class InMemoryPhaseRepository implements PhaseRepository {
  private store = new Map<string, Phase>();
  private projectPhaseOrder = new Map<string, string[]>(); // projectId -> ordered phase ids

  create(input: PhaseCreateInput): Phase {
    const existing = this.projectPhaseOrder.get(input.projectId) || [];
    const id = 'PH-' + Math.random().toString(36).slice(2, 10);
    const now = Date.now();
    const phase: Phase = { id, projectId: input.projectId, name: input.name, description: input.description, orderIndex: existing.length, createdAt: now };
    this.store.set(id, phase);
    this.projectPhaseOrder.set(input.projectId, [...existing, id]);
    return phase;
  }
  getById(id: string) { return this.store.get(id); }
  list(projectId: string, includeArchived = false): Phase[] {
    const orderedIds = this.projectPhaseOrder.get(projectId) || [];
    return orderedIds
      .map(id => this.store.get(id)!)
      .filter(p => !!p && (includeArchived || !p.archivedAt))
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }
  archive(id: string) {
    const p = this.store.get(id); if (p && !p.archivedAt) { p.archivedAt = Date.now(); this.store.set(id, p); }
  }
  restore(id: string) {
    const p = this.store.get(id); if (p && p.archivedAt) { delete p.archivedAt; this.store.set(id, p); }
  }
  reorder(updates: { id: string; orderIndex: number }[]) {
    // Update orderIndex values optimistically, then rebuild ordering array by new indices
    const byProject = new Map<string, Phase[]>();
    for (const u of updates) {
      const p = this.store.get(u.id); if (p) { p.orderIndex = u.orderIndex; this.store.set(p.id, p); }
    }
    // Reconstruct per project arrays
    for (const phase of this.store.values()) {
      if (!byProject.has(phase.projectId)) byProject.set(phase.projectId, []);
      byProject.get(phase.projectId)!.push(phase);
    }
    for (const [projectId, phases] of byProject.entries()) {
      const sorted = phases.sort((a, b) => a.orderIndex - b.orderIndex);
      sorted.forEach((p, idx) => { p.orderIndex = idx; this.store.set(p.id, p); });
      this.projectPhaseOrder.set(projectId, sorted.map(p => p.id));
    }
  }
  // Utility for migration backfill to insert deterministic default phase id
  ensureDefaultPhase(projectId: string, phaseId: string, name = 'Default Phase') {
    if (this.list(projectId, true).length > 0) return; // already have at least one
    const now = Date.now();
    const phase: Phase = { id: phaseId, projectId, name, orderIndex: 0, createdAt: now };
    this.store.set(phaseId, phase);
    this.projectPhaseOrder.set(projectId, [phaseId]);
  }
}
