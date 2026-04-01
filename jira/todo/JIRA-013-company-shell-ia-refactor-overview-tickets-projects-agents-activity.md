# JIRA-013 Company Shell IA refactor (Overview/Tickets/Projects/Agents/Activity)

## Purpose
Перебудувати IA у context-first shell, щоб всі ключові дії виконувались в контексті конкретної компанії.

## Scope
- Створити єдиний Company shell layout
- Винести Tickets/Projects/Agents/Activity у вкладки
- Прибрати ізольовані глобальні екрани без контексту

## Files/Modules Likely Affected
- apps/web/src/app/companies/[id]/**
- apps/web/src/components/AppHeaderNav.tsx
- apps/web/src/components/Breadcrumbs.tsx

## Dependencies
JIRA-012

## Owner
frontend

## Risks
TBD

## Validation
Навігаційний smoke-test: Company -> Tickets -> Project -> Agents -> Back

## Definition of Done
Користувач може пройти весь цикл роботи, не втрачаючи контекст компанії та без перемикань між дубльованими секціями.

## Progress (2026-04-01)
- `companies/[id]/agents` тепер має власну канонічну реалізацію (без залежності від legacy `workspaces/[id]/agents`).
- Знято прямий зв'язок `companies/* -> workspaces/*`, що спрощує наступні IA-рефактори.
