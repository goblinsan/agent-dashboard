import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, agents, taskRepo, phaseRepo, projectRepo } from '../src/server.js';

function apiKey() {
  const id = 'agent-' + Math.random().toString(36).slice(2,6);
  const key = 'key-' + Math.random().toString(36).slice(2,12);
  agents.set(id, { id, name: id, apiKey: key });
  return key;
}

describe('Project Status Snapshot (Slice 3)', () => {
  it('returns 0% completion with no tasks in a fresh project', async () => {
    const key = apiKey();
    const proj = projectRepo.create({ name: 'Isolated Project' });
    const res = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', key);
    expect(res.status).toBe(200);
    expect(res.body.data.completionPct).toBe(0);
    expect(res.body.data.totals.tasks).toBe(0);
  });

  it('reflects partial and then full completion (isolated project)', async () => {
    const key = apiKey();
    const proj = projectRepo.create({ name: 'Progress Project' });
    const t1 = taskRepo.create({ title: 'A', projectId: proj.id });
    const t2 = taskRepo.create({ title: 'B', projectId: proj.id });
    t1.status = 'done' as any; taskRepo.save(t1 as any);
    const partial = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', key);
    expect(partial.body.data.totals.tasks).toBe(2);
    expect(partial.body.data.completionPct).toBe(50);
    t2.status = 'done' as any; taskRepo.save(t2 as any);
    const full = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', key);
    expect(full.body.data.completionPct).toBe(100);
  });

  it('selects active phase correctly (isolated project)', async () => {
    const key = apiKey();
    const proj = projectRepo.create({ name: 'Phase Project' });
    const p1 = phaseRepo.create({ projectId: proj.id, name: 'Phase One' });
    const p2 = phaseRepo.create({ projectId: proj.id, name: 'Phase Two' });
    const t1 = taskRepo.create({ title: 'Phase1 Task', projectId: proj.id, phaseId: p1.id });
    const t2 = taskRepo.create({ title: 'Phase2 Task', projectId: proj.id, phaseId: p2.id });
    t1.status = 'done' as any; taskRepo.save(t1 as any);
    const snap = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', key);
    expect(snap.status).toBe(200);
    expect(snap.body.data.activePhase.id).toBe(p2.id);
  });
});
