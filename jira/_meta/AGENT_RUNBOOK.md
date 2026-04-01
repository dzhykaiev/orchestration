# Agent Runbook (Parallel Execution)

## Current Active Tasks
- JIRA-014 — Context-first navigation and header simplification
- JIRA-015 — Ticket-first primary flow and Project flow demotion
- JIRA-017 — Unified action and state patterns
- JIRA-018 — Cross-entity linking and next-action guidance
- JIRA-019 — API alias deprecation + contract stabilization
- JIRA-020 — System UX architecture master plan

## Safe Parallel Batches
- Batch 1: JIRA-019 + JIRA-012 + JIRA-013 (foundation)
- Batch 2: JIRA-014 + JIRA-016 + JIRA-017 (navigation/state cleanup)
- Batch 3: JIRA-015 + JIRA-018 (ticket-first and cross-entity flow)
- Batch 4: JIRA-020 conformance pass + docs finalization

## Rules
- Кожен агент має власний write scope.
- Не чіпати чужі файли без потреби.
- Після завершення задачі: додати `## Result` у файл задачі.

## Autopilot Loop Policy (Main Agent)
- Працювати в циклі по плану до повного завершення, без пауз на confirm після кожного кроку.
- Після завершення кроку одразу переходити до наступного незавершеного кроку.
- Питати користувача лише якщо є blocker: доступи/approval, ризикована деструктивна дія, або критична неоднозначність.
- Коли контекст головного агента доходить до ~50%, виконати `/compact` і продовжити з наступного незавершеного кроку.

## Merge Checklist
1. Переглянути список змінених файлів і конфлікти scope.
2. Прогнати typecheck для змінених пакетів.
3. Прогнати цільові тести.
4. Перемістити задачу в `done/` або `blocked/`.

## Minimal Validation Commands
```bash
pnpm --filter @orchestration/api typecheck
pnpm --filter @orchestration/web typecheck
pnpm --filter @orchestration/api test -- src/routes/__tests__/workspaces.test.ts src/routes/__tests__/features.test.ts
pnpm --filter @orchestration/web test -- src/app/board/board-utils.test.ts src/lib/workspaceNavigation.test.ts
```
