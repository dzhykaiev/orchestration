# API Overview

Fastify REST API running on port `3001`. All endpoints are prefixed with `/api`.

Base URL: `http://localhost:3001/api`

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| | | |
| **Projects** | | |
| `GET` | `/projects` | List all projects |
| `POST` | `/projects` | Create a new project |
| `GET` | `/projects/:id` | Get project details |
| `PUT` | `/projects/:id` | Update a project |
| `DELETE` | `/projects/:id` | Delete a project |
| `POST` | `/projects/:id/plan` | Start orchestration planning |
| `GET` | `/projects/:id/files` | Browse generated files |
| | | |
| **Workstreams** | | |
| `GET` | `/workstreams` | List workstreams (filter by project) |
| `GET` | `/workstreams/:id` | Get workstream details |
| | | |
| **Tasks** | | |
| `GET` | `/tasks` | List tasks (filter by project/workstream) |
| `GET` | `/tasks/:id` | Get task details with logs |
| | | |
| **Workspaces** | | |
| `GET` | `/workspaces` | List all workspaces |
| `POST` | `/workspaces` | Create a workspace |
| `GET` | `/workspaces/:id` | Get workspace details |
| `PUT` | `/workspaces/:id` | Update a workspace |
| `DELETE` | `/workspaces/:id` | Delete a workspace |
| | | |
| **Features** | | |
| `GET` | `/features` | List features (filter by project) |
| `POST` | `/features` | Create a feature |
| `PUT` | `/features/:id` | Update a feature |
| `DELETE` | `/features/:id` | Delete a feature |
| | | |
| **Artifacts** | | |
| `GET` | `/artifacts` | List artifacts (filter by project/task) |
| `GET` | `/artifacts/:id` | Get artifact details |
| | | |
| **Agents** | | |
| `GET` | `/agents` | List agent definitions |
| `POST` | `/agents` | Create agent definition |
| | | |
| **Audit Logs** | | |
| `GET` | `/audit-logs` | List audit logs (filter by project/entity) |
| | | |
| **Events** | | |
| `GET` | `/events` | SSE stream for real-time updates |

## Request Validation

All endpoints use Zod schemas for request validation. Schemas are in `apps/api/src/schemas/`.

Invalid requests return:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error details"
}
```

## Error Responses

| Status | Meaning |
|--------|---------|
| `400` | Bad Request — validation failed |
| `404` | Not Found — resource doesn't exist |
| `500` | Internal Server Error |

All errors follow the shape:

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "Description of what went wrong"
}
```

## Authentication

::: warning MVP Limitation
No authentication in MVP. All requests are trusted. See [Assumptions](/assumptions) for details.
:::
