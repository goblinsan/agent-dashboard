import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let devKey: string;
let archKey: string;

beforeAll(async () => {
  const dev = await request(app).post('/agents/register').send({ name: 'dev-agent', role: 'dev' });
  devKey = dev.body.data.apiKey;
  const arch = await request(app).post('/agents/register').send({ name: 'arch-agent', role: 'architect' });
  archKey = arch.body.data.apiKey;
});

beforeEach(() => {
  // Default to disabled unless a test explicitly enables
  process.env.ENFORCE_ROLES = '0';
});

describe('Role enforcement (design notes)', () => {
  it('enforces architect role when enabled', async () => {
    process.env.ENFORCE_ROLES = '1';
    const okRes = await request(app)
      .post('/design-notes')
      .set('x-api-key', archKey)
      .send({
        title: 'Arch Decision',
        context: 'Context for decision rationale elaboration',
        decision: 'Proceed with modular design',
        consequences: 'Easier future scaling'
      })
      .expect(201);
    expect(okRes.body.success).toBe(true);
    const forbidden = await request(app)
      .post('/design-notes')
      .set('x-api-key', devKey)
      .send({
        title: 'Dev Attempt',
        context: 'Attempt by dev role to create design note',
        decision: 'Should not matter',
        consequences: 'Should be forbidden'
      })
      .expect(403);
    expect(forbidden.body.error.code).toBe('forbidden');
  });

  it('allows any role when enforcement disabled', async () => {
    // Explicitly ensure disabled
    process.env.ENFORCE_ROLES = '0';
    const res = await request(app)
      .post('/design-notes')
      .set('x-api-key', devKey)
      .send({
        title: 'Dev Allowed',
        context: 'Should pass when roles disabled (sufficient length)',
        decision: 'Test decision',
        consequences: 'No negative impact'
      });
    if (res.status !== 201) {
      // Output body for diagnostic; test will still fail after assertion
      // eslint-disable-next-line no-console
      console.log('Diagnostic response (expected 201):', res.status, res.body);
      if (res.body?.error?.details?.fieldErrors) {
        // eslint-disable-next-line no-console
        console.log('Field Errors:', res.body.error.details.fieldErrors);
      }
    }
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});
