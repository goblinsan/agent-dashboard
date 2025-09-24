# Multi-Agent Project Dashboard — Product & Technical Spec (v1)
_Last updated: Sep 22, 2025_

## 1) Purpose & Vision
A React web app that acts as a **dashboard and coordination hub** for multi-layered projects and agent teams. It models nested projects → milestones → phases → tasks (tasks can nest), exposes a **discoverable API** for external agents (PM/Architect/DevOps/etc.) to read/write state, and computes **status roll-ups**, **effort remaining**, and a **Next Suggested Action** to keep work moving.

---

## 2) Core Concepts & Hierarchy
- **Project**: can contain subprojects (multi-layer). Holds goals, direction, personas, operational guidelines, DevOps configs, bug tracker, prioritization rubric.
- **Milestone**: e.g., “MVP1”. Contains phases.
- **Phase**: coherent grouping of tasks with a timebox or outcome theme (e.g., “Auth & User Model”).
- **Task**: work item that can be **nested** (a task may contain sub-tasks). Tasks support checklists, dependencies, owners, and acceptance criteria.
- **Persona**: a role an agent can adopt with operational limits (PM, Architect, DevOps, Lead Engineer, UI Engineer, Code Reviewer, Security Review).
- **Agent**: an automated actor (LLM or service) that reads/writes via the API, follows workflows/guidelines, and posts decisions, PR links, build logs, etc.
- **Bug**: tracked defect with severity/priority, linked to tasks/phases.

**Roll-up rules (summary):**
- Progress (0–100%) at each level = weighted average of children by **estimated effort**.
- Effort remaining = sum(child.remaining_effort) with buffers for risk.
- Status summary includes: % complete, blockers, risk (low/med/high), ETA.
- Next Suggested Action = algorithmic pick based on rubric (see §10).

---

## 3) Data Model (ERD & Schema)
> Storage: **PostgreSQL** (primary), **Redis** (caching + ephemeral agent coordination), **S3/Blob** for attachments. Optionally add **OpenSearch** for full-text later.

**Key entities**
- `projects` (self-referencing parent_id)
- `milestones`
- `phases`
- `tasks` (self-referencing parent_task_id)
- `personas`, `project_personas` (many-to-many w/ config)
- `agents` (registered external integrations)
- `bugs`
- `comments` (threaded, entity-scoped)
- `events` (audit log & webhook source)
- `guidelines` (operational + workflows + devops)
- `rubrics` (prioritization weights & formulas)

**Selected DDL (PostgreSQL)**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  parent_id UUID NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  direction TEXT,            -- overarching direction/goal
  goal TEXT,
  priority_scheme JSONB,     -- default rubric weights (see §9)
  personas JSONB,            -- allowed personas + limits (see §8)
  guidelines JSONB,          -- workflows/devops/security rules (see §7)
  devops_config JSONB,       -- CI/CD, envs, observability
  status_summary JSONB,      -- cached roll‑ups
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE milestones (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  due_date DATE,
  status TEXT CHECK (status IN ('not_started','in_progress','blocked','done')) DEFAULT 'not_started'
);

