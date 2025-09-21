import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app, DEFAULT_PROJECT_ID } from '../src/server';

let apiKey: string;

beforeAll(async () => {
  const res = await request(app).post('/agents/register').send({ name: 'proj-tester', role: 'pm' });
  expect(res.body.success).toBe(true);
  apiKey = res.body.data.apiKey;
});

describe('Projects CRUD', () => {
  it('lists default project', async () => {
    const res = await request(app).get('/projects').set('x-api-key', apiKey).expect(200);
    expect(res.body.success).toBe(true);
    const list = res.body.data;
    expect(Array.isArray(list)).toBe(true);
    const def = list.find((p: any) => p.id === DEFAULT_PROJECT_ID);
    expect(def).toBeTruthy();
    expect(def.archivedAt).toBeUndefined();
  });

  it('creates a new project', async () => {
    const res = await request(app).post('/projects').set('x-api-key', apiKey).send({ id: 'projA', name: 'Project A', description: 'Alpha' }).expect(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('projA');
  });

  it('prevents duplicate project id', async () => {
    const dup = await request(app).post('/projects').set('x-api-key', apiKey).send({ id: 'projA', name: 'Duplicate A' }).expect(400);
    expect(dup.body.success).toBe(false);
    expect(dup.body.error.code).toBe('validation_failed');
  });

  it('archives and restores a project', async () => {
    const create = await request(app).post('/projects').set('x-api-key', apiKey).send({ id: 'projB', name: 'Project B' }).expect(201);
    expect(create.body.data.id).toBe('projB');
    const arch = await request(app).post('/projects/projB/archive').set('x-api-key', apiKey).expect(200);
    expect(arch.body.data.archived).toBe(true);
    // listing without includeArchived should omit archived project
    const listActive = await request(app).get('/projects').set('x-api-key', apiKey).expect(200);
    expect(listActive.body.data.find((p: any) => p.id === 'projB')).toBeUndefined();
    // listing with includeArchived should show it
    const listAll = await request(app).get('/projects?includeArchived=1').set('x-api-key', apiKey).expect(200);
    expect(listAll.body.data.find((p: any) => p.id === 'projB')?.archivedAt).toBeTruthy();
    const restore = await request(app).post('/projects/projB/restore').set('x-api-key', apiKey).expect(200);
    expect(restore.body.data.restored).toBe(true);
  });

  it('refuses archiving default project', async () => {
    const res = await request(app).post(`/projects/${DEFAULT_PROJECT_ID}/archive`).set('x-api-key', apiKey).expect(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('forbidden');
  });
});
