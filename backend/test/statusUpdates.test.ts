import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let apiKey: string;
let taskId: string;

beforeAll(async () => {
  const reg = await request(app).post('/agents/register').send({ name: 'status-agent' });
  apiKey = reg.body.data.apiKey;
  const task = await request(app).post('/tasks').set('x-api-key', apiKey).send({ title: 'Status Task' });
  taskId = task.body.data.id;
});

describe('Status Updates', () => {
  it('creates global and task-scoped updates and lists them', async () => {
    // Global update
    const globalRes = await request(app)
      .post('/status-updates')
      .set('x-api-key', apiKey)
      .send({ message: 'Global heartbeat' })
      .expect(201);
    expect(globalRes.body.success).toBe(true);
    expect(globalRes.body.data.taskId).toBeUndefined();

    // Task-scoped updates
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/status-updates')
        .set('x-api-key', apiKey)
        .send({ message: `Progress ${i}`, taskId })
        .expect(201);
    }

    const listAll = await request(app)
      .get('/status-updates')
      .set('x-api-key', apiKey)
      .expect(200);
    expect(listAll.body.success).toBe(true);
    expect(Array.isArray(listAll.body.data)).toBe(true);
    expect(listAll.body.data.length).toBeGreaterThanOrEqual(6);

    const listTask = await request(app)
      .get(`/status-updates?taskId=${taskId}&limit=3`)
      .set('x-api-key', apiKey)
      .expect(200);
    expect(listTask.body.success).toBe(true);
    expect(listTask.body.data.length).toBeLessThanOrEqual(3);
    // Ensure all returned entries are task-scoped
    for (const u of listTask.body.data) {
      expect(u.taskId).toBe(taskId);
    }
  });

  it('rejects too short message', async () => {
    const bad = await request(app)
      .post('/status-updates')
      .set('x-api-key', apiKey)
      .send({ message: 'hi' }) // shorter than min 3
      .expect(400);
    expect(bad.body.success).toBe(false);
    expect(bad.body.error.code).toBe('validation_failed');
  });
});
