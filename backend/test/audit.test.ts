import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, auditLog } from '../src/server';

let apiKey: string;
const ORIGINAL_MAX = process.env.MAX_AUDIT_ENTRIES;

// Use a much smaller max to exercise pruning quickly
process.env.MAX_AUDIT_ENTRIES = '50';

beforeAll(async () => {
  const res = await request(app).post('/agents/register').send({ name: 'prune-agent' });
  apiKey = res.body.data.apiKey;
});

describe('Audit pruning', () => {
  it('never exceeds MAX_AUDIT_ENTRIES after many task creations', async () => {
    const targetCreates = 200; // large burst
    for (let i = 0; i < targetCreates; i++) {
      await request(app)
        .post('/tasks')
        .set('x-api-key', apiKey)
        .send({ title: `Audit Task ${i}` })
        .expect(201);
    }
    expect(auditLog.length).toBeLessThanOrEqual(50);
  });
});

afterAll(() => {
  if (ORIGINAL_MAX !== undefined) process.env.MAX_AUDIT_ENTRIES = ORIGINAL_MAX; else delete process.env.MAX_AUDIT_ENTRIES;
});
