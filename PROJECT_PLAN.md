# Project Plan: AI Agent Dashboard

Last Updated: 2025-09-21T12:40:00Z
Auto-Refresh Directive: After any task moves to Done, the responsible agent MUST (a) update status fields, (b) add emergent follow-up tasks, (c) prune obsolete tasks, and (d) refresh the Logical Next Steps section timestamp.

## 1. Vision & High-Level Goal
Provide a shared, machine-readable and human-friendly dashboard through which multiple specialized AI (and human) agents can: (1) ingest project direction, constraints, and current status; (2) create, update, and complete tasks, bug reports, and design docs; (3) maintain auditable change history; and (4) converge quickly on an MVP that proves value.

### Core Outcome (MVP)
An operational backend + minimal UI (or structured API endpoints) enabling:
1. Create/read/update tasks with status transitions and ownership.
2. Submit status updates and design notes with timestamps and provenance.
3. Log bug reports with severity, reproduction steps, and linkage to tasks.
4. Expose a structured JSON (or GraphQL/REST) endpoint for agent consumption.
5. Provide guardrails (auth/role placeholders, validation, rate limiting stub) to prevent corruption / conflicting writes.

### Success Metrics (Initial)
| Metric | Target | Notes |
|--------|--------|-------|
| MVP Task CRUD Latency | < 300ms p95 (local) | Simple in-memory or lightweight DB acceptable initially |
| Mean Time to Status Sync | < 1 minute manual / near-instant programmatic | Agents fetch structured plan |
| Bug Triage Turnaround | < 24h (manual phase) | Later automate prioritization |
| Onboarding Time (new agent) | < 5 minutes | Clear persona docs + single endpoint spec |

### Guardrails
| Category | Guardrail | Rationale |
|----------|-----------|-----------|
| Scope | Always ship narrow vertical MVP before enhancements | Avoid diffused effort |
| Data Integrity | All writes validated (schema + required fields) | Prevent silent corruption |
| Observability | Every mutation emits timestamp + actor id | Traceability |
| Security (Early) | Maintain dependency audit list; no secrets in repo | Foundational hygiene |
| Evolution | Backlog grooming after each phase completion | Continuous alignment |
| Automation | Only automate after manual path proven | Avoid premature complexity |

### Operating Principles
1. Ship small, review fast.
2. Prefer explicit schemas over implicit conventions.
3. Record decisions (ADR-lite) for non-trivial architectural choices.
4. Optimize for clarity > cleverness.
5. Treat personas as living contracts; update when drift detected.

## 2. Phase Breakdown
Phases build cumulatively; only promote scope when acceptance criteria met.

### Phase 0: Foundations & Repo Hygiene
Purpose: Establish baseline structure, documentation, and simple runtime.

Acceptance Criteria:
1. Project plan (this file) populated and timestamped.
2. Prioritization rubric committed.
3. Personas expanded with actionable checklists.
4. Basic backend server skeleton running (health endpoint).
5. Task/Bug domain model draft in `shared/types`.

#### Task Tracker (Phase 0)
| ID | Task | Owner | Status | Priority | ETA | Notes |
|----|------|-------|--------|----------|-----|-------|
| P0-1 | Expand project plan scaffold | PM | Done | High | 2025-09-20 | Initial commit |
| P0-2 | Update prioritization rubric | PM | Done | High | 2025-09-20 | MVP focus wording applied |
| P0-3 | Flesh out personas | PM | Done | High | 2025-09-20 | All personas expanded |
| P0-4 | Define shared type interfaces | Architect | Done | High | 2025-09-20 | Implemented in shared/types |
| P0-5 | Backend health endpoint | Dev | Done | Medium | 2025-09-20 | `/health` + `/healthz` added |
| P0-6 | ADR template added | Architect | Done | Low | 2025-09-20 | `docs/adr/ADR-Template.md` |
| P0-7 | README expansion | PM | Done | Medium | 2025-09-20 | Added quick start & references |
| P0-8 | Status enum migration plan | Architect | Done | Medium | 2025-09-20 | Implemented; backward compat mapping in server |
| P0-9 | Introduce audit log scaffold | Dev | Done | Medium | 2025-09-20 | In-memory audit entries + /audit endpoint |

### Phase 1: MVP Task & Bug CRUD API (Completed)
Purpose: Provide minimal REST API for tasks and bug reports consumed by agents.

