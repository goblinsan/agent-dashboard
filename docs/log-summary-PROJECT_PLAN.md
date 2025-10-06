# Project Plan: machine-client-log-summarizer

Repository: https://github.com/goblinsan/machine-client-log-summarizer.git

Overview
--------
This project is a local dashboard (Vite + React + TypeScript) that ingests JSON log records produced by coordinated machine agents, stores them locally, and uses a locally hosted model (LM Studio) to produce human-friendly summaries for a selectable time window. The UI shows a list of JSON entries as collapsible/expandable items and displays model-generated summaries alongside the raw logs.

Current state (short)
----------------------
- Vite + React + TypeScript scaffold is in place and running on port 6006.
- Styles implemented in SCSS partials using a SMACSS-like split: `_base.scss`, `_layout.scss`, `_components.scss`, `_utils.scss`, `_mixins.scss`, and a manifest `_index.scss`.
- A Node script `scripts/replace-colors.js` exists to centralize color tokens; stylelint is configured and passing for the current SCSS.
- Basic UI skeleton and components exist; some files (App, main) already import the SCSS entrypoint.

Goal / Scope for this plan
-------------------------
Evolve the dashboard to:
- Continuously ingest JSON log files from disk and optional local process streams.
- Store logs in a local in-memory store (with an optional persisted layer) and present them as an expandable list in the UI.
- Integrate with a local LM Studio endpoint to summarize log history for an arbitrary time window.
- Provide a settings panel to configure LM Studio endpoint, time-window defaults, and ingestion options.
- Drive development with TDD: every new feature is introduced as a failing test then implemented to pass.

Milestones (high level)
-----------------------
1. Project & test harness setup
2. Local log ingestion (file + optional stream)
3. Log store, list UI, and expandable/collapsible entries
4. LM Studio integration (local model API client)
5. Summarization engine and time-window queries
6. Settings UI, error handling, and UX polish
7. End-to-end tests, CI, and documentation

For each milestone below you'll find a TDD task breakdown: the first task is always "write a failing test" and the second is "implement production code to make the test pass". Where helpful I include small subsequent tests (edge cases).

Milestone 1 — Project & test harness setup
-----------------------------------------
Goal: Ensure a reproducible dev environment and a test runner for unit and integration tests.

Tasks (TDD)
- Task 1 (test): Add a failing test that asserts the test runner is wired and the project builds in test mode.
	- Example: create `tests/setup.test.ts` that imports the app entry and asserts a non-null App component or that `npm run build` returns success (mocked). Run the test and observe failure (test should fail until test scripts are added).
- Task 2 (implementation): Configure the test runner (Jest or Vitest), add a minimal test script in package.json, and implement any bootstrapping so that `tests/setup.test.ts` passes.
	- Ensure types and tsconfig are compatible with the test runner.

Acceptance criteria
- Tests can be executed via `npm test` (or `npm run test:unit`) and the setup test passes.
- CI job skeleton exists (optional at this stage).

Milestone 2 — Local log ingestion (file + optional stream)
--------------------------------------------------------
Goal: Implement a robust ingestion layer that can read JSON log files from disk and accept an optional local process stream interface.

Tasks (TDD)
- Task 1 (test): Write a failing unit test that verifies the ingestion API can read a single JSON file and returns a parsed object.
	- Example: `tests/ingest/file-ingest.test.ts` should create a temporary JSON file with a sample log entry, call the ingestion function and assert the returned entry matches expected structure.
- Task 2 (implementation): Implement `src/ingest/fileIngest.ts` to read JSON files (support newline-delimited JSON and arrays), parse them into normalized records, and return them.
	- Edge test: another failing test to assert malformed JSON causes a controlled error (and the implementation should return a typed error or skip record policy).

Acceptance criteria
- File ingestion tests pass and ingestion handles NDJSON and JSON arrays.
- Ingestion API exposes a small interface so the app can request imports from a file picker.

Milestone 3 — Log store, list UI, and expandable entries
-------------------------------------------------------
Goal: Create a local log store and a UI list component that displays JSON entries as expandable/collapsible items (with virtualized list for performance as needed).

Tasks (TDD)
- Task 1 (test): Add a failing unit test for the store that asserts adding new records updates the store and emits change events.
	- Example: `tests/store/store.test.ts` creates the store, subscribes to updates, pushes a sample record and expects the subscription to receive the new length and entry.
- Task 2 (implementation): Implement `src/store/logStore.ts` (simple event-emitter-based store or use Zustand) to manage records, indexing by timestamp, and queries by time window.
- Task 3 (test): Add a failing UI test (Vitest + testing-library) asserting that the `LogList` component renders a collapsed entry by default and expands when clicked to show pretty-printed JSON.
- Task 4 (implementation): Implement `src/components/LogList.tsx` and `LogItem.tsx` to render the list, toggle expand/collapse, and pretty-print JSON (use monaco or `<pre>` with formatting). Implement optional virtualization if necessary.

