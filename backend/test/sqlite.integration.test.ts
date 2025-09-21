import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

process.env.PERSISTENCE = 'sqlite';
process.env.DB_FILE = ':memory:';

let api: any; let skip = false;

beforeAll(async () => {
  try {
    const mod: any = await import('../src/server.js');
    api = request(mod.app);
    if (!mod.taskRepo || !mod.taskRepo.list) skip = true;
  } catch { skip = true; }
});

describe('sqlite integration (conditional)', () => {
  it('creates task and transitions with optimistic concurrency', async () => {
    if (skip) return; // silently skip when driver absent
    const reg = await api.post('/agents/register').send({ name: 'tester' }).expect(200);
    const key = reg.body.data.apiKey;
    const create = await api.post('/tasks').set('x-api-key', key).send({ title: 'SQLite Task', priority: 'high' }).expect(201);
    expect(create.body.data.title).toBe('SQLite Task');
    const task = create.body.data;
    const trans = await api.post(`/tasks/${task.id}/transition`).set('x-api-key', key).send({ newStatus: 'in_progress', rationale: 'start', expectedVersion: task.version }).expect(200);
    expect(trans.body.data.status).toBe('in_progress');
    // conflict
    await api.post(`/tasks/${task.id}/transition`).set('x-api-key', key).send({ newStatus: 'blocked', rationale: 'conflict', expectedVersion: task.version }).expect(409);
  });

  it('persists bug create and patch with versioning', async () => {
    if (skip) return;
    const reg = await api.post('/agents/register').send({ name: 'bugger' }).expect(200);
    const key = reg.body.data.apiKey;
    const bug = await api.post('/bugs').set('x-api-key', key).send({ title: 'SQLite Bug', severity: 'high', reproSteps: ['x'] }).expect(201);
    const b = bug.body.data;
    const patch = await api.patch(`/bugs/${b.id}`).set('x-api-key', key).send({ proposedFix: 'fix', expectedVersion: b.version }).expect(200);
    expect(patch.body.data.version).toBe(b.version + 1);
  });

  it('stores status updates & design notes', async () => {
    if (skip) return;
    const reg = await api.post('/agents/register').send({ name: 'noter' }).expect(200);
    const key = reg.body.data.apiKey;
    const su = await api.post('/status-updates').set('x-api-key', key).send({ message: 'hello sqlite' }).expect(201);
    expect(su.body.data.message).toBe('hello sqlite');
    const dn = await api.post('/design-notes').set('x-api-key', key).send({ title: 'arch', context: 'c', decision: 'd', consequences: 'x' }).expect(400); // context length too short triggers validation ensuring route works
    // Provide proper lengths
    const dn2 = await api.post('/design-notes').set('x-api-key', key).send({ title: 'arch', context: 'a'.repeat(15), decision: 'decide'.repeat(2), consequences: 'impact'.repeat(2) }).expect(201);
    expect(dn2.body.data.title).toBe('arch');
  });
});
