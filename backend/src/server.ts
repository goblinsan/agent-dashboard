import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
import { InMemoryTaskRepository } from './repositories/taskRepository.js';
import { InMemoryBugRepository } from './repositories/bugRepository.js';
import { InMemoryStatusUpdateRepository } from './repositories/statusUpdateRepository.js';
import { InMemoryDesignNoteRepository } from './repositories/designNoteRepository.js';
import { WebSocketServer, WebSocket } from 'ws';
import { z } from 'zod';

// In-memory stores & types
interface Agent { id: string; name: string; apiKey: string; role?: string; lastHeartbeat?: number; currentTaskId?: string; }
// Updated status model: todo, in_progress, blocked, done (legacy 'open','completed' accepted in queries for migration)
type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
interface Task { id: string; title: string; status: TaskStatus; version: number; assignees: string[]; priority?: string; rationaleLog: string[]; }
interface Bug { id: string; title: string; severity: 'low' | 'medium' | 'high' | 'critical'; taskId?: string; reproSteps: string[]; proposedFix?: string; createdAt: number; }
interface Guideline { id: string; category: string; version: number; content: string; updatedAt: number; }

const agents = new Map<string, Agent>();
// Persistence selection (in-memory default)
const useSqlite = process.env.PERSISTENCE === 'sqlite';
let taskRepo: any;
let bugRepo: any;
let statusUpdateRepo: any;
let designNoteRepo: any;
if (useSqlite) {
  try {
    // Dynamic import to avoid runtime error if dependency missing
    const { SqliteTaskRepository, SqliteBugRepository, SqliteStatusUpdateRepository, SqliteDesignNoteRepository } = await import('./repositories/sqliteRepositories.js').catch(() => ({} as any));
    if (SqliteTaskRepository && SqliteBugRepository && SqliteStatusUpdateRepository && SqliteDesignNoteRepository) {
      taskRepo = new SqliteTaskRepository();
      bugRepo = new SqliteBugRepository();
      statusUpdateRepo = new SqliteStatusUpdateRepository();
      designNoteRepo = new SqliteDesignNoteRepository();
      console.log('[persistence] SQLite enabled (tasks, bugs, status updates, design notes)');
    } else {
      console.warn('[persistence] SQLite requested but repository module unavailable – falling back to in-memory');
      taskRepo = new InMemoryTaskRepository();
      bugRepo = new InMemoryBugRepository();
      statusUpdateRepo = new InMemoryStatusUpdateRepository();
      designNoteRepo = new InMemoryDesignNoteRepository();
    }
  } catch (err) {
    console.warn('[persistence] SQLite initialization failed – using in-memory. Error:', (err as any)?.message);
    taskRepo = new InMemoryTaskRepository();
    bugRepo = new InMemoryBugRepository();
    statusUpdateRepo = new InMemoryStatusUpdateRepository();
    designNoteRepo = new InMemoryDesignNoteRepository();
  }
} else {
  taskRepo = new InMemoryTaskRepository();
  bugRepo = new InMemoryBugRepository();
  statusUpdateRepo = new InMemoryStatusUpdateRepository();
  designNoteRepo = new InMemoryDesignNoteRepository();
}
const guidelines = new Map<string, Guideline>();
const auditLog: { id: string; actor: string; entity: string; entityId: string; action: string; at: number; diff?: any }[] = [];
function maxAuditEntries() { return parseInt(process.env.MAX_AUDIT_ENTRIES || '5000', 10); }
function pushAudit(entry: { id: string; actor: string; entity: string; entityId: string; action: string; at: number; diff?: any }) {
  auditLog.push(entry);
  const cap = maxAuditEntries();
  if (auditLog.length > cap) {
    const overflow = auditLog.length - cap;
    auditLog.splice(0, overflow);
  }
}

