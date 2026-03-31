# What is Orchestration Platform?

AI-driven software orchestration platform. You provide a high-level software goal — "build a REST API for managing bookmarks" or "create a CLI tool that converts CSV to JSON" — and the system designs the architecture, breaks work into parallel workstreams, and dispatches AI agents to implement the code.

## How It Works

The system acts as an automated software team:

1. **You submit a goal** via the web dashboard or API
2. **Architect agent** analyzes the goal and produces a system design: components, data models, APIs, file structure
3. **Work is decomposed** into parallel workstreams, each with clear scope, deliverables, and interface contracts
4. **Implementation agents** pick up tasks from a job queue and write code to the project directory
5. **QA agent validates** each workstream's output against contracts
6. **Dashboard tracks** everything in real-time

```
You → Goal → Architect → Plan → Agents (parallel) → Validation → Code on disk
```

## Who Is It For?

- **Solo developers** who want to accelerate prototyping by letting AI handle boilerplate and scaffolding
- **Technical leads** exploring AI-assisted development workflows
- **Researchers** studying multi-agent orchestration patterns for software engineering

This is not a replacement for a development team. It is a force multiplier for a single operator who understands software architecture and can review, guide, and iterate on AI-generated output.

## MVP Scope

### In Scope

| Feature | Status |
|---------|--------|
| Single-project orchestration | ✅ |
| Architect + implementation agents | ✅ |
| Real-time progress dashboard | ✅ |
| File-based output | ✅ |
| Claude API as LLM provider | ✅ |
| Local development via Docker Compose | ✅ |

### Out of Scope (Future)

- Multi-tenancy and user authentication
- Git integration (commits, branches, PRs)
- CI/CD pipeline execution
- Multiple LLM providers and model selection
- Cloud deployment and horizontal scaling
- Agent-to-agent communication
- Interactive refinement during execution

## Success Criteria

The MVP is successful when you can:

1. Submit a goal like "build a REST API for a todo list with PostgreSQL storage"
2. Watch the architect agent produce a coherent system design
3. See implementation agents work in parallel on different parts
4. Find a working (or nearly working) codebase on disk
5. Understand what happened at every step via the dashboard
