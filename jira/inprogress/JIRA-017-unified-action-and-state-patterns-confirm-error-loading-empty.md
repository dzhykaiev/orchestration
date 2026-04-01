# JIRA-017 Unified action and state patterns (confirm/error/loading/empty)

## Purpose
Уніфікувати поведінку системи в критичних станах, щоб знизити помилки та підвищити довіру користувача.

## Scope
- Єдиний confirm pattern для destructive actions
- Стандартизовані empty/loading/error стани
- Узгоджений формат error details

## Files/Modules Likely Affected
- apps/web/src/components/ui/ConfirmModal.tsx
- apps/web/src/components/ui/Toast*.tsx
- apps/web/src/app/**/page.tsx
- apps/web/src/lib/api.ts

## Dependencies
JIRA-014

## Owner
frontend

## Risks
TBD

## Validation
Regression checklist for create/update/delete + network/validation/conflict errors

## Definition of Done
У всіх ключових екранах однаковий UX-патерн для state handling та ризикових дій.

## Progress (2026-04-01)
- Home page переведено на єдиний state pattern через `PageStates`:
  - loading: `PageLoadingState`
  - error: `PageErrorState`
- Прибрано окремий нестандартний fallback UI на Home, щоб уникнути різних сценаріїв поведінки між екранами.
- Project detail page також переведено на `PageLoadingState` / `PageErrorState` замість окремого локального fallback.
- Company agents page (`/companies/[id]/agents`) переведено на `PageLoadingState` / `PageErrorState`, включно з secondary action `Back to Company`, щоб вирівняти UX state handling між company-підрозділами.
- Companies index page (`/companies`) переведено з локального skeleton fallback на `PageLoadingState`, щоб list-view також відповідав єдиному loading pattern.
- New Project page (`/projects/new`) переведено на явний state lifecycle для компаній:
  - loading: `PageLoadingState` під час `api.companies.list`
  - error: `PageErrorState` з `Retry` + secondary `Back to Companies`
  - empty: `PageEmptyState` з єдиною дією `Create Company`
- При `companies.length === 0` форма створення проєкту більше не рендериться паралельно з empty-state, щоб прибрати суперечливий UX і зробити flow лінійним.

## Remaining
- TBD
