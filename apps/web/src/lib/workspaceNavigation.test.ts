import { describe, expect, it } from "vitest";
import {
  buildBoardHref,
  buildCompanyHref,
  buildWorkspaceHref,
  resolveCompanySelection,
  resolveWorkspaceSelection,
} from "./workspaceNavigation";

describe("workspaceNavigation", () => {
  it("builds board href with and without company context", () => {
    expect(buildBoardHref("ws-123")).toBe("/companies/ws-123/board");
    expect(buildBoardHref("")).toBe("/board");
    expect(buildBoardHref(undefined)).toBe("/board");
  });

  it("builds board href with optional board query params", () => {
    expect(buildBoardHref("ws-123", { q: "billing api", status: "todo" })).toBe(
      "/companies/ws-123/board?q=billing+api&status=todo",
    );
    expect(buildBoardHref(undefined, { q: "infra" })).toBe("/board?q=infra");
  });

  it("builds company href with and without company context", () => {
    expect(buildCompanyHref("ws-123")).toBe("/companies/ws-123");
    expect(buildCompanyHref("")).toBe("/companies");
    expect(buildCompanyHref(undefined)).toBe("/companies");
  });

  it("keeps workspace href alias for backward compatibility", () => {
    expect(buildWorkspaceHref("ws-123")).toBe("/companies/ws-123");
    expect(buildWorkspaceHref("")).toBe("/companies");
    expect(buildWorkspaceHref(undefined)).toBe("/companies");
  });

  it("resolves company from requested id first", () => {
    const selected = resolveCompanySelection({
      requestedCompanyId: "ws-2",
      availableCompanyIds: ["ws-1", "ws-2"],
    });

    expect(selected).toBe("ws-2");
  });

  it("falls back to first available id when requested is invalid", () => {
    const selected = resolveCompanySelection({
      requestedCompanyId: "ws-missing",
      availableCompanyIds: ["ws-1", "ws-2"],
    });

    expect(selected).toBe("ws-1");
  });

  it("returns empty selection when no companies are available", () => {
    const selected = resolveCompanySelection({
      requestedCompanyId: "ws-1",
      availableCompanyIds: [],
    });

    expect(selected).toBe("");
  });

  it("keeps workspace selection alias for backward compatibility", () => {
    const selected = resolveWorkspaceSelection({
      requestedWorkspaceId: "ws-2",
      availableWorkspaceIds: ["ws-1", "ws-2"],
    });

    expect(selected).toBe("ws-2");
  });
});
