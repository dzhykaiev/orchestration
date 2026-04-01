# JIRA-011 Web Vitest ESM Fix

## Purpose
Розблокувати запуск web unit-тестів у поточному стеку vite/vitest.

## Scope
- Виправити `ERR_REQUIRE_ESM` у `apps/web/vitest.config.ts` / суміжному конфігу.
- Забезпечити запуск `vitest run` для локальних unit tests.

## Files/Modules Likely Affected
- apps/web/vitest.config.ts
- vitest.config.ts
- package.json / tooling config (за потреби)

## Dependencies
- none

## Owner
mixed

## Risks
- Несумісність між версіями `vite`/`vitest`/ts runtime.

## Validation
- `pnpm --filter @orchestration/web exec vitest run src/app/board/board-utils.test.ts`

## Definition of Done
- Web unit tests стартують і виконуються без startup ESM помилки.

## Result
- Прибрано runtime-import `defineConfig` з `apps/web/vitest.config.ts`.
- Конфіг залишено як plain object, щоб не тригерити `vite` через CJS path на старті.
- Після зміни точна команда `pnpm --filter @orchestration/web exec vitest run src/app/board/board-utils.test.ts` проходить.
- `package.json` змінювати не знадобилось.
