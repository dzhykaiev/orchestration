---
name: jira-state-sync
description: "Sync local Jira (`jira/*`) with real application state: find drift (done-but-not-updated and updated-but-not-done) and reconcile status/files."
---

# Jira State Sync

Коротко звіряє стан задач у `jira` з реальним станом застосунку та оновлює Jira-файли без ручної рутини.

## Goal

Підтримувати Jira в актуальному стані:
- зроблено в коді, але не відображено в Jira -> оновити Jira;
- в Jira позначено як завершено, але доказів немає -> повернути у роботу або позначити blocker.

## Trigger examples

- `sync jira`
- `звір jira з реальним станом`
- `онови jira по фактичному прогресу`

## Workflow (mandatory)

1. Read current board state
- Прочитати всі `jira/todo/*.md`, `jira/inprogress/*.md`, `jira/done/*.md`, `jira/blocked/*.md`.
- Запустити `./jira/_meta/audit-jira.sh`.

2. Detect drift using evidence (no guessing)
- Джерела доказів: `git log --oneline`, `git diff`, changed files, результати `typecheck/test`, секції `## Progress`/`## Result`.
- Drift A (work done, Jira stale): є код/тести/коміт-докази, але ticket лишився у `todo`/`inprogress`.
- Drift B (Jira ahead, work not proven): ticket у `done`, але DoD/validation не підтверджуються.

3. Reconcile Jira
- A: перемістити `todo|inprogress -> done`, додати `## Progress (YYYY-MM-DD)` і `## Result` з короткими фактами.
- B: перемістити `done -> inprogress` (або `blocked` якщо є явний blocker), додати причину в `## Remaining`/`## Blocker`.
- Якщо прогрес частковий: не закривати, тільки оновити `## Progress` + `## Remaining`.

4. Validate and report
- Повторно запустити `./jira/_meta/audit-jira.sh`.
- Повернути короткий звіт: що переміщено, що оновлено, що заблоковано.

## Rules

- Не змінювати зміст задачі без доказів у коді/тестах.
- Не залишати статус без оновлених `Progress/Remaining/Result` секцій.
- Якщо докази неоднозначні — ставити `inprogress` з чітким `## Remaining`, не `done`.
