import { projectRepo, phaseRepo, taskRepo } from '../server.js';

// Simple in-memory caches (non-persistent, invalidated on mutations)
interface CacheEntry<T> { value: T; ts: number }
const AGG_STATUS_CACHE = new Map<string, CacheEntry<AggregatedStatus>>();
// Default TTL (ms) - recompute if stale even without explicit invalidation
const STATUS_TTL_MS = 10_000; // 10s; conservative; can tune

function isFresh<T>(entry: CacheEntry<T> | undefined) {
  if (!entry) return false;
  return (Date.now() - entry.ts) < STATUS_TTL_MS;
}
export function invalidateProjectStatus(projectId: string) {
  AGG_STATUS_CACHE.delete(projectId);
  // Invalidate all ancestors (walk up parent chain if available)
  const proj = projectRepo.getById(projectId) as any;
  let current = proj?.parentProjectId ? projectRepo.getById(proj.parentProjectId) : undefined;
  while (current) {
    AGG_STATUS_CACHE.delete(current.id);
    current = (current as any).parentProjectId ? projectRepo.getById((current as any).parentProjectId) : undefined;
  }
}

interface ProjectStatusSnapshot {
  projectId: string;
  completionPct: number;
  activePhase?: { id: string; name: string };
  activeTaskCount: number;
  nextPriorityTask?: { id: string; title: string; phaseId?: string };
  totals: { tasks: number; done: number };
  generatedAt: number;
}

// Computes status for a single project (no nested aggregation yet)
export function computeProjectStatus(projectId: string): ProjectStatusSnapshot | undefined {
  const proj = projectRepo.getById(projectId);
  if (!proj || proj.archivedAt) return; // inactive or missing
  const phases = phaseRepo.list(projectId, false); // exclude archived phases
  const tasks = taskRepo.list({ projectId });
  const activeTasks = tasks.filter((t: any) => !t.deletedAt);
  const done = activeTasks.filter((t: any) => t.status === 'done').length;
  const total = activeTasks.length;
  const completionPct = total === 0 ? 0 : (done / total) * 100;

  // Determine active phase: first phase with at least one incomplete task OR last phase if all done
  let activePhase: { id: string; name: string } | undefined;
  if (phases.length) {
    const inc = phases.find((ph: any) => activeTasks.some((t: any) => t.phaseId === ph.id && t.status !== 'done'));
    const chosen: any = inc || phases[phases.length - 1];
    activePhase = { id: chosen.id, name: chosen.name };
  }

  // Next priority task: order by (phase.orderIndex, phasePriority ?? large, createdAt) and status != done
  const phaseOrderIndex = new Map<string, number>();
  phases.forEach((p: any) => phaseOrderIndex.set(p.id, p.orderIndex));
  const candidate = activeTasks
    .filter((t: any) => t.status !== 'done')
    .sort((a: any, b: any) => {
      const ao = phaseOrderIndex.get(a.phaseId) ?? 9999;
      const bo = phaseOrderIndex.get(b.phaseId) ?? 9999;
      if (ao !== bo) return ao - bo;
      const ap = a.phasePriority ?? 9999;
      const bp = b.phasePriority ?? 9999;
      if (ap !== bp) return ap - bp;
      return a.createdAt - b.createdAt;
    })[0];

  const snapshot: ProjectStatusSnapshot = {
    projectId,
    completionPct: Number(completionPct.toFixed(2)),
    activePhase,
    activeTaskCount: activeTasks.filter((t: any) => t.status !== 'done').length,
    nextPriorityTask: candidate ? { id: candidate.id, title: candidate.title, phaseId: candidate.phaseId } : undefined,
    totals: { tasks: total, done },
    generatedAt: Date.now()
  };
  return snapshot;
}

interface AggregatedStatus extends ProjectStatusSnapshot {
  rollup?: {
    childCount: number;
    aggregated: { tasks: number; done: number; completionPct: number };
    children: ProjectStatusSnapshot[];
  };
}

export function computeAggregatedProjectStatus(projectId: string): AggregatedStatus | undefined {
  const cached = AGG_STATUS_CACHE.get(projectId);
  if (isFresh(cached)) return cached!.value;
  const base = computeProjectStatus(projectId);
  if (!base) return;
  if (!projectRepo.listChildren) return base;

  // Collect descendants recursively (excluding archived). We'll keep direct children separate for backward compatibility in rollup.children.
  const visited = new Set<string>();
  function collectDescendants(pid: string): string[] {
    if (!projectRepo.listChildren) return [];
    const direct = projectRepo.listChildren(pid).filter((c: any) => !c.archivedAt);
    const result: string[] = [];
    for (const child of direct) {
      if (visited.has(child.id)) continue; // guard against unforeseen cycles (should already be prevented) 
      visited.add(child.id);
      result.push(child.id);
      result.push(...collectDescendants(child.id));
    }
    return result;
  }
  const descendantIds = collectDescendants(projectId);
  if (descendantIds.length === 0) {
    AGG_STATUS_CACHE.set(projectId, { value: base, ts: Date.now() });
    return base;
  }
  // Direct children list for rollup.children
  const directChildren = projectRepo.listChildren(projectId).filter((c: any) => !c.archivedAt);
  const directChildStatuses = directChildren.map((c: any) => computeProjectStatus(c.id)).filter(Boolean) as ProjectStatusSnapshot[];
  // All descendants (could include direct) for aggregation math
  const allDescendantStatuses = descendantIds.map(id => computeProjectStatus(id)).filter(Boolean) as ProjectStatusSnapshot[];

  const aggTasks = allDescendantStatuses.reduce((s, cs) => s + cs.totals.tasks, 0) + base.totals.tasks;
  const aggDone = allDescendantStatuses.reduce((s, cs) => s + cs.totals.done, 0) + base.totals.done;
  const pct = aggTasks === 0 ? 0 : (aggDone / aggTasks) * 100;
  const aggregated: AggregatedStatus = { ...base, rollup: { childCount: directChildStatuses.length, aggregated: { tasks: aggTasks, done: aggDone, completionPct: Number(pct.toFixed(2)) }, children: directChildStatuses } };
  AGG_STATUS_CACHE.set(projectId, { value: aggregated, ts: Date.now() });
  return aggregated;
}

// Testing / diagnostics helpers
export const __statusCache = {
  dump() { return { agg: AGG_STATUS_CACHE.size }; },
  clear() { AGG_STATUS_CACHE.clear(); }
};