Completion Summary (Phase 1 Achieved):
- CRUD endpoints for tasks (create, list, status transition) and bugs (create, list) implemented against in-memory repositories.
- Status transition validation with optimistic concurrency and rationale logging.
- Standardized response envelope + centralized error handling (all endpoints covered in OpenAPI).
- OpenAPI spec authored (v0.1.1) with error schemas; publish + lint scripts added.
- Audit logging with pagination limit and bounded retention (pruning) + ADR-0002.
- Negative tests (transition rules, version conflict, validation, pruning) added.
- Repository abstraction decision captured in ADR-0001.

Deferred / Not Included in Acceptance (moved to Enhancement Backlog):
- CI OpenAPI lint integration (pipeline enforcement).
- Bug parity test: version conflict scenario (still desired but not blocking Phase 1 exit).

Phase 1 exit criteria satisfied; promoting focus to Phase 2.

### Enhancement Backlog (Deferred Items)
| ID | Item | Rationale | Status | Notes |
|----|------|----------|--------|-------|
| EB-1 | CI OpenAPI lint (former P1-16) | Enforce spec quality in CI | Todo | Add GitHub Action using `npm run ci:verify` |
| EB-2 | Bug version conflict test parity | Strengthen reliability | Todo | Mirror task test case |
| EB-3 | Metrics instrumentation design doc | Prep for Phase 4 | Todo | Lightweight design outline |
| EB-4 | Dependency scan script enhancement | Security posture | Todo | Produce artifact file |

### Phase 2: Status Updates & Design Notes
Purpose: Enable periodic status pings and design docs for alignment.

Acceptance Criteria:
1. `StatusUpdate` entity linked to Task or global context.
2. API endpoints for posting/fetching updates.
3. Design note (ADR-lite) creation with rationale + decision.
4. Agents can query last N updates.
5. Basic pagination (limit + since; later offset added for reverse chronological windows).
6. (Enhanced) Offset pagination for status updates & design notes (added).
7. Bug optimistic concurrency parity (PATCH with versioning) incorporated for consistency.
8. CI workflow running build/test/lint/spec publish.
9. Dependency audit JSON artifact produced.

Phase 2 Completion Summary (Achieved):
- StatusUpdate + DesignNote endpoints with validation, audit logging, and tests delivered.
- Pagination: initial limit + since (status updates) extended with offset for both updates and notes (OpenAPI 0.3.1).
- Bug PATCH endpoint with optimistic concurrency (version field) added; OpenAPI 0.3.2 updated.
- README expanded with PATCH usage & pagination model.
- CI GitHub Action (`ci.yml`) executes `ci:verify` + artifacts (OpenAPI + audit-report.json).
- Dependency scan script produces normalized `audit-report.json` (included in CI artifacts).
- Persistence strategy documented (ADR-0003) preparing Phase 3.

#### Task Tracker (Phase 2)
| ID | Task | Owner | Status | Priority | ETA | Notes |
|----|------|-------|--------|----------|-----|-------|
| P2-1 | Define StatusUpdate schema | Architect | Done | High | 2025-09-20 | Implemented in shared/types |
| P2-2 | Implement updates endpoints | Dev | Done | High | 2025-09-20 | Endpoints + tests |
| P2-3 | ADR-lite creation endpoint | Dev | Done | Medium | 2025-09-20 | Design notes implemented |
| P2-4 | Pagination & filters (limit+since+offset) | Dev | Done | Medium | 2025-09-21 | Offset added (0.3.1) |
| P2-5 | Update docs & examples | PM | Done | Low | 2025-09-21 | README & OpenAPI revision |
| P2-6 | Bug PATCH optimistic concurrency | Dev | Done | High | 2025-09-21 | Versioned bug updates (0.3.2) |
| P2-7 | CI pipeline integration | DevOps | Done | High | 2025-09-21 | GitHub Actions added |
| P2-8 | Dependency audit artifact | Security | Done | Medium | 2025-09-21 | `audit-report.json` produced |

### Enhancement Backlog (Deferred / Post-Phase 2)
| ID | Item | Rationale | Status | Notes |
|----|------|----------|--------|-------|
| EB-1 | Cursor-based pagination evaluation | Stability & large datasets | Todo | Replace offset once persistence lands |
| EB-2 | Design note edge-case tests (length bounds, invalid payloads) | Robustness | Todo | Expand test coverage |
| EB-3 | Metrics instrumentation design doc | Prep Phase 4 | Todo | Outline counters & timers |
| EB-4 | Enforcement of high/critical vuln fail threshold | Security gating | Todo | Post-process audit JSON |
| EB-5 | Export/import data script (pre-persistence) | Data portability | Todo | Supports Phase 3 migration |

### Phase 3: Persistence, Authorization & Archival (Completed)
Purpose: Introduce durable optional persistence, role-based guardrails (experimental), data portability, and reversible archival (soft delete + restore).

