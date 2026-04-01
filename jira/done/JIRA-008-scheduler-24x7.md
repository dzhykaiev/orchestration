# JIRA-008 Scheduler / 24x7 Execution

## Purpose
Додати безперервний execution loop для агентної компанії.

## Scope
- Черга тикетів + політики запуску.
- Retry/backoff/timeout.

## Files/Modules Likely Affected
- apps/api/src/services/scheduler/*
- apps/api/src/services/orchestration/*
- apps/api/src/routes/tickets.ts

## Dependencies
- JIRA-003
- JIRA-005
- JIRA-007

## Risks
- Неконтрольований ріст задач або retry-loop.

## Validation
- long-running integration smoke

## Definition of Done
- Тикети можуть виконуватись автоматично за policy без ручного запуску.

## Result
- Додано 24/7 ticket auto-runner з policy:
  - автопідбір кандидатів зі статусів `todo` + `backlog`;
  - авто-kickoff у `planning` queue;
  - retry/backoff (exponential) з лімітом спроб;
  - timeout-сигнали для stale `in_progress` тикетів через audit log (`action: escalated`).
- Додано API керування runner:
  - `GET /api/tickets/runner/status`
  - `POST /api/tickets/runner/start`
  - `POST /api/tickets/runner/stop`
  - `POST /api/tickets/runner/tick`
- Runner інтегровано в startup API та graceful shutdown.
- Пройдено:
  - `pnpm --filter @orchestration/api typecheck`
  - `pnpm --filter @orchestration/api test -- src/routes/__tests__/features.test.ts`
  - `pnpm --filter @orchestration/api test -- src/routes/__tests__/workspaces.test.ts`