Acceptance criteria
- The store tests pass; UI tests assert expand/collapse behavior.
- In the running app the log list displays items that expand to show formatted JSON.

Milestone 4 — LM Studio integration (local model client)
-----------------------------------------------------
Goal: Provide a small API client to call a local LM Studio instance to send prompts and receive completions.

Tasks (TDD)
- Task 1 (test): Add a failing integration test that mocks an LM Studio endpoint and asserts the client library calls the expected HTTP route and returns a structured response.
	- Example: `tests/lm/client.test.ts` sets up an HTTP mock server (msw or nock) and expects `lmClient.summarizeWindow()` to POST the right payload.
- Task 2 (implementation): Implement `src/lm/lmClient.ts` that can POST to a configurable LM Studio URL, handle authentication (if needed), and parse returned completions into a typed Summaries object.
	- Edge test: ensure HTTP errors are surfaced as typed errors and do not crash the app.

Acceptance criteria
- The LM client unit/integration tests pass; the client supports configurable base URL and basic timeouts/retries.

Milestone 5 — Summarization engine and time-window queries
---------------------------------------------------------
Goal: Build the summarization flow: query the store for a time window, format a prompt, send to LM Studio, and persist/display the returned summary.

Tasks (TDD)
- Task 1 (test): Add a failing test that asserts the summarizer composes the expected prompt given a set of records and a time window.
	- Example: `tests/summarize/prompt.test.ts` constructs 3 sample records and compares the generated prompt to a known-good string (this ensures stable prompt shaping).
- Task 2 (implementation): Implement `src/summarize/engine.ts` that queries `logStore` for records, builds the prompt (with truncation heuristics), calls `lmClient.summarizeWindow()`, and returns/stores structured summaries.
- Task 3 (test): Failing integration test to assert the end-to-end path: store -> summarizer -> lmClient (mocked) -> UI receives summary updates.
- Task 4 (implementation): Wire summarizer into the UI with progress indicators and caching (per time window), plus retry/backoff on transient LM errors.

Acceptance criteria
- Prompt shaping tests pass; summarizer returns cached summaries for identical time windows and invalidates cache when the underlying store changes.

Milestone 6 — Settings UI, error handling, and UX polish
------------------------------------------------------
Goal: Expose LM Studio endpoint, time-window defaults, ingestion behavior, and show unobtrusive errors and logs in the UI.

Tasks (TDD)
- Task 1 (test): Add a failing UI test that asserts settings are persisted to localStorage and that changing the LM Studio URL updates the client configuration.
- Task 2 (implementation): Implement `src/components/Settings.tsx` with a small form, localStorage persistence, and validation.
- Task 3 (test): Add failing tests for graceful error displays (summarization failures, ingestion parse errors).
- Task 4 (implementation): Implement consistent error handling and user-notifications (toasts/snackbars) and a small diagnostic panel.

Acceptance criteria
- Settings persist across reloads; errors are surfaced to the user with actionable messages.

Milestone 7 — End-to-end tests, CI, and documentation
----------------------------------------------------
Goal: Add E2E tests that run against a mocked LM Studio and create a CI pipeline to run unit + e2e checks. Document the SCSS manifest and the developer workflow for adding mixins/partials.

Tasks (TDD)
- Task 1 (test): Create an E2E test (Playwright or Cypress) that starts the dev server, uploads or writes a log file, triggers summarization (mocked LM Studio), and verifies the summary appears in the UI.
- Task 2 (implementation): Wire CI (GitHub Actions) with jobs for install, lint, unit tests, and E2E tests (using mocked endpoints or service containers). Add README / `DEVELOPER.md` notes on the SCSS manifest and how to add new mixins/partials.

Acceptance criteria
- CI runs: install -> lint -> unit tests -> e2e (mocked) and passes on the branch.
- Developer documentation added describing the SCSS organization and the summarization flow.

Acceptance Criteria (overall)
----------------------------
- All milestones have unit tests (and integration tests where applicable) driven by the failing-first TDD pattern.
- The app can ingest JSON logs from disk, show them in an expandable list, and obtain summaries from a configurable LM Studio endpoint for an arbitrary time window.
- Settings persist and are validated; errors are handled gracefully.
- A CI pipeline runs linting, unit tests, and a basic mocked E2E flow.

Notes
-----
- Start small: get file ingestion + store + a simple summarizer prompt working end-to-end with a mocked LM Studio before integrating the live LM Studio host.
- Maintain the TDD discipline: each feature begins with a small failing test that expresses the expectation and is quick to run.
- Keep the `_extras.scss` partial minimal — migrate rules into primary partials as components stabilize.




now i need a script to run on the API running on localhost:8080 to populate that project with new milestones and tasks.
API Spec: api\app\openapi.yml
Milestones:
-----------
- Name: Project & test harness setup
- Goal: Ensure a reproducible dev environment and a test runner for unit and integration tests.
-- Tasks:
--- 01.0: Add a failing test that asserts the test runner is wired and the project builds in test mode.
    - Example: create `tests/setup.test.ts` that imports the app entry and asserts a non-null App component or that `npm run build` returns success (mocked). Run the test and observe failure (test should fail until test scripts are added).
