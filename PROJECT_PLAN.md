# Project Plan: AI Agent Dashboard

Last Updated: 2025-09-21T15:25:00Z
Auto-Refresh Directive: After any task moves to Done, the responsible agent MUST (a) update status fields, (b) add emergent follow-up tasks, (c) prune obsolete tasks, and (d) refresh the Logical Next Steps section timestamp.

## 1. Vision & High-Level Goal
Provide a shared, machine-readable and human-friendly dashboard through which multiple specialized AI (and human) agents can: (1) ingest project direction, constraints, and current status; (2) create, update, and complete tasks, bug reports, and design docs; (3) maintain auditable change history; (4) converge quickly on an MVP that proves value; and (5) (post-MVP) manage and switch between multiple projects from a unified interface.

### Core Outcome (MVP)
An operational backend + minimal UI (or structured API endpoints) enabling (single-project MVP now complete; multi-project support planned):
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

## 2. Phase Breakdown (Condensed)
Phases 0–4 are COMPLETE and collectively constitute the MVP. Detailed task tables have been archived; below are concise summaries preserving institutional knowledge while keeping this plan lean.

### Completed Phases (Summary)
| Phase | Focus | Key Deliverables | Notes |
|-------|-------|------------------|-------|
| 0 | Foundations & Hygiene | Plan, personas, prioritization rubric, health endpoints, audit scaffold, shared types, ADR template | Established baseline repo discipline |
| 1 | Core Task & Bug API | Task CRUD + transitions, Bug CRUD, optimistic concurrency, error envelope, initial OpenAPI, audit retention | Proved vertical slice for work tracking |
| 2 | Status Updates & Design Notes | StatusUpdate + DesignNote entities, pagination (limit/since/offset), Bug PATCH + version, CI workflow, dependency audit, persistence strategy ADR | Expanded collaboration primitives |
| 3 | Persistence & Lifecycle | Optional SQLite, migrations, soft delete + restore, export/import, role middleware flag, full repo parity | Enabled durability & reversible deletes |
| 4 | Minimal Dashboard UI | Static HTML dashboard: tasks/bugs/updates lists, create task, submit status update, polling refresh, restore endpoints in spec | Human visibility + faster iteration |

MVP Status: ✅ COMPLETE (all exit criteria satisfied; further changes tracked as enhancements and do not reopen MVP scope).

### Upcoming Enhancement Phases
| Phase | Theme | Objective | High-Level Outcomes |
|-------|-------|----------|---------------------|
| 5 | Observability & Automation | Surface system health & accelerate feedback loops | `/metrics`, counters, latency sampling, anomaly heuristic, daily digest scaffold |
| 6 | UI Enhancements & UX | Improve usability, multi-project context & reduce context switching | Project selector & creation UI, soft-delete visibility & restore UI, design notes panel, richer task detail, WebSocket push |
| 7 | Security & Reliability | Harden platform & gate risky changes | Vulnerability severity enforcement, rate limiting, auth expansion, audit persistence decision |
| 8 | Scale & Data Evolution | Prepare for higher volume & pagination robustness | Cursor pagination, retention policies, hard purge workflow, upsert-aware import |
| 9 | Collaboration & Extensibility | Integrations & notification pathways | Webhook queue, subscription filters, multi-agent presence, pluggable event hooks |

## 3. Enhancement Backlog (Prioritized)
Single authoritative backlog. "Priority" uses P0 (near-term), P1 (important), P2 (nice). Phase Target is provisional.

