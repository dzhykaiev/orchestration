# Jira Workspace (локальний)

Це локальна дошка задач у файловій системі.

## Колонки
- `todo/` — заплановано, ще не почато
- `inprogress/` — задача в роботі
- `done/` — завершено
- `blocked/` — заблоковано (чекає залежність/рішення)

## Правило роботи
- Одна задача = один markdown файл `JIRA-XXX-*.md`.
- Щоб почати задачу: перемістити файл з `todo/` у `inprogress/`.
- Щоб закрити: перемістити в `done/` і додати секцію `## Result`.
- Якщо блокер: перемістити в `blocked/` і додати `## Blocker`.

## Корисні команди
```bash
# взяти задачу в роботу
mv jira/todo/JIRA-001-domain-cutover.md jira/inprogress/

# завершити задачу
mv jira/inprogress/JIRA-001-domain-cutover.md jira/done/

# список задач у роботі
ls -1 jira/inprogress
```
