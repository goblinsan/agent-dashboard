# Project Plan: AI Agent Dashboard

Last Updated: 2025-09-21T19:10:30Z
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
| 10 | Hierarchical Projects & Roll-up | Introduce phases, nested projects, roll-up status & richer metadata | Phase entity, parent projects, completion aggregation, status readout API/UI |

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
| B-21 | Project entity schema | Define Project (id, name, description, createdAt, archivedAt?) | P0 | 6 | Done |
| B-22 | Project reference propagation | Add projectId to tasks, bugs, status updates, design notes | P0 | 6 | Done |
| B-23 | Project CRUD API | Endpoints: create/list/archive/select (header or query) | P0 | 6 | Done |
| B-24 | Migration for project tables | SQLite migration + backfill existing records to default project | P0 | 6 | Done |
| B-25 | Project selection UI | Dropdown + create project inline (persists selection in localStorage) | P1 | 6 | Done |
| B-26 | Export/import multi-project aware | Include projects array & per-entity projectId in snapshot | P1 | 8 | Todo |
| B-27 | Phase entity schema | Define Phase (id, projectId, name, description?, orderIndex, createdAt, archivedAt?) | P0 | 10 | Done |
| B-28 | Phase migration & backfill | SQLite migration; create implicit default phase per existing project; update export/import | P0 | 10 | In-Progress (migration file added; enforcement step pending) |
| B-29 | Phase CRUD & reorder API | Create/list/update/archive; reorder endpoint (batch orderIndex update) | P0 | 10 | Done |
| B-30 | Task phase linkage | Add `phaseId` to tasks (nullable until backfilled); enforce phase-project consistency | P0 | 10 | Done |
| B-31 | In-phase task prioritization | Add `phasePriority` (int) with reorder API; adjust list sorting | P1 | 10 | Done (basic move & ordered listing implemented) |
| B-32 | Project extended metadata | Fields: highLevelDescription, prioritizationRubric (md/text), securityGuidelines (md), devOps (repoUrl, ciUrl, slackChannel) | P0 | 10 | Todo |
| B-33 | Nested project support | Add `parentProjectId` + depth validation + roll-up rules | P1 | 10 | Done (in-memory; cycle detection app-layer) |
| B-34 | Completion roll-up engine | Compute % complete from leaf tasks via phases → projects; cache & invalidate on mutation | P0 | 10 | Partial (aggregation + aggregated caching implemented; multi-level recursion & perf optimizations deferred) |
| B-35 | Project status readout API | Endpoint `/projects/:id/status` returning activePhase, completionPct, activeTaskCount, nextPriorityTask | P0 | 10 | Done (extended with optional rollup=1) |
| B-36 | Status readout UI panel | Surface aggregated status in dashboard; auto-refresh | P1 | 10 | Todo |
| B-37 | Phase management UI | Create/reorder/archive phases; drag & drop reorder (progressive enhancement) | P1 | 10 | Todo |
| B-38 | Rubric & security docs UI | Read-only render of markdown fields with basic sanitation | P2 | 10 | Todo |
| B-39 | Project metadata edit API | PATCH endpoints for rubric/security/devOps links | P1 | 10 | Todo |
| B-40 | Hierarchical export/import | Extend snapshot format with phases, parentProjectId, phase/task ordering | P1 | 10 | Todo |
| B-41 | Roll-up test suite | Unit tests for completion math across nested projects & phase/task edge cases | P0 | 10 | Todo |
| B-42 | Data validation guards | Ensure phase.projectId matches task.projectId; prevent cycles in project nesting | P0 | 10 | Todo |
| B-43 | Migration backfill tasks → default phase | After creating default phase per project, assign tasks lacking phaseId | P0 | 10 | Todo |
| B-44 | Performance optimization (roll-up) | Incremental invalidation vs full recompute; benchmark >5k tasks | P2 | 10 | Todo |
| B-45 | Phase archive behavior | Define effect on tasks (freeze? allow moves?); implement rules & tests | P1 | 10 | Todo |
| B-46 | DevOps link health check | Background ping to repo/slack endpoints surfaced in status | P2 | 10 | Todo |
| B-47 | Access control extensions | Gate editing of security & rubric fields by role (future flag) | P2 | 10 | Todo |
| B-48 | UI task prioritization controls | Inline drag or up/down controls within phase | P2 | 10 | Todo |

