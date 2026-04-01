# JIRA-016 Board context/state cleanup (remove hidden workspace state)

## Purpose
Прибрати прихований стан борди і зробити company context явним та керованим URL/route станом.

## Scope
- Депрекейтнути localStorage як primary source
- Явний company context у board route
- Прозорий workspace/company selector behavior

## Files/Modules Likely Affected
- apps/web/src/lib/workspaceNavigation.ts
- apps/web/src/app/board/page.tsx
- apps/web/src/components/AppHeaderNav.tsx

## Dependencies
JIRA-013

## Owner
frontend

## Risks
TBD

## Validation
Manual test: hard reload, deep-link, back/forward не ламають selected company context

## Definition of Done
Board завжди відкривається у явному company context; hidden state не впливає на critical navigation.

## Progress (2026-04-01)
- Канонічний board query context переведено на `companyId`.
- Залишено backward compatibility: board читає legacy `workspaceId` і нормалізує URL до `companyId`.
- Оновлено навігаційні хелпери (`resolveCompanySelection`, `buildCompanyHref`) з deprecated-аліасами для старого API виклику.
- Централізовано формування board URL через `buildBoardHref(companyId, options)`:
  - підтримка `q/type/status/projectId` в одному контракті;
  - прибрано ручне складання `"/board?companyId=..."` на company screens (`overview`, `tickets`, `activity`) і `projects/new`.
- Додано канонічний company-scoped board route: `/companies/:id/board`.
- `board/page.tsx` тепер резолвить company context з path (`/companies/:id/board`) і зберігає backward compatibility для `/board?companyId=...` та legacy `workspaceId`.
- Alias behavior оновлено: глобальний `/board` з company context нормалізується до канонічного `/companies/:id/board` (із збереженням query filters).
- Внутрішній стан board-page узгоджено з доменом `company`:
  - локальні змінні/хендлери `workspaces/selectedWorkspaceId/fetchWorkspaces/syncWorkspaceContext` перейменовано в `companies/selectedCompanyId/fetchCompanies/syncCompanyContext`;
  - це зменшує когнітивний шум і ризик помилок у підтримці змішаних термінів.
- Для безпечної міграції збережено API-сумісність створення ticket:
  - board `handleSave` приймає `companyId` і legacy `workspaceId`, далі нормалізує до одного `companyId` значення.
- UI-layer модалки ticket очищено від `workspace*` у публічному контракті:
  - `FeatureModal` prop API переведено на `companies` + `defaultCompanyId` + `onSave({ companyId })`;
  - оновлено callsites у board і project detail, щоб прибрати змішаний словник у компонентних інтерфейсах.
- Продовжено cleanup board/project UI layer:
  - `board/page.tsx`: CSS hooks `board-workspace-select` -> `board-company-select`, `workspace-empty-actions` -> `company-empty-actions`.
  - `projects/[id]/page.tsx`: локальний контекст перейменовано `workspace/workspaceAgents` -> `company/companyAgents`; введено `projectCompanyId` для явного company context у board/activity/company links.
  - `projects/new/page.tsx`: внутрішній state і форма переведені на `companies/companyId/selectedCompany`; legacy `workspaceId` залишено лише як API payload key та validation compatibility key.
- Навігаційний helper у web canonicalized:
  - додано `apps/web/src/lib/companyNavigation.ts` як canonical module;
  - сторінкові імпорти переведено з `workspaceNavigation` на `companyNavigation`;
  - `workspaceNavigation.ts` залишено як deprecated compatibility re-export wrapper.
- Для error handling залишено сумісність з backend validation key:
  - modal показує company field error як для `companyId`, так і для legacy `workspaceId`.
- Validation:
  - `pnpm --filter @orchestration/web typecheck` passed.
  - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts` passed.

## Remaining
- TBD
