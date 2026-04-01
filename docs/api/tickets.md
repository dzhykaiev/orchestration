# Tickets API

`Tickets` are the company-facing alias for `features`.

## Canonical and Alias Routes

- Canonical feature routes still exist at `/api/features`.
- Ticket-centric routes are available at `/api/tickets`.

Both point to the same underlying entity.

## List Tickets

```http
GET /api/tickets
GET /api/tickets?workspaceId=uuid
GET /api/tickets?status=todo
GET /api/tickets?assigneeMode=agent&assigneeAgentDefinitionId=uuid
```

## Create Ticket

```http
POST /api/tickets
Content-Type: application/json

{
  "workspaceId": "uuid",
  "title": "Hire architect for onboarding flow",
  "description": "Define first architecture tasks and delegation plan",
  "type": "improvement",
  "priority": 2,
  "assigneeMode": "orchestrator"
}
```

## Update / Delete

```http
PATCH /api/tickets/:id
DELETE /api/tickets/:id
```

## Kickoff Ticket

Creates linked execution project and moves ticket to `in_progress`.

```http
POST /api/tickets/:id/kickoff
```

## Ticket Communication Log

```http
GET /api/tickets/:id/log?limit=50&offset=0
POST /api/tickets/:id/log
```

Example payload:

```json
{
  "message": "Need clarification on onboarding priorities",
  "channel": "question",
  "actorType": "agent",
  "actorId": "agent-uuid"
}
```

## Hiring Through Tickets

Hire agent and optionally create delegated follow-up ticket.

```http
POST /api/tickets/:id/hire
```

## Runner Controls

```http
GET /api/tickets/runner/status
POST /api/tickets/runner/start
POST /api/tickets/runner/stop
POST /api/tickets/runner/tick
```

These endpoints control autonomous execution policy for `todo/backlog` tickets.
