# Agent Company Operations Runbook

Operational guide for running a ticket-driven autonomous company.

## Roles

- `CEO/Orchestrator`: top-level operator agent, owns strategy and hiring decisions.
- `Architect`: decomposes goals into implementable work and delegation plans.
- `Specialists` (backend/frontend/data/devops/qa): execute delegated tickets.

## Operating Rules

- Every work item must exist as a ticket.
- Every decision and question should be logged in ticket communication timeline.
- Hiring and delegation must happen through ticket actions.
- Tickets should have one clear owner at a time.

## Ticket Lifecycle

- `backlog`: captured but not ready.
- `todo`: ready to execute.
- `in_progress`: kicked off into execution project.
- `done`: accepted outcome.
- `rejected`: intentionally dropped.

## Recommended Daily Loop

1. Review high-priority `todo` tickets.
2. Ensure owners are assigned (`orchestrator` or specific agent).
3. Trigger or verify `TicketAutoRunner`.
4. Check stale `in_progress` tickets and escalation signals.
5. Resolve blockers through ticket Q/A.
6. Close completed tickets and create follow-up tickets when needed.

## Runner Controls

- `GET /api/tickets/runner/status`
- `POST /api/tickets/runner/start`
- `POST /api/tickets/runner/stop`
- `POST /api/tickets/runner/tick`

Environment controls:
- `AUTO_TICKET_RUNNER_ENABLED` (default: `true`)
- `AUTO_TICKET_RUNNER_INTERVAL_MS` (default: `15000`)
- `AUTO_TICKET_RUNNER_MAX_PER_TICK` (default: `2`)
- `AUTO_TICKET_RUNNER_MAX_RETRIES` (default: `5`)
- `AUTO_TICKET_RUNNER_BACKOFF_BASE_MS` (default: `30000`)
- `AUTO_TICKET_RUNNER_BACKOFF_MAX_MS` (default: `900000`)
- `AUTO_TICKET_RUNNER_INPROGRESS_TIMEOUT_MS` (default: `7200000`)

## Incident Patterns

## Runner Not Moving Tickets

Check:
- no eligible tickets in `todo/backlog`,
- tickets already have `orchestrationProjectId`,
- retry cap reached,
- queue/redis availability.

Action:
- run `POST /api/tickets/runner/tick` manually,
- inspect ticket logs for retry or failure metadata,
- reduce blockers in ticket definitions.

## Stale In-Progress Tickets

Signal:
- ticket log entry with `kind: auto-runner-timeout-signal`.

Action:
- inspect linked project and execution logs,
- create intervention ticket,
- delegate incident response to architect/ops agent.

## Governance Suggestions

- Keep one company goal statement concise and stable.
- Prefer short tickets with explicit done criteria.
- Use delegated follow-up tickets over long ambiguous tickets.
- Run periodic backlog grooming by architect agent.
