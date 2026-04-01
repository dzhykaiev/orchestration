# JIRA-014 Context-first navigation and header simplification

## Purpose
Зменшити когнітивне навантаження через просту та передбачувану навігацію з одним primary next step.

## Scope
- Спрощення глобального header до Companies + Activity
- Стандартизувати breadcrumbs у всіх ключових екранах
- Вирівняти back-links та hierarchy contract

## Files/Modules Likely Affected
- apps/web/src/components/AppHeaderNav.tsx
- apps/web/src/components/Breadcrumbs.tsx
- apps/web/src/app/**/page.tsx

## Dependencies
JIRA-012, JIRA-013

## Owner
frontend

## Risks
TBD

## Validation
UX checklist: кожен екран має 1 primary action + коректний breadcrumb path

## Definition of Done
Навігація стає лінійною: користувач завжди розуміє де він і куди повернутись.

## Progress (2026-04-01)
- Header `Activity` fallback вирівняно на `/companies` (без неочікуваного переходу на home root поза контекстом компанії).
- Компанійний shell breadcrumb стандартизовано до `Companies / Company`.
- Board breadcrumb зроблено context-first: `Companies / {Company} / Tickets` (включно з loading/error/empty станами).
- У `projects/new` breadcrumb додано ієрархію компанії: `Companies / {Company} / Advanced: New Project`.
