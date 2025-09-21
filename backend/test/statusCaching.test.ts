import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, taskRepo, projectRepo } from '../src/server.js';
import { __statusCache, computeAggregatedProjectStatus, invalidateProjectStatus } from '../src/services/projectStatus.js';

async function registerAgent(name: string) {
  const res = await request(app).post('/agents/register').send({ name });
  expect(res.status).toBe(200);
  return res.body.data.apiKey;
}

describe('Status caching (aggregated only)', () => {
  it('reuses cached aggregated status until invalidated', async () => {
    const key = await registerAgent('cache1');
  const parent = projectRepo.create({ name: 'CacheParent' });
  const child = projectRepo.create({ name: 'CacheChild' });
  projectRepo.setParent(child.id, parent.id);
    // seed a task so initial aggregation has rollup content
    taskRepo.create({ title: 'Seed Child Task', projectId: child.id });
    const first = computeAggregatedProjectStatus(parent.id);
    expect(first).toBeDefined();
    const baseCount = first?.rollup?.aggregated.tasks || 0;
    const before = __statusCache.dump();
    // Add task directly in child via repo (no invalidation yet)
    taskRepo.create({ title: 'Child Task 2', projectId: child.id });
    const second = computeAggregatedProjectStatus(parent.id); // should use cached value
    expect(second?.rollup?.aggregated.tasks).toBe(baseCount);
    const mid = __statusCache.dump();
    expect(mid.agg).toBe(before.agg);
    // Invalidate via child and recompute -> should increase task count
    invalidateProjectStatus(child.id); // invalidating child should also bubble up
    const third = computeAggregatedProjectStatus(parent.id);
    expect(third?.rollup?.aggregated.tasks).toBe(baseCount + 1);
  });

  it('does not cache base status (ensures immediate consistency)', async () => {
    const key = await registerAgent('cache2');
    const proj = projectRepo.create({ name: 'BaseNoCache' });
    const s1 = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', key);
    expect(s1.status).toBe(200);
    const t = taskRepo.create({ title: 'New Task', projectId: proj.id });
    t.status = 'done' as any; taskRepo.save(t as any);
    const s2 = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', key);
    expect(s2.body.data.completionPct).toBe(100);
  });
});
