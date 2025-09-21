import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, phaseRepo, taskRepo } from '../src/server.js';

async function obtainKey() {
  const res = await request(app).post('/agents/register').send({ name: 'auto-phase-tester' });
  return res.body.data.apiKey as string;
}

describe('Auto Phase Assignment', () => {
  it('assigns default phase and phasePriority on task creation without phaseId', async () => {
    // Create a project to isolate
  const key = await obtainKey();
  const headers = { 'x-api-key': key };
  const resProj = await request(app).post('/projects').set(headers).send({ name: 'AutoPhase Project' });
    expect(resProj.status).toBe(201);
    const projectId = resProj.body.data.id;
    // Create task
  const resTask = await request(app).post('/tasks').set({ ...headers, 'x-project-id': projectId }).send({ title: 'Task A' });
    expect(resTask.status).toBe(201);
    const task = resTask.body.data;
    expect(task.phaseId).toBeDefined();
    // Check that phase exists and orderIndex 0
    const phases = phaseRepo.list(projectId, false);
    expect(phases.length).toBeGreaterThan(0);
    const defaultPhase = phases[0];
    expect(task.phaseId).toBe(defaultPhase.id);
    // Create second task to verify phasePriority increments
  const resTask2 = await request(app).post('/tasks').set({ ...headers, 'x-project-id': projectId }).send({ title: 'Task B' });
    expect(resTask2.status).toBe(201);
    const taskB = resTask2.body.data;
    // Collect tasks directly to inspect priorities
    const all = taskRepo.list({ projectId });
    const inPhase = all.filter((t: any) => t.phaseId === defaultPhase.id).sort((a: any,b: any)=> (a.phasePriority??0)-(b.phasePriority??0));
    expect(inPhase.length).toBeGreaterThanOrEqual(2);
    // Ensure distinct incremental priorities
    const priorities = inPhase.map((t:any)=>t.phasePriority).filter((p:any)=>p!==undefined);
    expect(new Set(priorities).size).toBe(priorities.length);
  });
});
