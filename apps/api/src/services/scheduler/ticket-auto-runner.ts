import type { Queue } from "bullmq";
import { auditLogService } from "../audit-log.service.js";
import { featureService } from "../feature.service.js";

type RetryState = {
  attempts: number;
  nextAttemptAt: number;
  lastError: string;
};

type RunnerOptions = {
  pollIntervalMs: number;
  maxTicketsPerTick: number;
  maxRetries: number;
  backoffBaseMs: number;
  backoffMaxMs: number;
  inProgressTimeoutMs: number;
};

type RunnerStatus = {
  running: boolean;
  inTick: boolean;
  pollIntervalMs: number;
  lastTickStartedAt: string | null;
  lastTickFinishedAt: string | null;
  retryQueueSize: number;
  inFlightSize: number;
};

type RunnerTickResult = {
  startedAt: string;
  finishedAt: string;
  candidates: number;
  kickedOff: number;
  failed: number;
  skippedByBackoff: number;
  skippedByRetryCap: number;
  staleInProgressDetected: number;
  skipped: boolean;
};

type TicketLike = {
  id: string;
  title: string;
  workspaceId?: string | null;
  status?: string;
  priority?: number;
  sortOrder?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  orchestrationProjectId?: string | null;
};

const DEFAULT_OPTIONS: RunnerOptions = {
  pollIntervalMs: Number.parseInt(process.env.AUTO_TICKET_RUNNER_INTERVAL_MS ?? "15000", 10),
  maxTicketsPerTick: Number.parseInt(process.env.AUTO_TICKET_RUNNER_MAX_PER_TICK ?? "2", 10),
  maxRetries: Number.parseInt(process.env.AUTO_TICKET_RUNNER_MAX_RETRIES ?? "5", 10),
  backoffBaseMs: Number.parseInt(process.env.AUTO_TICKET_RUNNER_BACKOFF_BASE_MS ?? "30000", 10),
  backoffMaxMs: Number.parseInt(process.env.AUTO_TICKET_RUNNER_BACKOFF_MAX_MS ?? "900000", 10),
  inProgressTimeoutMs: Number.parseInt(
    process.env.AUTO_TICKET_RUNNER_INPROGRESS_TIMEOUT_MS ?? "7200000",
    10,
  ),
};

export class TicketAutoRunner {
  private readonly retryState = new Map<string, RetryState>();
  private readonly inFlight = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private inTick = false;
  private lastTickStartedAt: Date | null = null;
  private lastTickFinishedAt: Date | null = null;

  constructor(private options: RunnerOptions = DEFAULT_OPTIONS) {}

