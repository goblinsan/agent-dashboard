import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let apiKey: string;

beforeAll(async () => {
  const reg = await request(app).post('/agents/register').send({ name: 'design-agent' });
  apiKey = reg.body.data.apiKey;
});

describe('Design Notes & status update since filter', () => {
  it('creates design notes and lists them with limit', async () => {
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .post('/design-notes')
        .set('x-api-key', apiKey)
        .send({
          title: `Decision ${i}`,
          context: 'We need to choose an approach for X component',
          decision: 'Proceed with approach A',
          consequences: 'Simpler initial implementation'
        })
        .expect(201);
      expect(res.body.success).toBe(true);
    }

    const list = await request(app)
      .get('/design-notes?limit=2')
      .set('x-api-key', apiKey)
      .expect(200);
    expect(list.body.success).toBe(true);
    expect(list.body.data.length).toBeLessThanOrEqual(2);
  });

  it('filters status updates by since timestamp', async () => {
    const start = Date.now();
    // create baseline update
    await request(app).post('/status-updates').set('x-api-key', apiKey).send({ message: 'Pre-change' }).expect(201);
    const since = Date.now();
    // later updates
    await request(app).post('/status-updates').set('x-api-key', apiKey).send({ message: 'After 1' }).expect(201);
    await request(app).post('/status-updates').set('x-api-key', apiKey).send({ message: 'After 2' }).expect(201);
    const listSince = await request(app)
      .get(`/status-updates?since=${since}`)
      .set('x-api-key', apiKey)
      .expect(200);
    expect(listSince.body.success).toBe(true);
    // Ensure all returned are >= since
    for (const u of listSince.body.data) {
      expect(u.createdAt).toBeGreaterThanOrEqual(since);
    }
    // There should be at least 2 recent ones
    expect(listSince.body.data.length).toBeGreaterThanOrEqual(2);
    // start variable is just to avoid unused warning
    expect(start).toBeLessThanOrEqual(Date.now());
  });
});
