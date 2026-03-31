# Architecture Review — April 1, 2026

## 1. Project Summary

Monorepo for an autonomous multi-agent delivery platform with three runtime apps and two shared packages:
- `apps/api` (Fastify REST + SSE + queue producers)
- `apps/orchestrator` (BullMQ workers + LLM execution runtime)
- `apps/web` (Next.js dashboard)
- `packages/db` (Drizzle schema + repositories)
- `packages/shared` (types, schemas, state transitions)

The product intent is to convert user goals/features into planned workstreams, execute agent tasks, validate outcomes, and expose progress/artifacts in UI.

## 2. Current Architecture

Repo type: modular monorepo, operationally deployed as a modular monolith (single DB + Redis + two Node services + web app).

Current layering trend (already partially implemented):
- Application use-cases with explicit ports (`application/*`)
- Infrastructure dependency wiring (`infrastructure/*-dependencies.ts`)
- Interface adapters (`routes/*`, `workers/*`, `services/*`)

Current runtime boundaries:
- HTTP ingress: `apps/api/src/interfaces/http/build-app.ts`
- Queue ingress/egress: `apps/api/src/plugins/redis.ts`, `apps/orchestrator/src/application/runtime/create-orchestrator-runtime.ts`
- Worker handlers: `apps/orchestrator/src/workers/*.ts`
- Persistence: `packages/db/src/repositories/*`
- Contracts: `packages/shared/src/*`

## 3. Domain Map

Primary domains:
- Workspace/Project lifecycle
- Planning and workstream decomposition
- Task execution and retries
- Validation and review
- Delegation/escalation/hierarchy
- Artifacts and audit logs
- Feature board orchestration kickoff

Domain ownership today (practical):
- API domain orchestration: `apps/api/src/application/*`
- Worker domain orchestration: `apps/orchestrator/src/application/*`
- Data model + repo contracts: `packages/db`
- Cross-app shared language: `packages/shared`

## 4. Main Flows

1. Feature/project creation in API -> DB write -> planning queue enqueue.
2. Orchestrator planning worker -> LLM plan -> create workstreams/tasks -> enqueue implementation jobs.
3. Implementation worker -> provider execution -> file output + task updates + events.
4. Progress logic -> dependency unblock + optional validation enqueue.
5. Validation worker -> verdict -> workstream/project status transitions.
6. API SSE route -> Redis pub/sub fan-out -> web realtime updates.

## 5. Architectural Problems

1. No enforced file-ownership isolation between workstreams; implementation diffing still scans broad trees, so parallel agents can overwrite each other.
2. Filesystem path contract is inconsistent across apps (`./projects` vs `../orchestrator/projects` and UI hardcoded assumptions).
3. Orchestrator `progress` domain is still a high-coupling hotspot with many side effects (status, queueing, reviewer parsing, git operations).
4. Circular orchestration dependencies remain between implementation/validation/progress modules.
5. Type erosion in port boundaries (`string`, `Record<string, unknown>`) weakens compile-time contracts for parallel edits.
6. Dependency graph normalization is weak (non-UUID dependencies tolerated), causing nondeterministic unblocking behavior.
7. Retry semantics are split across queue settings and DB attempt counters, increasing reasoning complexity for worker behavior.
8. Feature kickoff is coupled to one shared repository path (`SELF_REPO_PATH`), creating contention for concurrent agent execution.

## 6. Technical Risks

1. Contract drift between runtime behavior and docs/tests can cause false confidence during autonomous refactors.
2. State-machine transitions spread across modules can regress under parallel edits.
3. Queue/job payload changes without version discipline can silently break worker coordination.
4. Recovery/cancellation behavior remains high-risk in distributed async execution.
5. Dirty worktree and broad concurrent edits raise merge/regression probability without stricter ownership map.

## 7. Recommended Target Architecture

Recommended style: domain-oriented modular monolith with strict ports-and-adapters inside each app.

Target principles:
- Keep single deployable DB/Redis topology (no microservice split now).
- Standardize each domain module as:
  - `application` (use-cases + ports)
  - `domain` (entities/value objects/rules)
  - `infrastructure` (repo/queue/provider adapters)
  - `interfaces` (HTTP/worker/event adapters)
- Make `packages/shared` the public contract boundary, and avoid cross-app deep imports.
- Introduce event contract versioning (`eventName`, `version`, `payload`) before more scaling.
- Use path ownership + contract files to maximize safe parallel AI execution.

## 8. Recommended Folder / Module Structure

Incremental target (no rewrite):

