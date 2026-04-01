---
name: product-designer-jira
description: "Use this skill to run user-flow and product-design review, then persist prioritized improvements as Jira tasks in `jira/todo`."
---

# Product Designer Jira

Проводить рев'ю user flow і продуктового дизайну та фіксує покращення у локальному Jira backlog.

## Goal

Зробити end-to-end цикл:

1. аудит поточних user flows і продуктового UX
2. пріоритизація покращень
3. створення конкретних Jira-тасок у `jira/todo`

## When to use

- `skill product-designer-jira`
- `зроби рев'ю юзер флоу і додай покращення в jira`

## Mandatory workflow

### Phase 1 - Product + Flow review

Проаналізуй:

- ціль продукту і ключових користувачів
- основні entry points і критичні user flows
- onboarding, IA, discoverability, conversion friction
- місця, де користувач губиться або зупиняється

### Phase 2 - Prioritization

Згрупуй findings у:

- critical blockers
- quick wins
- structural improvements

Для кожного пункту зафіксуй:

- user problem
- proposed change
- expected impact
- risk

### Phase 3 - Persist to Jira (required)

Для кожного пріоритетного покращення створи окрему задачу через:

```bash
bash scripts/jira-create-task.sh \
  --title "<короткий заголовок покращення>" \
  --purpose "<яку user проблему вирішує>" \
  --scope "<крок 1 ; крок 2 ; крок 3>" \
  --files "<екрани/компоненти/модулі>" \
  --dependencies "<JIRA-XXX, ... або порожньо>" \
  --risks "<основний ризик>" \
  --validation "<як перевірити UX поліпшення>" \
  --definition "<чіткий DoD>" \
  --owner "product-design-review"
```

Мінімум:

- 3 задачі, якщо є суттєві проблеми
- 1 задача, якщо знайшли лише одну high-impact зміну

### Phase 4 - Optional execution kickoff

Якщо користувач явно просить одразу імплементувати:

1. перемісти обрану задачу `todo -> inprogress`
2. запусти технічну реалізацію
3. після завершення `inprogress -> done` + `## Result`

## Output format

Поверни саме ці секції:

1. Product Goal
2. Core User Flows (Observed)
3. Key UX/Product Findings
4. Prioritized Improvements
5. Jira Tasks Created
6. Next Step

## Rules

- Не обмежуйся візуалом: фокус на зрозумілості, конверсії і speed-to-value.
- Не залишай покращення тільки в тексті відповіді: вони мають бути створені як Jira файли.
- Якщо даних недостатньо, створи задачі з позначкою `TBD` в деталях, але не пропускай capture.
- Не змінюй існуючі Jira задачі без прямої вказівки користувача.
