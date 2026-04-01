# Execution Plan: Jira-like Zero Human Company

> Current UX architecture execution is tracked separately in:
> `jira/_meta/EXECUTION_PLAN_UX_PHASE2_JIRA012-020.md` (Apr 1, 2026).

## 1. Execution Strategy
- Рухаємось contract-first: спочатку фіксуємо домен (`Company`, `Ticket`), потім адаптери/alias, потім UI/UX і runtime.
- Робимо boundary-first refactor: API контракти + shared schema на межі, далі реалізації.
- Працюємо малими незалежними задачами, щоб можна було запускати 2-4 агентів паралельно.

## 2. Workstreams
- WS-A: Domain & API contracts
- WS-B: Onboarding + Company bootstrap flow
- WS-C: Ticket-centric orchestration (hiring, communication)
- WS-D: Runtime isolation per company
- WS-E: Board UX + observability
- WS-F: QA, migration, rollout docs

## 3. Task Breakdown
- JIRA-001 Domain cutover (`workspace/feature` -> `company/ticket`) у публічному API та shared типах.
- JIRA-002 Ініціалізація компанії (назва, ціль, опис, перший CEO/Orchestrator, CLI).
- JIRA-003 Авто-створення першого ticket після bootstrap (CEO планує компанію).
- JIRA-004 Ticket communication log (agent-agent, user-agent, системні події).
- JIRA-005 Hiring flow через tickets (CEO наймає architect, architect делегує далі).
- JIRA-006 Board UX (Jira-like колонки, фільтри, activity timeline).
- JIRA-007 Ізольовані workspace roots per company (файли/проекти/рантайм).
- JIRA-008 Планувальник/runner для 24/7 execution політик.
- JIRA-009 Міграції + backward compatibility + smoke/e2e.
- JIRA-010 Документація нової операційної моделі.

## 4. Dependency Graph
- JIRA-001 -> JIRA-002, JIRA-004, JIRA-006, JIRA-009
- JIRA-002 -> JIRA-003
- JIRA-004 -> JIRA-005
- JIRA-003 + JIRA-005 -> JIRA-008
- JIRA-007 -> JIRA-008, JIRA-009
- JIRA-006 + JIRA-008 + JIRA-009 -> JIRA-010

## 5. Parallelization Opportunities
- Після JIRA-001 можна паралелити:
  - Agent A: JIRA-002/003
  - Agent B: JIRA-004/005
  - Agent C: JIRA-007
  - Agent D: JIRA-006
- JIRA-009 стартує як тільки є готові куски з A/B/C.

## 6. Merge Order
1. JIRA-001
2. JIRA-002
3. JIRA-003
4. JIRA-004
5. JIRA-005
6. JIRA-007
7. JIRA-006
8. JIRA-008
9. JIRA-009
10. JIRA-010

## 7. Validation / QA Plan
- API: route tests для `/api/companies` + `/api/tickets`.
- Shared contracts: typecheck у `packages/shared`.
- Web: onboarding flow + board integration tests.
- Runtime: integration test на ізоляцію per-company директорій.
- E2E: "create company -> first CEO ticket -> hire architect -> spawn subtasks".

## 8. Rollback Considerations
- Тримати alias endpoints (`/workspaces`, `/features`) до завершення міграції клієнта.
- Фічі за флагом для scheduler/runner.
- ДБ-міграції тільки additive до стабілізації.