CREATE TABLE phases (
  id UUID PRIMARY KEY,
  milestone_id UUID NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  estimated_effort NUMERIC(10,2) DEFAULT 0,  -- in hours
  remaining_effort NUMERIC(10,2) DEFAULT 0,
  priority_score NUMERIC(10,2) DEFAULT 0,
  status TEXT CHECK (status IN ('not_started','in_progress','blocked','done')) DEFAULT 'not_started'
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  phase_id UUID NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  parent_task_id UUID NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  persona_required TEXT, -- e.g. 'LeadEngineer', 'SecurityReview'
  acceptance_criteria TEXT,
  effort_estimate NUMERIC(10,2) DEFAULT 0,
  effort_spent NUMERIC(10,2) DEFAULT 0,
  priority_score NUMERIC(10,2) DEFAULT 0,
  risk_level TEXT CHECK (risk_level IN ('low','medium','high')) DEFAULT 'low',
  severity TEXT CHECK (severity IN ('nice_to_have','minor','major','critical')) DEFAULT 'minor',
  status TEXT CHECK (status IN ('not_started','in_progress','blocked','in_review','done')) DEFAULT 'not_started',
  blocked_by UUID[], -- other task IDs
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE bugs (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT CHECK (severity IN ('S1','S2','S3','S4')),
  priority INTEGER CHECK (priority BETWEEN 1 AND 5) DEFAULT 3,
  status TEXT CHECK (status IN ('open','in_progress','in_review','closed')) DEFAULT 'open',
  linked_task_id UUID NULL REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE TABLE events (
  id UUID PRIMARY KEY,
  entity_type TEXT,   -- 'project'|'milestone'|'phase'|'task'|'bug'
  entity_id UUID,
  type TEXT,          -- 'created'|'updated'|'commented'|'status_change'|'agent_action'|...
  payload JSONB,
  created_by TEXT,    -- user or agent id
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 4) API (Agent-Friendly & Discoverable)
> REST first (OpenAPI), with optional GraphQL façade for UI. Serve **JSON Schema** for each entity and surface **.well-known** discovery.

**OpenAPI Paths (excerpt)**
```http
GET  /v1/.well-known/schemas            # lists entity schemas & links
GET  /v1/projects?parent_id=...         # list / search
POST /v1/projects                       # create
GET  /v1/projects/{id}
PATCH/PUT /v1/projects/{id}

GET  /v1/projects/{id}/milestones
POST /v1/milestones
GET  /v1/milestones/{id}
PATCH/PUT /v1/milestones/{id}

GET  /v1/phases/{id}
PATCH/PUT /v1/phases/{id}

GET  /v1/phases/{id}/tasks
POST /v1/tasks
GET  /v1/tasks/{id}
PATCH/PUT /v1/tasks/{id}
POST /v1/tasks/{id}:complete            # marks done; recalculates roll‑ups
POST /v1/tasks/{id}:block               # add blocker ref

GET  /v1/projects/{id}/bugs
POST /v1/bugs
PATCH/PUT /v1/bugs/{id}

GET  /v1/projects/{id}/status           # computed roll‑ups (project/milestones/phases)
GET  /v1/projects/{id}/next-action      # algorithmic suggestion (see §10)

POST /v1/agents/register                # register an agent & capabilities
POST /v1/agents/{id}/heartbeat
POST /v1/agents/{id}/events             # agent emits actions/links/logs

GET  /v1/events?entity_type=task&entity_id=...
POST /v1/comments                       # generic comments on any entity
```
**Discovery**
- GET /v1/.well-known/schemas returns JSON Schema URLs for project, milestone, phase, task, bug, persona, rubric, guidelines, devops_config.

- GET /v1/.well-known/personas lists built‑in personas and allowed operations.

**Webhook & Eventing**
- Outbound webhooks: configurable per project. Secret‑signed (HMAC‑SHA256).

- Event types: entity.created|updated|deleted, status.changed, priority.changed, agent.action, build.passed|failed, security.flag, pr.opened|merged, bug.opened|closed.

**Agent Contract(capabilities & limits)**
```json
{
  "id": "agent_lead_engineer_01",
  "persona": "LeadEngineer",
  "capabilities": ["task.create","task.update","task.complete","comment.create","bug.link"],
  "rate_limits": {"rpm": 60, "burst": 20},
  "operational_limits": {
    "can_modify_guidelines": false,
    "can_change_rubric": false,
    "allowed_projects": ["*"]
  },
  "callback_url": "https://agent.example/callback",
  "public_key_pem": "..."
}
```

---

## 5) Frontend (React) — UX & Architecture
- Stack: React 18 + Vite, TypeScript, TanStack Router (or React Router), TanStack Query for server cache, Zustand for local UI state, Tailwind + shadcn/ui, Recharts for charts.
- Dashboard widgets, drill-down pages, persona view, bug detail.
- Keyboard accessible; high-contrast theme.

**Top‑Level Nav**
- Dashboard (All Projects) — roll‑up view with drill‑downs.
- Worklist — personalized queue by persona/owner.
- Bugs — cross‑project bug list & trends.
- Activity — event stream with filters.
- Settings — personas, rubrics, guidelines, webhooks, agent registry.

**Dashboard Widgets**
- Portfolio heatmap: progress by project (sparkline + % complete).
- Burn‑down / burn‑up for milestones.
- Effort remaining by phase; critical path; blocker graph.
- “Next Suggested Action” panel.

**Drill‑down Pages**
- Project detail → Milestones → Phase → Task tree (collapsible), with checklists & dependencies graph.
- Persona view: shows tasks eligible for that persona + operational limits.
- Bug detail: linkage to tasks, severity trend chart.

**Component Sketch (partial)**
```http
<AppLayout>
  <Header/> <Sidebar/> <Outlet/>
</AppLayout>

Routes:
/                    -> <PortfolioDashboard/>
/projects/:id        -> <ProjectOverview/>
/projects/:id/plan   -> <ProjectPlanTree/>
/milestones/:id      -> <MilestoneView/>
/phases/:id          -> <PhaseBoard/>
/tasks/:id           -> <TaskDetail/>
/bugs                -> <BugList/>
/bugs/:id            -> <BugDetail/>
/settings/...        -> <SettingsRoot/>
```
**State/Queries (examples)**
- `usePortfolioSummary()` → `/v1/projects?aggregate=true`
- `useProjectStatus(id)` → `/v1/projects/{id}/status`
- `useNextAction(projectId)` → `/v1/projects/{id}/next-action`
- Infinite activity stream with filters → `/v1/events` (SSE or WebSocket optional)

Accessibility: keyboard‑navigable tree for tasks; ARIA roles; high‑contrast theme.

---

## 6) Task Tree & Dependencies
- Unbound Nested tasks via `parent_task_id` with DAG checks on blockers.
- Derived fields: progress = effort_spent / effort_estimate (bounded [0,1]).
- Roll‑up recompute triggers: on task create/update/complete/block.
- Blocker visualization: directed graph (blocked_by). Detect cycles; surface critical path (DAG on ready tasks).

---

## 7) Operational Guidelines & DevOps Config
- Workflows of persona interactions; CI/CD; environments; observability; security gates.

**Guidelines JSON shape**
```json
{
  "workflows": {
    "persona_interactions": [
      {"from":"ProjectManager","to":"Architect","trigger":"new_phase_spec","handoff":"PRD link"},
      {"from":"Architect","to":"LeadEngineer","trigger":"arch_review_passed","handoff":"ADR link"},
      {"from":"LeadEngineer","to":"CodeReviewer","trigger":"pr_opened","handoff":"PR URL"},
      {"from":"CodeReviewer","to":"SecurityReview","trigger":"labels:security","handoff":"threat_model.md"}
    ]
  },
  "devops": {
    "repos": ["github.com/org/app"],
    "branching": "trunk+PRs",
    "ci": {"provider":"GitHubActions","workflows":["build.yml","test.yml","deploy.yml"]},
    "environments": ["dev","staging","prod"],
    "observability": {"logs":"OTLP","metrics":"Prometheus","traces":"OpenTelemetry"}
  },
  "security": {
    "dependency_policy": "deny: GPL-3.0",
    "secrets_scanning": true,
    "sast": true,
    "container_scanning": true
  }
}
```
---

## 8) Personas (Roles & Limits)
- PM, Architect, DevOps, Lead Engineer, UI Engineer, Code Reviewer, Security Review.

```json
[
  {"name":"ProjectManager","goal":"maintain focus; eliminate scope creep; achieve milestones","can": ["milestone.update","phase.prioritize","task.prioritize","comment.create"], "limits": {"no_code_writes": true}},
  {"name":"Architect","goal":"sound extensible design; track structure","can":["task.create","task.update","adr.create","risk.flag"],"limits": {"no_prod_deploy": true}},
  {"name":"DevOps","goal":"clean fast builds; observability","can":["pipeline.update","env.configure","deploy.trigger"],"limits": {"prod_requires_approval": true}},
  {"name":"LeadEngineer","goal":"clean maintainable code","can":["task.update","pr.open","task.complete"],"limits": {"requires_review": true}},
  {"name":"UIEngineer","goal":"intuitive UI","can":["task.update","design.link","story.add"],"limits": {"requires_accessibility_check": true}},
  {"name":"CodeReviewer","goal":"prevent sprawl & tech debt","can":["review.request_changes","review.approve"],"limits": {}},
  {"name":"SecurityReview","goal":"prevent harmful actions & vulns","can":["threat_model.review","policy.block"],"limits": {"can_block_merge": true}}
]
```

---

## 9) Prioritization Rubric (WSJF-inspired)
- WSJF with weights + readiness/impact boosts; normalized scoring.

**Inputs per task/phase**
- business_value (1–10)
- time_criticality (1–10)
- risk_reduction (1–10)
- effort_estimate (hours)
- blocking_penalty (+0..+5) if task unblocks many
- security_penalty (+0..+5) for unresolved security flags (raises priority)

**Formula**
`WSJF = (w1*business_value + w2*time_criticality + w3*risk_reduction + w4*blocking_penalty + w5*security_penalty) / max(effort_estimate, 0.5)`

Default weights: w1=1.0, w2=0.8, w3=0.7, w4=0.6, w5=1.2 (project‑level override via priority_scheme).

**Priority score scaling**: normalize to 0–100 per phase bucket using min‑max across siblings.

---

## 10) Next Suggested Action (NSA) Algorithm

**Goal**: pick the most impactful, ready‑to‑start item, per persona if provided.

**Steps**
- Filter candidate tasks: status in ('not_started','in_progress'), blocked_by empty, acceptance criteria present.
- Compute **Readiness Score** = normalized(spec_quality + owner_available + env_ready + dependencies_ready).
- Compute **Impact Score** = normalized(WSJF) with additional boosts:
  - +10 if closes a phase; +20 if closes a milestone; +30 if closes project.
- Apply **Persona Fit**: boost tasks whose persona_required matches persona filter.
- Penalize if `risk_level=high` and no security review scheduled.
- Rank by `FinalScore = 0.5*Readiness + 0.5*Impact` (tunable per project).
- Return top 3 with rationale, plus quick actions (assign, start, open PR, create ADR).

**API Response Example**

```json
{
  "project_id":"...",
  "persona":"LeadEngineer",
  "suggestions":[
    {
      "task_id":"...",
      "title":"Implement OAuth token refresh",
      "final_score":87.3,
      "reasons":["Highest WSJF in phase","Unblocks login tests","Spec approved by Architect"],
      "quick_actions":[{"type":"assign","assignee":"agent_lead_engineer_01"},{"type":"start"}]
    }
  ]
}
```

---

## 11) Status & Effort Roll-ups
- **Task remaining** = max(effort_estimate - effort_spent, 0) (plus optional risk buffer: +10% if risk=medium, +25% if high).
- **Phase remaining** = sum(task.remaining) across subtree.
- **Milestone remaining** = sum(phase.remaining).
- **Project remaining** = sum(all milestone.remaining + subproject.remaining).
- **% Complete** at each level: `1 - (remaining / total_estimate)`; clamp 0–100.
- **ETA**: based on recent velocity (hours completed/week) × remaining (project‑level velocity smoothing EMA(α=0.3)).

---

## 12) Security, AuthN/Z & Audit
- **Auth**: OIDC (Auth0/Cognito) + PATs for agents.
- **RBAC**: roles admin, maintainer, contributor, viewer, agent.
- **Field‑level guards**: personas cannot exceed operational limits (enforced server‑side).
- **Audit**: immutable events append‑only; cryptographic signatures for agent actions.
- **Rate limits**: per user/agent (rpm, burst); WAF rules.
- **Secrets**: Vault or KMS; never store private keys.

---

## 13) DevOps
- **Backend**: Node.js (Fastify) or Python (FastAPI). Containerized. Postgres via Prisma/SQLAlchemy.
- **CI/CD**: GitHub Actions (build, test, lint, SCA, SAST). Canary deploys.
- **Infra**: Terraform modules. Envs: dev, staging, prod.
- **Observability**: OpenTelemetry traces; metrics (latency p95, error rate, NSA compute time); structured logs.
- **Migrations**: Flyway or Prisma migrate.

---

## 14) Agent Integration
- **Coordination bus**: Redis Streams agent:events, agent:work, with per‑project stream keys.
- **Claim/ack protocol**: agents claim tasks via /v1/tasks/{id}:start (server emits event and publishes to Redis stream).
- **Idempotency**: agents include Idempotency-Key on writes.
- **Back‑pressure**: server can throttle via 429 + Retry-After and pause stream partitions.

**Redis Message (example)**
```json
{
  "type":"work.assigned",
  "task_id":"...",
  "persona":"CodeReviewer",
  "url":"https://app/tasks/...",
  "deadline":"2025-09-25T17:00:00Z"
}
```

---

## 15) Bug Tracker (MVP)
- CRUD + link to tasks.
- Severity (S1–S4), Priority (1–5), Status.
- SLA policies per severity.
- Charts: open vs closed over time; mean time to resolve.

---

## 16) Example Seed JSON
```json
{
  "project": {"name":"Multi-Agent Dashboard","goal":"Ship MVP1","direction":"Agent-assisted"},
  "milestones":[{"name":"MVP1","due_date":"2025-11-15"}],
  "tasks":[
    {"title":"Design DB schema","persona_required":"Architect","effort_estimate":16},
    {"title":"Implement /v1/.well-known","persona_required":"LeadEngineer","effort_estimate":10}
  ]
}
```

---

## 17) UI Acceptance Criteria (MVP)
- Portfolio page shows all projects with: % complete, remaining effort, risk badge, next action.
- Drill‑down to milestone → phase → task tree with inline editing.
- Create/edit tasks with persona requirement and dependencies.
- Compute and display next suggested actions per project & per persona.
- Agent registry UI with heartbeat status and last action.
- Bug list with filters by severity/status and linking to tasks.

---

## 18) Roadmap
**MVP (4–6 weeks)**
- DB schema + migrations
- Core REST API + .well‑known
- React app with dashboard, project tree, basic NSA
- Agent registry + Redis bus + outbound webhooks
- Basic bug tracker

**Post‑MVP**
- GraphQL façade
- Full‑text search (OpenSearch)
- SLA policies & alerting
- Cross‑project dependency graph + critical path
- Advanced security gates & policy engine (OPA)
- AI summarization of status updates

---

## 19) NFRs
- **Performance**: p95 API < 200ms for reads, < 500ms for writes; NSA compute < 2s at P50.
- **Scalability**: 10k projects, 1M tasks, 100 concurrent agents.
- **Reliability**: 99.9% uptime; RPO 15m, RTO 1h.
- **Compliance**: SOC2‑friendly logging & access controls.

---

## 20) Decisions (resolved)
- Phases optional? ✅ Yes (tasks may attach directly to milestones).
- Manual progress override? ✅ Supported (requires audit event status.manual_override and stores prior computed values for diff).
- Persona arbitration? ✅ Optimistic locking + server arbiter (version field on tasks; conflicts routed to arbiter service which applies project policy).
