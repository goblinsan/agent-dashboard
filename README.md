# AI Agent Dashboard

Collaborative coordination hub for multiple specialized AI (and human) agents: centralized tasks, bug reports, status updates, design notes, and architectural decisions.

## Core References
- Project Plan: `PROJECT_PLAN.md`
- Prioritization Rubric: `PRIORITIZATION.md`
- Agent Guidelines: `AGENT_GUIDELINES.md`
- Personas: `personas/` (Architect, Code Reviewer, Project Manager, QA Tester, Security Agent)
- ADR Template: `docs/adr/ADR-Template.md`

## Quick Start (Backend Dev)
```bash
cd backend
npm install
npm run dev   # (if a dev script is later added) or: npx ts-node src/server.ts
```

Server defaults to `http://localhost:4000`.

## Minimal Dashboard (MVP UI)
After starting the backend you can access a lightweight dashboard at the root URL (`/`). It provides:
- API key input (persisted in `localStorage`).
- Auto-refresh (every ~7s) lists for Tasks, Bugs, and recent Status Updates.
- Inline create-task form (title + optional priority) with immediate refresh.
- Inline status update submission form (posts global updates).

Soft-deleted records are excluded (there is currently no UI toggle to show or restore them; use API calls below). A future enhancement may add a "Show Deleted" toggle + restore buttons.

### Quick UI Tour
1. Register an agent (get API key):
	 ```bash
	 curl -s -X POST http://localhost:4000/agents/register \
		 -H 'Content-Type: application/json' \
		 -d '{"name":"ui-user","role":"dev"}' | jq
	 ```
2. Open `http://localhost:4000/` in a browser.
3. Paste the `apiKey` into the field; click Save.
4. Create a task via the form (e.g. "Draft MVP criteria"). It will appear in the Tasks list.
5. Use API calls (or future UI forms) to post status updates; they appear in the Status Updates panel.

Error states (missing/invalid key) appear as a red banner. Soft-deleted entities are intentionally excluded from the dashboard lists (restored items reappear automatically).

### Posting a Status Update (via API)
```bash
curl -s -X POST http://localhost:4000/status-updates \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"message":"Dashboard smoke OK"}' | jq
```

### Soft Delete / Restore (UI Visibility)
Currently deletion & restoration are API-only. Example:
```bash
TASK_ID=... # existing task id
curl -X DELETE -H "x-api-key: $API_KEY" http://localhost:4000/tasks/$TASK_ID
curl -H "x-api-key: $API_KEY" http://localhost:4000/tasks | jq   # task gone
curl -X POST -H "x-api-key: $API_KEY" http://localhost:4000/tasks/$TASK_ID/restore
curl -H "x-api-key: $API_KEY" http://localhost:4000/tasks | jq   # task visible again
```

Planned incremental UI enhancements (post-MVP): toggle to show deleted items + restore buttons, design notes list, WebSocket-driven live updates.

### Health Endpoints
All responses follow the standard envelope: `{ success: true, data: ... }` or `{ success: false, error: { code, message, details? } }`.

| Endpoint | Description | Example (truncated) |
|----------|-------------|---------------------|
| `GET /health` | Basic counts & version | `{ "success": true, "data": { "tasks": 1, "agents": 0, "version": "0.1.0" }}` |
| `GET /healthz` | Rich uptime payload | `{ "success": true, "data": { "status":"ok","uptimeMs":12345,... }}` |

### Agent Registration Flow
1. `POST /agents/register { name, role }` → returns `{ id, apiKey }`.
2. Use `x-api-key` header for authenticated endpoints (`/tasks`, `/bugs`, etc.).

