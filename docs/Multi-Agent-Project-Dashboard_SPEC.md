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
-- (DDL trimmed here for brevity; keep full in repo if desired)
```
(See the canvas for the full DDL block.)

---

## 4) API (Agent-Friendly & Discoverable)
> REST first (OpenAPI), with optional GraphQL façade for UI. Serve **JSON Schema** for each entity and surface **.well-known** discovery.

**OpenAPI Paths (excerpt)**
```http
GET  /v1/.well-known/schemas
GET  /v1/projects
POST /v1/projects
GET  /v1/projects/{id}
PATCH/PUT /v1/projects/{id}
POST /v1/milestones
POST /v1/tasks
PATCH/PUT /v1/tasks/{id}
GET  /v1/projects/{id}/status
GET  /v1/projects/{id}/next-action
POST /v1/agents/register
POST /v1/agents/{id}/events
GET  /v1/events
```
(Full list in canvas spec.)

---

## 5) Frontend (React) — UX & Architecture
- React 18 + Vite, TypeScript, TanStack Query/Router, Tailwind/shadcn/ui, Recharts.
- Dashboard widgets, drill-down pages, persona view, bug detail.
- Keyboard accessible; high-contrast theme.

---

## 6) Task Tree & Dependencies
- Nested tasks via `parent_task_id` with DAG checks on blockers.

---

## 7) Operational Guidelines & DevOps Config
- Workflows of persona interactions; CI/CD; environments; observability; security gates.

---

## 8) Personas (Roles & Limits)
- PM, Architect, DevOps, Lead Engineer, UI Engineer, Code Reviewer, Security Review.

---

## 9) Prioritization Rubric (WSJF-inspired)
- WSJF with weights + readiness/impact boosts; normalized scoring.

---

## 10) Next Suggested Action (NSA) Algorithm
- Filters, readiness score, impact score, persona fit, ranking, quick actions.

---

## 11) Status & Effort Roll-ups
- Remaining effort, % complete, ETA via velocity EMA.

---

## 12) Security, AuthN/Z & Audit
- OIDC + PATs, RBAC, audit events, rate limits, vault/KMS.

---

## 13) DevOps
- FastAPI backend, CI/CD, Terraform infra, OpenTelemetry.

---

## 14) Agent Integration
- Redis Streams for agent coordination; webhooks; idempotency.

---

## 15) Bug Tracker (MVP)
- Severity, priority, status; SLA & charts.

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
- Portfolio roll-up, task tree, NSA display, agent registry, bug list.

---

## 18) Roadmap
- MVP then GraphQL, search, SLA, critical path, OPA, AI summaries.

---

## 19) NFRs
- Perf, scale, reliability, compliance targets.

---

## 20) Decisions (resolved)
- Phases optional; manual progress override supported; optimistic locking + server arbiter.