Completion Summary:
| Capability | Status | Notes |
|------------|--------|-------|
| SQLite adapter (better-sqlite3) | Done | Optional; seamless fallback to in-memory |
| Migration system | Done | `migrations/*.sql` with `_migrations` ledger |
| Full repository parity (all entities) | Done | Tasks, Bugs, StatusUpdates, DesignNotes |
| Conditional SQLite integration tests | Done | Skips gracefully if driver missing |
| Role-based authorization middleware | Done (experimental) | Guard on design note creation when `ENFORCE_ROLES=1` |
| Export script | Done | JSON snapshot export (`npm run data:export`) |
| Import script | Done | Rehydrates from snapshot (`npm run data:import`) |
| Soft delete (tasks, bugs, design notes) | Done | `deleted_at` (SQLite) / `deletedAt` (in-memory) + filtering |
| Restore endpoints | Done | `POST /:entity/:id/restore` + audit `restored` action |
| Audit log retention policy | Done | Bounded in-memory with pruning (ADR-0002) |
| CI resilience for optional driver | Done | `migrate:if-present` avoids pipeline failures |
| CI matrix with explicit SQLite build | Deferred | Future improvement |
| Audit log persistence table | Deferred | Decision deferred; ephemeral acceptable for MVP |

Phase 3 Exit Rationale: All persistence and data lifecycle primitives required for MVP have landed; remaining deferred items do not block a minimal usable product.

#### Task Tracker (Phase 3)
| ID | Task | Owner | Status | Priority | Notes |
|----|------|-------|--------|----------|-------|
| P3-1 | Select persistence adapter (SQLite-first) | Architect | Done | High | ADR-0003 drafted |
| P3-2 | Initial migration + schema baseline | Dev | Done | High | 0001_initial + 0002_soft_delete applied |
| P3-3 | Task & Bug SQLite repos | Dev | Done | High | Optimistic concurrency parity maintained |
| P3-4 | StatusUpdate & DesignNote SQLite repos | Dev | Done | Medium | Full entity coverage |
| P3-5 | Conditional SQLite integration tests | QA | Done | Medium | Skips when driver missing |
| P3-6 | Optional dependency handling | Dev | Done | Medium | `optionalDependencies` + runtime detection |
| P3-7 | Export data script | Dev | Done | High | `npm run data:export` |
| P3-8 | Import data script | Dev | Done | High | `npm run data:import` |
| P3-9 | Role validation middleware | Dev | Done | Medium | `ENFORCE_ROLES` flag gating |
| P3-10 | Soft delete support | Dev | Done | Medium | Delete & restore endpoints implemented |
| P3-11 | CI SQLite matrix job | DevOps | Deferred | Medium | Post-MVP hardening |
| P3-12 | Audit log persistence decision | Architect | Deferred | Low | Re-evaluate post-MVP |

### Phase 4: Minimal Dashboard UI (Completed)
Purpose: Provide a lightweight browser-accessible dashboard to visualize and (minimally) create data without external tools—unlocking stakeholder visibility and faster iteration.

Acceptance Criteria (MVP Surface Slice):
1. Static HTML (`public/index.html`) served from backend root.
2. API key input (stored in `localStorage`) appended as `x-api-key` for all fetches.
3. Read-only lists: Tasks (title, status, priority), Bugs (title, severity), Status Updates (message, relative time).
4. Automatic refresh (poll every ≤10s) OR WebSocket if trivial to hook—polling acceptable for MVP.
5. Minimal styling (readable layout) with zero build tooling (vanilla JS + inline CSS acceptable).
6. Basic error banner if auth fails (invalid/expired API key).

Stretch (Post-MVP for this phase):
- Create Task form (title + optional priority) with optimistic refresh.
- Soft-deleted visibility toggle + restore action button.
- Design Notes list (truncated context & decision).
- WebSocket upgrade for push updates.

#### Task Tracker (Phase 4)
| ID | Task | Owner | Status | Priority | Notes |
|----|------|-------|--------|----------|-------|
| P4-1 | Serve static dashboard (`public/`) | Dev | Done | High | Implemented static middleware + index.html |
| P4-2 | API key input + storage | Dev | Done | High | localStorage integration in UI |
| P4-3 | Fetch & render tasks/bugs | Dev | Done | High | Polling every 7s implemented |
| P4-4 | Render status updates feed | Dev | Done | High | Shows last 20 with relative time |
| P4-5 | Basic UX & error states | Dev | Done | Medium | Error banner + hint states |
| P4-6 | README dashboard section | PM | Done | Medium | Added with usage + lifecycle |
| P4-7 | OpenAPI update (restore endpoints) | Dev | Done | Medium | Spec v0.4.0 includes restore + includeDeleted |
| P4-8 | Create Task form (stretch) | Dev | Done | Medium | Promoted into MVP scope |
| P4-9 | Status update submission form | Dev | Done | Medium | Added inline form to UI |

