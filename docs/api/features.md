# Features API

Kanban-style work board items (features and issues) scoped to a workspace.

For company-oriented usage, prefer [Tickets API](/api/tickets) which exposes the same entity with ticket-first naming.

## List Features

```http
GET /api/features
GET /api/features?workspaceId=uuid
GET /api/features?status=in_progress
GET /api/features?sourceProjectId=uuid
GET /api/features?assigneeMode=agent&assigneeAgentDefinitionId=uuid
```

## Create Feature

```http
POST /api/features
Content-Type: application/json

{
  "workspaceId": "uuid",
  "title": "User authentication",
  "description": "Add JWT-based auth to API endpoints",
  "type": "bug",
  "priority": 2,
  "sourceProjectId": "uuid",
  "assigneeMode": "agent",
  "assigneeAgentDefinitionId": "uuid"
}
```

## Update Feature

```http
PATCH /api/features/:id
Content-Type: application/json

{
  "status": "in_progress",
  "assigneeMode": "orchestrator",
  "assigneeAgentDefinitionId": null
}
```

## Delete Feature

```http
DELETE /api/features/:id
```

## Feature Types

| Type | Description |
|------|-------------|
| `feature` | New functionality |
| `bug` | Bug fix |
| `improvement` | Enhancement to existing feature |
| `refactor` | Internal cleanup/refactor |

## Feature Statuses

`backlog` → `todo` → `in_progress` → `done` / `rejected`

## Assignee Modes

| Mode | Behavior |
|------|----------|
| `orchestrator` | Main orchestrator owns triage and routing |
| `agent` | Work item is assigned to a specific workspace agent |
