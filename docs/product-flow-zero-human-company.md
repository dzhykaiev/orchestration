# Zero-Human Company Flow

This document describes the current operating model: a Jira-like, ticket-first company where agents execute continuously with minimal human intervention.

## Product Intent

The product is optimized for a founder/operator who wants to:
- create a company once,
- define strategic goals,
- run autonomous agent teams 24/7,
- track all execution through tickets.

The system should feel like "Jira + AI workforce" instead of "single prompt -> single project run".

## Core Entities

- `Company` (`workspace` in storage): isolation boundary for files, agent definitions, projects, and tickets.
- `Ticket` (`feature` in storage): smallest traceable unit of work and communication thread.
- `Agent` (`agent_definition`): role-capable worker that can be hired and assigned from tickets.
- `Execution Project` (`project`): runtime context created when a ticket is kicked off.

## End-to-End User Flow

## 1. Company Bootstrap

User launches product and creates a company:
- company name,
- primary goal (required),
- optional description,
- first operator role (`ceo` or `orchestrator`),
- provider (`claude`, `codex`, `opencode`) for the founding agent.

Result:
- company record is created,
- founding agent is created,
- first bootstrap ticket is created automatically (`Initial operating plan for <company>`),
- initial ticket log is added.

## 2. Ticket-First Operations

All work is represented as tickets:
- hiring,
- planning,
- implementation,
- clarifications,
- delegation.

Ticket log keeps full communication history (agent <-> agent, user <-> agent, system events).

## 3. Hiring Through Tickets

From a ticket, the current owner can hire an agent via API:
- create agent definition,
- optionally create delegated follow-up ticket assigned to that new agent,
- write delegation audit log.

This keeps org growth and execution traceable in one artifact: the ticket timeline.

## 4. 24/7 Execution Policy

`TicketAutoRunner` executes continuously:
- scans `todo` and `backlog` tickets,
- applies kickoff policy and creates execution projects,
- retries failed kickoff attempts with exponential backoff,
- emits timeout/escalation signals for stale `in_progress` tickets.

## 5. Multi-Company Navigation

UI supports many companies (workspace/company aliases).
Each company is isolated in runtime paths and execution context.

## Isolation Guarantees

For each company:
- separate root filesystem area,
- separate project subdirectories,
- no cross-company path traversal,
- independent ticket and agent graph.

## Design Principles

- Ticket-first: no hidden agent work outside ticket timelines.
- Low-friction bootstrap: first company and first operator in one screen.
- Operational clarity: clear owner, status, and audit history per ticket.
- Safe autonomy: retry and timeout policies are visible and controllable.

## Current Limitations

- Scheduler retry state is currently in-memory and resets on API restart.
- Escalation signals for stale tickets are advisory (non-destructive).
- Full E2E flow automation should be extended with longer-running smoke scenarios.
