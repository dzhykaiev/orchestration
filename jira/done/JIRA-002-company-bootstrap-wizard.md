# JIRA-002 Company Bootstrap Wizard

## Purpose
Зробити ініціалізацію компанії як 1-й обов'язковий flow.

## Scope
- Поля: company name, goal (required), description (optional).
- Вибір першого агента: CEO/Orchestrator.
- Вибір Agent CLI: claude/codex/opencode.

## Files/Modules Likely Affected
- apps/web/src/app/companies/new/*
- apps/web/src/components/*
- apps/api/src/routes/workspaces.ts (companies alias)
- packages/shared/src/schema.ts

## Dependencies
- JIRA-001

## Risks
- Неповна валідація форми.

## Validation
- form validation tests
- e2e: create company wizard success

## Definition of Done
- Нову компанію можна створити тільки через wizard із required goal.

## Result
- Оновлено bootstrap wizard: `Company Name`, `Company Goal` (required), `Description` (optional), `CEO/Orchestrator`, `CLI`.
- Додано створення першого managing agent у тому ж submit flow.
- Додано best-effort rollback компанії, якщо створення першого агента падає.
- Пройдено `pnpm --filter @orchestration/web typecheck`.
