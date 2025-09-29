Persona: LeadEngineer
Goal: Build a performant, filterable, append-only Activity / Event Stream page that lists events from the backend and updates as new events arrive. Ship a minimal vertical slice first; keep the design and types easy to extend.

The project dashboard is running the dashboard api at http://localhost:8080/
In progress Milestone : adc16227-d589-4b0a-86fe-5ad60405339f

Use the dashboard api and mark the last task as done. task id: 2f012a91-2b2b-4e36-b27d-31ffe1cdc0d2
Mark the next task as In Progress and begin the implementation. task id : 584e0eb6-6c94-43a3-b27e-f16013364116


## Requirements
- **Append‑only activity feed**: Display all events (`/v1/events` API). Events should be ordered newest → oldest.
- **Filters**:
  - By `entity_type` (project, milestone, phase, task, bug)
  - By `status` or `type` (status_change, agent_action, created, updated, etc.)
  - By `created_by` (specific user or agent)
- **Pagination / Infinite scroll**: support `?limit` and `?offset` params from API; append results as the user scrolls.
- **UI/UX**:
  - Event cards with: timestamp, actor (user/agent), type, summary text, links to related entity (project, milestone, task).
  - Clear visual distinction between event types (e.g. icon or color coding).
  - Sticky filter controls at top.
  - Empty state when no events found.

## Technical Notes
- **API**: Use `GET /v1/events` with query params for filtering.
- **React Stack**: TanStack Query for fetching with infinite scroll; Tailwind + shadcn/ui for UI.
- **Data Contract (example)**:
```json
{
  "id": "uuid",
  "entity_type": "task",
  "entity_id": "uuid",
  "type": "status_change",
  "payload": {"from": "in_progress", "to": "done"},
  "created_by": "agent_lead_engineer_01",
  "created_at": "2025-09-26T17:30:00Z"
}
```
- **Linking**: clicking entity id links to its detail page (project, milestone, phase, task, bug).

## Acceptance Criteria
- User can open the Event Stream page and see a feed of recent events.
- Filtering works by entity type, actor, and event type.
- Infinite scroll loads older events seamlessly.
- Each event clearly displays actor, timestamp, type, and context with links.
- Data is never mutated — feed is append‑only.