// Seed data
const baseGuideline: Guideline = { id: 'g-base', category: 'general', version: 1, content: 'Initial guidelines. Refer to AGENT_GUIDELINES.md', updatedAt: Date.now() };
guidelines.set(baseGuideline.id, baseGuideline);
const sampleTask = taskRepo.create({ title: 'Implement core API' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

// Utility helpers
class ApiError extends Error {
  status: number;
  code: string;
  details?: any;
  constructor(code: string, status: number, message?: string, details?: any) {
    super(message || code);
    this.status = status; this.code = code; this.details = details;
  }
}

const ok = <T>(res: Response, data: T, status = 200) => res.status(status).json({ success: true, data });
const fail = (res: Response, err: ApiError) => res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });

function auth(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-api-key');
  if (!key) return fail(res, new ApiError('missing_api_key', 401));
  const agent = [...agents.values()].find(a => a.apiKey === key);
  if (!agent) return fail(res, new ApiError('invalid_api_key', 401));
  (req as any).agent = agent;
  next();
}

// Role enforcement (opt-in via ENFORCE_ROLES=1). Evaluated per-request so tests can toggle env dynamically.
function requireRoles(allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (process.env.ENFORCE_ROLES !== '1') return next();
    const agent: Agent | undefined = (req as any).agent;
    const role = agent?.role;
    if (!role || !allowed.includes(role)) {
      return fail(res, new ApiError('forbidden', 403, 'forbidden'));
    }
    return next();
  };
}

const transitionSchema = z.object({
  newStatus: z.enum(['in_progress', 'blocked', 'done']),
  rationale: z.string().min(5).max(1200),
  confidence: z.number().min(0).max(1).optional(),
  expectedVersion: z.number().int().nonnegative()
});

const bugSchema = z.object({
  title: z.string().min(3).max(120),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  taskId: z.string().optional(),
  reproSteps: z.array(z.string().min(1)).min(1),
  proposedFix: z.string().optional()
});

const bugUpdateSchema = z.object({
  title: z.string().min(3).max(120).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  proposedFix: z.string().optional(),
  status: z.enum(['open','triaged','in_progress','resolved','closed']).optional(),
  expectedVersion: z.number().int().positive(),
  reproSteps: z.array(z.string().min(1)).min(1).optional()
});

// Routes
app.post('/agents/register', (req: Request, res: Response) => {
  const { name, role } = req.body || {};
  if (!name) return fail(res, new ApiError('name_required', 400));
  const id = nanoid(8); const apiKey = nanoid(32);
  const agent: Agent = { id, name, apiKey, role };
  agents.set(id, agent);
  return ok(res, { id, apiKey });
});

app.get('/tasks', auth, (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const includeDeleted = req.query.includeDeleted === '1';
  let list = taskRepo.list ? taskRepo.list({ status: status ? status.replace(/^open$/, 'todo').replace(/^completed$/, 'done') : undefined, includeDeleted }) : taskRepo.list();
  return ok(res, list);
});

app.post('/tasks', auth, (req: Request, res: Response) => {
  const { title, priority } = req.body || {};
  if (!title) return fail(res, new ApiError('title_required', 400));
  const task = taskRepo.create({ title, priority });
  const actor = (req as any).agent?.id || 'system';
  pushAudit({ id: nanoid(10), actor, entity: 'task', entityId: task.id, action: 'created', at: Date.now(), diff: { status: { to: 'todo' } } });
  broadcast({ type: 'task.created', task });
  return ok(res, task, 201);
});

app.post('/tasks/:id/transition', auth, (req: Request, res: Response) => {
  const parse = transitionSchema.safeParse(req.body);
  if (!parse.success) return fail(res, new ApiError('validation_failed', 400, 'validation_failed', parse.error.flatten()));
  const agent: Agent = (req as any).agent;
  const task = taskRepo.getById(req.params.id);
  if (!task) return fail(res, new ApiError('not_found', 404));
  const { newStatus, rationale, confidence, expectedVersion } = parse.data;
  if (task.version !== expectedVersion) return fail(res, new ApiError('version_conflict', 409, 'version_conflict', { currentVersion: task.version }));
  if (newStatus === 'in_progress' && task.status !== 'todo') return fail(res, new ApiError('invalid_transition', 400));
  if (newStatus === 'done' && task.status !== 'in_progress') return fail(res, new ApiError('invalid_transition', 400));
  if (newStatus === 'blocked' && task.status === 'done') return fail(res, new ApiError('invalid_transition', 400));
  if (newStatus === 'in_progress' && !task.assignees.includes(agent.id)) task.assignees.push(agent.id);
  const prevStatus = task.status;
  task.status = newStatus as TaskStatus;
  task.version += 1;
  const entry = `[${new Date().toISOString()}] ${agent.id} -> ${newStatus} :: ${rationale}${confidence !== undefined ? ` (conf=${confidence})` : ''}`;
  task.rationaleLog.push(entry);
  pushAudit({ id: nanoid(10), actor: agent.id, entity: 'task', entityId: task.id, action: 'status_change', at: Date.now(), diff: { status: { from: prevStatus, to: newStatus } } });
  taskRepo.save(task);
  broadcast({ type: 'task.updated', task });
  return ok(res, task);
});

