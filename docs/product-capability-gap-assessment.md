# Product Capability Gap Assessment

## Context

Vision: an autonomous multi-agent work orchestration platform for software teams/agencies with hierarchy, delegation, execution, review, and governance.

This assessment is based on the current codebase and identifies:

1. missing capabilities
2. weak or naive implementations
3. MVP priorities
4. deferred capabilities
5. differentiation opportunities

---

## 1) Missing capabilities

### Company/workspace model
- No organization/company/workspace entities, memberships, or tenant scoping.
- Projects are top-level and not linked to workspace ownership.

### Goal management
- A single `goal` exists per project and a lightweight `features` board exists, but there is no hierarchy (objective → initiative → epic → task), KPI tracking, or goal dependency graph.

### Plan/task decomposition
- Workstreams and dependencies exist, but decomposition is shallow and does not model rich task DAGs with risk, confidence, acceptance criteria, or alternatives.

### Agent hierarchy and roles
- Agent roles are static enums; there is no dynamic hierarchy (manager/reviewer/escalation agents), capability registry, or role policies.

### Dependency management
- Dependencies are simple string arrays with limited semantic meaning (no typed dependency edges, critical path metadata, or contract-level dependency policies).

### Review and approval
- Validation exists, but there are no structured multi-step review/approval workflows, no mandatory human gates, and no policy-driven approvals.

### Escalation
- No first-class escalation model (route-to-human, severity levels, on-call handoff, timeout escalation).

### Artifacts
- Files are visible from filesystem output, but artifacts are not first-class immutable records (plan artifact, review artifact, execution transcript, evidence bundle).

### Audit logs
- No durable append-only audit log for governance/compliance across agent decisions and human overrides.

### Observability
- Basic event stream and logs exist, but no deep tracing, reliability metrics, SLOs, or per-agent health analytics.

### Cost/runtime tracking
- Cost fields exist, but there is no comprehensive token/model/runtime telemetry, budget guardrails, or forecasting.

### Permissions/policies
- No authn/authz model (RBAC/ABAC), no workspace-scoped permissions, no policy engine to constrain agent actions.

### Dashboard/reporting
- Operational dashboard exists, but leadership reporting is missing (throughput, cost trends, SLA, rework, escaped defects, policy violations).

### Human override
- Basic stop/retry actions exist; missing richer override controls (pause at gate, force replan, lock paths, manual dependency intervention with audit trail).

### Failure recovery
- Retries exist but no robust checkpointing, deterministic replay, rollback strategy, or resume-from-safe-point workflows.

---

## 2) Weak or naive implementations

- Circular dependencies are handled by removing dependency edges, which can preserve liveness but break correctness.
- Validation relies on textual LLM verdict parsing (`VERDICT: PASS/FAIL`) instead of strongly structured, machine-verifiable checks.
- Event taxonomy is narrow and misses governance events (approval, escalation, override, policy violations).
- Status model is execution-focused and lacks governance states (`awaiting_approval`, `escalated`, `blocked_by_policy`, etc.).
- Feature kickoff is tied to `SELF_REPO_PATH`, useful for internal workflows but not general multi-tenant agency usage.
- Project total-cost update path is inconsistent across flows (risk of stale aggregate cost depending on how task completion is triggered).

---

## 3) What should be MVP

For the target product vision (teams/agencies), MVP should prioritize:

1. Workspace + membership + RBAC
2. Governance-ready run lifecycle with approval gates
3. Structured plan graph (task DAG + dependency semantics)
4. Human-in-the-loop checkpoints for risky actions
5. Durable audit log and traceability
6. Budget and runtime guardrails (caps, alerts, auto-pause)
7. Baseline failure recovery (checkpoint + resumable runs)

---

## 4) What should be deferred

- Multi-cloud autoscaling and sophisticated infra orchestration
- Advanced cross-workspace portfolio BI/report builders
- Rich freeform agent-to-agent negotiation protocols
- Marketplace/ecosystem extensibility
- Heavy customization layers for enterprise reporting UX

---

## 5) What would make the product truly differentiated

### Governance-native autonomy
- Every agent action can be traced to policy decisions and approvals.

### Strategy-level planning intelligence
- Generate and score multiple execution plans by cost/risk/time before execution.

### Operational trust layer
- Deterministic replay, forensic timeline, explainability (“why this action was taken”).

### Agency-grade multi-client isolation
- Workspace/client boundaries with policy templates and billable reporting per client.

### Outcome-first metrics
- Focus on delivery outcomes (cycle time, rework reduction, quality, budget efficiency), not only task states.

---

## Recommended execution order

1. Governance foundation: workspace, RBAC, approvals, audit.
2. Reliability foundation: checkpoint/replay/recovery + stronger dependency model.
3. Intelligence moat: plan scoring, explainability, and portfolio insights.

