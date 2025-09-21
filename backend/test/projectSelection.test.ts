import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/server';

let apiKey: string;

beforeAll(async () => {
  const res = await request(app).post('/agents/register').send({ name: 'selector' });
  apiKey = res.body.data.apiKey;
  // create two projects
  await request(app).post('/projects').set('x-api-key', apiKey).send({ id: 'selA', name: 'Select A' }).expect(201);
  await request(app).post('/projects').set('x-api-key', apiKey).send({ id: 'selB', name: 'Select B' }).expect(201);
});

describe('Project selection header', () => {
  it('isolates tasks per project', async () => {
    const tA = await request(app).post('/tasks').set('x-api-key', apiKey).set('x-project-id', 'selA').send({ title: 'Task A1' }).expect(201);
    const tB = await request(app).post('/tasks').set('x-api-key', apiKey).set('x-project-id', 'selB').send({ title: 'Task B1' }).expect(201);
    expect(tA.body.data.id).not.toBe(tB.body.data.id);
    const listA = await request(app).get('/tasks').set('x-api-key', apiKey).set('x-project-id', 'selA').expect(200);
    const listB = await request(app).get('/tasks').set('x-api-key', apiKey).set('x-project-id', 'selB').expect(200);
    expect(listA.body.data.find((t: any) => t.id === tA.body.data.id)).toBeTruthy();
    expect(listA.body.data.find((t: any) => t.id === tB.body.data.id)).toBeFalsy();
    expect(listB.body.data.find((t: any) => t.id === tB.body.data.id)).toBeTruthy();
    expect(listB.body.data.find((t: any) => t.id === tA.body.data.id)).toBeFalsy();
  });

  it('rejects archived project usage', async () => {
    await request(app).post('/projects/selB/archive').set('x-api-key', apiKey).expect(200);
    const fail = await request(app).get('/tasks').set('x-api-key', apiKey).set('x-project-id', 'selB').expect(404);
    expect(fail.body.error.code).toBe('not_found');
  });
});
