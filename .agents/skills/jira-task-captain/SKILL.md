---
name: jira-task-captain
description: "Use this skill to reliably capture user tasks into local Jira files (`jira/todo`) so tasks are not lost, then optionally start execution agents."
---

# Jira Task Captain

Надійно приймає задачу від користувача, зберігає її у локальну Jira-дошку, і тільки після цього запускає виконання.

## Goal

Забезпечити правило: **жодна задача не втрачається**.

Кожен запит користувача має пройти через етап persisted capture:

1. створити task-файл у `jira/todo/`
2. зафіксувати подію у `jira/_meta/CAPTURE_LOG.tsv`
3. повідомити користувачу `JIRA-XXX` і шлях файлу
4. лише потім переходити до імплементації або запуску агентів

## Trigger examples

- `використай jira-task-captain: хочу додати кнопку реєстрації`
- `skill jira-відповідальний: зроби нову задачу ...` (сприймати як цей skill)
- `додай задачу в jira ...`

## Mandatory workflow

### Phase 1 - Capture (required)

1. Витягни мінімум:
   - title
   - purpose (або `TBD`)
2. Створи задачу командою:

```bash
scripts/jira-create-task.sh \
  --title "<title>" \
  --purpose "<purpose або TBD>" \
  --scope "<item1 ; item2>" \
  --files "<path1 ; path2>" \
  --dependencies "<JIRA-001, JIRA-002>" \
  --validation "<command/check>" \
  --definition "<done criteria>" \
  --owner "<owner/agent>"
```

3. Переконайся, що файл реально існує в `jira/todo/`.
4. Переконайся, що рядок додався в `jira/_meta/CAPTURE_LOG.tsv`.
5. Поверни користувачу ticket id і шлях.

### Phase 2 - Clarify (only if risky)

Став тільки критичні питання, які блокують правильне виконання:

- бізнес-правила, що змінюють результат
- обмеження безпеки/даних
- незворотні архітектурні рішення

### Phase 3 - Execute (optional)

Якщо користувач явно просить “зробити зараз”:

1. перемісти задачу `todo -> inprogress`
2. виконай імплементацію
3. після завершення: `inprogress -> done`, додай `## Result`
4. якщо блокер: `inprogress -> blocked`, додай `## Blocker`

## Output format

Відповідай коротко в такому порядку:

1. `Captured`: `JIRA-XXX` + файл
2. `Status`: `todo` / `inprogress` / `done` / `blocked`
3. `Next`: що буде зроблено далі

## Rules

- Не запускати агентів до persisted capture.
- Не тримати задачу тільки в чаті: вона має бути у файлі.
- Якщо даних мало, все одно створити задачу з `TBD`, а не відкладати.
- Не змінювати або не видаляти чужі Jira-файли без прямої вказівки користувача.
