# JIRA-004 Ticket Communication Log

## Purpose
Зберігати повний журнал комунікацій у межах ticket.

## Scope
- Події: user->agent, agent->agent, system updates.
- Читання журналу на сторінці ticket.

## Files/Modules Likely Affected
- packages/db/src/schema.ts
- apps/api/src/routes/tickets.ts
- apps/api/src/services/*
- apps/web/src/components/board/*

## Dependencies
- JIRA-001

## Risks
- Ріст об'єму логів.

## Validation
- DB migration + API tests + UI rendering test

## Definition of Done
- В ticket видно впорядкований event log з таймстемпами.

## Result
- Додано API для ticket communication log:
  - `GET /api/tickets/:id/log` (pagination)
  - `POST /api/tickets/:id/log` (message entry з actor/channel/metadata)
- Логи зберігаються у `audit_logs` як entity=`feature` з metadata.kind=`message`.
- Додано тест-кейси в [apps/api/src/routes/__tests__/features.test.ts](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/api/src/routes/__tests__/features.test.ts).
- Реалізація: [apps/api/src/routes/tickets.ts](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/api/src/routes/tickets.ts), [apps/api/src/application/audit-logs/ports.ts](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/api/src/application/audit-logs/ports.ts), [apps/api/src/application/audit-logs/audit-log-use-cases.ts](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/api/src/application/audit-logs/audit-log-use-cases.ts)
