# Contributing Guide

Last Updated: 2025-09-21

## Overview
This project targets a fast-feedback, small vertical slice approach. Keep changes incremental, documented, and tested. Prefer clarity over cleverness.

## Prerequisites
- Node.js: Recommend LTS (v20.x) for prebuilt `better-sqlite3` binaries.
- npm 10+
- Git
- (Optional for native SQLite build on Windows / if using Node >=21):
  - Visual Studio 2022 Build Tools with "Desktop development with C++" workload
  - Windows 10/11 SDK
  - Python 3 on PATH

## Installation
```bash
cd backend
npm install
```
If `better-sqlite3` fails to build, it is optional. The app will fall back to in-memory repositories.

## Persistence Modes
| Mode | How | Notes |
|------|-----|-------|
| In-Memory | Omit `PERSISTENCE` env var | Fast tests / ephemeral dev |
| SQLite | Set `PERSISTENCE=sqlite` and run migrations | Requires optional native module |

Run migrations:
```bash
npm run migrate          # hard require driver
npm run migrate:if-present  # skips if driver missing
```

Start (in-memory):
```bash
npm run dev
```
Start (SQLite):
```bash
npm run dev:sqlite
```

## Testing
```bash
npm test
```
SQLite integration tests auto-skip if the driver is absent.

## Project Scripts (Backend)
| Script | Purpose |
|--------|---------|
| `dev` | Start dev server (in-memory) |
| `dev:sqlite` | Migrate (if driver) + run with SQLite |
| `migrate` | Apply migrations (requires driver) |
| `migrate:if-present` | Apply migrations only if driver installed |
| `ci:verify` | Build, test, lint OpenAPI, publish spec artifact, dependency scan, conditional migrate |
| `scan:json` | Produce normalized vulnerability report |

## Adding Migrations
1. Create new incremental file under `backend/migrations/NNNN_description.sql`.
2. Keep operations idempotent per file (transaction handled by runner).
3. Avoid destructive changes without a prior archival / data copy step.

## Coding Standards
- TypeScript strict mode (avoid implicit `any`).
- Centralized error envelope `{ success, data | error }`.
- Keep repository interfaces implementation-agnostic.
- Commit messages: Conventional style (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`).

## ADRs & Design Notes
Non-trivial decisions: create an ADR under `docs/adr/` (increment numeric ID) or a design note via API (`/design-notes`). Summarize rationale & alternatives.

## Export / Import (Planned)
Forthcoming scripts will support dataset portability. Until then, data is ephemeral in-memory or stored in local SQLite file at `backend/data/agent-dashboard.db`.

## Branching & PR Flow
1. Branch naming: `feature/<slug>` or `chore/<slug>`.
2. Keep PRs < 400 lines diff when possible.
3. Include updated `PROJECT_PLAN.md` if scope changes or phase items complete.
4. Ensure tests and `ci:verify` pass locally before opening PR.

## Security
- No secrets committed. Use environment variables (not yet formalized: future `.env.example`).
- Monitor vulnerability report artifact; remediation tasks added to backlog if high/critical.

## Performance (Future)
A lightweight benchmark harness may be added in Phase 4; avoid premature micro-optimizations.

## Getting Help
Check: README -> Personas -> Project Plan -> ADRs. If still unclear, draft a design note with options.

---
Thank you for contributing! Make it simple, make it observable, make it auditable.
