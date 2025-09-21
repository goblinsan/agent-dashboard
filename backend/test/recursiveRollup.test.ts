import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/server.js';

async function register(name: string) {
  const res = await request(app).post('/agents/register').send({ name });
  return res.body.data.apiKey as string;
}

describe('Recursive Roll-up Aggregation', () => {
  it('rolls up tasks across multi-level descendant hierarchy', async () => {
    const key = await register('rec-rollup');
    const headers = { 'x-api-key': key };
    // Create root, mid, leaf projects
    const root = await request(app).post('/projects').set(headers).send({ name: 'Root Project' });
    expect(root.status).toBe(201);
    const rootId = root.body.data.id;
    const mid = await request(app).post('/projects').set(headers).send({ name: 'Mid Project', parentProjectId: rootId });
    expect(mid.status).toBe(201);
    const midId = mid.body.data.id;
    const leaf = await request(app).post('/projects').set(headers).send({ name: 'Leaf Project', parentProjectId: midId });
    expect(leaf.status).toBe(201);
    const leafId = leaf.body.data.id;

    // Create tasks: 1 in root (done), 2 in mid (1 done,1 todo), 3 in leaf (2 done,1 todo)
    // Root task
    const tRoot = await request(app).post('/tasks').set({ ...headers, 'x-project-id': rootId }).send({ title: 'R Task' });
    // Transition root task to done
    const trRoot = await request(app).post(`/tasks/${tRoot.body.data.id}/transition`).set(headers).send({ newStatus: 'in_progress', rationale: 'start', expectedVersion: 1 });
    expect(trRoot.status).toBe(200);
    const trRootDone = await request(app).post(`/tasks/${tRoot.body.data.id}/transition`).set(headers).send({ newStatus: 'done', rationale: 'complete', expectedVersion: 2 });
    expect(trRootDone.status).toBe(200);

    // Mid tasks
    const m1 = await request(app).post('/tasks').set({ ...headers, 'x-project-id': midId }).send({ title: 'M1' });
    const m2 = await request(app).post('/tasks').set({ ...headers, 'x-project-id': midId }).send({ title: 'M2' });
    // Complete one mid task
    await request(app).post(`/tasks/${m1.body.data.id}/transition`).set(headers).send({ newStatus: 'in_progress', rationale: 'start', expectedVersion: 1 });
    await request(app).post(`/tasks/${m1.body.data.id}/transition`).set(headers).send({ newStatus: 'done', rationale: 'complete', expectedVersion: 2 });

    // Leaf tasks
    const l1 = await request(app).post('/tasks').set({ ...headers, 'x-project-id': leafId }).send({ title: 'L1' });
    const l2 = await request(app).post('/tasks').set({ ...headers, 'x-project-id': leafId }).send({ title: 'L2' });
    const l3 = await request(app).post('/tasks').set({ ...headers, 'x-project-id': leafId }).send({ title: 'L3' });
    // Complete two leaf tasks
    for (const id of [l1.body.data.id, l2.body.data.id]) {
      await request(app).post(`/tasks/${id}/transition`).set(headers).send({ newStatus: 'in_progress', rationale: 'start', expectedVersion: 1 });
      await request(app).post(`/tasks/${id}/transition`).set(headers).send({ newStatus: 'done', rationale: 'complete', expectedVersion: 2 });
    }

    // Fetch roll-up for root
    const status = await request(app).get(`/projects/${rootId}/status?rollup=1`).set(headers);
    expect(status.status).toBe(200);
    const data = status.body.data;
    // Totals: root(1) + mid(2) + leaf(3) = 6 tasks; done: root(1) + mid(1) + leaf(2) = 4 ⇒ 66.67%
    expect(data.rollup.aggregated.tasks).toBe(6);
    expect(data.rollup.aggregated.done).toBe(4);
    expect(Number(data.rollup.aggregated.completionPct)).toBeCloseTo(66.67, 0.1);
    // Ensure direct children only includes mid (not leaf) in children array
    expect(data.rollup.children.some((c: any) => c.projectId === midId)).toBe(true);
    expect(data.rollup.children.some((c: any) => c.projectId === leafId)).toBe(false);
  });
});
