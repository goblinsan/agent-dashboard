# API Routes & Usage Guide

- **Base URL:** `http://localhost:8080`
- **Media Type:** JSON for request and response bodies.
- **Authentication:** Not required for local development.
- **Error Handling:** Non-2xx responses include a JSON `detail` field describing the problem.

Use `curl` or any HTTP client. Examples below assume a Unix-like shell; on Windows PowerShell, adjust quoting accordingly.

---

## Projects

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/projects` | List projects. Optional `parent_id` query for nested setups. |
| `POST` | `/v1/projects` | Create a project (`name`, optional `goal`, `direction`, `parent_id`). |
| `GET` | `/v1/projects/{project_id}` | Retrieve a single project. |
| `PATCH` | `/v1/projects/{project_id}` | Update project metadata (`name`, `goal`, `direction`, `parent_id`). |
| `GET` | `/v1/projects/{project_id}/status` | Aggregated effort + completion metrics for the project. |
| `GET` | `/v1/projects/{project_id}/status/summary` | Natural language daily summary. |
| `GET` | `/v1/projects/{project_id}/next-action` | Top task suggestions based on priority heuristics. |
| `GET` | `/v1/projects/{project_id}/milestones` | Resolve milestones by slug or name within a project. |

**Create a project**
```bash
curl -s -X POST http://localhost:8080/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Vertical Slice","goal":"Ship MVP0"}'
```

---

## Milestones

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/milestones` | List milestones. Filter with `project_id`. |
| `POST` | `/v1/milestones` | Create a milestone (requires `project_id`, `name`; optional `description`, dates, status). |
| `GET` | `/v1/milestones/{milestone_id}` | Fetch a milestone by ID. |
| `PATCH` | `/v1/milestones/{milestone_id}` | Update milestone fields (`name`, `description`, status, dates). |

### Upsert milestone by slug (Coordinator-friendly)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/projects/{project_id}/milestones:upsert` | Create or update a milestone by `slug` within the project. Returns 201 on create, 200 on update. |

Request body (any subset in updates):

```
{
  "slug": "mvp0",
  "name": "MVP 0",
  "start_date": "2025-10-01",
  "due_date": "2025-10-15"
}
```

Notes:
- `slug` must be unique per project (case-sensitive). When omitted in updates, 422 is returned.
- You can later reference tasks under this milestone via `(project_id, milestone_slug)`.
- On creation, returns `201 Created` and sets `Location: /v1/milestones/{id}`.

Try it:

```bash
# Create a project
PROJECT_ID=$(curl -s -X POST http://localhost:8080/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo Project"}' | jq -r '.id')

# Upsert a milestone by slug (first time -> 201)
curl -i -s -X POST http://localhost:8080/v1/projects/$PROJECT_ID/milestones:upsert \
  -H "Content-Type: application/json" \
  -d '{"slug":"mvp0","name":"MVP 0","start_date":"2025-10-01","due_date":"2025-10-15"}' | sed -n '1,20p'

# Upsert same slug to update fields (-> 200)
curl -i -s -X POST http://localhost:8080/v1/projects/$PROJECT_ID/milestones:upsert \
  -H "Content-Type: application/json" \
  -d '{"slug":"mvp0","name":"MVP Zero"}' | sed -n '1,20p'
```

> Creating a milestone validates that the `project_id` exists.

### Resolve milestones by slug or name (within a project)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/projects/{project_id}/milestones` | Resolve milestones by `slug` (exact match) or search by `name` (substring, case-insensitive). If neither is provided, returns a limited list. |

Query parameters:
- `slug` (optional): exact slug to match. If provided, returns milestones whose stored slug matches, or slugified name for legacy rows.
- `name` (optional): substring search against milestone name.
- `limit` (optional, default 10): maximum number of items to return.

Response shape:
```
{
  "ok": true,
  "milestones": [
    {
      "id": "<uuid>",
      "slug": "mvp0",
      "name": "MVP 0",
      "start_date": "2025-10-01",
      "due_date": "2025-10-15",
      "url": "/v1/milestones/<uuid>"
    }
  ]
}
```

Try it:

```bash
# Resolve by slug
curl -s "http://localhost:8080/v1/projects/$PROJECT_ID/milestones?slug=mvp0" | jq .

# Resolve by name contains
curl -s "http://localhost:8080/v1/projects/$PROJECT_ID/milestones?name=MVP" | jq .

# Get first 5 milestones (no filter)
curl -s "http://localhost:8080/v1/projects/$PROJECT_ID/milestones?limit=5" | jq .
```

---

## Tasks

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/tasks` | List tasks. Filter via `project_id`, `milestone_id`, or `phase_id`. |
| `POST` | `/v1/tasks` | Create a task (requires `milestone_id` + `title`; optional fields mirror the schema). |
| `GET` | `/v1/tasks/{task_id}` | Retrieve a task. |
| `PATCH` | `/v1/tasks/{task_id}` | Update task fields. Requires `lock_version` for optimistic locking. |

### Upsert task (external_id or natural key)

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/tasks:upsert` | Create a task if it does not exist, else update and return it. Upsert by `external_id`, fallback to `(project_id + milestone_slug + task.slug)`. |

