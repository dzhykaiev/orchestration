# JIRA-005 Hiring Through Tickets

## Purpose
Реалізувати найм нових агентів виключно через workflow тикетів.

## Scope
- CEO створює ticket на найм architect.
- Architect може створювати дочірні tickets і призначати агентам.

## Files/Modules Likely Affected
- apps/api/src/routes/tickets.ts
- apps/api/src/routes/workspace-agents.ts
- apps/api/src/services/*
- apps/web/src/app/board/page.tsx

## Dependencies
- JIRA-004

## Owner
mixed

## Risks
- Конфлікти ролей/доступів.

## Validation
- integration: CEO -> hire architect -> architect delegates

## Definition of Done
- Делегація та найм відбуваються тільки через tickets.

## Result
- Додано `POST /api/tickets/:id/hire`:
  - створює нового agent definition у межах компанії ticket-а;
  - опційно створює delegated follow-up ticket, призначений цьому агенту;
  - пише delegation audit log (`action=delegated`).
- Додано тест на hiring flow в [apps/api/src/routes/__tests__/features.test.ts](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/api/src/routes/__tests__/features.test.ts).
- Реалізація: [apps/api/src/routes/tickets.ts](/Users/yevhenii.dzhykaiev/Documents/study/orchestration/apps/api/src/routes/tickets.ts)
