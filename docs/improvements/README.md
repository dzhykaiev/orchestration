# Improvements Backlog

Структурований список покращень для платформи. Кожен файл — окрема задача з контекстом, проблемою, рішенням і чеклістом.

## Як працювати з цими файлами

1. Агент читає файл задачі
2. Виконує описані кроки
3. Відмічає `[x]` виконані пункти в чеклісті
4. Додає коментар `<!-- DONE by [agent] at [date] -->` в кінці файлу

## Пріоритет виконання

### P0 — Критичні (зламаний флоу)
- [01-unified-entity-flow.md](./01-unified-entity-flow.md) — Уніфікація флоу Workspace → Project → Feature
- [02-feature-workspace-binding.md](./02-feature-workspace-binding.md) — Прив'язка фіч до воркспейсів
- [11-code-health-audit-2026-03-31.md](./11-code-health-audit-2026-03-31.md) — Виправлення зламаних quality gates (`typecheck`, `lint`) і стабілізація critical-path

### P1 — Важливі (консистентність)
- [03-api-consistency.md](./03-api-consistency.md) — Консистентність API (пагінація, фільтри, ендпоінти)
- [04-status-machines.md](./04-status-machines.md) — Строгі state machines для всіх сутностей
- [05-dependency-resolution.md](./05-dependency-resolution.md) — Нормалізація залежностей воркстрімів

### P2 — Покращення (якість)
- [06-cost-tracking.md](./06-cost-tracking.md) — Коректний трекінг вартості
- [07-orchestrator-resilience.md](./07-orchestrator-resilience.md) — Стійкість оркестратора
- [08-audit-and-artifacts.md](./08-audit-and-artifacts.md) — Автоматичний аудит і артефакти
- [09-frontend-ux.md](./09-frontend-ux.md) — UX покращення фронтенду
- [10-agent-hierarchy-improvements.md](./10-agent-hierarchy-improvements.md) — Покращення ієрархії агентів