### Example (cURL)
```bash
curl -s -X POST http://localhost:4000/agents/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"build-bot","role":"dev"}'

API_KEY=... # from previous output
curl -s -H "x-api-key: $API_KEY" http://localhost:4000/healthz | jq

### Standard Response Envelope

| Field | Type | Notes |
|-------|------|-------|
| `success` | boolean | True on success, false on failure |
| `data` | any | Present only when `success=true` |
| `error.code` | string | Machine-readable stable error code |
| `error.message` | string | Human-readable (may match code) |
| `error.details` | object | Optional structured validation/context |

Error example (invalid transition):
```json
{
	"success": false,
	"error": { "code": "invalid_transition", "message": "invalid_transition" }
}
```

### Common Error Codes
| Code | Meaning |
|------|---------|
| `missing_api_key` | Auth header absent |
| `invalid_api_key` | API key not recognized |
| `name_required` | Agent registration missing name |
| `title_required` | Task creation missing title |
| `validation_failed` | Schema validation error (see `error.details`) |
| `version_conflict` | Optimistic concurrency mismatch |
| `invalid_transition` | Disallowed status change |
| `not_found` | Resource or route not found |
| `forbidden` | Actor not permitted |
| `internal_error` | Unhandled server exception |
```

### Architectural Tenets (Excerpt)
1. Ship narrow vertical MVP first.
2. Schema-first; explicit contracts.
3. Mutation auditability.
4. Replaceable persistence (Phase 3).

## Domain Types (Early Draft)
See `shared/types/index.ts` for `Task`, `BugReport`, `StatusUpdate`, `DesignNote`, and `AuditEntry` definitions.

## API Specification
An evolving OpenAPI spec lives at `backend/openapi.yaml` (current: 0.5.0). Keep this file updated with any new endpoints or schema changes before merging functional changes.

Status enum has been migrated to: `todo | in_progress | blocked | done` (legacy `open/completed` still accepted only via query normalization temporarily).

### Multi-Project Support (v0.5.0+)
The backend now supports isolating data across multiple logical projects.

Core concepts:
* Every request that creates or lists project-scoped entities (`tasks`, `bugs`, `status-updates`, `design-notes`) can specify a project via the `x-project-id` header.
* If the header is absent, the implicit project id `default` is used (seeded on startup / via migrations).
* Archived or unknown project ids return `404` (`project_not_found`).
* Projects themselves are not auto-deleted; archiving hides them from default listings while preserving data.

Project lifecycle endpoints:
```bash
# List active projects
curl -s -H "x-api-key: $API_KEY" http://localhost:4000/projects | jq

# Include archived projects
curl -s -H "x-api-key: $API_KEY" "http://localhost:4000/projects?includeArchived=1" | jq

# Create a project (custom id optional)
curl -s -X POST -H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"id":"alpha","name":"Alpha Project","description":"Exploration"}' \
	http://localhost:4000/projects | jq

# Archive (cannot archive 'default')
curl -s -X POST -H "x-api-key: $API_KEY" http://localhost:4000/projects/alpha/archive | jq

# Restore
curl -s -X POST -H "x-api-key: $API_KEY" http://localhost:4000/projects/alpha/restore | jq
```

Using a specific project for tasks:
```bash
# Create task in project 'alpha'
curl -s -X POST http://localhost:4000/tasks \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-H 'x-project-id: alpha' \
	-d '{"title":"Alpha scoped task"}' | jq

# List tasks only in 'alpha'
curl -s -H "x-api-key: $API_KEY" -H 'x-project-id: alpha' http://localhost:4000/tasks | jq

# Listing without header still targets 'default'
curl -s -H "x-api-key: $API_KEY" http://localhost:4000/tasks | jq
```

Isolation Guarantee (in-memory & SQLite):
* Each entity row is tagged with `project_id`.
* List endpoints filter by the selected project id.
* Cross-project leakage is prevented by repository-level filtering.

Edge Cases:
* Supplying an archived project id → `404 not_found` with code `not_found` (message `project_not_found`).
* Attempting to archive the `default` project → `403 forbidden`.
* Creating a project with an existing id → `400 validation_failed` (details include `already_exists`).

Future Enhancements:
* UI project selector dropdown.
* Optional cross-project aggregate endpoints (e.g., global metrics) with explicit opt-in.
* Project-level role scoping / permissions.