app.get('/bugs', auth, (req: Request, res: Response) => {
  const includeDeleted = req.query.includeDeleted === '1';
  if (bugRepo.list.length === 0) return ok(res, []);
  return ok(res, bugRepo.list({ includeDeleted }));
});

app.post('/bugs', auth, (req: Request, res: Response) => {
  const parse = bugSchema.safeParse(req.body);
  if (!parse.success) return fail(res, new ApiError('validation_failed', 400, 'validation_failed', parse.error.flatten()));
  const bug = bugRepo.create({ title: parse.data.title, severity: parse.data.severity, taskId: parse.data.taskId, reproSteps: parse.data.reproSteps, proposedFix: parse.data.proposedFix });
  broadcast({ type: 'bug.created', bug });
  return ok(res, bug, 201);
});

app.patch('/bugs/:id', auth, (req: Request, res: Response) => {
  const parse = bugUpdateSchema.safeParse(req.body);
  if (!parse.success) return fail(res, new ApiError('validation_failed', 400, 'validation_failed', parse.error.flatten()));
  const bug = bugRepo.getById(req.params.id);
  if (!bug) return fail(res, new ApiError('not_found', 404));
  if ((bug.version || 1) !== parse.data.expectedVersion) return fail(res, new ApiError('version_conflict', 409, 'version_conflict', { currentVersion: bug.version }));
  const prev = { ...bug };
  if (parse.data.title) bug.title = parse.data.title;
  if (parse.data.severity) bug.severity = parse.data.severity as any;
  if (parse.data.proposedFix !== undefined) bug.proposedFix = parse.data.proposedFix;
  if (parse.data.status) bug.status = parse.data.status as any;
  if (parse.data.reproSteps) bug.reproSteps = parse.data.reproSteps;
  bug.version = (bug.version || 1) + 1;
  bugRepo.save(bug as any);
  pushAudit({ id: nanoid(10), actor: (req as any).agent.id, entity: 'bug', entityId: bug.id, action: 'updated', at: Date.now(), diff: { version: { from: prev.version, to: bug.version } } });
  broadcast({ type: 'bug.updated', bug });
  return ok(res, bug);
});

app.get('/guidelines', auth, (_req: Request, res: Response) => ok(res, [...guidelines.values()]));

app.post('/agents/:id/heartbeat', auth, (req: Request, res: Response) => {
  const agent: Agent = (req as any).agent;
  if (agent.id !== req.params.id) return fail(res, new ApiError('forbidden', 403));
  const { currentTaskId } = req.body || {};
  agent.lastHeartbeat = Date.now();
  agent.currentTaskId = currentTaskId;
  return ok(res, { ts: agent.lastHeartbeat });
});

const startTime = Date.now();
const apiVersion = '0.1.0';

app.get('/health', (_req: Request, res: Response) => ok(res, { tasks: taskRepo.list().length, agents: agents.size, version: apiVersion, ts: Date.now() }));

app.get('/healthz', (_req: Request, res: Response) => {
  const now = Date.now();
  return ok(res, {
    status: 'ok',
    version: apiVersion,
    uptimeMs: now - startTime,
    counts: { tasks: taskRepo.list().length, agents: agents.size, bugs: bugRepo.list().length },
    timestamp: now
  });
});

app.get('/audit', auth, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  return ok(res, auditLog.slice(-limit));
});

