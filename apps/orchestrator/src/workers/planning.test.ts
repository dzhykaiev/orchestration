import { beforeEach, describe, expect, it, vi } from "vitest";

const updateProject = vi.fn();
const getProjectById = vi.fn();
const createWorkstream = vi.fn();
const updateWorkstream = vi.fn();
const createTask = vi.fn();
const implementationQueueAdd = vi.fn();
const emitTyped = vi.fn();
const parseWorkstreams = vi.fn();

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

vi.mock("@orchestration/db", () => ({
  projectRepo: {
    getProjectById,
    updateProject,
  },
  workstreamRepo: {
    createWorkstream,
    updateWorkstream,
  },
  taskRepo: {
    createTask,
  },
  auditLogRepo: {
    createAuditLog: vi.fn(),
  },
  artifactRepo: {
    createArtifact: vi.fn(),
  },
}));

vi.mock("../llm/index.js", () => ({
  createLLMProvider: vi.fn().mockReturnValue({
    run: vi.fn().mockResolvedValue({ result: "architect output" }),
    listFiles: vi.fn().mockResolvedValue([]),
  }),
}));

vi.mock("../prompts/architect.js", () => ({
  ARCHITECT_EXISTING_CODEBASE_PROMPT: "existing",
  ARCHITECT_SYSTEM_PROMPT: "system",
  parseArchitecture: vi.fn().mockReturnValue("architecture"),
  parseWorkstreams,
}));

vi.mock("../prompts/implementation.js", () => ({
  buildUserMessage: vi.fn().mockReturnValue("implement"),
}));

vi.mock("../shared-resources.js", () => ({
  implementationQueue: { add: implementationQueueAdd },
}));

vi.mock("../events/index.js", () => ({
  eventBus: { emitTyped },
}));

describe("handlePlanningJob dependency normalization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    implementationQueueAdd.mockResolvedValue(undefined);
    parseWorkstreams.mockReturnValue([
      {
        name: "Foundation",
        objective: "base",
        dependencies: [],
        deliverables: [],
        ownedPaths: [],
        assignedAgent: "backend",
        order: 0,
      },
      {
        name: "API",
        objective: "api",
        dependencies: ["Foundation", "unknown-dep"],
        deliverables: [],
        ownedPaths: [],
        assignedAgent: "backend",
        order: 1,
      },
    ]);
    getProjectById.mockResolvedValue({
      id: "project-1",
      projectMode: "greenfield",
      repoPath: null,
      repoUrl: null,
      goal: "test goal",
      provider: "opencode",
    });
    updateProject.mockResolvedValue({});
    createTask.mockResolvedValue({
      id: "task-1",
      role: "backend",
      prompt: "implement",
    });
    createWorkstream.mockImplementation(
      async (input: { name: string; dependencies: string[] }) => ({
        id:
          input.name === "Foundation"
            ? "11111111-1111-1111-1111-111111111111"
            : "22222222-2222-2222-2222-222222222222",
        projectId: "project-1",
        name: input.name,
        objective: "obj",
        status: "pending",
        dependencies: input.dependencies,
        assignedAgent: "backend",
        deliverables: [],
        ownedPaths: [],
        order: 0,
      }),
    );
  });

  it("normalizes name-based dependencies to UUIDs and keeps unknown values as-is", async () => {
    const { handlePlanningJob } = await import("./planning.js");

    await handlePlanningJob({
      data: { projectId: "project-1", goal: "goal", provider: "opencode" },
    } as never);

    expect(updateWorkstream).toHaveBeenCalledWith("22222222-2222-2222-2222-222222222222", {
      dependencies: ["11111111-1111-1111-1111-111111111111", "unknown-dep"],
    });
  });

  it("emits planning lifecycle events and enqueues implementation with expected payload", async () => {
    const { handlePlanningJob } = await import("./planning.js");

    await handlePlanningJob({
      data: { projectId: "project-1", goal: "goal", provider: "opencode" },
    } as never);

    expect(implementationQueueAdd).toHaveBeenCalledWith(
      "implement",
      {
        taskId: "task-1",
        workstreamId: "11111111-1111-1111-1111-111111111111",
        projectId: "project-1",
        role: "backend",
        prompt: "implement",
        provider: "opencode",
      },
      { jobId: "plan-11111111-1111-1111-1111-111111111111" },
    );

    expect(emitTyped).toHaveBeenCalledWith("project.planning_started", { projectId: "project-1" });
    expect(emitTyped).toHaveBeenCalledWith("workstream.started", {
      workstreamId: "11111111-1111-1111-1111-111111111111",
      projectId: "project-1",
    });
    expect(emitTyped).toHaveBeenCalledWith("task.queued", {
      taskId: "task-1",
      workstreamId: "11111111-1111-1111-1111-111111111111",
    });
    expect(emitTyped).toHaveBeenCalledWith("project.planning_completed", {
      projectId: "project-1",
      workstreamIds: [
        "11111111-1111-1111-1111-111111111111",
        "22222222-2222-2222-2222-222222222222",
      ],
    });
  });

  it("treats empty workstreams from planner as direct completion", async () => {
    parseWorkstreams.mockReturnValueOnce([]);
    const { handlePlanningJob } = await import("./planning.js");

    await handlePlanningJob({
      data: { projectId: "project-1", goal: "goal", provider: "opencode" },
    } as never);

    expect(updateProject).toHaveBeenCalledWith("project-1", {
      architecture: "architecture",
      status: "completed",
    });
    expect(emitTyped).not.toHaveBeenCalledWith("project.failed", expect.anything());
  });

  it("emits project.failed when no workstreams can be created", async () => {
    createWorkstream.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const { handlePlanningJob } = await import("./planning.js");

    await handlePlanningJob({
      data: { projectId: "project-1", goal: "goal", provider: "opencode" },
    } as never);

    expect(updateProject).toHaveBeenCalledWith("project-1", { status: "failed" });
    expect(emitTyped).toHaveBeenCalledWith("project.failed", {
      projectId: "project-1",
      error: "No workstreams could be created",
    });
  });
});
