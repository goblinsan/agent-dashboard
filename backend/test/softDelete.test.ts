import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let key: string;

beforeAll(async () => {
  const reg = await request(app).post('/agents/register').send({ name: 'deleter', role: 'architect' });
  key = reg.body.data.apiKey;
});

describe('Soft delete lifecycle', () => {
  it('soft deletes a task and hides it from default list', async () => {
    const create = await request(app).post('/tasks').set('x-api-key', key).send({ title: 'Temp Task' }).expect(201);
    const id = create.body.data.id;
    await request(app).delete(`/tasks/${id}`).set('x-api-key', key).expect(200);
    const list = await request(app).get('/tasks').set('x-api-key', key).expect(200);
    expect(list.body.data.find((t: any) => t.id === id)).toBeUndefined();
    const listInc = await request(app).get('/tasks?includeDeleted=1').set('x-api-key', key).expect(200);
    const deletedTask = listInc.body.data.find((t: any) => t.id === id);
    expect(deletedTask).toBeDefined();
    expect(typeof deletedTask.deletedAt).toBe('number');
    // restore
    await request(app).post(`/tasks/${id}/restore`).set('x-api-key', key).expect(200);
    const listAfterRestore = await request(app).get('/tasks').set('x-api-key', key).expect(200);
    expect(listAfterRestore.body.data.find((t: any) => t.id === id)).toBeDefined();
  });

  it('soft deletes a bug and design note', async () => {
    const bug = await request(app).post('/bugs').set('x-api-key', key).send({ title: 'Temp Bug', severity: 'low', reproSteps: ['step'] }).expect(201);
    const bid = bug.body.data.id;
    await request(app).delete(`/bugs/${bid}`).set('x-api-key', key).expect(200);
    const bugs = await request(app).get('/bugs').set('x-api-key', key).expect(200);
    expect(bugs.body.data.find((b: any) => b.id === bid)).toBeUndefined();
  const bugsInc = await request(app).get('/bugs?includeDeleted=1').set('x-api-key', key).expect(200);
  const deletedBug = bugsInc.body.data.find((b: any) => b.id === bid);
  expect(deletedBug).toBeDefined();
  expect(typeof deletedBug.deletedAt).toBe('number');
    // restore bug
    await request(app).post(`/bugs/${bid}/restore`).set('x-api-key', key).expect(200);
    const bugsAfter = await request(app).get('/bugs').set('x-api-key', key).expect(200);
    expect(bugsAfter.body.data.find((b: any) => b.id === bid)).toBeDefined();

  const dn = await request(app).post('/design-notes').set('x-api-key', key).send({ title: 'DN Title', context: 'Context long enough for validation', decision: 'Decision text long enough', consequences: 'Consequences long enough' }).expect(201);
    const dnid = dn.body.data.id;
    await request(app).delete(`/design-notes/${dnid}`).set('x-api-key', key).expect(200);
    const dns = await request(app).get('/design-notes').set('x-api-key', key).expect(200);
    expect(dns.body.data.find((d: any) => d.id === dnid)).toBeUndefined();
    const dnsInc = await request(app).get('/design-notes?includeDeleted=1').set('x-api-key', key).expect(200);
  const deletedNote = dnsInc.body.data.find((d: any) => d.id === dnid);
  expect(deletedNote).toBeDefined();
  expect(typeof deletedNote.deletedAt).toBe('number');
    // restore design note
    await request(app).post(`/design-notes/${dnid}/restore`).set('x-api-key', key).expect(200);
    const dnsAfter = await request(app).get('/design-notes').set('x-api-key', key).expect(200);
    expect(dnsAfter.body.data.find((d: any) => d.id === dnid)).toBeDefined();
  });
});
