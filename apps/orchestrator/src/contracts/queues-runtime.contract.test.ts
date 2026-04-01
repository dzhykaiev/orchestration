import { beforeEach, describe, expect, it, vi } from "vitest";

const queueClose = vi.fn().mockResolvedValue(undefined);
const workerClose = vi.fn().mockResolvedValue(undefined);
const workerOn = vi.fn();
const queueCtor = vi.fn().mockImplementation((_name: string, _opts: unknown) => ({
  close: queueClose,
}));
const workerCtor = vi.fn().mockImplementation((_name: string, _handler: unknown, _opts: unknown) => ({
  on: workerOn,
  close: workerClose,
}));

vi.mock("bullmq", () => ({
  Queue: queueCtor,
  Worker: workerCtor,
}));

vi.mock("../interfaces/workers/handlers.js", () => ({
  handlePlanningJob: vi.fn(),
  handleImplementationJob: vi.fn(),
  handleValidationJob: vi.fn(),
  handleRecoveryJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../shared-resources.js", () => ({
  sharedConnection: { id: "shared-connection" },
}));

describe("orchestrator queue runtime contract", () => {
  beforeEach(() => {
    queueCtor.mockClear();
    workerCtor.mockClear();
    queueClose.mockClear();
    workerClose.mockClear();
    workerOn.mockClear();
  });

  it("creates expected queues and worker concurrency defaults", async () => {
    const { createOrchestratorRuntime } = await import("../application/runtime/create-orchestrator-runtime.js");
    const runtime = createOrchestratorRuntime();

    expect(queueCtor).toHaveBeenCalledWith(
      "planning",
      expect.objectContaining({
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        }),
      }),
    );
    expect(queueCtor).toHaveBeenCalledWith(
      "implementation",
      expect.objectContaining({
        defaultJobOptions: expect.objectContaining({
          attempts: 1,
        }),
      }),
    );
    expect(queueCtor).toHaveBeenCalledWith(
      "validation",
      expect.objectContaining({
        defaultJobOptions: expect.objectContaining({
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        }),
      }),
    );

    expect(workerCtor).toHaveBeenCalledWith(
      "planning",
      expect.any(Function),
      expect.objectContaining({ concurrency: 1 }),
    );
    expect(workerCtor).toHaveBeenCalledWith(
      "implementation",
      expect.any(Function),
      expect.objectContaining({ concurrency: 3 }),
    );
    expect(workerCtor).toHaveBeenCalledWith(
      "validation",
      expect.any(Function),
      expect.objectContaining({ concurrency: 2 }),
    );

    await runtime.stop();
    expect(workerClose).toHaveBeenCalledTimes(3);
    expect(queueClose).toHaveBeenCalledTimes(3);
  });
});