  start(planningQueue: Queue, intervalMs?: number) {
    if (this.timer) return;

    if (intervalMs && Number.isFinite(intervalMs) && intervalMs >= 1000) {
      this.options = { ...this.options, pollIntervalMs: Math.floor(intervalMs) };
    }

    this.timer = setInterval(() => {
      this.tick(planningQueue).catch((err) => {
        console.error("[TicketAutoRunner] Tick failed:", err);
      });
    }, this.options.pollIntervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  getStatus(): RunnerStatus {
    return {
      running: Boolean(this.timer),
      inTick: this.inTick,
      pollIntervalMs: this.options.pollIntervalMs,
      lastTickStartedAt: this.lastTickStartedAt?.toISOString() ?? null,
      lastTickFinishedAt: this.lastTickFinishedAt?.toISOString() ?? null,
      retryQueueSize: this.retryState.size,
      inFlightSize: this.inFlight.size,
    };
  }

  async tick(planningQueue: Queue): Promise<RunnerTickResult> {
    const startedAt = new Date();

    if (this.inTick) {
      const nowIso = startedAt.toISOString();
      return {
        startedAt: nowIso,
        finishedAt: nowIso,
        candidates: 0,
        kickedOff: 0,
        failed: 0,
        skippedByBackoff: 0,
        skippedByRetryCap: 0,
        staleInProgressDetected: 0,
        skipped: true,
      };
    }

    this.inTick = true;
    this.lastTickStartedAt = startedAt;

    let staleInProgressDetected = 0;
    let kickedOff = 0;
    let failed = 0;
    let skippedByBackoff = 0;
    let skippedByRetryCap = 0;

    try {
      staleInProgressDetected = await this.detectStaleInProgressTickets();
      const candidates = await this.loadCandidates();

      for (const ticket of candidates) {
        if (kickedOff + failed >= this.options.maxTicketsPerTick) break;

        const state = this.retryState.get(ticket.id);
        const now = Date.now();

        if (state && state.attempts >= this.options.maxRetries) {
          skippedByRetryCap += 1;
          continue;
        }

        if (state && state.nextAttemptAt > now) {
          skippedByBackoff += 1;
          continue;
        }

        this.inFlight.add(ticket.id);
        try {
          await featureService.kickoff(ticket.id, planningQueue);
          this.retryState.delete(ticket.id);
          kickedOff += 1;

          await auditLogService.create({
            workspaceId: ticket.workspaceId ?? undefined,
            entityType: "feature",
            entityId: ticket.id,
            action: "status_changed",
            actorType: "system",
            metadata: {
              kind: "auto-runner-kickoff",
              from: ticket.status ?? "backlog",
              to: "in_progress",
              policy: {
                maxRetries: this.options.maxRetries,
                backoffBaseMs: this.options.backoffBaseMs,
              },
            },
          });
        } catch (err) {
          failed += 1;

          const prev = this.retryState.get(ticket.id);
          const attempts = (prev?.attempts ?? 0) + 1;
          const backoff = Math.min(
            this.options.backoffBaseMs * 2 ** Math.max(0, attempts - 1),
            this.options.backoffMaxMs,
          );

          this.retryState.set(ticket.id, {
            attempts,
            nextAttemptAt: Date.now() + backoff,
            lastError: err instanceof Error ? err.message : String(err),
          });

          await auditLogService.create({
            workspaceId: ticket.workspaceId ?? undefined,
            entityType: "feature",
            entityId: ticket.id,
            action: attempts >= this.options.maxRetries ? "failed" : "updated",
            actorType: "system",
            metadata: {
              kind:
                attempts >= this.options.maxRetries
                  ? "auto-runner-retry-exhausted"
                  : "auto-runner-retry-scheduled",
              attempts,
              maxRetries: this.options.maxRetries,
              retryAfterMs: attempts >= this.options.maxRetries ? null : backoff,
              error: err instanceof Error ? err.message : String(err),
            },
          });
        } finally {
          this.inFlight.delete(ticket.id);
        }
      }

      const finishedAt = new Date();
      this.lastTickFinishedAt = finishedAt;

      return {
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        candidates: candidates.length,
        kickedOff,
        failed,
        skippedByBackoff,
        skippedByRetryCap,
        staleInProgressDetected,
        skipped: false,
      };
    } finally {
      this.inTick = false;
    }
  }

  private async detectStaleInProgressTickets() {
    const result = await featureService.list({
      status: "in_progress",
      limit: 200,
      offset: 0,
    });

    const cutoff = Date.now() - this.options.inProgressTimeoutMs;
    let staleCount = 0;

    for (const raw of result.data as TicketLike[]) {
      if (!raw.orchestrationProjectId) continue;
      const updatedAt = raw.updatedAt ? new Date(raw.updatedAt).getTime() : Number.NaN;
      if (!Number.isFinite(updatedAt) || updatedAt > cutoff) continue;

      staleCount += 1;
      await auditLogService.create({
        workspaceId: raw.workspaceId ?? undefined,
        projectId: raw.orchestrationProjectId,
        entityType: "feature",
        entityId: raw.id,
        action: "escalated",
        actorType: "system",
        metadata: {
          kind: "auto-runner-timeout-signal",
          timeoutMs: this.options.inProgressTimeoutMs,
          updatedAt: new Date(updatedAt).toISOString(),
          note: "Ticket appears stale in in_progress and may require manual intervention.",
        },
      });
    }

    return staleCount;
  }

  private async loadCandidates(): Promise<TicketLike[]> {
    const [todoResult, backlogResult] = await Promise.all([
      featureService.list({ status: "todo", limit: 200, offset: 0 }),
      featureService.list({ status: "backlog", limit: 200, offset: 0 }),
    ]);

    const byId = new Map<string, TicketLike>();

    for (const raw of [
      ...(todoResult.data as TicketLike[]),
      ...(backlogResult.data as TicketLike[]),
    ]) {
      if (raw.orchestrationProjectId) continue;
      if (this.inFlight.has(raw.id)) continue;
      byId.set(raw.id, raw);
    }

    return Array.from(byId.values()).sort((a, b) => {
      const prio = (b.priority ?? 0) - (a.priority ?? 0);
      if (prio !== 0) return prio;

      const order = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (order !== 0) return order;

      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
      return createdA - createdB;
    });
  }
}

export const ticketAutoRunner = new TicketAutoRunner();
