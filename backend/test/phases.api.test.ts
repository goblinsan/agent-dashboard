import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, agents, taskRepo, phaseRepo } from '../src/server.js';

function registerAgent() {
  const id = 'agent-' + Math.random().toString(36).slice(2,6);
  const apiKey = 'key-' + Math.random().toString(36).slice(2,12);
  agents.set(id, { id, name: id, apiKey });
  return apiKey;
}

describe('Phase API & task move (Slice 2)', () => {
  it('creates, lists, archives, restores a phase', async () => {
    const key = registerAgent();
    // create phase
    const create = await request(app).post('/phases').set('x-api-key', key).send({ name: 'Build' });
    expect(create.status).toBe(201);
    const phaseId = create.body.data.id;
    // list via project path
    const list = await request(app).get('/projects/default/phases').set('x-api-key', key);
    expect(list.status).toBe(200);
    expect(list.body.data.find((p: any) => p.id === phaseId)).toBeTruthy();
    // archive
    const arch = await request(app).post(`/phases/${phaseId}/archive`).set('x-api-key', key);
    expect(arch.status).toBe(200);
    // list again (should exclude archived by default)
    const list2 = await request(app).get('/projects/default/phases').set('x-api-key', key);
    expect(list2.body.data.find((p: any) => p.id === phaseId)).toBeFalsy();
    // restore
    const rest = await request(app).post(`/phases/${phaseId}/restore`).set('x-api-key', key);
    expect(rest.status).toBe(200);
    const list3 = await request(app).get('/projects/default/phases').set('x-api-key', key);
    expect(list3.body.data.find((p: any) => p.id === phaseId)).toBeTruthy();
  });

  it('reorders phases', async () => {
    const key = registerAgent();
    // create 2 phases
    const a = await request(app).post('/phases').set('x-api-key', key).send({ name: 'Phase A' });
    const b = await request(app).post('/phases').set('x-api-key', key).send({ name: 'Phase B' });
    const aId = a.body.data.id; const bId = b.body.data.id;
    // reorder: put B before A
    const reorder = await request(app).post('/phases/reorder').set('x-api-key', key).send({ phases: [ { id: bId, orderIndex: 0 }, { id: aId, orderIndex: 1 } ] });
    expect(reorder.status).toBe(200);
    const list = await request(app).get('/projects/default/phases').set('x-api-key', key);
    const idsInOrder = list.body.data.map((p: any) => p.id);
    // The first two user-created phases may come after default depending on default creation; ensure relative order preserved
    expect(idsInOrder.indexOf(bId)).toBeLessThan(idsInOrder.indexOf(aId));
  });

  it('moves a task to a phase and assigns incremental priority', async () => {
    const key = registerAgent();
    // create a new task
    const task = taskRepo.create({ title: 'Task X', projectId: 'default' });
    const p1 = await request(app).post('/phases').set('x-api-key', key).send({ name: 'Exec' });
    const p2 = await request(app).post('/phases').set('x-api-key', key).send({ name: 'QA' });
    const p1Id = p1.body.data.id; const p2Id = p2.body.data.id;
    // move to p1
    const mv1 = await request(app).patch(`/tasks/${task.id}/move`).set('x-api-key', key).send({ phaseId: p1Id });
    expect(mv1.status).toBe(200);
    expect(mv1.body.data.phaseId).toBe(p1Id);
    const firstPriority = mv1.body.data.phasePriority;
    // move to p2 (should reset priority sequence in that phase)
    const mv2 = await request(app).patch(`/tasks/${task.id}/move`).set('x-api-key', key).send({ phaseId: p2Id });
    expect(mv2.status).toBe(200);
    expect(mv2.body.data.phaseId).toBe(p2Id);
    expect(mv2.body.data.phasePriority).toBe(0); // first task in phase p2
    // create another task & move into p2 -> should get priority 1
    const t2 = taskRepo.create({ title: 'Task Y', projectId: 'default' });
    const mv3 = await request(app).patch(`/tasks/${t2.id}/move`).set('x-api-key', key).send({ phaseId: p2Id });
    expect(mv3.body.data.phasePriority).toBe(1);
    expect(firstPriority).toBe(0); // initial priority correctness in first phase
  });
});
