import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let apiKey: string;

beforeAll(async () => {
  const reg = await request(app).post('/agents/register').send({ name: 'bug-agent' });
  apiKey = reg.body.data.apiKey;
});

describe('Bug versioning & updates', () => {
  it('updates a bug with optimistic concurrency', async () => {
    const create = await request(app)
      .post('/bugs')
      .set('x-api-key', apiKey)
      .send({ title: 'Minor glitch', severity: 'low', reproSteps: ['Step 1'] })
      .expect(201);
    const bug = create.body.data;
    expect(bug.version).toBe(1);
    const patch = await request(app)
      .patch(`/bugs/${bug.id}`)
      .set('x-api-key', apiKey)
      .send({ proposedFix: 'Add null check', expectedVersion: 1 })
      .expect(200);
    expect(patch.body.data.version).toBe(2);
    expect(patch.body.data.proposedFix).toBe('Add null check');
  });

  it('rejects version conflict', async () => {
    const create = await request(app)
      .post('/bugs')
      .set('x-api-key', apiKey)
      .send({ title: 'Race condition', severity: 'high', reproSteps: ['Do X','Do Y'] })
      .expect(201);
    const bug = create.body.data;
    // first valid patch to bump version
    await request(app)
      .patch(`/bugs/${bug.id}`)
      .set('x-api-key', apiKey)
      .send({ status: 'triaged', expectedVersion: 1 })
      .expect(200);
    // stale expectedVersion
    const conflict = await request(app)
      .patch(`/bugs/${bug.id}`)
      .set('x-api-key', apiKey)
      .send({ status: 'in_progress', expectedVersion: 1 })
      .expect(409);
    expect(conflict.body.success).toBe(false);
    expect(conflict.body.error.code).toBe('version_conflict');
  });
});
