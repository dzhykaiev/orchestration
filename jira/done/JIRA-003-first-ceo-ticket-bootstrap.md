# JIRA-003 First CEO Ticket Bootstrap

## Purpose
Після створення компанії автоматично запускати першу тикет-задачу від CEO.

## Scope
- Auto-ticket "Company operating plan".
- Kickoff у фоновому режимі.

## Files/Modules Likely Affected
- apps/api/src/routes/tickets.ts
- apps/api/src/services/feature-service.ts
- apps/web/src/app/companies/new/page.tsx

## Dependencies
- JIRA-002

## Owner
mixed

## Risks
- Дублікат автотікета при повторному submit/retry.

## Validation
- integration: single bootstrap ticket per company

## Definition of Done
- Після bootstrap компанія має 1 стартовий ticket у board.

## Result
- Після bootstrap компанії автоматично створюється перший ticket (`Initial operating plan for <company>`).
- Ticket автоматично призначається на freshly-created founding agent (`assigneeMode=agent`).
- У ticket одразу додається системний log entry про bootstrap походження.
- Реалізація: [apps/web/src/app/workspaces/new/page.tsx](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/web/src/app/workspaces/new/page.tsx), [apps/web/src/lib/api.ts](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/web/src/lib/api.ts)
