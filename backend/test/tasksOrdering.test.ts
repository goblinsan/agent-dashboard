import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, agents, taskRepo, phaseRepo, projectRepo } from '../src/server.js';

function apiKey() {
  const id = 'agent-' + Math.random().toString(36).slice(2,6);
  const key = 'key-' + Math.random().toString(36).slice(2,12);
  agents.set(id, { id, name: id, apiKey: key });
  return key;
}

describe('Ordered tasks listing (?ordered=1)', () => {
  it('orders by phase orderIndex then phasePriority then createdAt', async () => {
    const key = apiKey();
    const proj = projectRepo.create({ name: 'Ordering Project' });
    const pA = phaseRepo.create({ projectId: proj.id, name: 'Phase A' });
    const pB = phaseRepo.create({ projectId: proj.id, name: 'Phase B' });
    // Create tasks with explicit phases & priorities
    const t1 = taskRepo.create({ title: 'A-1', projectId: proj.id, phaseId: pA.id });
    const t2 = taskRepo.create({ title: 'B-1', projectId: proj.id, phaseId: pB.id });
    const t3 = taskRepo.create({ title: 'A-2', projectId: proj.id, phaseId: pA.id });
    // Assign priorities (simulate moves) to ensure ordering inside phase A: t1 priority 0, t3 priority 1
    if (taskRepo.setPhase) taskRepo.setPhase(t1.id, pA.id, 0);
    if (taskRepo.setPhase) taskRepo.setPhase(t3.id, pA.id, 1);
    if (taskRepo.setPhase) taskRepo.setPhase(t2.id, pB.id, 0);

    const res = await request(app)
      .get(`/tasks?ordered=1`)
      .set('x-api-key', key)
      .set('x-project-id', proj.id);
    expect(res.status).toBe(200);
  const ids = res.body.data.map((t: any) => t.id);
  // Phase A tasks (t1, t3) should come before Phase B task (t2)
  expect(ids.indexOf(t1.id)).toBeGreaterThan(-1);
  expect(ids.indexOf(t2.id)).toBeGreaterThan(-1);
  expect(ids.indexOf(t3.id)).toBeGreaterThan(-1);
  expect(ids.indexOf(t1.id)).toBeLessThan(ids.indexOf(t2.id));
  expect(ids.indexOf(t3.id)).toBeLessThan(ids.indexOf(t2.id));
  // Within Phase A, t1 (priority 0) before t3 (priority 1)
  expect(ids.indexOf(t1.id)).toBeLessThan(ids.indexOf(t3.id));
  });

  it('places unphased tasks after phased tasks', async () => {
    const key = apiKey();
    const proj = projectRepo.create({ name: 'Unphased Ordering' });
    const pA = phaseRepo.create({ projectId: proj.id, name: 'Phase A' });
    const phased = taskRepo.create({ title: 'Phased', projectId: proj.id, phaseId: pA.id });
    if (taskRepo.setPhase) taskRepo.setPhase(phased.id, pA.id, 0);
    const unphased = taskRepo.create({ title: 'Legacy', projectId: proj.id });
    const res = await request(app)
      .get(`/tasks?ordered=1`)
      .set('x-api-key', key)
      .set('x-project-id', proj.id);
    const ids = res.body.data.map((t: any) => t.id);
    expect(ids.indexOf(phased.id)).toBeGreaterThan(-1);
    expect(ids.indexOf(unphased.id)).toBeGreaterThan(-1);
    expect(ids.indexOf(phased.id)).toBeLessThan(ids.indexOf(unphased.id));
  });
});
