import { describe, expect, it, vi } from "vitest";
import { buildPlanJobPayload } from "../application/planning/plan-job-payload.js";

describe("planning queue contract", () => {
  it("builds canonical planning payload shape", () => {
    const resolveProvider = vi.fn().mockReturnValue("openai");

    const payload = buildPlanJobPayload({
      projectId: "project-1",
      goal: "Deliver MVP",
      projectProvider: null,
      resolveProvider,
    });

    expect(resolveProvider).toHaveBeenCalledWith(null);
    expect(payload).toEqual({
      projectId: "project-1",
      goal: "Deliver MVP",
      provider: "openai",
    });
    expect(Object.keys(payload).sort()).toEqual(["goal", "projectId", "provider"]);
  });
});