// Status Updates (Phase 2)
const statusUpdateSchema = z.object({
  message: z.string().min(3).max(500),
  taskId: z.string().optional()
});

app.get('/status-updates', auth, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const taskId = req.query.taskId as string | undefined;
  const since = req.query.since ? Number(req.query.since) : undefined;
  let list = statusUpdateRepo.list(10000, taskId); // pull full for filter then slice
  if (since) list = list.filter((u: any) => u.createdAt >= since);
  const window = list.slice(-(offset + limit)).slice(0, limit); // slice from end applying offset
  return ok(res, window);
});

app.post('/status-updates', auth, (req: Request, res: Response) => {
  const parsed = statusUpdateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, new ApiError('validation_failed', 400, 'validation_failed', parsed.error.flatten()));
  const agent: Agent = (req as any).agent;
  const update = statusUpdateRepo.create({ actor: agent.id, message: parsed.data.message, taskId: parsed.data.taskId });
  pushAudit({ id: nanoid(10), actor: agent.id, entity: 'status_update', entityId: update.id, action: 'created', at: Date.now(), diff: { message: { to: update.message } } });
  broadcast({ type: 'status_update.created', update });
  return ok(res, update, 201);
});

// Design Notes (Phase 2)
const designNoteSchema = z.object({
  title: z.string().min(3).max(120),
  context: z.string().min(10).max(2000),
  decision: z.string().min(5).max(2000),
  consequences: z.string().min(5).max(2000)
});

app.get('/design-notes', auth, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const includeDeleted = req.query.includeDeleted === '1';
  const notes = designNoteRepo.list(10000, { includeDeleted }); // large cap, then paginate from newest
  const window = notes.slice(-(offset + limit)).slice(0, limit);
  return ok(res, window);
});

// Restrict design note creation to architect or pm roles when enforcement enabled
app.post('/design-notes', auth, requireRoles(['architect','pm']), (req: Request, res: Response) => {
  const parsed = designNoteSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, new ApiError('validation_failed', 400, 'validation_failed', parsed.error.flatten()));
  const agent: Agent = (req as any).agent;
  const note = designNoteRepo.create({ actor: agent.id, ...parsed.data });
  pushAudit({ id: nanoid(10), actor: agent.id, entity: 'design_note', entityId: note.id, action: 'created', at: Date.now(), diff: { title: { to: note.title } } });
  broadcast({ type: 'design_note.created', note });
  return ok(res, note, 201);
});

// Soft delete endpoints
app.delete('/tasks/:id', auth, (req: Request, res: Response) => {
  const task = taskRepo.getById(req.params.id, true);
  if (!task) return fail(res, new ApiError('not_found', 404));
  if (task.deletedAt) return ok(res, { alreadyDeleted: true });
  if (taskRepo.softDelete) taskRepo.softDelete(task.id); else { task.deletedAt = Date.now(); taskRepo.save(task); }
  pushAudit({ id: nanoid(10), actor: (req as any).agent.id, entity: 'task', entityId: task.id, action: 'soft_deleted', at: Date.now() });
  return ok(res, { deleted: true });
});
app.post('/tasks/:id/restore', auth, (req: Request, res: Response) => {
  const task = taskRepo.getById(req.params.id, true);
  if (!task) return fail(res, new ApiError('not_found', 404));
  if (!task.deletedAt) return ok(res, { alreadyActive: true });
  if (taskRepo.restore) taskRepo.restore(task.id); else { delete (task as any).deletedAt; taskRepo.save(task); }
  pushAudit({ id: nanoid(10), actor: (req as any).agent.id, entity: 'task', entityId: task.id, action: 'restored', at: Date.now() });
  return ok(res, { restored: true });
});

