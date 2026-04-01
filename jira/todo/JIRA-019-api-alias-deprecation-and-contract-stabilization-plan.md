# JIRA-019 API alias deprecation and contract stabilization plan

## Purpose
Закріпити контрактну модель Company/Ticket без різких breaking changes та з планом міграції.

## Scope
- Описати canonical API surface
- Позначити aliases legacy/compat
- Додати contract tests і migration notes

## Files/Modules Likely Affected
- apps/api/src/interfaces/http/build-app.ts
- apps/api/src/routes/*.ts
- docs/api/overview.md
- docs/contracts/README.md

## Dependencies
JIRA-012

## Owner
backend+architect

## Risks
TBD

## Validation
API contract tests + docs review

## Progress (2026-04-01, web)
- `apps/web/src/lib/api.ts`
  - Added canonical type aliases `Company` and `Ticket`.
  - Kept `Workspace` and `Feature` as deprecated type aliases for compatibility.
  - Added dev-time deprecation warnings for legacy client surfaces:
    - `api.workspaces` -> `api.companies`
    - `api.features` -> `api.tickets`
- `apps/web/src/app/projects/[id]/page.tsx`
  - Replaced remaining legacy calls:
    - `api.workspaces.*` -> `api.companies.*`
    - `api.features.create` -> `api.tickets.create`
- Docs updated with alias policy:
  - `docs/api/overview.md`
  - `docs/contracts/README.md`
- `apps/web/src/app/**/*` and `apps/web/src/components/board/*`
  - Migrated remaining legacy type imports/usages from `Workspace`/`Feature` to `Company`/`Ticket`.
  - Left only deprecated compatibility aliases in `apps/web/src/lib/api.ts`.
- Validation
  - `pnpm --filter @orchestration/web typecheck` passed.
  - `pnpm --filter @orchestration/web test -- src/app/board/board-utils.test.ts src/lib/workspaceNavigation.test.ts` passed.
- Backend (2026-04-01)
  - Added explicit alias lifecycle policy in route layer via:
    - `apps/api/src/routes/alias-lifecycle.ts`
  - Legacy alias endpoints now emit lifecycle/observability headers:
    - `Deprecation: true`
    - `Sunset: Wed, 30 Sep 2026 23:59:59 GMT`
    - `X-API-Alias-Legacy`, `X-API-Alias-Canonical`, `X-API-Alias-Usage`
    - `Warning: 299 - "... deprecated ..."`
  - Hooked legacy detection into:
    - `apps/api/src/routes/workspaces.ts` (`/api/workspaces*` -> `/api/companies*`)
    - `apps/api/src/routes/features.ts` (`/api/features*` -> `/api/tickets*`)
  - Added/extended contract tests for parity and lifecycle headers:
    - `apps/api/src/routes/__tests__/workspaces.test.ts`
    - `apps/api/src/routes/__tests__/features.test.ts`
  - Validation:
    - `pnpm --filter @orchestration/api test -- src/routes/__tests__/workspaces.test.ts src/routes/__tests__/features.test.ts` passed.
- Legacy route resilience (2026-04-01, web)
  - Added nested frontend alias redirect to preserve deep links:
    - `apps/web/src/app/workspaces/[id]/[...slug]/page.tsx`
  - Behavior:
    - Any `/workspaces/:id/*` legacy route now redirects to `/companies/:id/*` instead of returning 404.
  - Validation:
    - `pnpm --filter @orchestration/web typecheck` passed.

## Remaining
- Optional: replace process-local `X-API-Alias-Usage` counter with centralized metrics sink in production telemetry.

## Definition of Done
Команда має задокументований і протестований план переходу до canonical API без втрати сумісності.