### Browser Dashboard Enhancements (Post v0.5.0)
The static dashboard (`backend/public/index.html`) now includes:
* Auto agent registration: if no API key is stored, a lightweight agent is registered (`web-<random>`), and the returned key is saved.
* Project management panel: list, create, select, archive, and restore projects directly in the browser.
* Per-project context: all task / bug / status update operations send `x-project-id` for the selected project (defaults to `default`).
* Visual active project indicator and immediate refresh upon switching.

Limitations:
* No delete (hard removal) of projects—only archive/restore.
* Design notes & bug creation UI still omitted (API only for now).
* Role-based restrictions not surfaced visually (errors still appear in banner).

Planned UI follow-ups:
* Design note creation and listing pane.
* Bug report creation form and transitions.
* WebSocket-driven live updates (currently polling every 7s).
* Inline project description editing.

### OpenAPI Linting
Run Spectral against the spec to catch contract issues:
```bash
cd backend
npm run lint:openapi
```
CI integration (planned) will enforce a clean lint before merge.

### Audit Retention
The audit log is in-memory and automatically pruned to a maximum size.

Environment variable:
`MAX_AUDIT_ENTRIES` (default: `5000`)

Behavior: When the cap is exceeded, oldest entries are removed in a single splice so memory usage stays roughly bounded. See `docs/adr/ADR-0002-audit-log-retention.md`.

Querying:
`GET /audit?limit=100` (max 500) returns the most recent entries (bounded by limit and retention window).

### Core Task & Bug Examples
Assuming you have an `API_KEY` from agent registration.
```bash
# Create a task
curl -s -X POST http://localhost:4000/tasks \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"title":"Investigate memory usage","priority":"high"}' | jq

# Transition task (optimistic concurrency - version must match)
TASK_ID=... # from previous output
VERSION=0   # initial version
curl -s -X POST http://localhost:4000/tasks/$TASK_ID/transition \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"newStatus":"in_progress","rationale":"Starting work","expectedVersion":'$VERSION'}' | jq

# Report a bug
curl -s -X POST http://localhost:4000/bugs \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"title":"Crash on save","severity":"high","reproSteps":["Open app","Click Save","Observe crash"]}' | jq

# Update a bug (optimistic concurrency)
BUG_ID=... # from previous bug creation
BUG_VERSION=1 # initial bug version (1 on creation)
curl -s -X PATCH http://localhost:4000/bugs/$BUG_ID \
  -H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"proposedFix":"Guard null pointer","expectedVersion":'$BUG_VERSION'}' | jq

# Version conflict example (reusing old version)
curl -s -X PATCH http://localhost:4000/bugs/$BUG_ID \
  -H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
  -d '{"proposedFix":"Another change","expectedVersion":'$BUG_VERSION'}' | jq

# Post a global status update
curl -s -X POST http://localhost:4000/status-updates \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"message":"Build pipeline green"}' | jq

# Post a task-scoped status update
curl -s -X POST http://localhost:4000/status-updates \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"message":"Refactoring in progress","taskId":"'$TASK_ID'"}' | jq

# Fetch last 10 status updates since a timestamp
SINCE=$(date +%s%3N) # capture current epoch ms
curl -s -H "x-api-key: $API_KEY" "http://localhost:4000/status-updates?limit=10&since=$SINCE" | jq

# Offset pagination: skip newest 10, get next 5
curl -s -H "x-api-key: $API_KEY" "http://localhost:4000/status-updates?limit=5&offset=10" | jq

# Create a design note
curl -s -X POST http://localhost:4000/design-notes \
	-H "x-api-key: $API_KEY" -H 'Content-Type: application/json' \
	-d '{"title":"Select persistence layer","context":"Need simple local dev store","decision":"Use SQLite first","consequences":"Low ops overhead, later migration path"}' | jq

# List design notes (limit 5)
curl -s -H "x-api-key: $API_KEY" "http://localhost:4000/design-notes?limit=5" | jq

# Offset pagination for design notes: second page (items 6-10 if they exist)
curl -s -H "x-api-key: $API_KEY" "http://localhost:4000/design-notes?limit=5&offset=5" | jq
```

