# Tasks API

Tasks are individual units of work assigned to AI agents.

## List Tasks

```http
GET /api/tasks?projectId=uuid
GET /api/tasks?workstreamId=uuid
GET /api/tasks?status=running
```

## Get Task

```http
GET /api/tasks/:id
```

**Response**:
```json
{
  "id": "uuid",
  "workstreamId": "uuid",
  "projectId": "uuid",
  "role": "backend",
  "title": "Implement todo CRUD endpoints",
  "prompt": "...",
  "output": "...",
  "status": "completed",
  "error": null,
  "costUsd": "0.15",
  "attemptCount": 1,
  "maxAttempts": 3,
  "filesModified": ["apps/api/src/routes/todos.ts", "apps/api/src/services/todos.ts"],
  "createdAt": "2026-03-31T10:05:00Z",
  "startedAt": "2026-03-31T10:05:01Z",
  "completedAt": "2026-03-31T10:06:30Z"
}
```

## Task Statuses

```
queued → running → completed
                 → failed → (retry) → running
                 → cancelled
```

| Status | Description |
|--------|-------------|
| `queued` | Waiting in BullMQ queue |
| `running` | Agent is executing |
| `completed` | Finished successfully |
| `failed` | Failed (may retry) |
| `cancelled` | Manually cancelled |

## Task Lifecycle

1. **Created** — orchestrator creates task with prompt and context
2. **Queued** — added to BullMQ implementation queue
3. **Running** — agent picks up the task, calls LLM
4. **Completed/Failed** — output saved, status updated
5. **Retry** (if failed) — re-enqueued with error context from previous attempt
