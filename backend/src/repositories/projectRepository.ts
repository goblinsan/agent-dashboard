import { Project } from '../../../shared/types/index.js';

export interface ProjectCreateInput { id?: string; name: string; description?: string }
export interface ProjectRepository {
  create(input: ProjectCreateInput): Project;
  getById(id: string): Project | undefined;
  list(includeArchived?: boolean): Project[];
  archive(id: string): void;
  restore(id: string): void;
}

export class InMemoryProjectRepository implements ProjectRepository {
  private store = new Map<string, Project>();
  constructor(seedDefault = true) {
    if (seedDefault) {
      const now = Date.now();
      const def: Project = { id: 'default', name: 'Default Project', description: 'Initial project', createdAt: now };
      this.store.set(def.id, def);
    }
  }
  create(input: ProjectCreateInput): Project {
    const now = Date.now();
    const id = input.id || 'P-' + Math.random().toString(36).slice(2,8);
    const proj: Project = { id, name: input.name, description: input.description, createdAt: now };
    this.store.set(id, proj);
    return proj;
  }
  getById(id: string) { return this.store.get(id); }
  list(includeArchived = false): Project[] {
    return [...this.store.values()].filter(p => includeArchived || !p.archivedAt);
  }
  archive(id: string) {
    const p = this.store.get(id); if (p && !p.archivedAt && p.id !== 'default') { p.archivedAt = Date.now(); this.store.set(id, p); }
  }
  restore(id: string) {
    const p = this.store.get(id); if (p && p.archivedAt) { delete p.archivedAt; this.store.set(id, p); }
  }
}
