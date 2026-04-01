# JIRA-018 Cross-entity linking and next-action guidance system

## Purpose
Побудувати системну зв'язність між Ticket/Project/Agent та зробити next step явним у кожній точці.

## Scope
- Двосторонні лінки Ticket<->Project
- Next action cards у Company/Project
- Контекстні CTA для unblock/escalation

## Files/Modules Likely Affected
- apps/web/src/app/board/page.tsx
- apps/web/src/app/projects/[id]/page.tsx
- apps/web/src/app/workspaces/[id]/page.tsx

## Dependencies
JIRA-015, JIRA-016

## Owner
product+frontend

## Risks
TBD

## Validation
Scenario walkthrough: user can move from signal -> action in <=2 clicks

## Definition of Done
Система завжди підказує наступну корисну дію і не залишає користувача в dead-end стані.

## Progress (2026-04-01)
- Company Tickets list тепер веде в залежності від контексту:
  - якщо ticket має `orchestrationProjectId` -> перехід у linked Project
  - якщо linked project відсутній -> перехід у Board з prefilled search
- Company Activity feed для ticket events теж робить context-aware routing:
  - linked project існує -> `/projects/:id`
  - інакше -> Board search
- Project detail (`projects/[id]`) покращено:
  - `Current stage` card має явний primary next-action (status-aware)
  - issue tickets отримали прямі переходи:
    - у linked project (коли існує)
    - або у Board з prefilled ticket search
