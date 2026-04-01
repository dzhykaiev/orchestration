# Execution Plan: UX Phase 2 (JIRA-012..JIRA-020)

## 1. Execution Strategy
- Objective: перевести продукт з "route/domain chaos" у стабільну `Company -> Tickets -> Projects -> Agents -> Activity` систему з ticket-first операційною моделлю.
- Principle: canonical-first at boundaries (`company/ticket`), context-first in navigation, one-primary-action per screen.
- Delivery mode: 3 короткі спринти з паралельними workstreams, мінімізуючи overlap по файлах.

## 2. Workstreams
- WS-1 Canonical Domain & Route Cleanup
  - JIRA-012, JIRA-019
- WS-2 Company Shell IA & Navigation
  - JIRA-013, JIRA-014, JIRA-016
- WS-3 Ticket-first Flow & Cross-entity Guidance
  - JIRA-015, JIRA-018
- WS-4 Unified State/Action Reliability
  - JIRA-017
- WS-5 Governance & UX Architecture Control
  - JIRA-020

## 3. Task Breakdown (Sprint Framing)

### Sprint 1 (Apr 1, 2026 - Apr 12, 2026) — Stabilize Boundaries
1. JIRA-012: Canonical domain language + route cleanup.
2. JIRA-019: API alias lifecycle/deprecation headers + parity tests.
3. JIRA-013 (foundation slice): Company shell as single context frame.

Definition of done:
- No user-visible `workspace/feature` terms.
- Canonical routes are primary in frontend.
- Alias compatibility remains functional with test coverage.

### Sprint 2 (Apr 13, 2026 - Apr 26, 2026) — Linearize Navigation
1. JIRA-013 (completion): all company tabs + context shell consistency.
2. JIRA-014: header/breadcrumb simplification and hierarchy contract.
3. JIRA-016: explicit board context state (URL as source of truth).
4. JIRA-017: unified loading/empty/error/confirm patterns.

Definition of done:
- User never loses company context across tabs and board entry.
- One primary action per major screen state.
- State-handling patterns are consistent on key flows.

### Sprint 3 (Apr 27, 2026 - May 10, 2026) — Optimize Operating Flow
1. JIRA-015: ticket-first as primary flow, direct project as advanced path.
2. JIRA-018: cross-entity links + next-action guidance system.
3. JIRA-020: enforce architecture guardrails via docs/checklists.

Definition of done:
- "Signal -> Action" is reachable in <=2 clicks on core journeys.
- Ticket->Project->Activity loop is explicit and reversible.
- Product team has enforceable UX system rules.

## 4. Dependency Graph
- Dependency shape:
  - `JIRA-020` informs all UX tasks as architecture guardrail.
  - `JIRA-012 -> JIRA-013 -> JIRA-014 -> JIRA-015 -> JIRA-018`
  - `JIRA-013 -> JIRA-016 -> JIRA-018`
  - `JIRA-012 -> JIRA-019`
  - `JIRA-014 -> JIRA-017`
- Critical path:
  - `JIRA-012 -> JIRA-013 -> JIRA-014 -> JIRA-015 -> JIRA-018`
- Co-critical risk:
  - If `JIRA-016` slips, `JIRA-018` becomes blocked even when ticket-first updates are ready.

## 5. Parallelization Opportunities

### Batch A (safe after JIRA-012 baseline)
- Agent 1: JIRA-013 company shell routing/layout
- Agent 2: JIRA-019 API alias observability/tests/docs
- Agent 3: JIRA-014 header/breadcrumb consistency

### Batch B
- Agent 1: JIRA-016 board context URL/state cleanup
- Agent 2: JIRA-017 state pattern unification
- Agent 3: JIRA-015 ticket-first CTA hierarchy

### Batch C
- Agent 1: JIRA-018 cross-entity linking + next-action cards
- Agent 2: JIRA-020 governance docs/checklists and architecture review pass

Parallel-safe write scopes:
- Routing/layout: `apps/web/src/app/**/layout.tsx`, `.../components/*Tabs*`, `Breadcrumbs`, `AppHeaderNav`.
- Board state: `apps/web/src/app/board/page.tsx`, `apps/web/src/lib/workspaceNavigation.ts`.
- API alias lifecycle: `apps/api/src/routes/**`, `docs/api/**`, `docs/contracts/**`.
- State pattern: `apps/web/src/components/ui/*`, page-level state wrappers.

## 6. Merge Order
1. JIRA-020 (freeze architecture target and acceptance constraints)
2. JIRA-012 (canonical naming/route cleanup baseline)
3. JIRA-013 (company shell backbone)
4. JIRA-014 (global navigation simplification)
5. JIRA-016 (board context source-of-truth)
6. JIRA-015 (ticket-first prioritization)
7. JIRA-018 (cross-entity linking and next-action system)
8. JIRA-017 (state UX standardization after core structure stabilizes)
9. JIRA-019 (can merge right after JIRA-012; keep early to de-risk API compatibility)

## 7. Validation / QA Plan

### Contract & API checks
- `pnpm --filter @orchestration/api test -- src/routes/__tests__/workspaces.test.ts src/routes/__tests__/features.test.ts`
- Validate deprecation headers on legacy endpoints; no deprecation headers on canonical endpoints.

### Web integrity checks
- `pnpm --filter @orchestration/web typecheck`
- Targeted tests for board/navigation:
  - `pnpm --filter @orchestration/web test -- src/app/board/board-utils.test.ts src/lib/workspaceNavigation.test.ts`

### UX scenario checks (manual, required)
1. Company create -> Open Tickets -> Create ticket -> Kickoff -> Open Project.
2. From failed project -> find linked ticket -> create follow-up action.
3. Hard reload/deep-link on board preserves explicit company context.
4. Every major page has one primary CTA and valid breadcrumb chain.

### KPI acceptance thresholds
- Route/domain consistency: 0 user-visible legacy term leaks in primary UI paths.
- Flow clarity: >=90% of tested journeys complete without backtracking.
- Next action clarity: >=95% of tested states display explicit next step.
- Recovery usability: failed-project to corrective action <=2 clicks.

### Sprint Exit Matrix
| Sprint | KPI Exit Criteria | Rollback Trigger |
|---|---|---|
| Sprint 1 | `0` visible legacy labels; nav smoke pass `>=95%`; canonical API usage `>=80%` | Canonical/alias payload mismatch, or >`5%` nav smoke failures |
| Sprint 2 | Ticket-first completion `>=85%`; context-loss incidents `=0`; state consistency `>=95%` | Reproducible context-loss after reload/deep-link, or destructive action without confirm |
| Sprint 3 | Two-click success `>=90%`; backlink integrity `100%`; contracts pass `100%`; alias usage `<20%` | Two-click success `<80%`, backlink break in critical flow, or contract/boundary failures |

## 8. Rollback Considerations
- Keep alias API endpoints active until all frontend canonical routing is stable in production.
- If regressions appear in board context behavior:
  - rollback board-context changes first (JIRA-016 slice), keep shell IA intact.
- If navigation regressions appear:
  - keep company shell routes, temporarily re-enable previous header links via feature flag branch.
- Any rollback must preserve canonical naming in user-facing copy (do not reintroduce legacy terms).
