import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';
import { resetMetrics } from '../src/services/metrics.js';

async function registerAgent(name: string) {
  const res = await request(app).post('/agents/register').send({ name });
  expect(res.status).toBe(200);
  return res.body.data.apiKey as string;
}

describe('Metrics instrumentation', () => {
  beforeAll(() => {
    resetMetrics();
  });

  it('tracks request counts, per-route stats, and cache hit/miss for aggregated status', async () => {
    const apiKey = await registerAgent('metrics-agent');
    const headers = { 'x-api-key': apiKey };

    // Create a new project (isolated route key for status endpoint)
    const proj = await request(app).post('/projects').set(headers).send({ name: 'MetricsProj' });
    expect(proj.status).toBe(201);
    const projectId = proj.body.data.id;

    // Create a task (ensures non-empty roll-up math)
    const task = await request(app).post('/tasks').set({ ...headers, 'x-project-id': projectId }).send({ title: 'MTask' });
    expect(task.status).toBe(201);

    // First aggregated status call => cache miss expected
    const status1 = await request(app).get(`/projects/${projectId}/status?rollup=1`).set(headers);
    expect(status1.status).toBe(200);
    // Second aggregated status call => cache hit expected (within TTL, no invalidation)
    const status2 = await request(app).get(`/projects/${projectId}/status?rollup=1`).set(headers);
    expect(status2.status).toBe(200);

    // Fetch metrics (note: this request itself increments totalRequests just before snapshot)
    const metricsRes = await request(app).get('/metrics');
    expect(metricsRes.status).toBe(200);
    const snap = metricsRes.body.data;

    // Cache counters: 1 miss (first), 1 hit (second)
    expect(snap.cache.statusAggMisses).toBe(1);
    expect(snap.cache.statusAggHits).toBe(1);

    // Route keys (concrete paths)
    const statusRouteKey = `GET /projects/${projectId}/status`;
    const taskCreateKey = 'POST /tasks';
    const projectCreateKey = 'POST /projects';
    const agentRegisterKey = 'POST /agents/register';
    const metricsKey = 'GET /metrics';

    // Presence
    for (const k of [statusRouteKey, taskCreateKey, projectCreateKey, agentRegisterKey, metricsKey]) {
      expect(snap.perRoute[k]).toBeDefined();
    }

    // Counts: status route hit exactly twice for this specific project path
    expect(snap.perRoute[statusRouteKey].count).toBe(2);
    expect(snap.perRoute[statusRouteKey].errors).toBe(0);
    // Generic routes may have prior traffic from other tests; assert at least once
    expect(snap.perRoute[taskCreateKey].count).toBeGreaterThanOrEqual(1);
    expect(snap.perRoute[projectCreateKey].count).toBeGreaterThanOrEqual(1);
    expect(snap.perRoute[agentRegisterKey].count).toBeGreaterThanOrEqual(1);
    expect(snap.perRoute[metricsKey].count).toBeGreaterThanOrEqual(1);

    // Latency accumulation: ensure some latency captured for status route
    expect(snap.perRoute[statusRouteKey].totalLatencyMs).toBeGreaterThan(0);

    // Aggregate totalRequests should be >= sum of the perRoute counts we asserted minimally (cannot rely on exact due to prior tests)
    const minLocalCalls = 6; // register + project + task + status1 + status2 + metrics
    expect(snap.totalRequests).toBeGreaterThanOrEqual(minLocalCalls);
    expect(snap.totalErrors).toBe(0);
  });
});
