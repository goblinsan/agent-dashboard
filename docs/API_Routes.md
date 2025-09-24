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
| `GET` | `/v1/projects/{project_id}/status` | Aggregated effort + completion metrics for the project. |
| `GET` | `/v1/projects/{project_id}/status/summary` | Natural language daily summary. |
| `GET` | `/v1/projects/{project_id}/next-action` | Top task suggestions based on priority heuristics. |

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

> Creating a milestone validates that the `project_id` exists.

---

## Tasks

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/v1/tasks` | List tasks. Filter via `project_id`, `milestone_id`, or `phase_id`. |
| `POST` | `/v1/tasks` | Create a task (requires `milestone_id` + `title`; optional fields mirror the schema). |
| `GET` | `/v1/tasks/{task_id}` | Retrieve a task. |
| `PATCH` | `/v1/tasks/{task_id}` | Update task fields. Requires `lock_version` for optimistic locking. |

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