Body:

```
{
  "external_id": "gh:octo/repo#123",          // primary natural key (optional)
  "project_id": "<uuid>",                     // required if using milestone_slug
  "milestone_id": "<uuid>",                   // or provide milestone_id directly
  "milestone_slug": "mvp0",                   // used with project_id
  "slug": "setup-dev-env",                    // task-level slug in the milestone (optional)
  "title": "Set up dev environment",
  "description": "Install deps and tools",
  "assignee_persona": "LeadEngineer",
  "effort_estimate": 2.5,
  "priority_score": 0.7,
  "parent_task_id": "<uuid>",
  "options": { "initial_status": "in_progress" }
}
```

Responses:
- 201 Created for new tasks, 200 OK for existing; headers include:
  - `Location: /v1/tasks/{id}`
  - `ETag: W/"<lock_version>"`
- 409 Conflict if `external_id` already refers to a task in another milestone.
- 422 Unprocessable Entity for invalid `milestone_id` or unknown `(project_id, milestone_slug)`.

Try it (external_id):

```bash
# Ensure you have PROJECT_ID from previous example

# Upsert milestone if needed
curl -s -X POST http://localhost:8080/v1/projects/$PROJECT_ID/milestones:upsert \
  -H "Content-Type: application/json" \
  -d '{"slug":"mvp0","name":"MVP 0"}' >/dev/null

# Create or update a task by external_id
curl -i -s -X POST http://localhost:8080/v1/tasks:upsert \
  -H "Content-Type: application/json" \
  -d '{
        "external_id": "gh:octo/repo#123",
        "project_id": "'$PROJECT_ID'",
        "milestone_slug": "mvp0",
        "slug": "setup-dev-env",
        "title": "Set up dev environment",
        "assignee_persona": "LeadEngineer",
        "effort_estimate": 2.5,
        "priority_score": 0.7,
        "options": { "initial_status": "in_progress" }
      }' | sed -n '1,40p'
```

Try it (natural key fallback):

```bash
curl -i -s -X POST http://localhost:8080/v1/tasks:upsert \
  -H "Content-Type: application/json" \
  -d '{
        "project_id": "'$PROJECT_ID'",
        "milestone_slug": "mvp0",
        "slug": "draft-arch",
        "title": "Draft architecture"
      }' | sed -n '1,40p'
```

### Resolve task by external_id or natural key

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/tasks/resolve` | Resolve and return a task using `external_id`, or `(project_id, milestone_slug, task_slug)`. |

Query examples:

```
/v1/tasks/resolve?external_id=gh:octo/repo#123
/v1/tasks/resolve?project_id=<uuid>&milestone_slug=mvp0&task_slug=setup-dev-env
```

Responses:
- 200 with `TaskRead`
- 404 if not found
- 422 if required query parameters are missing

Try it:

```bash
# Resolve by external_id
curl -s "http://localhost:8080/v1/tasks/resolve?external_id=$(printf %s 'gh:octo/repo#123' | jq -sRr @uri)" | jq .

# Resolve by natural key
curl -s "http://localhost:8080/v1/tasks/resolve?project_id=$PROJECT_ID&milestone_slug=mvp0&task_slug=setup-dev-env" | jq .
```

### Update task status with optimistic concurrency

| Method | Path | Description |
| --- | --- | --- |
| `PATCH` | `/v1/tasks/{task_id}/status` | Update only the `status` field; optional `lock_version` for concurrency. |

Body:

```
{ "status": "done", "lock_version": 3 }
```

Responses:
- 200 with updated `TaskRead`; header `ETag: W/"<lock_version>"` reflects the new version
- 409 with payload `{ "error": "conflict", "lock_version": <current>, "task": <TaskRead> }` when stale
- 422 for validation errors

Update by external id:

| Method | Path |
| --- | --- |
| `PATCH` | `/v1/tasks/by-external/{external_id}/status` |

On 409, returns the current `TaskRead` directly (no wrapper object) to match the proposal.

Try it (by id):

```bash
# Get TASK_ID from the last upsert
TASK_ID=$(curl -s "http://localhost:8080/v1/tasks?project_id=$PROJECT_ID" | jq -r '.[0].id')

# Update status (without lock_version)
curl -i -s -X PATCH http://localhost:8080/v1/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"done"}' | sed -n '1,40p'

