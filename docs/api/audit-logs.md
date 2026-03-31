# Audit Logs API

Complete audit trail of all system changes. Every creation, update, and status change is logged.

## List Audit Logs

```http
GET /api/audit-logs?projectId=uuid
GET /api/audit-logs?entityType=task
GET /api/audit-logs?entityId=uuid
GET /api/audit-logs?action=status_changed
```

**Response**:
```json
[
  {
    "id": "uuid",
    "projectId": "uuid",
    "entityType": "task",
    "entityId": "uuid",
    "action": "status_changed",
    "actorType": "system",
    "actorId": "orchestrator",
    "details": {
      "from": "queued",
      "to": "running"
    },
    "createdAt": "2026-03-31T10:05:01Z"
  }
]
```

## Actions

| Action | Description |
|--------|-------------|
| `created` | Entity created |
| `updated` | Entity modified |
| `status_changed` | Status transition |
| `delegated` | Task delegated to agent |
| `escalated` | Task escalated due to failure |
| `reviewed` | Reviewed by QA agent |
| `completed` | Successfully completed |
| `failed` | Failed execution |

## Actor Types

| Type | Description |
|------|-------------|
| `user` | Human action via API/dashboard |
| `agent` | AI agent action |
| `system` | Orchestrator system action |
