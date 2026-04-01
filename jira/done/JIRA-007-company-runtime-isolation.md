# JIRA-007 Company Runtime Isolation

## Purpose
Зробити ізоляцію файлів/процесів/проєктів на рівні компанії.

## Scope
- Окрема root-директорія на компанію.
- Окремий context для агентських запусків.

## Files/Modules Likely Affected
- apps/api/src/services/runtime/*
- apps/api/src/services/orchestration/*
- packages/shared/src/*

## Dependencies
- none

## Risks
- Випадкове змішування контекстів між компаніями.

## Validation
- integration test: 2 companies -> ізольовані FS paths/state

## Definition of Done
- Операції однієї компанії не мають доступу до артефактів іншої.

## Result
- Додано company-scoped runtime context у shared типах.
- Додано deterministic resolver для `companyRoot/projectsRoot/projectRoot`.
- `launch.service` і `files` route переведені на company-scoped paths + safe path resolution.
- Додано unit test для company runtime resolution.
- Пройдено:
  - `pnpm --filter @orchestration/shared typecheck`
  - `pnpm --filter @orchestration/api typecheck`
  - `pnpm --filter @orchestration/api test -- src/services/orchestration/__tests__/company-runtime.test.ts`