```text
apps/api/src/
  domains/
    projects/{application,domain,infrastructure,interfaces}
    workstreams/{application,domain,infrastructure,interfaces}
    tasks/{application,domain,infrastructure,interfaces}
    features/{application,domain,infrastructure,interfaces}
    audit-logs/{application,domain,infrastructure,interfaces}
    reviews/{application,domain,infrastructure,interfaces}
  platform/{config,plugins,bootstrap}
  interfaces/http/{routes,schemas,mappers}

apps/orchestrator/src/
  domains/
    planning/{application,domain,infrastructure,interfaces}
    implementation/{application,domain,infrastructure,interfaces}
    validation/{application,domain,infrastructure,interfaces}
    progress/{application,domain,infrastructure,interfaces}
    delegation/{application,domain,infrastructure,interfaces}
    escalation/{application,domain,infrastructure,interfaces}
    recovery/{application,domain,infrastructure,interfaces}
    event-log/{application,domain,infrastructure,interfaces}
    hierarchy/{application,domain,infrastructure,interfaces}
  platform/{runtime,queues,llm,prompts,bootstrap}

packages/
  shared/{contracts,schemas,state-machines,events}
  db/{schema,repositories,migrations}
```

Migration rule: move one domain at a time behind stable barrel exports to avoid broad import churn.

## 9. Documentation Needed

Must-have gaps:
- `docs/architecture/current-state.md` (truth source for actual structure, updated weekly).
- `docs/architecture/target-state.md` (target module map + invariants).
- `docs/architecture/dependency-rules.md` (allowed import matrix per layer).
- `docs/contracts/events.md` (event payload schemas + versioning policy).
- `docs/contracts/queues.md` (job names, payloads, producers/consumers).
- `docs/ownership/module-owners.md` (path ownership for parallel agents).
- `.github/CODEOWNERS` (enforced ownership boundaries for concurrent streams).
- `docs/contracts/contract-registry.md` (single index of source-of-truth contracts: API, events, queues, DB, state machines).
- `docs/parallel-execution/agent-playbooks/*` (role-specific runbooks aligned to current repo structure).
- ADR set for critical decisions:
  - queue contract versioning
  - cancellation/recovery semantics
  - domain module template
  - event envelope normalization (`payload` model + versioning)
  - escalation/review/hierarchy model boundaries

## 10. Execution Phases

### Phase 0 — Guardrails and contracts
Goal: freeze contracts before more refactors.
- Add dependency rules, ownership map, queue/event contracts.
- Align existing docs with current code realities.
DoD: agents can pick tasks by path with no ambiguity.

### Phase 1 — Foundation refactor (in-place)
Goal: complete ports/adapters consistency in API and orchestrator.
- Remove remaining direct DB coupling from interface layer.
- Normalize dependency factory pattern per domain.
DoD: all domain logic entered via use-cases, adapters are thin.

### Phase 2 — Domain module extraction
Goal: converge folders to `domains/<name>/{application,domain,infrastructure,interfaces}`.
- Migrate highest-churn domains first (`projects`, `tasks`, `planning`, `implementation`, `progress`).
- Keep compatibility exports during migration.
DoD: at least top 5 domains follow template; no functional regressions.

### Phase 3 — Reliability and observability
Goal: reduce async orchestration risk.
- Harden cancellation/recovery/state transitions.
- Add event/queue correlation IDs and structured telemetry.
DoD: deterministic recovery scenarios covered by tests/runbooks.

### Phase 4 — Scale and agent productivity
Goal: optimize for parallel AI-agent delivery throughput.
- Contract tests for events/queues.
- CI checks for layer/import violations and ownership boundaries.
DoD: parallel PRs can merge with low conflict rate and high confidence.

## 11. Parallel Workstreams for Agents

WS-A: Architecture/Contracts
- Files: `docs/architecture/*`, `docs/contracts/*`, ADRs.
- Output: import matrix, event/queue specs, ownership map.

WS-B: API Domain Consolidation
- Files: `apps/api/src/{application,infrastructure,services,routes}` (domain-by-domain).
- Output: consistent use-case + dependency-factory pattern, adapter-thin routes.

WS-C: Orchestrator Domain Consolidation
- Files: `apps/orchestrator/src/{application,infrastructure,workers,events,tracking}`.
- Output: consistent domain modules, isolated side effects.

WS-D: Reliability/State Machines
- Files: `packages/shared/src/*transitions*`, orchestrator recovery/progress domains, tests.
- Output: canonical transitions + recovery playbooks + regression tests.

WS-E: Contract Testing & CI Guardrails
- Files: `apps/*/tests`, `contracts/*`, CI config.
- Output: event/queue contract tests, dependency rule checks, ownership-aware CI labels.

Parallelization policy:
- Each agent owns disjoint path prefixes.
- Cross-stream dependencies only through contract files in `docs/contracts` and `packages/shared`.
- Merge order: WS-A -> (WS-B + WS-C + WS-D parallel) -> WS-E.

## 12. Open Questions / Assumptions

Assumptions used:
- Single-tenant/limited-tenant model remains acceptable in near term.
- PostgreSQL + Redis + BullMQ remain core infrastructure.
- No immediate requirement to split into microservices.
- Existing in-flight edits in repo are intentional and should not be reverted.

Open questions:
- Required SLA for queue processing and recovery windows?
- Is strict approval gating needed before provider-level file/system operations?
- Which event fields are mandatory for all UI-relevant updates?
- Should project/feature lifecycle be unified under one explicit state machine now or later?
