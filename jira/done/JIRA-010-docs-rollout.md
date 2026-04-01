# JIRA-010 Docs + Rollout

## Purpose
Описати нову операційну модель продукту і правила експлуатації.

## Scope
- README update.
- Product flow doc.
- Agent operating guide (roles, tickets, escalation).

## Files/Modules Likely Affected
- README.md
- docs/*

## Dependencies
- JIRA-006
- JIRA-008
- JIRA-009

## Risks
- Документація відстане від реалізації.

## Validation
- docs review checklist

## Definition of Done
- Новий користувач може пройти повний flow без усних пояснень.

## Result
- Оновлено README під ticket-first/company-first модель.
- Додано продуктову flow-документацію:
  - `docs/product-flow-zero-human-company.md`
- Додано operational runbook:
  - `docs/runbooks/agent-company-operations.md`
- Додано API документацію для tickets:
  - `docs/api/tickets.md`
- Оновлено API overview/workspaces/features docs під aliases `companies/tickets` і runner endpoints.
- Оновлено VitePress sidebar для нових сторінок.
- Валідація:
  - `pnpm --filter @orchestration/api typecheck`
  - `pnpm docs:build`
