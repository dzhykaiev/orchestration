# Features API

Kanban-style feature board for tracking capabilities within a project.

## List Features

```http
GET /api/features
GET /api/features?projectId=uuid
GET /api/features?status=in_progress
```

## Create Feature

```http
POST /api/features
Content-Type: application/json

{
  "projectId": "uuid",
  "title": "User authentication",
  "description": "Add JWT-based auth to API endpoints",
  "type": "feature",
  "status": "backlog",
  "priority": 1
}
```

## Update Feature

```http
PUT /api/features/:id
Content-Type: application/json

{
  "status": "in_progress"
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
| `task` | Technical task |

## Feature Statuses

`backlog` → `todo` → `in_progress` → `done` / `rejected`
