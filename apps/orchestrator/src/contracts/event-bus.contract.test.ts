import { EVENTS_CHANNEL } from "@orchestration/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const publish = vi.fn().mockResolvedValue(1);
const on = vi.fn();
const quit = vi.fn().mockResolvedValue("OK");
const persistEvent = vi.fn().mockResolvedValue(undefined);

vi.mock("ioredis", () => {
  class RedisMock {
    status = "ready";
    on = on;
    publish = publish;
    quit = quit;
  }

  return {
    default: { default: RedisMock },
  };
});

vi.mock("../events/event-log.js", () => ({
  persistEvent,
}));

describe("event bus contract", () => {
  beforeEach(() => {
    publish.mockClear();
    on.mockClear();
    quit.mockClear();
    persistEvent.mockClear();
  });

  it("publishes typed event envelope on shared channel", async () => {
    const { EventBus, CHANNEL } = await import("../events/emitter.js");
    const bus = new EventBus();

    bus.emitTyped("project.planning_started", { projectId: "project-1" });

    expect(CHANNEL).toBe(EVENTS_CHANNEL);
    expect(persistEvent).toHaveBeenCalledWith({
      type: "project.planning_started",
      payload: { projectId: "project-1" },
    });
    expect(publish).toHaveBeenCalledWith(
      EVENTS_CHANNEL,
      JSON.stringify({
        type: "project.planning_started",
        payload: { projectId: "project-1" },
      }),
    );

    await bus.close();
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it("keeps lifecycle payload shapes for queued task and planning completion", async () => {
    const { EventBus } = await import("../events/emitter.js");
    const bus = new EventBus();

    bus.emitTyped("task.queued", {
      taskId: "task-1",
      workstreamId: "ws-1",
    });
    bus.emitTyped("project.planning_completed", {
      projectId: "project-1",
      workstreamIds: ["ws-1", "ws-2"],
    });

    expect(publish).toHaveBeenCalledWith(
      EVENTS_CHANNEL,
      JSON.stringify({
        type: "task.queued",
        payload: { taskId: "task-1", workstreamId: "ws-1" },
      }),
    );
    expect(publish).toHaveBeenCalledWith(
      EVENTS_CHANNEL,
      JSON.stringify({
        type: "project.planning_completed",
        payload: { projectId: "project-1", workstreamIds: ["ws-1", "ws-2"] },
      }),
    );

    await bus.close();
  });
});
