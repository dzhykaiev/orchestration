# JIRA-001 Domain Cutover (workspace/feature -> company/ticket)

## Purpose
Завершити публічний доменний перехід у API/shared/web без регресій.

## Scope
- Уніфікувати неймінг у публічних DTO і клієнтських викликах.
- Залишити backward-compatible alias маршрути.

## Files/Modules Likely Affected
- apps/api/src/routes/*
- apps/api/src/interfaces/http/build-app.ts
- packages/shared/src/*
- apps/web/src/lib/api.ts

## Dependencies
- none

## Owner
mixed

## Risks
- Злам існуючих клієнтських викликів.

## Validation
- typecheck (api/web/shared)
- route tests для companies/tickets + legacy aliases

## Definition of Done
- `/api/companies` і `/api/tickets` повністю робочі.
- legacy шляхи працюють як alias.

## Result
- Додано alias маршрути `/api/companies` і `/api/tickets`.
- Збережено legacy сумісність через `/api/workspaces` і `/api/features`.
- Оновлено web API client на нові alias endpoints.
- Підтверджено typecheck та route tests для alias шляхів.
