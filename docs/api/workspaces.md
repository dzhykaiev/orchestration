# Workspaces API

Workspaces group projects together for organization.

## List Workspaces

```http
GET /api/workspaces
```

## Create Workspace

```http
POST /api/workspaces
Content-Type: application/json

{
  "name": "Personal Projects",
  "slug": "personal",
  "description": "Side projects and experiments"
}
```

## Get Workspace

```http
GET /api/workspaces/:id
```

## Update Workspace

```http
PUT /api/workspaces/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description"
}
```

## Delete Workspace

```http
DELETE /api/workspaces/:id
```
