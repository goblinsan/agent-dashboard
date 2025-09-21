import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { nanoid } from 'nanoid';
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
const tasks = new Map<string, Task>();
const bugs = new Map<string, Bug>();
const guidelines = new Map<string, Guideline>();
const auditLog: { id: string; actor: string; entity: string; entityId: string; action: string; at: number; diff?: any }[] = [];

// Seed data
const baseGuideline: Guideline = { id: 'g-base', category: 'general', version: 1, content: 'Initial guidelines. Refer to AGENT_GUIDELINES.md', updatedAt: Date.now() };
guidelines.set(baseGuideline.id, baseGuideline);
const sampleTask: Task = { id: 'T-1', title: 'Implement core API', status: 'todo', version: 1, assignees: [], rationaleLog: [] };
tasks.set(sampleTask.id, sampleTask);

const app = express();
app.use(cors());
app.use(express.json({ limit: '200kb' }));

function auth(req: Request, res: Response, next: NextFunction) {
  const key = req.header('x-api-key');
  if (!key) return res.status(401).json({ error: 'missing_api_key' });
  const agent = [...agents.values()].find(a => a.apiKey === key);
  if (!agent) return res.status(401).json({ error: 'invalid_api_key' });
  (req as any).agent = agent;
  next();
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

// Routes
app.post('/agents/register', (req: Request, res: Response) => {
  const { name, role } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name_required' });
  const id = nanoid(8); const apiKey = nanoid(32);
  const agent: Agent = { id, name, apiKey, role };
  agents.set(id, agent);
  res.json({ id, apiKey });
});

app.get('/tasks', auth, (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  let list = [...tasks.values()];
  if (status) {
    const normalized = status.replace(/^open$/, 'todo').replace(/^completed$/, 'done');
    list = list.filter(t => t.status === normalized);
  }
  res.json(list);
});

app.post('/tasks', auth, (req: Request, res: Response) => {
  const { title, priority } = req.body || {};
  if (!title) return res.status(400).json({ error: 'title_required' });
  const id = 'T-' + nanoid(6);
  const task: Task = { id, title, status: 'todo', version: 1, assignees: [], priority, rationaleLog: [] };
  tasks.set(id, task);
  const actor = (req as any).agent?.id || 'system';
  auditLog.push({ id: nanoid(10), actor, entity: 'task', entityId: id, action: 'created', at: Date.now(), diff: { status: { to: 'todo' } } });
  broadcast({ type: 'task.created', task });
  res.status(201).json(task);
});

app.post('/tasks/:id/transition', auth, (req: Request, res: Response) => {
  const parse = transitionSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'validation_failed', details: parse.error.flatten() });
  const agent: Agent = (req as any).agent;
  const task = tasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: 'not_found' });
  const { newStatus, rationale, confidence, expectedVersion } = parse.data;
  if (task.version !== expectedVersion) return res.status(409).json({ error: 'version_conflict', currentVersion: task.version, task });
  if (newStatus === 'in_progress' && task.status !== 'todo') return res.status(400).json({ error: 'invalid_transition' });
  if (newStatus === 'done' && task.status !== 'in_progress') return res.status(400).json({ error: 'invalid_transition' });
  if (newStatus === 'blocked' && task.status === 'done') return res.status(400).json({ error: 'invalid_transition' });
  if (newStatus === 'in_progress' && !task.assignees.includes(agent.id)) task.assignees.push(agent.id);
  const prevStatus = task.status;
  task.status = newStatus as TaskStatus;
  task.version += 1;
  const entry = `[${new Date().toISOString()}] ${agent.id} -> ${newStatus} :: ${rationale}${confidence !== undefined ? ` (conf=${confidence})` : ''}`;
  task.rationaleLog.push(entry);
  auditLog.push({ id: nanoid(10), actor: agent.id, entity: 'task', entityId: task.id, action: 'status_change', at: Date.now(), diff: { status: { from: prevStatus, to: newStatus } } });
  broadcast({ type: 'task.updated', task });
  res.json(task);
});

app.get('/bugs', auth, (_req: Request, res: Response) => {
  res.json([...bugs.values()]);
});

app.post('/bugs', auth, (req: Request, res: Response) => {
  const parse = bugSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'validation_failed', details: parse.error.flatten() });
  const id = 'B-' + nanoid(6);
  const bug: Bug = { id, ...parse.data, createdAt: Date.now() };
  bugs.set(id, bug);
  broadcast({ type: 'bug.created', bug });
  res.status(201).json(bug);
});

app.get('/guidelines', auth, (_req: Request, res: Response) => {
  res.json([...guidelines.values()]);
});

app.post('/agents/:id/heartbeat', auth, (req: Request, res: Response) => {
  const agent: Agent = (req as any).agent;
  if (agent.id !== req.params.id) return res.status(403).json({ error: 'forbidden' });
  const { currentTaskId } = req.body || {};
  agent.lastHeartbeat = Date.now();
  agent.currentTaskId = currentTaskId;
  res.json({ ok: true, ts: agent.lastHeartbeat });
});

const startTime = Date.now();
const apiVersion = '0.1.0';

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true, tasks: tasks.size, agents: agents.size, version: apiVersion, ts: Date.now() });
});

app.get('/healthz', (_req: Request, res: Response) => {
  const now = Date.now();
  res.json({
    status: 'ok',
    version: apiVersion,
    uptimeMs: now - startTime,
    counts: { tasks: tasks.size, agents: agents.size, bugs: bugs.size },
    timestamp: now
  });
});

app.get('/audit', auth, (_req: Request, res: Response) => {
  res.json(auditLog.slice(-200));
});

// WebSocket events
const serverPort = process.env.PORT || 4000;
const server = app.listen(serverPort, () => {
  console.log(`Backend listening on :${serverPort}`);
});

interface OutboundEvent { type: string; [k: string]: any }
const wss = new WebSocketServer({ server, path: '/events' });

function broadcast(event: OutboundEvent) {
  const payload = JSON.stringify(event);
  wss.clients.forEach((c: WebSocket) => { if (c.readyState === WebSocket.OPEN) c.send(payload); });
}

wss.on('connection', (ws: WebSocket) => {
  ws.send(JSON.stringify({ type: 'hello', ts: Date.now() }));
});

export { app, agents, tasks, bugs, guidelines, auditLog };
