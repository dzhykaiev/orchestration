# API Overview

Fastify REST API running on port `3001`. All endpoints are prefixed with `/api`.

Base URL: `http://localhost:3001/api`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/health/ready` | Readiness check (DB + Redis) |
| **Projects** | | |
| `GET` | `/projects` | List all projects |
| `POST` | `/projects` | Create a new project |
| `GET` | `/projects/:id` | Get project details |
| `PATCH` | `/projects/:id` | Update a project |
| `DELETE` | `/projects/:id` | Delete a project |
| `POST` | `/projects/:id/plan` | Start planning |
| `POST` | `/projects/:id/stop` | Stop/cancel project |
| `POST` | `/projects/:id/archive` | Archive project |
| `GET` | `/projects/:id/detail` | Aggregated detail (project + workstreams + tasks + feature) |
| `GET` | `/projects/:id/costs` | Cost breakdown |
| `GET` | `/projects/:id/workstreams` | Project workstreams |
| `POST` | `/projects/:id/workstreams` | Create workstream in project |
| `GET` | `/projects/:id/files` | Browse generated files |
| `GET` | `/projects/:id/files/content` | Read file content |
| **Workstreams** | | |
| `GET` | `/workstreams/:id` | Get workstream details |
| `PATCH` | `/workstreams/:id` | Update workstream |
| `GET` | `/workstreams/:id/tasks` | List workstream tasks |
| **Tasks** | | |
| `POST` | `/tasks` | Create task + enqueue implementation |
| `POST` | `/tasks/:id/retry` | Retry failed task |
| `POST` | `/tasks/:id/complete` | Mark task completed/failed |
| `GET` | `/tasks/:id/children` | List child tasks |
| `GET` | `/tasks/:id/tree` | Task subtree |
| **Workspaces** | | |
| `GET` | `/workspaces` | List all workspaces |
| `POST` | `/workspaces` | Create a workspace |
| `GET` | `/workspaces/:id` | Get workspace details |
| `PATCH` | `/workspaces/:id` | Update a workspace |
| `DELETE` | `/workspaces/:id` | Delete a workspace |
| `GET` | `/workspaces/:id/projects` | List workspace projects |
| `GET` | `/workspaces/:id/features` | List workspace features |
| `GET` | `/workspaces/:id/agents` | List workspace agents |
| `POST` | `/workspaces/:id/agents` | Create workspace agent definition |
| **Features** | | |
| `GET` | `/features` | List features (filter by project) |
| `POST` | `/features` | Create a feature |
| `PATCH` | `/features/reorder` | Reorder features |
| `PATCH` | `/features/:id` | Update a feature |
| `DELETE` | `/features/:id` | Delete a feature |
| `POST` | `/features/:id/kickoff` | Create orchestration project from feature |
| **Artifacts** | | |
| `GET` | `/projects/:id/artifacts` | List project artifacts |
| `GET` | `/artifacts/:id` | Get artifact details |
| `DELETE` | `/artifacts/:id` | Delete artifact |
| **Escalations** | | |
| `GET` | `/projects/:id/escalations` | List project escalations |
| `GET` | `/escalations/:id` | Get escalation |
| `PATCH` | `/escalations/:id` | Update escalation status/resolution |
| **Reviews** | | |
| `GET` | `/tasks/:id/reviews` | Task reviews |
| `GET` | `/workstreams/:id/reviews` | Workstream reviews |
| **Agents** | | |
| `GET` | `/agents/definitions` | List all agent definitions |
| **Audit Logs** | | |
| `GET` | `/projects/:id/audit-log` | List project audit logs |
| **Events** | | |
| `GET` | `/events` | SSE stream for real-time updates |

## Request Validation

All endpoints use Zod schemas for request validation. Schemas are in `apps/api/src/schemas/`.

Invalid requests return:

```json
{
  "statusCode": 400,
  "error": "Validation Error",
  "requestId": "..."
}
```

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Bad Request — validation failed |
| `404` | Not Found — resource doesn't exist |
| `409` | Invalid state transition |
| `415` | Unsupported media type |
| `500` | Internal server error |

All errors follow the shape:

```json
{
  "error": "Description",
  "statusCode": 500,
  "requestId": "..."
}
```

## Authentication

::: warning MVP Limitation
No authentication in MVP. All requests are trusted. See [Assumptions](/assumptions) for details.
:::
