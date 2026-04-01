# JIRA-012 Canonical domain language and route cleanup (Company/Ticket)

## Purpose
Прибрати термінологічний хаос Workspace/Company та Feature/Ticket, щоб користувач бачив одну модель системи.

## Scope
- Уніфікувати UI copy на Company/Ticket
- Прибрати публічний дублікат Workspaces routes у фронті
- Узгодити breadcrumbs та CTA з canonical route map

## Files/Modules Likely Affected
- apps/web/src/app/**
- apps/web/src/components/**
- apps/web/src/lib/api.ts
- docs/product-flow-zero-human-company.md

## Dependencies
none

## Owner
frontend

## Risks
TBD

## Validation
rg -n '/workspaces|Workspace(s)?' apps/web/src ; ручний проход основних flow у web

## Definition of Done
У користувацькому UI лишаються тільки терміни Company/Ticket; навігація не містить дубльованих маршрутів Workspaces.

## Progress (2026-04-01)
- Canonical routes `companies/*` більше не ре-експортуються з `workspaces/*`.
- Legacy `workspaces/*` сторінки переведені в редіректи на `companies/*` для backward compatibility.
- Додано route alias `/new -> /companies/new`, щоб прибрати 404 для старих entry points.
- Додано catch-all legacy redirect `workspaces/[id]/[...slug] -> companies/[id]/[...slug]`, щоб старі deep-link маршрути не повертали 404.
- На Companies list та shared `PageEmptyState` почато міграцію CSS hooks з `workspace-*` на `company-*` з alias-сумісністю в `globals.css`.
- `companies/new` переведено на canonical hooks/id:
  - container class: `workspace-create-card` -> `company-create-card`
  - form field ids: `ws-*` -> `company-*`