Backlog Grooming Rule: After completing any P0/P1 item, reassess next 1–2 items for reprioritization; avoid pulling >2 concurrent P1 efforts.

## 4. Phase 5 Preview (Observability & Automation)
Initial slice will implement B-1 & B-2 (metrics & endpoint) plus optional lightweight error anomaly heuristic (sliding window error ratio). Remaining automation (digest, notification) deferred until metrics stable.

---

## 5. (Former Sections Renumbered)
Subsequent sections retain prior numbering intent but have been shifted.

## 3. Domain Model (Draft)
| Entity | Key Fields | Notes |
|--------|------------|-------|
| Project | id, name, description?, highLevelDescription?, prioritizationRubric?, securityGuidelines?, devOps{repoUrl,ciUrl,slackChannel?}, parentProjectId?, createdAt, archivedAt? | Logical container; can nest; extended metadata optional |
| Phase | id, projectId, name, description?, orderIndex, createdAt, archivedAt? | Ordered child of a project; groups tasks; archived phases exclude tasks from active roll-up |
| Task | id, projectId, phaseId?, title, description, status, priority (legacy), phasePriority?, owner, createdAt, updatedAt, deletedAt? | Status: todo/in_progress/blocked/done; phasePriority supersedes priority when phaseId present |
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
Timestamp: 2025-09-21T19:10:30Z
| Priority | Action | Rationale | Owner |
|----------|--------|-----------|-------|
| High | Phase migration backfill & NOT NULL enforcement (B-28/B-43) | Complete transition; ensure every task assigned a phase | Dev |
| High | Recursive roll-up & extended tests (B-34 extension, B-41) | Support deeper hierarchies prior to UI surfacing | Dev |
| High | Metrics instrumentation (B-1) | Observe cache behavior & baseline performance | Dev |
| Medium | Metadata schema & edit API (B-32/B-39) | Enable richer project context for agents | Architect |
| Medium | Export/import hierarchy & phases spec (B-40) | Preserve structure across snapshots | PM |
| Low | Incremental roll-up optimization research (B-44) | Plan scale path >5k tasks | Dev |
| Low | Archived phase behavior policy (B-45) | Clarify semantics before UI integration | PM |

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

## 12. Hierarchical Projects & Phases Implementation Plan

### 12.1 Goals
Introduce ordered phases within projects, allow nested projects, provide a real-time status readout (active phase, completion %, active tasks, next priority task), and enrich project metadata (rubric, security guidelines, DevOps integrations).

### 12.2 Key Concepts
1. Phase: Ordered lane of execution within a project; tasks belong to exactly one phase (after backfill) unless legacy/unassigned during transition.
2. Nested Project: A project may optionally have a `parentProjectId`; completion rolls up leaf task completion via phases.
3. Roll-up Completion: Percentage = completedLeafTasks / totalLeafTasks (excluding archived phases & soft-deleted tasks). Cached with invalidation triggers on entity mutation.
4. Status Readout: Aggregated snapshot served by dedicated endpoint (B-35) for dashboard & agents.
5. Metadata Fields: Markdown-capable long-form fields (prioritizationRubric, securityGuidelines) sanitized before UI rendering.

### 12.3 Ordering & Prioritization
Phases have `orderIndex` (0-based). Tasks within a phase have `phasePriority` (dense integers after reorder). Reordering operations are idempotent and batch-updated for atomicity.

### 12.4 API Additions (Incremental)
Implemented so far:
1. `POST /phases` create phase.
2. `GET /projects/:id/phases` list ordered phases.
3. (Patch rename not yet implemented) – future minor enhancement.
4. `POST /phases/reorder` batch reorder (id + orderIndex array).
5. `POST /phases/:id/archive` & `/restore`.
6. `PATCH /tasks/:id/move` to assign `phaseId` and computed/appended `phasePriority`.
7. Ordered listing: `GET /tasks?ordered=1` sorts by (phase.orderIndex, phasePriority, createdAt).
8. `GET /projects/:id/status` base snapshot.
9. `GET /projects/:id/status?rollup=1` aggregated snapshot including children.
10. `PATCH /projects/:id/parent` set or clear parent with cycle guard.

Planned (not yet implemented):
- Bulk phase priority reorder endpoint for tasks within a phase.
- Phase rename/update endpoint.
	 ```json
	 {
		 "projectId": "...",
		 "activePhase": { "id": "...", "name": "..." },
		 "completionPct": 72.5,
		 "activeTaskCount": 5,
		 "nextPriorityTask": { "id": "...", "title": "...", "phaseId": "..." }
	 }
	 ```