# Update status with lock_version to demonstrate concurrency
CURR_VERSION=$(curl -s http://localhost:8080/v1/tasks/$TASK_ID | jq -r '.lock_version')
curl -i -s -X PATCH http://localhost:8080/v1/tasks/$TASK_ID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"in_progress","lock_version":'$CURR_VERSION'}' | sed -n '1,60p'
```

Try it (by external_id):

```bash
curl -i -s -X PATCH http://localhost:8080/v1/tasks/by-external/$(printf %s 'gh:octo/repo#123' | jq -sRr @uri)/status \
  -H "Content-Type: application/json" \
  -d '{"status":"on_hold"}' | sed -n '1,40p'
```

### Batch update statuses

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/v1/tasks/status:batch` | Batch status updates by `id` or `external_id`. |

Body:

```
[
  { "id": "<uuid>", "status": "in_progress", "lock_version": 1 },
  { "external_id": "gh:octo/repo#123", "status": "done" }
]
```

Returns array of per-item results:

```
[
  { "ok": true,  "id": "<uuid>", "external_id": null, "status": 200, "lock_version": 2 },
  { "ok": false, "id": null,    "external_id": "gh:octo/repo#123", "status": 404, "error": "not found" }
]
```

Notes on concurrency and caching:
- `ETag` uses a weak validator derived from `lock_version`: `W/"<n>"`.
- For status updates, you can send `lock_version` in the body. Support for `If-Match` may be added later.

Try it:

```bash
curl -s -X POST http://localhost:8080/v1/tasks/status:batch \
  -H "Content-Type: application/json" \
  -d '[
        { "external_id": "gh:octo/repo#123", "status": "done" },
        { "id": "'$TASK_ID'", "status": "in_progress" }
      ]' | jq .
```

**Updating a task status**
```bash
curl -s -X PATCH \
  http://localhost:8080/v1/tasks/<task_id> \
  -H "Content-Type: application/json" \
  -d '{"status":"done","lock_version":2}'
```

---

## Bugs

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/bugs` | List bugs. Filter with `project_id` and/or `task_id`. |
| `POST` | `/v1/bugs` | Create a bug (`project_id`, `title`; optional `task_id`, `description`, `severity`, `status`). Validates task ↔ project relationship. |
| `PATCH` | `/v1/bugs/{bug_id}` | Update bug fields (`status`, `severity`, `description`, `task_id`). |
| `DELETE` | `/v1/bugs/{bug_id}` | Delete a bug (returns HTTP 204). |

---

## Event Log (Activity)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/events` | List events for a project. `project_id` query is required; optional `milestone_id`, `task_id`, `limit` (default 50). |
| `POST` | `/v1/events` | Append an event (`project_id`, `summary`; optional `category`, `milestone_id`, `task_id`, `details`). If `task_id` is supplied, it must belong to the project and (optionally) the provided milestone. |

**Log an event**
```bash
curl -s -X POST http://localhost:8080/v1/events \
  -H "Content-Type: application/json" \
  -d '{
        "project_id": "<project_id>",
        "summary": "Deployment completed",
        "category": "update",
        "details": "All services rolled at 14:35",
        "task_id": "<task_id>"
      }'
```

---

## Personas

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/personas` | List persona definitions (key, name, description, limits). |
| `GET` | `/v1/personas/projects/{project_id}` | Personas assigned to a project plus per-agent limits. |
| `PUT` | `/v1/personas/projects/{project_id}` | Replace personas assigned to the project (body: `{ "personas": [{"persona_key": "LeadEngineer", "limit_per_agent": 2}, ...] }`). |

---

## Discovery (.well-known)

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/.well-known/schemas` | Returns JSON Schema for project, milestone, and task payloads. Helpful for client-side validation. |

---

## Quick Workflow Example

```bash
# 1) Create project and milestone
PROJECT_ID=$(curl -s -X POST http://localhost:8080/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Dogfood MVP"}' | jq -r '.id')

MILESTONE_ID=$(curl -s -X POST http://localhost:8080/v1/milestones \
  -H "Content-Type: application/json" \
  -d '{"project_id":"'"$PROJECT_ID"'","name":"Vertical Slice"}' | jq -r '.id')

# 2) Create a task
TASK_ID=$(curl -s -X POST http://localhost:8080/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"milestone_id":"'"$MILESTONE_ID"'","title":"Set up dev env"}' | jq -r '.id')

# 3) Log an event tied to the task
curl -s -X POST http://localhost:8080/v1/events \
  -H "Content-Type: application/json" \
  -d '{"project_id":"'"$PROJECT_ID"'","task_id":"'"$TASK_ID"'","summary":"Local env ready"}'
```

---

## Notes
- All timestamps are stored/returned in UTC with timezone information.
- DELETE endpoints respond with `204 No Content` when successful.
- For convenience, the `docs/Execution_Plan_Dogfood_MVP.md` file tracks high-level roadmap status if you need context on recommended workflows.

### Schema highlights
- Milestones now support a `slug` unique within a project; helpful for stable addressing.
- Tasks support `external_id` (unique per project) and an optional `slug` unique within a milestone.
- Task status enum now includes `on_hold` in addition to existing states.
