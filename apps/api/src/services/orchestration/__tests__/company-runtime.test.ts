import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const getById = vi.fn();

vi.mock("../../project.service.js", () => ({
  projectService: {
    getById,
  },
}));

vi.stubEnv("COMPANIES_DIR", "/tmp/orchestration-companies");

const { resolveCompanyRuntimeContext } = await import("../company-runtime.js");
const { resolveWithinRoot } = await import("../../runtime/company-paths.js");

describe("company runtime context", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("resolves a deterministic company-scoped project root", async () => {
    getById.mockResolvedValueOnce({
      id: "project-123",
      workspaceId: "company-456",
    });

    const context = await resolveCompanyRuntimeContext("project-123");

    expect(context).toEqual({
      companyId: "company-456",
      projectId: "project-123",
      companyRoot: "/tmp/orchestration-companies/company-456",
      projectRoot: "/tmp/orchestration-companies/company-456/projects/project-123",
    });
  });

  it("rejects traversal outside the root", () => {
    expect(() => resolveWithinRoot("/tmp/orchestration-companies/company-456", "../etc/passwd")).toThrow(
      "Path escapes root",
    );
  });
});
