# JIRA-009 Migration + QA Stabilization

## Purpose
Стабілізувати перехід і прибрати регресії.

## Scope
- Міграції DB (additive).
- Контрактні тести API.
- E2E ключових сценаріїв.

## Files/Modules Likely Affected
- packages/db/drizzle/*
- apps/api/src/routes/__tests__/*
- apps/web/src/**/*.test.ts*

## Dependencies
- JIRA-001
- JIRA-006
- JIRA-007
- JIRA-008

## Owner
mixed

## Risks
- Неповне покриття сценаріїв.

## Validation
- `pnpm typecheck`
- `pnpm test`
- e2e smoke

## Definition of Done
- Green CI для ключового happy-path і основних edge-cases.

## Result
- Проведено стабілізаційний QA-прогін після доменного переходу та scheduler змін.
- Перевірки пройдено:
  - `pnpm --filter @orchestration/shared typecheck`
  - `pnpm --filter @orchestration/db typecheck`
  - `pnpm --filter @orchestration/web typecheck`
  - `pnpm --filter @orchestration/api typecheck`
  - `pnpm --filter @orchestration/api test` (96 tests)
  - `pnpm --filter @orchestration/web test` (8 tests)
- Контрактні route сценарії для `tickets/companies` залишились стабільними після додавання scheduler endpoint-ів.