### Pagination Model
Offset pagination is applied from the newest items (reverse chronological) for status updates and design notes.
Formula (conceptually): take full list sorted oldest→newest, slice from the end with `offset + limit`, then take first `limit` of that slice → stable windows relative to newest.

Fields:
- `limit` (default 50, cap 200)
- `offset` (default 0) counts how many newest items to skip
- `since` (status updates only) filters by creation time before pagination windowing

### Data Export / Import
Portable JSON snapshots let you backup or migrate between in-memory and SQLite modes.

Export (writes to stdout):
```bash
cd backend
npm run data:export > snapshot.json
```
Or specify a file path:
```bash
npm run data:export -- --file ./data/export-$(date +%s).json
```

Import (CAUTION: naive insert-only; best on empty datasets):
```bash
npm run data:import -- snapshot.json
```
The import script will create entities using current repository implementation. IDs and versions may differ from original; reconciliation/upsert not yet implemented.

### Role-Based Authorization (Experimental)
Role enforcement is disabled by default. Set `ENFORCE_ROLES=1` to enable rudimentary role checks.

Current behavior when enabled:
- `POST /design-notes` requires agent role in: `architect | pm`.

All other endpoints are currently unrestricted (authentication via `x-api-key` still required). Agents obtain a role at registration time: `POST /agents/register { name, role }`.

Example (Windows bash / cross-env pattern if needed):
```bash
ENFORCE_ROLES=1 npm run dev
# or
cross-env ENFORCE_ROLES=1 npm run dev
```
If an agent without required role attempts a protected action, response:
```json
{ "success": false, "error": { "code": "forbidden", "message": "forbidden" } }
```

### Soft Delete & Restore (Experimental)
Entities (`tasks`, `bugs`, `design-notes`) support soft deletion and restoration via endpoints:

```bash
DELETE /tasks/:id              # soft delete
POST   /tasks/:id/restore      # restore previously deleted
DELETE /bugs/:id
POST   /bugs/:id/restore
DELETE /design-notes/:id
POST   /design-notes/:id/restore
```

Behavior:
- Delete marks the entity with `deletedAt` (not permanently removed).
- Restore clears `deletedAt` making it visible again in default listings.
- Default list endpoints exclude soft-deleted records.
- Use `?includeDeleted=1` query parameter on list endpoints (`/tasks`, `/bugs`, `/design-notes`) to include them.
- A second delete call on an already deleted entity returns `{ alreadyDeleted: true }`.
- A restore call on an already active (not deleted) entity returns `{ alreadyActive: true }`.
- Audit log records `soft_deleted` and `restored` actions.

List with deleted included:
```bash
curl -H "x-api-key: $API_KEY" "http://localhost:4000/tasks?includeDeleted=1" | jq
```
You can then call restore on selected ids.

Example (Task lifecycle):
```bash
# Delete a task
afterId=T-123
curl -X DELETE -H "x-api-key: $API_KEY" http://localhost:4000/tasks/$afterId

# Fetch including deleted
curl -H "x-api-key: $API_KEY" "http://localhost:4000/tasks?includeDeleted=1" | jq

# Restore the task
curl -X POST -H "x-api-key: $API_KEY" http://localhost:4000/tasks/$afterId/restore

# Now visible without includeDeleted
curl -H "x-api-key: $API_KEY" http://localhost:4000/tasks | jq
```

Limitations / Roadmap:
- No bulk restore/undelete endpoint yet.
- Physical purge may follow later (cron / retention window) to hard-delete aged soft-deleted entities.
- Import/export currently treats deleted items as normal objects; future tooling may optionally exclude or differentiate them.

### Contributing Workflow (Condensed)
1. Select a Todo task from plan; move to In-Progress.
2. Implement minimal change + tests (when harness present).
3. Update plan & Logical Next Steps timestamp.
4. Commit with conventional style (e.g., `feat:`, `chore:`).

