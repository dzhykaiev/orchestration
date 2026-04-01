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
- Для нових задач використовувати шаблон: `jira/_meta/TICKET_TEMPLATE.md`.
- Перед merge запускати аудит структури: `./jira/_meta/audit-jira.sh`.

## Стандарт секцій задачі
- `## Purpose`
- `## Scope`
- `## Files/Modules Likely Affected`
- `## Dependencies`
- `## Owner`
- `## Risks`
- `## Validation`
- `## Definition of Done`
- `## Progress (YYYY-MM-DD)`
- `## Remaining` (для `todo/inprogress/blocked`)
- Для `done/*`: обов'язково `## Result`

## Корисні команди
```bash
# взяти задачу в роботу
mv jira/todo/JIRA-001-domain-cutover.md jira/inprogress/

# завершити задачу
mv jira/inprogress/JIRA-001-domain-cutover.md jira/done/

# список задач у роботі
ls -1 jira/inprogress

# перевірити структуру jira-квитків
./jira/_meta/audit-jira.sh
```
