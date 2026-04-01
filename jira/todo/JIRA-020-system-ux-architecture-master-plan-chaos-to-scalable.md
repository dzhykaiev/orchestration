# JIRA-020 System UX Architecture Master Plan (chaos -> scalable)

## Purpose
Зафіксувати цільову UX-архітектуру системи (IA, навігація, action/state патерни), щоб привести продукт до стабільної context-first моделі `Company -> Tickets -> Projects -> Agents -> Activity`.

## Scope
- Сформувати цільовий IA/navigation contract і core user flows.
- Зафіксувати правила UX-системи (naming, one-primary-action, state patterns, link contracts).
- Вести conformance log для змін JIRA-012..019, які мають відповідати цій архітектурі.

## Files/Modules Likely Affected
- apps/web/src/app/**
- apps/web/src/components/**
- apps/web/src/lib/companyNavigation.ts
- apps/web/src/lib/workspaceNavigation.ts
- jira/_meta/AGENT_RUNBOOK.md
- docs/product-overview.md

## Dependencies
JIRA-012, JIRA-013, JIRA-014, JIRA-015, JIRA-016, JIRA-017, JIRA-018, JIRA-019

## Owner
product+frontend+architect

## Risks
TBD

## Validation
- `pnpm --filter @orchestration/web typecheck`
- `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts`
- Manual walkthrough: Company create -> Tickets -> Kickoff -> Project -> Activity (з перевіркою breadcrumbs + one-primary-action contract)

## Definition of Done
Цільова UX-архітектура задокументована і підтверджена conformance-оновленнями: ключові маршрути та екрани працюють у context-first моделі, а core сценарії не мають dead-end станів.

## 1. 🔍 Problems List

1. Domain language is inconsistent in code and UX.
   - User-facing model is `Company/Ticket`, but internals and route params still use `workspace/feature` naming.
   - This creates mental duplication and implementation mistakes.
2. Navigation has parallel entry points for the same job.
   - Work can start from Home, Board, Company Overview, or direct Project creation with equal visual weight.
   - Users are not guided to one primary execution path.
3. Global Board and Company tabs split context ownership.
   - Board is global with company selector, while company pages are context-scoped.
   - Users switch between global and scoped mental models.
4. Information architecture still leaks legacy structures.
   - `companies/*` pages often re-export from `workspaces/*`.
   - This keeps hidden coupling and slows future simplification.
5. Action hierarchy is noisy.
   - Many screens expose multiple same-priority CTAs.
   - “Advanced: Direct Project” appears too often and competes with ticket-first flow.
6. Redundant state logic and flow duplication.
   - Similar data fetch/state handling exists in multiple company subpages.
   - Higher maintenance cost and inconsistent behavior risk.
7. Cross-entity journey is not fully linear.
   - Ticket -> Project -> Activity path exists, but guidance is fragmented across screens.
   - Users can still end up in “what now?” states.
8. Some route aliasing creates operational confusion.
   - `/new` missing route caused 404.
   - Root route also failed under watcher-limit conditions (`EMFILE`) causing false “missing page” perception.

## 2. ✂️ What to Remove / Merge

1. Remove user-visible `workspace/feature` terminology everywhere in UI copy and component props (keep API compatibility only as internal migration layer).
2. Remove duplicated route implementations by inlining canonical `companies/*` pages instead of re-export chains from `workspaces/*`.
3. Merge board ownership into company context:
   - Primary board route becomes company-scoped: `/companies/:id/tickets` (kanban mode as default view).
   - Keep `/board` as temporary redirect, not primary surface.
4. Demote direct project creation into one explicit advanced entry.
   - Keep it in Company > Projects only.
   - Remove competing direct-project CTAs from Home/Board hero areas.
5. Merge “overview guidance” blocks into one reusable `NextActionPanel` contract.
6. Remove multi-primary action headers.
   - One primary CTA per screen.
   - Remaining actions become secondary or contextual.

## 3. 🧱 New Architecture

### Product Goal
Enable a team/operator to run autonomous delivery through a predictable ticket-first pipeline with clear company context.

### Primary User Types
1. Operator/Founder: defines goals, prioritizes tickets, launches execution.
2. Team Lead: monitors projects, resolves failures, adjusts agents.
3. Reviewer/Observer: checks progress and history with minimal interaction.

### Core Entities
1. Company
2. Ticket
3. Project
4. Agent
5. Activity Log

### IA (Navigation Model)
1. Global nav:
   - `Companies`
   - `Global Activity` (optional aggregate, read-only)
2. Company shell (`/companies/:id`):
   - `Overview`
   - `Tickets` (default operational surface, includes board/list toggle)
   - `Projects`
   - `Agents`
   - `Activity`

### Core Screens
1. Companies List
   - Purpose: pick or create operating context.
   - User does: open existing company or create new one.
   - Components: searchable company list, create CTA, empty state.
2. Company Overview
   - Purpose: health snapshot + immediate next step.
   - User does: decide what to do now.
   - Components: KPI summary, single `NextActionPanel`, recent risk alerts.
3. Company Tickets
   - Purpose: capture, prioritize, and kick off work.
   - User does: create/update tickets, move status, kickoff.
   - Components: board/list toggle, filters, ticket editor, kickoff confirm.
4. Company Projects
   - Purpose: monitor execution and investigate failures.
   - User does: open project detail, inspect status, recover blocked work.
   - Components: status segments, project list, advanced “New Project” action.
5. Company Agents
   - Purpose: manage delegation model.
   - User does: review hierarchy, add/change agent definitions.
   - Components: hierarchy map, role coverage gaps, add/edit form.
6. Company Activity
   - Purpose: audit and timeline.
   - User does: trace changes, navigate to related ticket/project.
   - Components: unified timeline, filters, deep links.
7. Project Detail
   - Purpose: execution observability and unblock actions.
   - User does: track tasks/artifacts/logs, return to source ticket/company context.
   - Components: status, tasks, logs, artifacts, “next action” and backlinks.

## 4. 🗺️ User Flows

### Create X (Company + first work)
1. Open `Companies`.
2. `Create Company`.
3. System auto-creates initial bootstrap ticket and managing agent.
4. Land on `Company Overview` with primary CTA: `Open Tickets`.

### Manage X (Ticket-first execution)
1. `Company > Tickets`.
2. Create/refine ticket.
3. Move to `Ready`.
4. `Kickoff` creates linked project.
5. System deep-links to `Project Detail` and preserves company context.

### Monitor X (Execution + recovery)
1. `Company > Projects` (or from ticket/project backlinks).
2. Filter to `Planning/In progress/Failed`.
3. Open project, inspect tasks/logs/artifacts.
4. Use context CTA:
   - failure -> `Back to linked ticket` or `Create follow-up ticket`
   - success -> `Queue next ticket`.

## 5. 📐 UX Rules / Principles

1. Naming consistency
   - UI vocabulary: only `Company`, `Ticket`, `Project`, `Agent`, `Activity`.
   - Legacy words never appear in visible UI.
2. Action pattern
   - Exactly one primary CTA per screen state.
   - Advanced actions are explicitly labeled and visually secondary.
3. Context persistence
   - Every operational screen must keep explicit `companyId` context.
   - No hidden context via localStorage as source of truth.
4. Predictable hierarchy
   - Global -> Company -> Entity detail.
   - Breadcrumbs always reflect this chain.
5. State system
   - Standardized loading/empty/error/confirm patterns across all entity screens.
6. Link contract
   - Every ticket with project link has reciprocal backlinks.
   - Every project has “source ticket” and “company” anchors.
7. Reusable layout contracts
   - `CompanyShell`, `PageHeader`, `NextActionPanel`, `EntityList`, `PageState`.
8. Two-click rule
   - From any signal (alert/failure/ready ticket), user reaches corrective action in <=2 clicks.

## 6. 💡 Optional Improvements (advanced ideas)

1. Introduce “Work Queue” view inside Company Tickets:
   - prioritized ready tickets + estimated execution capacity.
2. Add SLA-based attention layer:
   - stale tickets, long-running projects, repeated failures.
3. Add role-based cockpit presets:
   - Operator preset (tickets/projects), Reviewer preset (activity/audit).
4. Add guided escalation flow:
   - project failure -> auto-suggest follow-up ticket template with linked evidence.
5. Add IA health tests in CI:
   - route checks, breadcrumb contract checks, single-primary-CTA lint rule.

## Progress (2026-04-01) — Conformance Pass

1. Naming/copy guardrails tightened:
   - user-facing `feature` copy replaced with `ticket` on Home, Board toasts, and Project detail backlink text.
   - 404 fallback CTA changed to `Back to Companies` (`/companies`) to match top-level IA.
   - Home internal domain naming aligned from `workspace*` to `company*` for local state/context variables.
2. State/action pattern guardrails extended:
   - Project detail now uses shared `PageLoadingState` and `PageErrorState`.
   - Company Agents and Companies list screens now also use shared `PageLoadingState` / `PageErrorState` patterns.
   - Introduced shared `CompanyHeader` layout contract and applied it to Companies list/new plus Company Projects/Tickets/Activity pages to remove duplicated header wrappers.
3. Cross-entity guidance guardrails extended:
   - Project `Current stage` includes status-aware primary action.
   - Issue cards on Project detail now deep-link to linked project or board ticket search context.
   - Company Overview quick actions no longer duplicate direct-project advanced entry; Home guidance/empty states now keep ticket-board as single primary path.
   - Introduced shared `NextActionPanel` contract and wired it into Home guidance + Company Overview + Company Projects/Tickets/Activity/Agents header guidance blocks to reduce duplicated guidance structure.
4. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.
   - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts` passed.

## Progress (2026-04-01) — Navigation Contract Hardening

1. Board navigation URL contract centralized:
   - `buildBoardHref` expanded with optional board query params (`q`, `type`, `status`, `projectId`).
   - Eliminated ad-hoc string concatenation for board links in Company Overview, Company Tickets, Company Activity, and New Project page.
2. Backward compatibility kept while reducing cognitive variance:
   - Legacy `workspaceId` intake remains accepted where relevant.
   - UI navigation now points through one helper contract, lowering risk of route/query drift.
3. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.

## Progress (2026-04-01) — Company-Scoped Board Canonicalization

1. Board IA direction moved to company-scoped routing:
   - Introduced `/companies/:id/board` route (reusing board surface).
   - Updated `buildBoardHref` to produce company-scoped links when `companyId` is known.
2. Board context resolution hardened:
   - Board now derives context from scoped path first, then falls back to query (`companyId` and legacy `workspaceId`).
   - Company switch on board updates URL path in scoped mode, preserving active filters.
3. Backward compatibility preserved:
   - Global `/board` and query-driven deep links continue to function.
4. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.
   - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts` passed.

## Progress (2026-04-01) — Board Domain Naming Alignment (Internal)

1. Internal board state language aligned to company domain model:
   - `board/page.tsx` local state and handlers renamed from `workspace*` to `company*` (`companies`, `selectedCompanyId`, `fetchCompanies`, `syncCompanyContext`).
2. Migration compatibility preserved:
   - Board save flow now tolerates both `companyId` and legacy `workspaceId` payload keys, normalizing to one company context before API create.
3. UX architecture impact:
   - Reduced mixed-terminology cognitive load for maintainers without changing user-facing behavior.
4. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.
   - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts` passed.

## Progress (2026-04-01) — Modal Contract Naming Cleanup

1. Component API naming aligned to domain language:
   - `FeatureModal` public props migrated from `workspaces/defaultWorkspaceId/workspaceId` to `companies/defaultCompanyId/companyId`.
2. Cross-screen adoption completed:
   - Updated board and project detail callsites to use the company-based modal contract.
3. Compatibility handling retained:
   - Modal company field error rendering accepts backend validation keys for both `companyId` and legacy `workspaceId`.
4. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.
   - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts` passed.

## Progress (2026-04-01) — Main Agent Autopilot + Context Compaction Policy

1. Execution policy standardized across skill/runbook/docs:
   - Added explicit autopilot loop rule: complete assigned plan steps continuously without per-step user confirmation.
2. Context control guardrail added:
   - Added explicit rule to trigger `/compact` when main-agent context usage reaches ~50%.
3. Escalation boundaries clarified:
   - User prompts are required only for hard blockers (permissions, destructive actions, critical ambiguity).
4. Documentation touchpoints updated:
   - `.agents/skills/system-ux-architect/SKILL.md`
   - `jira/_meta/AGENT_RUNBOOK.md`
   - `CLAUDE.md`

## Progress (2026-04-01) — Board/Project Company Naming Conformance (UI Layer)

1. Board surface naming cleanup continued:
   - Replaced board-local CSS hooks from `workspace` to `company` naming (`board-company-select`, `company-empty-actions`), with style aliases retained for backward compatibility.
2. Project detail context naming cleanup:
   - Local state and lookups renamed from `workspace*` to `company*` while preserving API compatibility for persisted project shape (`project.workspaceId`).
   - Added explicit `projectCompanyId` derivation to make company context intent clear in links/actions.
3. New project form naming cleanup:
   - Form state migrated to `companies/companyId/selectedCompany`.
   - Kept backend payload compatibility by mapping canonical company value to legacy `workspaceId` field at API boundary.
   - Validation compatibility preserved for both `companyId` and `workspaceId` field errors.
4. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.
   - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts` passed.

## Progress (2026-04-01) — Navigation Module Naming Conformance

1. Canonical navigation module introduced:
   - Added `apps/web/src/lib/companyNavigation.ts` as canonical source for company-scoped URL helpers.
2. Screen imports aligned to canonical module:
   - Board, Home, Project detail, New Project, and Company subpages now import from `companyNavigation`.
3. Backward compatibility preserved:
   - `apps/web/src/lib/workspaceNavigation.ts` converted into deprecated re-export wrapper to avoid breaking old imports/tests.
4. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.
   - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts` passed.

## Progress (2026-04-01) — New Project State Contract Conformance

1. `projects/new` aligned to unified state UX contract:
   - Added explicit `PageLoadingState` while company list loads.
   - Added explicit `PageErrorState` with retry + `Back to Companies`.
   - Added explicit `PageEmptyState` with single corrective CTA: `Create Company`.
2. Flow ambiguity removed in empty context:
   - New Project form no longer renders when there is no company context.
   - Enforces linear prerequisite: create/select company first, then create project.
3. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.
   - `pnpm --filter @orchestration/web test -- src/lib/workspaceNavigation.test.ts src/app/board/board-utils.test.ts` passed.

## Progress (2026-04-01) — Legacy Deep-Link Alias Hardening

1. Frontend alias routing hardened to avoid hidden 404s:
   - Added catch-all legacy redirect route:
     - `apps/web/src/app/workspaces/[id]/[...slug]/page.tsx`
2. Context continuity improved for old links:
   - Any legacy deep link under `/workspaces/:id/*` now maps to canonical `/companies/:id/*`.
   - Reduces user-facing route ambiguity during migration and supports old bookmarks/shared URLs.
3. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.

## Progress (2026-04-01) — Company-Class Naming Migration (UI Hooks)

1. Canonical class hooks introduced on key surfaces:
   - Companies list switched from `workspace-*` classes to `company-*`.
   - Shared `PageEmptyState` switched to `company-empty*` classes.
   - `CompanyHeader` action container switched to `company-section-actions`.
2. Backward style compatibility preserved:
   - Added CSS alias selectors so `workspace-*` and `company-*` variants render identically during migration.
   - Included responsive alias coverage for `company-grid` and `company-section-actions`.
3. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.

## Progress (2026-04-01) — Company Create Screen Naming Conformance

1. `companies/new` naming cleanup completed for canonical surface:
   - Create card class switched to `company-create-card`.
   - Form control ids switched from `ws-*` to `company-*`.
2. UX architecture impact:
   - Reduces legacy language leakage on the first company bootstrap flow.
3. Validation snapshot:
   - `pnpm --filter @orchestration/web typecheck` passed.

## Remaining
- TBD