### Phase 5: Observability & Automation
Purpose: (Deferred until after UI MVP) Improve reliability, analytics, and proactive alerts.


Acceptance Criteria (to be revisited post Phase 4):
1. Metrics endpoint (requests, latency, error rate).
2. Basic anomaly detection heuristic (error rate threshold).
3. Daily digest generator (summary of latest tasks/bugs/updates).
4. Notification hook scaffold (webhook queue placeholder).
5. Performance baseline documented.

#### Task Tracker (Phase 5)
| ID | Task | Owner | Status | Priority | Notes |
|----|------|-------|--------|----------|-------|
| P5-1 | Metrics collection instrumentation | Dev | Todo | Medium | Stats object aggregation |
| P5-2 | Metrics endpoint `/metrics` | Dev | Todo | Medium | JSON output |
| P5-3 | Error anomaly heuristic | Dev | Todo | Low | Threshold-based |
| P5-4 | Daily summary generator | PM | Todo | Low | Aggregates recent updates |
| P5-5 | Notification hook scaffold | Dev | Todo | Low | Webhook queue placeholder |

## 3. Domain Model (Draft)
| Entity | Key Fields | Notes |
|--------|------------|-------|
| Task | id, title, description, status, priority, owner, createdAt, updatedAt | Status enum: Todo, In-Progress, Blocked, Done |
| BugReport | id, title, description, severity, stepsToReproduce, status, linkedTaskIds[], createdAt | Severity: Low/Med/High/Critical |
| StatusUpdate | id, actor, scope(taskId|null), message, createdAt | Scope optional for global context |
| DesignNote (ADR-lite) | id, title, context, decision, consequences, createdAt, supersededBy? | Keep short/formal |
| AuditEntry | id, actor, entityType, entityId, action, diff, createdAt | Append-only |

## 4. Bug Report Table (Active Bugs)
| Bug ID | Title | Severity | Status | Linked Tasks | Reported | Notes |
|--------|-------|----------|--------|--------------|----------|-------|
| B-1 | (placeholder) | - | - | - | - | Populate when first bug appears |

## 5. Decision Log (ADR-lite Index)
| ID | Title | Date | Status | Summary |
|----|-------|------|--------|---------|
| ADR-0001 | Repository abstraction | 2025-09-20 | Accepted | Interfaces enable future persistence swap |
| ADR-0002 | Audit log retention | 2025-09-21 | Accepted | Bounded in-memory pruning with MAX_AUDIT_ENTRIES |
| ADR-0003 | Persistence layer strategy | 2025-09-21 | Draft | Adopt SQLite first; migration path to Postgres |

## 6. Operational Rituals
| Ritual | Frequency | Owner | Description |
|--------|-----------|-------|------------|
| Plan Refresh | After each task completion | Current actor | Update tables + Next Steps timestamp |
| Backlog Groom | End of each phase | PM | Reprioritize & prune |
| Security Scan | Weekly | Security | Generate vulnerability diff |
| Metrics Review | Weekly | PM/Dev | Identify regressions |

## 7. Risks & Mitigations (Early)
| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Scope creep | Delay MVP | Medium | Strict MVP gate & rubric |
| Data loss (in-memory) | Rework | High (early) | Plan migration in Phase 3 |
| Decision drift | Inconsistency | Medium | ADR-lite log |
| Security debt | Incidents later | Medium | Early dependency scanning |
| Over-automation early | Waste | Medium | Manual first policy |

## 8. Logical Next Steps (Auto-Refresh Section)
Timestamp: 2025-09-21T12:40:00Z
| Priority | Action | Rationale | Owner |
|----------|--------|-----------|-------|
| Medium | CI SQLite matrix (P3-11) | Persistence validation in CI | DevOps |
| Low | Cursor pagination evaluation (EB-1) | Scale readiness | Dev |
| Low | Vulnerability severity enforcement (EB-4) | Strengthen security gate | Security |
| Low | Audit log persistence reconsideration (P3-12) | Post-MVP decision | Architect |
| Low | Metrics design doc (P5 prep) | Prepare observability phase | Dev |

Refresh Instructions: When any above action completes, update its source table, remove or demote it here, add newly emergent actions, and reset the timestamp to current ISO.

