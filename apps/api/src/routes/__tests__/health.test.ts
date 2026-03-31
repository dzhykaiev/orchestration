import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";

const { healthRoutes } = await import("../health.js");

async function buildApp(opts?: { db?: boolean; redis?: boolean }) {
  const app = Fastify();

  if (opts?.db !== false) {
    app.decorate("db", {
      execute: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    });
  }

  if (opts?.redis !== false) {
    app.decorate("redis", {
      ping: vi.fn().mockResolvedValue("PONG"),
    });
  }

  await app.register(healthRoutes);
  return app;
}

describe("Health Routes", () => {
  it("GET /health returns ok", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });

  it("GET /health/ready returns 200 when all healthy", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("ok");
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.redis.status).toBe("ok");
  });

  it("GET /health/ready returns 503 when db is missing", async () => {
    const app = await buildApp({ db: false });
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("degraded");
    expect(body.checks.database.status).toBe("error");
  });

  it("GET /health/ready returns 503 when redis is missing", async () => {
    const app = await buildApp({ redis: false });
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe("degraded");
    expect(body.checks.redis.status).toBe("error");
  });

  it("GET /health/ready returns 503 when db throws", async () => {
    const app = await buildApp();
    // biome-ignore lint/suspicious/noExplicitAny: test mock
    (app as any).db.execute = vi.fn().mockRejectedValue(new Error("Connection refused"));
    const res = await app.inject({ method: "GET", url: "/health/ready" });
    expect(res.statusCode).toBe(503);
    const body = JSON.parse(res.payload);
    expect(body.checks.database.status).toBe("error");
    expect(body.checks.database.error).toBe("Connection refused");
  });
});
