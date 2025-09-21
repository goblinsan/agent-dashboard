import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, taskRepo } from '../src/server.js';

async function registerAgent(name: string) {
  const res = await request(app).post('/agents/register').send({ name });
  expect(res.status).toBe(200);
  return res.body.data.apiKey;
}

describe('Project hierarchy & roll-up', () => {
  it('creates child project and sets parent', async () => {
    const key = await registerAgent('hier1');
    const parentRes = await request(app).post('/projects').set('x-api-key', key).send({ name: 'RootProj' });
    expect(parentRes.status).toBe(201);
    const parentId = parentRes.body.data.id;
    const childRes = await request(app).post('/projects').set('x-api-key', key).send({ name: 'ChildProj', parentProjectId: parentId });
    expect(childRes.status).toBe(201);
    expect(childRes.body.data.parentProjectId).toBe(parentId);
  });

  it('prevents cycle via setParent endpoint', async () => {
    const key = await registerAgent('hier2');
  const p1Res = await request(app).post('/projects').set('x-api-key', key).send({ name: 'ProjA' });
  expect(p1Res.status).toBe(201);
  const p1 = p1Res.body.data.id;
  const p2Res = await request(app).post('/projects').set('x-api-key', key).send({ name: 'ProjB', parentProjectId: p1 });
  expect(p2Res.status).toBe(201);
  const p2 = p2Res.body.data.id;
    // attempt to set parent of A to B (cycle)
    const cyc = await request(app).patch(`/projects/${p1}/parent`).set('x-api-key', key).send({ parentProjectId: p2 });
    expect(cyc.status).toBe(400);
  });

  it('rolls up status metrics when rollup=1', async () => {
    const key = await registerAgent('hier3');
  const parentRes = await request(app).post('/projects').set('x-api-key', key).send({ name: 'RootProj' });
  expect(parentRes.status).toBe(201);
  const parentId = parentRes.body.data.id;
  const childRes = await request(app).post('/projects').set('x-api-key', key).send({ name: 'ChildProjX', parentProjectId: parentId });
  expect(childRes.status).toBe(201);
  const childId = childRes.body.data.id;
    // create tasks in both parent and child
    const t1 = taskRepo.create({ title: 'Parent Task', projectId: parentId });
    const t2 = taskRepo.create({ title: 'Child Task', projectId: childId });
    // mark child task done to create difference
    t2.status = 'done'; taskRepo.save(t2);
    const statusRes = await request(app).get(`/projects/${parentId}/status?rollup=1`).set('x-api-key', key);
    expect(statusRes.status).toBe(200);
    const snap = statusRes.body.data;
    expect(snap.rollup).toBeDefined();
    expect(snap.rollup.childCount).toBe(1);
    expect(snap.rollup.aggregated.tasks).toBeGreaterThanOrEqual(2);
    expect(snap.rollup.aggregated.done).toBe(1 + (snap.totals.done || 0));
  });
});
