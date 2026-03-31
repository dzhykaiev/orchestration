# Workstreams API

Workstreams are parallel tracks of work within a project. Created by the architect agent during planning.

## List Workstreams

```http
GET /api/workstreams?projectId=uuid
```

Returns all workstreams for a project, including status, assigned role, and dependencies.

## Get Workstream

```http
GET /api/workstreams/:id
```

Returns workstream details including tasks, deliverables, and validation status.

**Response**:
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "name": "API Server",
  "description": "Implement REST API endpoints",
  "role": "backend",
  "status": "in_progress",
  "validationStatus": null,
  "orderIndex": 1,
  "dependencies": ["Data Layer"],
  "deliverables": ["POST /api/todos", "GET /api/todos", "GET /api/todos/:id"],
  "ownedPaths": ["apps/api/src/routes/", "apps/api/src/services/"],
  "createdAt": "2026-03-31T10:00:00Z",
  "updatedAt": "2026-03-31T10:05:00Z"
}
```

## Workstream Statuses

```
pending → in_progress → completed → (validation: pass/fail)
        → blocked      ↗
```

| Status | Description |
|--------|-------------|
| `pending` | Waiting to start (dependencies not met) |
| `blocked` | Blocked by failed dependency |
| `in_progress` | Agent is working |
| `completed` | All tasks finished |
| `failed` | Task failed after max retries |

## Validation

After all tasks in a workstream complete, a validation job is enqueued:
- QA agent checks deliverables
- Sets `validationStatus` to `pass`, `fail`, or `error`
