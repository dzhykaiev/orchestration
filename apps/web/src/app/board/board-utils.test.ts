import { describe, expect, it } from "vitest";
import type { Feature } from "../../lib/api";
import { buildFeatureSearchText } from "./board-utils";

describe("buildFeatureSearchText", () => {
  it("includes the core ticket context in lowercase", () => {
    const feature = {
      title: "Launch CEO company bootstrap",
      description: "Create the first orchestration company",
      type: "feature",
      status: "todo",
      assigneeMode: "agent",
    } as Feature;

    const haystack = buildFeatureSearchText(feature, "Orchestrator One", "Frontend", "HQ Rollout");

    expect(haystack).toContain("launch ceo company bootstrap");
    expect(haystack).toContain("create the first orchestration company");
    expect(haystack).toContain("orchestrator one");
    expect(haystack).toContain("frontend");
    expect(haystack).toContain("hq rollout");
    expect(haystack).toContain("todo");
  });
});