## 9. Contribution Workflow (Agents)
1. Read personas & prioritization rubric first.
2. Select a Todo with clear acceptance criteria; mark In-Progress.
3. Implement minimal change; update status & add audit entry.
4. If new insights emerge, append follow-up tasks (small, actionable).
5. Run vulnerability & lint checks (once added) before marking Done.
6. Refresh Logical Next Steps timestamp.

## 10. Exit Criteria for Declaring MVP Complete (Revised)
| Criterion | Requirement |
|-----------|------------|
| Backend Core | Task + Bug CRUD, Status Updates, Design Notes (read) operational with validation & audit |
| Persistence | Optional SQLite path + migrations functioning; fallback seamless |
| Data Lifecycle | Soft delete + restore available for core entities |
| Data Portability | Export/import scripts operational |
| Dashboard UI | Tasks, Bugs, Status Updates visible; API key entry; auto-refresh ≤10s |
| UI Create | Create task form functional (title + optional priority) |
| Status Update Visibility | Last ≤20 updates rendered with relative timestamps |
| Auth Guardrails | API key auth + optional role enforcement flag documented |
| Specification | OpenAPI updated (restore + soft delete semantics) |
| Security Hygiene | Dependency audit artifact produced in CI (no high/critical or documented exceptions) |
| Documentation | README + Project Plan + MVP criteria aligned |

## 11. MVP Criteria (Detailed)
The MVP is complete when a new developer or stakeholder can within 5 minutes:
1. Start backend (`npm install && npm run dev` or equivalent).
2. Register an agent via API and obtain an API key.
3. Open dashboard at root URL and paste key to load data.
4. Create a new task through the UI and see it appear immediately.
5. Observe status updates (latest ≤20) refreshing automatically.
6. Perform a soft delete + restore cycle for a task via API and verify visibility toggles accordingly.
7. Export data snapshot then re-import it in a fresh session without errors.
8. Confirm OpenAPI spec documents restore + soft delete endpoints.

### Functional Criteria
1. Task Management: Create (UI/API), list (UI/API), transition (API) with optimistic concurrency and audits.
2. Bugs: Create/list via API; listed read-only in UI with severity pills.
3. Status Updates: Post/list via API; UI shows last ≤20 with relative timestamps.
4. Design Notes: Create/list via API (role gated under flag); read not required in UI for MVP.
5. Soft Delete & Restore: Endpoints for tasks, bugs, design notes; tests cover lifecycle; UI not required to expose buttons.
6. Persistence & Portability: SQLite optional; export/import scripts succeed.
7. Authentication & Authorization: API key required for protected endpoints; role enforcement toggled by `ENFORCE_ROLES`.
8. Auditability: All create/update/delete/restore/status change events recorded and retained within cap.
9. Dashboard: Served statically; lists update ≤10s; task creation form works; error handling for auth issues.
10. Specification: OpenAPI reflects restore and soft delete semantics.
11. Documentation: README includes dashboard usage, soft delete/restore, and quick start.

### Non-Functional Criteria
1. Latency: p95 <300ms locally for list endpoints (informal manual check acceptable).
2. Stability: No unhandled promise rejections or server crashes in typical workflows.
3. Security Hygiene: Dependency audit contains no high/critical vulnerabilities OR exceptions documented.
4. Extensibility: Clear repository abstractions & migration framework present.

### Deferred / Explicitly Out of Scope
- Real-time WebSocket consumption in UI (polling suffices).
- Task assignment UI / multi-user presence indicators.
- Bulk restore/purge operations.
- Design Note UI rendering.
- Cursor pagination in UI (offset + limit sufficient for MVP volume).
- Metrics endpoint & anomaly detection.
- Audit log UI surfacing.

### Exit Checklist (All Satisfied)
- [x] `npm test` green.
- [x] Register agent & obtain API key.
- [x] Dashboard loads tasks/bugs/updates after key entry.
- [x] Create task via UI → appears immediately.
- [x] Post status update via API → appears within next poll.
- [x] Soft delete a task → disappears (without includeDeleted).
- [x] Restore the task → reappears.
- [x] Export snapshot → non-empty JSON file.
- [x] Import snapshot → entities present after restart.
- [x] OpenAPI includes restore endpoints.
- [x] README documents dashboard & restore lifecycle.
- [x] Dependency audit: no high/critical (or documented rationale).

MVP Lock Note: Additional automated assertions were added (soft delete `deletedAt` presence) post-lock without changing scope. Further work proceeds under Phase 5 or enhancement backlog without reopening MVP criteria.

---
End of Project Plan.