--- 02.0: Configure the test runner (Jest or Vitest), add a minimal test script in package.json, and implement any bootstrapping so that `tests/setup.test.ts` passes.
    - Ensure types and tsconfig are compatible with the test runner.
-----------
- Name: Local log ingestion (file + optional stream)
- Goal: Implement a robust ingestion layer that can read JSON log files from disk and accept an optional local process stream interface.
-- Tasks:
--- 01.0: Write a failing unit test that verifies the ingestion API can read a single JSON file and returns a parsed object.
    - Example: `tests/ingest/file-ingest.test.ts` should create a temporary JSON file with a sample log entry, call the ingestion function and assert the returned entry matches expected structure.
--- 02.0:     Implement `src/ingest/fileIngest.ts` to read JSON files (support newline-delimited JSON and arrays), parse them into normalized records, and return them.
    - Edge test: another failing test to assert malformed JSON causes a controlled error (and the implementation should return a typed error or skip record policy).
-----------
- Name: Log store, list UI, and expandable entries
- Goal: Create a local log store and a UI list component that displays JSON entries as expandable/collapsible items (with virtualized list for performance as needed).
-- Tasks:
--- 01.0: Add a failing unit test for the store that asserts adding new records updates the store and emits change events.
    - Example: `tests/store/store.test.ts` creates the store, subscribes to updates, pushes a sample record and expects the subscription to receive the new length and entry.
--- 02.0: Implement `src/store/logStore.ts` (simple event-emitter-based store or use Zustand) to manage records, indexing by timestamp, and queries by time window.
--- 03.0: Add a failing UI test (Vitest + testing-library) asserting that the `LogList` component renders a collapsed entry by default and expands when clicked to show pretty-printed JSON.
--- 04.0: Implement `src/components/LogList.tsx` and `LogItem.tsx` to render the list, toggle expand/collapse, and pretty-print JSON (use monaco or `<pre>` with formatting). Implement optional virtualization if necessary.
-----------
- Name: LM Studio integration (local model client)
- Goal: Provide a small API client to call a local LM Studio instance to send prompts and receive completions.
-- Tasks:
--- Add a failing integration test that mocks an LM Studio endpoint and asserts the client library calls the expected HTTP route and returns a structured response.
    - Example: `tests/lm/client.test.ts` sets up an HTTP mock server (msw or nock) and expects `lmClient.summarizeWindow()` to POST the right payload.
---     Implement `src/lm/lmClient.ts` that can POST to a configurable LM Studio URL, handle authentication (if needed), and parse returned completions into a typed Summaries object.
    - Edge test: ensure HTTP errors are surfaced as typed errors and do not crash the app.
-----------
- Name: Summarization engine and time-window queries
- Goal: Build the summarization flow: query the store for a time window, format a prompt, send to LM Studio, and persist/display the returned summary.
-- Tasks:
--- 01.0: Add a failing test that asserts the summarizer composes the expected prompt given a set of records and a time window.
    - Example: `tests/summarize/prompt.test.ts` constructs 3 sample records and compares the generated prompt to a known-good string (this ensures stable prompt shaping).
--- 02.0: Implement `src/summarize/engine.ts` that queries `logStore` for records, builds the prompt (with truncation heuristics), calls `lmClient.summarizeWindow()`, and returns/stores structured summaries.
--- 03.0: Failing integration test to assert the end-to-end path: store -> summarizer -> lmClient (mocked) -> UI receives summary updates.
--- 04.0: Wire summarizer into the UI with progress indicators and caching (per time window), plus retry/backoff on transient LM errors.
-----------
- Name: Settings UI, error handling, and UX polish
- Goal: Expose LM Studio endpoint, time-window defaults, ingestion behavior, and show unobtrusive errors and logs in the UI.
-- Tasks:
--- 01.0: Add a failing UI test that asserts settings are persisted to localStorage and that changing the LM Studio URL updates the client configuration.
--- 02.0: Implement `src/components/Settings.tsx` with a small form, localStorage persistence, and validation.
--- 03.0: Add failing tests for graceful error displays (summarization failures, ingestion parse errors).
--- 04.0: Implement consistent error handling and user-notifications (toasts/snackbars) and a small diagnostic panel.
-----------
- Name: End-to-end tests, CI, and documentation
- Goal: Add E2E tests that run against a mocked LM Studio and create a CI pipeline to run unit + e2e checks. Document the SCSS manifest and the developer workflow for adding mixins/partials.
-- Tasks:
--- 01.1: Create an E2E test (Playwright or Cypress) that starts the dev server, uploads or writes a log file, triggers summarization (mocked LM Studio), and verifies the summary appears in the UI.
--- 02.0: Wire CI (GitHub Actions) with jobs for install, lint, unit tests, and E2E tests (using mocked endpoints or service containers). Add README / `DEVELOPER.md` notes on the SCSS manifest and how to add new mixins/partials.
-----------