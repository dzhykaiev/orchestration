import { sql } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  // Lightweight liveness probe
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  // Deep readiness probe — checks DB and Redis connectivity
  app.get("/health/ready", async (request, reply) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

    // Check database
    if (app.db) {
      try {
        const start = performance.now();
        await app.db.execute(sql`SELECT 1`);
        checks.database = { status: "ok", latencyMs: Math.round(performance.now() - start) };
      } catch (err) {
        checks.database = {
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    } else {
      checks.database = { status: "error", error: "Not configured" };
    }

    // Check Redis
    if (app.redis) {
      try {
        const start = performance.now();
        await app.redis.ping();
        checks.redis = { status: "ok", latencyMs: Math.round(performance.now() - start) };
      } catch (err) {
        checks.redis = {
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    } else {
      checks.redis = { status: "error", error: "Not configured" };
    }

    const allHealthy = Object.values(checks).every((c) => c.status === "ok");

    return reply.status(allHealthy ? 200 : 503).send({
      status: allHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    });
  });
};
