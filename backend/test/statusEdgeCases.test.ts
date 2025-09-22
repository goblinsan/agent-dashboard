import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, agents, taskRepo, phaseRepo, projectRepo } from '../src/server.js';

function key() {
  const id = 'edge-' + Math.random().toString(36).slice(2,6);
  const k = 'k-' + Math.random().toString(36).slice(2,12);
  agents.set(id, { id, name: id, apiKey: k });
  return k;
}

describe('Status & Roll-up Edge Cases', () => {
  it('excludes tasks in archived phases from base project status totals', async () => {
    const apiKey = key();
    const proj = projectRepo.create({ name: 'ArchivePhaseProj' });
    const p1 = phaseRepo.create({ projectId: proj.id, name: 'Active Phase' });
    const p2 = phaseRepo.create({ projectId: proj.id, name: 'Temp Phase' });
    const t1 = taskRepo.create({ title: 'A1', projectId: proj.id, phaseId: p1.id });
    const t2 = taskRepo.create({ title: 'T2', projectId: proj.id, phaseId: p2.id });
    // Archive p2; t2 should not count
    phaseRepo.archive(p2.id);
    const res = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', apiKey);
    expect(res.status).toBe(200);
    // Only t1 should be counted
    expect(res.body.data.totals.tasks).toBe(1);
    expect(res.body.data.totals.done).toBe(0);
  });

  it('excludes soft deleted tasks from totals', async () => {
    const apiKey = key();
    const proj = projectRepo.create({ name: 'SoftDeleteProj' });
    const p = phaseRepo.create({ projectId: proj.id, name: 'Main' });
    const t1 = taskRepo.create({ title: 'Keep', projectId: proj.id, phaseId: p.id });
    const t2 = taskRepo.create({ title: 'Trash', projectId: proj.id, phaseId: p.id });
    // Soft delete second task
    if (taskRepo.softDelete) taskRepo.softDelete(t2.id); else { (t2 as any).deletedAt = Date.now(); taskRepo.save(t2 as any); }
    const res = await request(app).get(`/projects/${proj.id}/status`).set('x-api-key', apiKey);
    expect(res.status).toBe(200);
    expect(res.body.data.totals.tasks).toBe(1);
  });
});