## Roadmap Snapshot
| Phase | Focus (Summary) |
|-------|-----------------|
| 0 | Foundations (docs, types, health) |
| 1 | Task & Bug CRUD API |
| 2 | Status Updates & Design Notes |
| 3 | Persistence, Authorization & Archival (completed) |
| 4 | Minimal Dashboard UI (in progress) |
| 5 | Observability & Automation (upcoming) |

Full details in `PROJECT_PLAN.md`.

## Security (Early)
Basic dependency scanning & validation layering planned. See Security Agent persona.

## Continuous Integration
A GitHub Actions workflow (`.github/workflows/ci.yml`) runs on pushes and PRs to `main`:
- Install workspace dependencies
- Build & test backend (`ci:verify`)
- Lint OpenAPI spec
- Publish versioned OpenAPI file to `dist/` and upload artifact
- Generate dependency vulnerability report (`audit-report.json`) and upload as artifact

To replicate locally:
```bash
cd backend
npm run ci:verify   # produces dist + audit-report.json
```
Artifacts:
- `openapi-spec` (downloadable YAMLs)
- `dependency-audit` (JSON vulnerability summary)

## Dependency Audit Format
The script `scripts/dependency-scan.cjs` normalizes `npm audit --json` output into:
```json
{
  "generatedAt": 1720000000000,
  "advisories": [
    { "id": 123, "module": "example", "severity": "moderate", "title": "Prototype Pollution", "url": "https://...", "vulnerable_versions": "<2.0.0", "recommendation": "Update available" }
  ],
  "meta": { "total": 1, "severities": { "low":0, "moderate":1, "high":0, "critical":0 } }
}
```
Enforcement (e.g., failing on high/critical) can be added later by post-processing this JSON.

## Persistence (Phase 3 - Experimental)
Default runtime remains in-memory. SQLite support is OPTIONAL: the native driver `better-sqlite3` is now an `optionalDependency`. If it is not installed (e.g. missing build toolchain), the application seamlessly falls back to in-memory stores.

### Enabling SQLite
```bash
cd backend
npm install          # installs optional deps (will attempt better-sqlite3)
npm run migrate      # OR: npm run migrate:if-present (skips if driver missing)
PERSISTENCE=sqlite npm run dev   # use cross-env on Windows shells
```
Data file defaults to `backend/data/agent-dashboard.db`.

### Windows / Native Build Requirements
`better-sqlite3` builds native bindings. On Windows you need:
- Visual Studio 2022 (or Build Tools) with "Desktop development with C++" workload
- Latest Windows 10/11 SDK
- Python 3 installed and on PATH
- (Optional) Use Node LTS (v20.x) if prebuilt binaries lag for newer Node releases

After installing tooling:
```bash
npm rebuild better-sqlite3
```

If install fails or you skip installing build tooling, you will see a startup log indicating fallback to in-memory. CI uses `migrate:if-present` so builds are not blocked when the native module is absent.

### Migrations
Migrations live in `backend/migrations/*.sql` and are applied by:
* `npm run migrate` (hard-requires SQLite driver) 
* `npm run migrate:if-present` (skips gracefully if `better-sqlite3` is not installed)

Applied migrations are recorded in the `_migrations` table.

### Current Coverage
Implemented repositories (SQLite): Tasks, Bugs, StatusUpdates, DesignNotes.

### Roadmap
- Role-based authorization middleware
- Soft delete (archival flag) for core entities
- Optional: Persist audit log
- Upsert-aware import (id & version preservation)
- CI matrix job exercising SQLite path
- Cursor pagination evaluation

## License
Licensed under the Apache License, Version 2.0 (the "License"); you may not use this project except in compliance with the License. You may obtain a copy of the License in the `LICENSE` file at the repository root or at:

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

Copyright 2025 The AI Agent Dashboard Contributors.

---
Generated initial README expansion; refine as APIs evolve.
