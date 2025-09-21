import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let apiKey: string;

beforeAll(async () => {
  const res = await request(app).post('/agents/register').send({ name: 'test-agent', role: 'dev' });
  expect(res.body.success).toBe(true);
  apiKey = res.body.data.apiKey;
});

describe('Task lifecycle', () => {
  it('creates a task and transitions statuses', async () => {
    const create = await request(app)
      .post('/tasks')
      .set('x-api-key', apiKey)
      .send({ title: 'Sample Task' })
      .expect(201);

  expect(create.body.success).toBe(true);
  expect(create.body.data.status).toBe('todo');

  const taskId = create.body.data.id;

    const start = await request(app)
      .post(`/tasks/${taskId}/transition`)
      .set('x-api-key', apiKey)
      .send({ newStatus: 'in_progress', rationale: 'Starting', expectedVersion: 1 })
      .expect(200);

  expect(start.body.success).toBe(true);
  expect(start.body.data.status).toBe('in_progress');

    const done = await request(app)
      .post(`/tasks/${taskId}/transition`)
      .set('x-api-key', apiKey)
      .send({ newStatus: 'done', rationale: 'Finished', expectedVersion: 2 })
      .expect(200);

  expect(done.body.success).toBe(true);
  expect(done.body.data.status).toBe('done');
  });

  it('rejects invalid direct todo->done transition', async () => {
    // create fresh task
    const create = await request(app)
      .post('/tasks')
      .set('x-api-key', apiKey)
      .send({ title: 'Another Task' })
      .expect(201);
    const taskId = create.body.data.id;
    const invalid = await request(app)
      .post(`/tasks/${taskId}/transition`)
      .set('x-api-key', apiKey)
      .send({ newStatus: 'done', rationale: 'Skip ahead', expectedVersion: 1 })
      .expect(400);
    expect(invalid.body.success).toBe(false);
    expect(invalid.body.error.code).toBe('invalid_transition');
  });
});
