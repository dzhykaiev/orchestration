# JIRA-015 Ticket-first primary flow and Project flow demotion

## Purpose
Зробити ticket-first модель основним шляхом виконання, а direct New Project залишити як advanced сценарій.

## Scope
- Primary CTA: New Ticket/Kickoff
- Перепозиціонувати New Project як advanced
- Оновити guidance блоки на Home/Company/Board

## Files/Modules Likely Affected
- apps/web/src/app/page.tsx
- apps/web/src/app/board/page.tsx
- apps/web/src/app/projects/new/page.tsx
- docs/product-overview.md

## Dependencies
JIRA-013, JIRA-014

## Owner
product+frontend

## Risks
TBD

## Validation
E2E сценарій: Company create -> Ticket create -> Kickoff -> Project monitor

## Definition of Done
Основний сценарій веде користувача через Ticket-first pipeline без розгалуження на рівноцінні альтернативи.

## Progress (2026-04-01)
- Company Overview quick actions: прибрано дублюючий advanced-entry; залишено `Open Ticket Board` як primary та `Open Projects` як secondary.
- Company Projects header/empty states переведені у ticket-first hierarchy:
  - primary: `Open Tickets`
  - secondary: `Advanced: Direct Project`
- Home guidance/empty state: прибрано `Advanced: Direct Project` CTA, залишено єдиний ticket-first primary (`Open Ticket Board` / `Ticket Board`).
