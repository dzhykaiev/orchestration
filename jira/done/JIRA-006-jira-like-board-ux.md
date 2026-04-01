# JIRA-006 Jira-like Board UX

## Purpose
Покращити board до Jira-like досвіду для керування компанією.

## Scope
- Колонки статусів, фільтри, пошук, quick actions.
- Timeline активності по ticket.

## Files/Modules Likely Affected
- apps/web/src/app/board/page.tsx
- apps/web/src/components/*
- apps/web/src/styles/*

## Dependencies
- JIRA-001

## Owner
mixed

## Risks
- UI перевантаження без ієрархії.

## Validation
- UI tests + manual smoke on desktop/mobile

## Definition of Done
- Board дозволяє ефективно керувати ticket-потоком без ручного SQL/API.

## Result
- Board став ticket-centric: пошук, quick filter chips, clear filters.
- Покращено колонки: `Backlog`, `Ready`, `In progress`, `Done`, `Rejected` + короткі описи.
- Додано quick actions у картках (kickoff, move status, open project).
- Оновлено термінологію до `ticket/company` у board UI.
- Покращено мобільний layout (stack columns).
- Додано `board-utils.ts` і тест `board-utils.test.ts`.
- Пройдено `pnpm --filter @orchestration/web typecheck`.
- Відомий blocker: запуск web vitest падає через наявний `ERR_REQUIRE_ESM` у `vitest/vite` конфігурації.