| ID | Title | Description | Priority | Target Phase | Status |
|----|-------|------------|----------|--------------|--------|
| B-1 | Metrics instrumentation | In-memory counters (reqs, errors, latency buckets) | P0 | 5 | Todo |
| B-2 | `/metrics` endpoint | Expose JSON metrics snapshot | P0 | 5 | Todo |
| B-3 | Dependency severity gate | Fail CI on high/critical vulns (configurable) | P0 | 7 | Todo |
| B-4 | Soft-delete UI toggle & restore buttons | Show deleted entities & allow one-click restore | P0 | 6 | Todo |
| B-5 | Design notes panel | Read-only list (title + decision snippet) | P1 | 6 | Todo |
| B-6 | WebSocket push refresh | Replace polling for tasks/updates | P1 | 6 | Todo |
| B-7 | CI SQLite matrix job | Exercise persistent path on CI runner | P1 | 7 | Todo |
| B-8 | Cursor pagination evaluation | Replace offset for large datasets | P1 | 8 | Todo |
| B-9 | Audit log persistence decision | Promote audit log to durable store (SQLite table) | P1 | 7 | Todo |
| B-10 | Upsert-aware import | Preserve original IDs/versions during import | P1 | 8 | Todo |
| B-11 | Hard purge job | Remove soft-deleted > retention threshold | P2 | 8 | Todo |
| B-12 | Notification hook scaffold | Webhook queue + retry metadata | P2 | 9 | Todo |
| B-13 | Daily summary generator | Aggregate last 24h changes | P2 | 5 | Todo |
| B-14 | Rate limiting middleware | Basic per-key throttle | P2 | 7 | Todo |
| B-15 | Role expansion matrix | Granular role permissions per endpoint | P2 | 7 | Todo |
| B-16 | Export format versioning | Add schemaVersion & backward loader | P2 | 8 | Todo |
| B-17 | Design note edge-case tests | Payload length & validation fuzzing | P2 | 6 | Todo |
| B-18 | WebSocket auth tightening | Validate API key on upgrade | P2 | 7 | Todo |
| B-19 | Audit UI surface | Minimal UI page for recent audits | P2 | 6 | Todo |
| B-20 | Vulnerability diff trend | Track deltas across CI runs | P2 | 7 | Todo |
| B-21 | Project entity schema | Define Project (id, name, description, createdAt, archivedAt?) | P0 | 6 | Todo |
| B-22 | Project reference propagation | Add projectId to tasks, bugs, status updates, design notes | P0 | 6 | Todo |
| B-23 | Project CRUD API | Endpoints: create/list/archive/select (header or query) | P0 | 6 | Todo |
| B-24 | Migration for project tables | SQLite migration + backfill existing records to default project | P0 | 6 | Todo |
| B-25 | Project selection UI | Dropdown + create project inline (persists selection in localStorage) | P1 | 6 | Todo |
| B-26 | Export/import multi-project aware | Include projects array & per-entity projectId in snapshot | P1 | 8 | Todo |

Backlog Grooming Rule: After completing any P0/P1 item, reassess next 1–2 items for reprioritization; avoid pulling >2 concurrent P1 efforts.

## 4. Phase 5 Preview (Observability & Automation)
Initial slice will implement B-1 & B-2 (metrics & endpoint) plus optional lightweight error anomaly heuristic (sliding window error ratio). Remaining automation (digest, notification) deferred until metrics stable.

---

## 5. (Former Sections Renumbered)
Subsequent sections retain prior numbering intent but have been shifted.

## 3. Domain Model (Draft)
| Entity | Key Fields | Notes |
|--------|------------|-------|
| Project | id, name, description?, createdAt, archivedAt? | Logical container for all other entities |
| Task | id, projectId, title, description, status, priority, owner, createdAt, updatedAt, deletedAt? | Status: todo/in_progress/blocked/done |
| BugReport | id, projectId, title, description, severity, stepsToReproduce, status, linkedTaskIds[], createdAt, deletedAt? | Severity: low/medium/high/critical |
| StatusUpdate | id, projectId, actor, scope(taskId|null), message, createdAt | projectId defaults to selected project context |
| DesignNote (ADR-lite) | id, projectId, title, context, decision, consequences, createdAt, supersededBy?, deletedAt? | Multi-project scoping |
| AuditEntry | id, projectId, actor, entityType, entityId, action, diff, createdAt | Enables project-scoped filtering |

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
| Medium | Project schema & selection design (B-21/B-22) | Enable multi-project groundwork | Architect |

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
