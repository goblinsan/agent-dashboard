# Project Plan: AI Agent Dashboard

Last Updated: 2025-09-20T00:00:00Z
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
| P0-2 | Update prioritization rubric | PM | Todo | High | 2025-09-20 | MVP focus wording |
| P0-3 | Flesh out personas | PM | In-Progress | High | 2025-09-20 | Architect through Security |
| P0-4 | Define shared type interfaces | Architect | Todo | High | 2025-09-21 | Task, BugReport, StatusUpdate |
| P0-5 | Backend health endpoint | Dev | Todo | Medium | 2025-09-21 | `/healthz` returns ok + version |
| P0-6 | ADR template added | Architect | Todo | Low | 2025-09-21 | Lightweight structure |

### Phase 1: MVP Task & Bug CRUD API
Purpose: Provide minimal REST API for tasks and bug reports consumed by agents.

Acceptance Criteria:
1. In-memory repository (swap-friendly) for Tasks & Bugs.
2. Endpoints: POST/GET/PATCH `/tasks`, `/bugs` with validation.
3. Status transitions validated (Allowed: Todo -> In-Progress -> Done / Blocked loops back).
4. Basic error handling & structured JSON responses.
5. Versioned OpenAPI (or JSON schema bundle) published.
6. Logging each mutation with actor + iso timestamp.

#### Task Tracker (Phase 1)
| ID | Task | Owner | Status | Priority | ETA | Notes |
|----|------|-------|--------|----------|-----|-------|
| P1-1 | Define OpenAPI spec draft | Architect | Todo | High | 2025-09-22 | Start with Tasks only |
| P1-2 | Implement task repository | Dev | Todo | High | 2025-09-22 | In-memory map |
| P1-3 | Implement bug repository | Dev | Todo | High | 2025-09-22 | Mirror task pattern |
| P1-4 | REST handlers & routing | Dev | Todo | High | 2025-09-23 | Express / Fastify TBD |
| P1-5 | Validation middleware | Dev | Todo | High | 2025-09-23 | Zod or custom |
| P1-6 | Logging & audit trail | Dev | Todo | Medium | 2025-09-23 | Simple append JSONL |
| P1-7 | OpenAPI publish script | DevOps | Todo | Medium | 2025-09-24 | Generate & commit |
| P1-8 | Minimal README usage section | PM | Todo | Medium | 2025-09-24 | Curl examples |

### Phase 2: Status Updates & Design Notes
Purpose: Enable periodic status pings and design docs for alignment.

Acceptance Criteria:
1. `StatusUpdate` entity linked to Task or global context.
2. API endpoints for posting/fetching updates.
3. Design note (ADR-lite) creation with rationale + decision.
4. Agents can query last N updates.
5. Basic pagination.

#### Task Tracker (Phase 2)
| ID | Task | Owner | Status | Priority | ETA | Notes |
|----|------|-------|--------|----------|-----|-------|
| P2-1 | Define StatusUpdate schema | Architect | Todo | High | 2025-09-25 | Link optional taskId |
| P2-2 | Implement updates endpoints | Dev | Todo | High | 2025-09-26 | POST/GET queries |
| P2-3 | ADR-lite creation endpoint | Dev | Todo | Medium | 2025-09-26 | Markdown storage |
| P2-4 | Pagination & filters | Dev | Todo | Medium | 2025-09-27 | limit/offset |
| P2-5 | Update docs & examples | PM | Todo | Low | 2025-09-27 | Include sample payloads |

### Phase 3: Persistence & Role Guardrails
Purpose: Transition from in-memory to durable store with role-based constraints.

Acceptance Criteria:
1. Pluggable persistence (SQLite or lightweight Postgres option).
2. Migration scripts (idempotent).
3. Role field (e.g., reviewer, qa, security) validated on write.
4. Soft deletion & archival endpoints.
5. Security scanning of dependencies integrated (report artifact).

#### Task Tracker (Phase 3)
| ID | Task | Owner | Status | Priority | ETA | Notes |
|----|------|-------|--------|----------|-----|-------|
| P3-1 | Select persistence adapter | Architect | Todo | High | 2025-09-28 | Start with SQLite |
| P3-2 | Data model migration scripts | Dev | Todo | High | 2025-09-29 | SQL or Prisma |
| P3-3 | Repository refactor for adapter | Dev | Todo | High | 2025-09-29 | Interface contract |
| P3-4 | Role validation middleware | Dev | Todo | Medium | 2025-09-30 | Config-driven roles |
| P3-5 | Soft delete & archival | Dev | Todo | Medium | 2025-09-30 | `deletedAt` pattern |
| P3-6 | Dependency vulnerability scan | Security | Todo | Medium | 2025-09-30 | Report in repo |

### Phase 4: Observability & Automation
Purpose: Improve reliability, analytics, and proactive alerts.

Acceptance Criteria:
1. Metrics endpoint (requests, latency, error rate).
2. Basic anomaly detection heuristic (e.g., high error rate suggestion).
3. Scheduled summary generator (daily digest stub).
4. Notification hooks (webhook stub or queue placeholder).
5. Performance baseline documented.

#### Task Tracker (Phase 4)
| ID | Task | Owner | Status | Priority | ETA | Notes |
|----|------|-------|--------|----------|-----|-------|
| P4-1 | Metrics collection instrumentation | Dev | Todo | Medium | 2025-10-02 | Stats object |
| P4-2 | Metrics endpoint `/metrics` | Dev | Todo | Medium | 2025-10-02 | JSON output |
| P4-3 | Error anomaly heuristic | Dev | Todo | Low | 2025-10-03 | Threshold-based |
| P4-4 | Daily summary generator | PM | Todo | Low | 2025-10-03 | Aggregates recent updates |
| P4-5 | Notification hook scaffold | Dev | Todo | Low | 2025-10-04 | Webhook queue placeholder |

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
| ADR-1 | (reserved: persistence choice) | (pending) | Draft | Will document SQLite rationale |

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
Timestamp: 2025-09-20T00:00:00Z
| Priority | Action | Rationale | Owner |
|----------|--------|-----------|-------|
| High | Complete prioritization rubric update (P0-2) | Needed to enforce MVP lens | PM |
| High | Finalize personas (P0-3) | Enables role-based guidance for agents | PM |
| High | Define shared type interfaces (P0-4) | Unblocks Phase 1 API spec | Architect |
| Medium | Implement health endpoint (P0-5) | Basic runtime verification | Dev |
| Low | Add ADR template (P0-6) | Supports architectural traceability | Architect |

Refresh Instructions: When any above action completes, update its source table, remove or demote it here, add newly emergent actions, and reset the timestamp to current ISO.

## 9. Contribution Workflow (Agents)
1. Read personas & prioritization rubric first.
2. Select a Todo with clear acceptance criteria; mark In-Progress.
3. Implement minimal change; update status & add audit entry.
4. If new insights emerge, append follow-up tasks (small, actionable).
5. Run vulnerability & lint checks (once added) before marking Done.
6. Refresh Logical Next Steps timestamp.

## 10. Exit Criteria for Declaring MVP Complete
| Criterion | Requirement |
|-----------|------------|
| Task CRUD | Fully functional with validation & audit |
| Bug CRUD | Functional & linked to tasks |
| Status Updates | Post & fetch working |
| OpenAPI/Schema | Published & versioned |
| Personas & Rubric | Stable + referenced by agents |
| Basic Security | Dependency scan report present |
| Documentation | README usage & plan current |

---
End of Project Plan.
