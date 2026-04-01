import { beforeEach, describe, expect, it } from "vitest";
import {
  BOARD_WORKSPACE_STORAGE_KEY,
  buildBoardHref,
  buildWorkspaceHref,
  readStoredBoardWorkspaceId,
  resolveWorkspaceSelection,
  writeStoredBoardWorkspaceId,
} from "./workspaceNavigation";

describe("workspaceNavigation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("builds board href with and without workspace context", () => {
    expect(buildBoardHref("ws-123")).toBe("/board?workspaceId=ws-123");
    expect(buildBoardHref("")).toBe("/board");
    expect(buildBoardHref(undefined)).toBe("/board");
  });

  it("builds workspace href with and without workspace context", () => {
    expect(buildWorkspaceHref("ws-123")).toBe("/workspaces/ws-123");
    expect(buildWorkspaceHref("")).toBe("/workspaces");
    expect(buildWorkspaceHref(undefined)).toBe("/workspaces");
  });

  it("resolves workspace from requested id first", () => {
    const selected = resolveWorkspaceSelection({
      requestedWorkspaceId: "ws-2",
      storedWorkspaceId: "ws-1",
      availableWorkspaceIds: ["ws-1", "ws-2"],
    });

    expect(selected).toBe("ws-2");
  });

  it("falls back to stored id when requested is invalid", () => {
    const selected = resolveWorkspaceSelection({
      requestedWorkspaceId: "ws-missing",
      storedWorkspaceId: "ws-1",
      availableWorkspaceIds: ["ws-1", "ws-2"],
    });

    expect(selected).toBe("ws-1");
  });

  it("falls back to first workspace when requested and stored are invalid", () => {
    const selected = resolveWorkspaceSelection({
      requestedWorkspaceId: "ws-missing",
      storedWorkspaceId: "ws-also-missing",
      availableWorkspaceIds: ["ws-1", "ws-2"],
    });

    expect(selected).toBe("ws-1");
  });

  it("returns empty selection when no workspaces are available", () => {
    const selected = resolveWorkspaceSelection({
      requestedWorkspaceId: "ws-1",
      storedWorkspaceId: "ws-2",
      availableWorkspaceIds: [],
    });

    expect(selected).toBe("");
  });

  it("reads and writes stored workspace id safely", () => {
    expect(readStoredBoardWorkspaceId(window.localStorage)).toBe("");

    writeStoredBoardWorkspaceId(window.localStorage, "ws-55");
    expect(window.localStorage.getItem(BOARD_WORKSPACE_STORAGE_KEY)).toBe("ws-55");
    expect(readStoredBoardWorkspaceId(window.localStorage)).toBe("ws-55");

    writeStoredBoardWorkspaceId(window.localStorage, "");
    expect(window.localStorage.getItem(BOARD_WORKSPACE_STORAGE_KEY)).toBeNull();
    expect(readStoredBoardWorkspaceId(window.localStorage)).toBe("");
  });
});
