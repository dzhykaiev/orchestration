import { beforeEach, describe, expect, it, vi } from "vitest";

const listWorkstreamsByProject = vi.fn();
const updateProject = vi.fn();
const getProjectById = vi.fn();
const updateFeature = vi.fn();

vi.mock("@orchestration/db", () => ({
  workstreamRepo: {
    listWorkstreamsByProject,
  },
  projectRepo: {
    updateProject,
    getProjectById,
  },
  featureRepo: {
    getFeatureByProjectId: vi.fn(),
    updateFeature,
  },
  taskRepo: {
    countTasksByWorkstream: vi.fn(),
    createTask: vi.fn(),
  },
  auditLogRepo: {
    createAuditLog: vi.fn(),
  },
  reviewRepo: {
    getLatestReviewByWorkstreamId: vi.fn(),
  },
}));

vi.mock("../shared-resources.js", () => ({
  implementationQueue: { add: vi.fn() },
  validationQueue: { add: vi.fn() },
}));

vi.mock("../events/index.js", () => ({
  eventBus: { emitTyped: vi.fn() },
}));

describe("checkProjectCompletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listWorkstreamsByProject.mockResolvedValue([]);
  });

  it("does not mark project completed when there are no workstreams", async () => {
    const { checkProjectCompletion } = await import("./progress.js");

    await checkProjectCompletion("project-1");

    expect(listWorkstreamsByProject).toHaveBeenCalledWith("project-1");
    expect(updateProject).not.toHaveBeenCalled();
    expect(getProjectById).not.toHaveBeenCalled();
    expect(updateFeature).not.toHaveBeenCalled();
  });
});
