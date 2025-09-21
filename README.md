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
An evolving OpenAPI spec lives at `backend/openapi.yaml` (current: 0.3.2). Keep this file updated with any new endpoints or schema changes before merging functional changes.

Status enum has been migrated to: `todo | in_progress | blocked | done` (legacy `open/completed` still accepted only via query normalization temporarily).

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

### Contributing Workflow (Condensed)
1. Select a Todo task from plan; move to In-Progress.
2. Implement minimal change + tests (when harness present).
3. Update plan & Logical Next Steps timestamp.
4. Commit with conventional style (e.g., `feat:`, `chore:`).

## Roadmap Snapshot
| Phase | Focus |
|-------|-------|
| 0 | Foundations (docs, types, health) |
| 1 | Task & Bug CRUD API |
| 2 | Status Updates & Design Notes |
| 3 | Persistence & Role Guardrails |
| 4 | Observability & Automation |

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
Implemented repositories (SQLite): Tasks, Bugs (StatusUpdates & DesignNotes still in-memory until finalized schema adaptation).

### Roadmap
- Add SQLite status updates & design notes repos
- Optional: Persist audit log
- Export/import JSON utility for portability

## License
TBD (add license file if open sourcing publicly).

---
Generated initial README expansion; refine as APIs evolve.
