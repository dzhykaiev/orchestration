# Agents Overview

Agents are specialized AI workers that execute tasks within the orchestration pipeline. Each agent has a defined role, owned directories, and clear responsibilities.

## Agent Hierarchy

```
                    ┌──────────┐
                    │ Architect│  ← designs the system
                    │ (plans)  │
                    └────┬─────┘
                         │ creates workstreams
          ┌──────────┬───┴───┬──────────┬──────────┐
          ▼          ▼       ▼          ▼          ▼
     ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────┐ ┌───────┐
     │ Backend │ │Frontend│ │  Data  │ │DevOps│ │  QA   │
     │         │ │        │ │        │ │      │ │       │
     └─────────┘ └────────┘ └────────┘ └──────┘ └───────┘
      implements   implements implements  infra   validates
```

## Roles

| Role | Tier | Responsibility |
|------|------|----------------|
| `architect` | Strategic | System design, contracts, workstream planning |
| `backend` | Operational | API routes, services, middleware |
| `frontend` | Operational | Dashboard UI, components, hooks |
| `data` | Operational | Database schema, migrations, repositories |
| `devops` | Operational | Docker, CI/CD, configs, scripts |
| `qa` | Operational | Tests, validation, quality checks |

## Agent Tiers

| Tier | Description | Roles |
|------|-------------|-------|
| **Strategic** | High-level planning and architecture | `ceo`, `planner`, `architect` |
| **Tactical** | Coordination and delegation | `lead` |
| **Operational** | Direct implementation work | `backend`, `frontend`, `data`, `devops`, `qa`, `reviewer` |

## How Agents Work

1. **Prompt Construction** — orchestrator builds a prompt with: task description, relevant contracts, existing code context, and agent brief
2. **LLM Call** — prompt sent to Claude API via the LLM provider abstraction
3. **Output Parsing** — response parsed for file paths, code blocks, and structured data
4. **File Writing** — generated code written to the project directory
5. **Tracking** — modified files, costs, and output logged to the database

## Key Principles

### Isolation
Agents don't communicate with each other. They coordinate through contracts defined by the architect. Each agent receives everything it needs in its prompt context.

### Idempotency
Every task can be re-executed safely. Running a task again overwrites previous output files. No side effects accumulate across retries.

### Self-Correction
Failed tasks are retried with error context from the previous attempt. The agent receives: original prompt + "Previous attempt failed because: ..." This allows agents to learn from their mistakes.

## LLM Provider

The LLM provider abstraction is in `apps/orchestrator/src/llm/`. It supports:

- **Claude CLI** — default provider, uses Claude CLI for API calls
- **OpenCode** — alternative provider

Each agent role can be mapped to a different provider. The provider interface is defined in `packages/shared/src/types/llm-provider.ts`.