app.delete('/bugs/:id', auth, (req: Request, res: Response) => {
  const bug = bugRepo.getById(req.params.id, true);
  if (!bug) return fail(res, new ApiError('not_found', 404));
  if (bug.deletedAt) return ok(res, { alreadyDeleted: true });
  if (bugRepo.softDelete) bugRepo.softDelete(bug.id); else { bug.deletedAt = Date.now(); bugRepo.save(bug); }
  pushAudit({ id: nanoid(10), actor: (req as any).agent.id, entity: 'bug', entityId: bug.id, action: 'soft_deleted', at: Date.now() });
  return ok(res, { deleted: true });
});
app.post('/bugs/:id/restore', auth, (req: Request, res: Response) => {
  const bug = bugRepo.getById(req.params.id, true);
  if (!bug) return fail(res, new ApiError('not_found', 404));
  if (!bug.deletedAt) return ok(res, { alreadyActive: true });
  if (bugRepo.restore) bugRepo.restore(bug.id); else { delete (bug as any).deletedAt; bugRepo.save(bug); }
  pushAudit({ id: nanoid(10), actor: (req as any).agent.id, entity: 'bug', entityId: bug.id, action: 'restored', at: Date.now() });
  return ok(res, { restored: true });
});

app.delete('/design-notes/:id', auth, (req: Request, res: Response) => {
  const dn = designNoteRepo.getById ? designNoteRepo.getById(req.params.id, true) : undefined;
  if (!dn) return fail(res, new ApiError('not_found', 404));
  if (dn.deletedAt) return ok(res, { alreadyDeleted: true });
  if (designNoteRepo.softDelete) designNoteRepo.softDelete(dn.id); else { dn.deletedAt = Date.now(); designNoteRepo.save && designNoteRepo.save(dn); }
  pushAudit({ id: nanoid(10), actor: (req as any).agent.id, entity: 'design_note', entityId: dn.id, action: 'soft_deleted', at: Date.now() });
  return ok(res, { deleted: true });
});
app.post('/design-notes/:id/restore', auth, (req: Request, res: Response) => {
  const dn = designNoteRepo.getById ? designNoteRepo.getById(req.params.id, true) : undefined;
  if (!dn) return fail(res, new ApiError('not_found', 404));
  if (!dn.deletedAt) return ok(res, { alreadyActive: true });
  if (designNoteRepo.restore) designNoteRepo.restore(dn.id); else { delete (dn as any).deletedAt; designNoteRepo.save && designNoteRepo.save(dn); }
  pushAudit({ id: nanoid(10), actor: (req as any).agent.id, entity: 'design_note', entityId: dn.id, action: 'restored', at: Date.now() });
  return ok(res, { restored: true });
});

// Static dashboard (Phase 4) - serve files from /public if present
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Resolve public directory relative to this server file so it works regardless of CWD
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir, { extensions: ['html'] }));
}
// Explicit root handler to ensure dashboard served even if static middleware misses
const indexFile = path.join(publicDir, 'index.html');
if (fs.existsSync(indexFile)) {
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(indexFile);
  });
}

// Fallback 404
app.use((req, res) => fail(res, new ApiError('not_found', 404, `Route ${req.method} ${req.path} not found`)));

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) return fail(res, err);
  console.error('Unhandled error', err);
  return fail(res, new ApiError('internal_error', 500));
});

// WebSocket + HTTP bootstrap (defer actual listen so tests can instantiate multiple isolated apps)
interface OutboundEvent { type: string; [k: string]: any }
let server: any;
let wss: WebSocketServer | null = null;

function ensureServer() {
  if (server) return server;
  const serverPort = process.env.PORT || 4000;
  server = app.listen(serverPort, () => {
    if (!process.env.VITEST) console.log(`Backend listening on :${serverPort}`);
  });
  wss = new WebSocketServer({ server, path: '/events' });
  wss.on('connection', (ws: WebSocket) => {
    ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
  });
  return server;
}

function broadcast(event: OutboundEvent) {
  if (!wss) return; // no-op if server not started
  const payload = JSON.stringify(event);
  wss.clients.forEach((c: WebSocket) => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
}

export function startServer() { return ensureServer(); }
export function stopServer() { if (wss) { wss.clients.forEach(c => c.close()); wss.close(); wss = null; } if (server) { server.close(); server = null; } }

// Auto-start only when not under Vitest (so existing runtime behavior unchanged)
if (!process.env.VITEST) ensureServer();

export { app, agents, taskRepo, bugRepo, guidelines, auditLog, statusUpdateRepo, designNoteRepo };
