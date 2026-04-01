# Workspaces API

Workspaces are the storage entity behind `companies`. Both route families are supported:
- `/api/workspaces/*`
- `/api/companies/*` (alias)

## List Workspaces

```http
GET /api/workspaces
GET /api/companies
```

## Create Workspace

```http
POST /api/workspaces
POST /api/companies
Content-Type: application/json

{
  "name": "Acme Autonomous Labs",
  "mission": "Run product delivery through autonomous ticket-driven agent teams",
  "description": "Zero-human company prototype",
  "slug": "acme-autonomous-labs",
  "bootstrapAgentRole": "ceo",
  "bootstrapAgentProvider": "codex"
}
```

## Get Workspace

```http
GET /api/workspaces/:id
GET /api/companies/:id
```

## Update Workspace

```http
PATCH /api/workspaces/:id
PATCH /api/companies/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

## Delete Workspace

```http
DELETE /api/workspaces/:id
DELETE /api/companies/:id
```

## Company-Scoped Ticket Shortcuts

```http
GET /api/companies/:id/tickets
POST /api/companies/:id/tickets
```
