import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let apiKey: string;

beforeAll(async () => {
  const res = await request(app).post('/agents/register').send({ name: 'test-agent', role: 'dev' });
  apiKey = res.body.apiKey;
});

describe('Task lifecycle', () => {
  it('creates a task and transitions statuses', async () => {
    const create = await request(app)
      .post('/tasks')
      .set('x-api-key', apiKey)
      .send({ title: 'Sample Task' })
      .expect(201);

    expect(create.body.status).toBe('todo');

    const taskId = create.body.id;

    const start = await request(app)
      .post(`/tasks/${taskId}/transition`)
      .set('x-api-key', apiKey)
      .send({ newStatus: 'in_progress', rationale: 'Starting', expectedVersion: 1 })
      .expect(200);

    expect(start.body.status).toBe('in_progress');

    const done = await request(app)
      .post(`/tasks/${taskId}/transition`)
      .set('x-api-key', apiKey)
      .send({ newStatus: 'done', rationale: 'Finished', expectedVersion: 2 })
      .expect(200);

    expect(done.body.status).toBe('done');
  });
});
