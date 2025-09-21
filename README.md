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
An evolving OpenAPI spec lives at `backend/openapi.yaml`. Keep this file updated with any new endpoints or schema changes before merging functional changes.

Status enum has been migrated to: `todo | in_progress | blocked | done` (legacy `open/completed` still accepted only via query normalization temporarily).

## Contributing Workflow (Condensed)
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

## License
TBD (add license file if open sourcing publicly).

---
Generated initial README expansion; refine as APIs evolve.
