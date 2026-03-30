# Product Overview

## What Is This?

This is an AI-driven software orchestration platform. You give it a high-level software goal --- "build me a REST API for managing bookmarks" or "create a CLI tool that converts CSV to JSON" --- and it designs the architecture, breaks the work into parallel workstreams, and dispatches AI agents to implement the code.

The system acts as an automated software team: one architect agent plans the system design, and multiple implementation agents execute the plan in parallel, each responsible for a distinct workstream. The output is real, working code written to disk.

## Who Is It For?

- **Solo developers** who want to accelerate prototyping by letting AI handle boilerplate and scaffolding.
- **Technical leads** exploring AI-assisted development workflows.
- **Researchers** studying multi-agent orchestration patterns for software engineering.

This is not a replacement for a development team. It is a force multiplier for a single operator who understands software architecture and can review, guide, and iterate on AI-generated output.

## Core User Flow

1. **Submit a goal.** The user describes what they want built in plain language via the web dashboard or API.
2. **Architect plans.** The orchestrator invokes an architect agent (powered by Claude) that produces a system design: components, data models, APIs, file structure.
3. **Workstreams created.** The plan is decomposed into parallel workstreams, each with a clear scope, deliverables, and interface contracts.
4. **Agents execute.** Implementation agents pick up tasks from a job queue and write code, tests, and configuration files to the project directory.
5. **Validation.** Each agent's output is validated against the contracts defined during planning. Failures trigger retries with corrective context.
6. **Progress tracked.** The web dashboard shows real-time progress: which workstreams are active, which tasks are complete, what files have been generated.
7. **Output delivered.** The final result is a project directory on disk containing the generated codebase.

## MVP Scope

The MVP is intentionally narrow. It proves the core loop --- goal to architecture to parallel implementation to output --- without attempting to solve every possible concern.

### In Scope

- **Single-project orchestration.** One project at a time. No concurrent project execution.
- **Architect + 3 implementation agents.** One agent plans, three agents build. This is enough to demonstrate parallel execution without introducing excessive coordination complexity.
- **Basic progress dashboard.** A Next.js web UI showing project status, workstream progress, and task history. No authentication, no collaboration features.
- **File-based output.** Agents write code directly to the file system. No git integration, no deployment pipeline, no package publishing.
- **Single LLM provider.** Claude API only. No model selection, no fallback providers.
- **Local development only.** Runs on a developer's machine via Docker Compose. No cloud deployment, no managed infrastructure.

### Out of Scope (Future)

- Multi-tenancy and user authentication
- Git integration (commits, branches, PRs)
- CI/CD pipeline execution
- Multiple LLM providers and model selection
- Cloud deployment and horizontal scaling
- Agent-to-agent communication (agents communicate only through contracts and the orchestrator)
- Interactive refinement (user feedback loops during execution)

## Success Criteria for MVP

The MVP is successful when a user can:

1. Submit a goal like "build a REST API for a todo list with PostgreSQL storage" via the web dashboard.
2. Watch the architect agent produce a coherent system design.
3. See three implementation agents work in parallel on different parts of the system.
4. Find a working (or nearly working) codebase on disk when the process completes.
5. Understand what happened at every step by reviewing the dashboard's progress view.

The bar is not perfection. The bar is demonstrating that the orchestration loop works and produces useful output that a developer can iterate on.