### 12.5 Roll-up Algorithm (Current Implementation & Draft Enhancements)
Inputs: All non-deleted tasks belonging to non-archived phases of target project and its immediate child projects (one-level aggregation; deeper recursion deferred).
Computation:
1. Collect leaf tasks set T.
2. Let C = count(tasks in T with status == done).
3. Completion % = (C / |T|) * 100 (0 if |T| == 0).
4. Active phase = first phase (lowest orderIndex) with at least one incomplete task OR last phase if all completed.
5. Next priority task = earliest (lowest phase orderIndex, then lowest phasePriority) task where status != done.
Current Behavior: Aggregated status sums parent + immediate children only (one-level depth). Archived phases excluded from denominator. Unphased legacy tasks (none expected post-backfill) are treated as lowest priority after phased.

Planned Enhancements:
- Recursive descent beyond one level (depth >1).
- Incremental recompute (dirty segment invalidation) instead of full aggregation.
- Configurable inclusion toggle for archived phases.

### 12.6 Caching & Invalidation (Implemented – Aggregated Only)
Current Scope:
- Only aggregated (roll-up) status snapshots are cached; base project status recomputed each request for immediate consistency.
- In-memory Map keyed by projectId storing { snapshot, cachedAt } with 10s TTL.

Invalidation Triggers (bubble up ancestry):
1. Task create / status transition / move / soft delete / restore.
2. Phase create / archive / restore / reorder.
3. Project parent change (set/clear).
4. Related record mutations (bugs, status updates, design notes) trigger conservative invalidation.

Rationale: Aggregated computations span multiple projects; caching reduces redundant recomputes for polling agents. Base snapshots are cheap; caching them caused stale reads in repo-level test mutations.

Deferred Enhancements:
- Multi-level recursive aggregation + caching.
- Incremental delta-based invalidation (track affected counts) (B-44).
- Metrics for hit rate & recompute latency (depends on B-1/B-2).
- Optional diagnostics endpoint exposing cache stats.

### 12.7 Migration Strategy
1. Add `phases` table & `phaseId` to `tasks` (nullable initial).
2. For each project create a default phase with `orderIndex=0`.
3. Backfill existing tasks with corresponding default phaseId (B-43).
4. Enforce NOT NULL on `tasks.phaseId` in a follow-up migration after verification (two-step hardening).
5. Add `parentProjectId` column (nullable) with index & cycle-prevention constraint (validated at application layer).

### 12.8 Validation & Guards
1. Moving task to phase: phase.projectId must match task.projectId.
2. Nested project cannot set parent to self or descendant.
3. Archiving phase with incomplete tasks: allowed but excluded from active roll-up; tasks remain individually queryable.
4. Deleting (soft) a task in completed state still affects denominator; roll-up recomputed.

### 12.9 UI Enhancements
1. Phase panel: list + create + reorder (progressive enhancement fallback: up/down buttons).
2. Status readout card: active phase name, completion progress bar, active tasks count, quick link to next task.
3. Project metadata modal: edit rubric/security/devOps links (role-gated future).
4. Markdown rendering (basic) with sanitization & link target blank for external.

### 12.10 Testing Strategy (B-41)
Unit Tests:
- Completion % correctness (0%, partial, 100%).
- Nested project inclusion & exclusion of archived phases.
- Reorder stability (no duplicate or skipped orderIndex values).
- Phase archive effect on roll-up denominator.
- Cycle detection in project nesting.
Integration Tests:
- Status readout endpoint returns expected snapshot after each mutation type.
- Migration backfill correctness (all legacy tasks assigned a phase).

### 12.11 Acceptance Criteria Summary
1. Can create/reorder/archive phases; tasks can move between phases.
2. Roll-up completion % accurate across nested projects (verified by tests).
3. Status endpoint returns defined JSON schema; UI panel displays values.
4. Extended metadata persisted & retrievable; markdown fields safely rendered.
5. Export/import retains phases, ordering, parent relationships, and metadata.
6. Performance: recompute for project with ≤5k tasks <150ms p95 locally (baseline; optimize if exceeded).

### 12.12 Deferred / Future Considerations
- Weighted phases (custom weighting vs equal). Not required; potential B-49 later.
- SLA tracking per phase (elapsed vs planned duration).
- Historical burn-up chart generation.

---

---
End of Project Plan.
