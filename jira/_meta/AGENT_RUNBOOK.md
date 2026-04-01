# Agent Runbook (Parallel Execution)

## Current Active Tasks
- JIRA-002 — Wizard
- JIRA-006 — Board UX
- JIRA-007 — Runtime Isolation

## Safe Parallel Batches
- Batch 1: JIRA-002 + JIRA-006 + JIRA-007
- Batch 2: JIRA-003 + JIRA-004
- Batch 3: JIRA-005
- Batch 4: JIRA-008
- Batch 5: JIRA-009
- Batch 6: JIRA-010

## Rules
- Кожен агент має власний write scope.
- Не чіпати чужі файли без потреби.
- Після завершення задачі: додати `## Result` у файл задачі.

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
```
