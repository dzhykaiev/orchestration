import {
  InvalidTransitionError,
  assertFeatureTransition,
  assertProjectTransition,
  assertTaskTransition,
  assertWorkstreamTransition,
  canFeatureTransition,
  canProjectTransition,
  canTaskTransition,
  canWorkstreamTransition,
} from "@orchestration/shared";
import { describe, expect, it } from "vitest";

describe("transition helpers", () => {
  it("validates project transitions with table-driven cases", () => {
    const cases = [
      { from: "draft", to: "planning", expected: true },
      { from: "planning", to: "in_progress", expected: true },
      { from: "completed", to: "archived", expected: true },
      { from: "draft", to: "completed", expected: false },
      { from: "archived", to: "draft", expected: false },
    ] as const;

    for (const testCase of cases) {
      expect(canProjectTransition(testCase.from, testCase.to)).toBe(testCase.expected);
    }
  });

  it("validates workstream transitions with table-driven cases", () => {
    const cases = [
      { from: "pending", to: "in_progress", expected: true },
      { from: "blocked", to: "failed", expected: true },
      { from: "in_progress", to: "completed", expected: true },
      { from: "pending", to: "completed", expected: false },
      { from: "completed", to: "in_progress", expected: false },
    ] as const;

    for (const testCase of cases) {
      expect(canWorkstreamTransition(testCase.from, testCase.to)).toBe(testCase.expected);
    }
  });

  it("validates feature transitions with table-driven cases", () => {
    const cases = [
      { from: "backlog", to: "todo", expected: true },
      { from: "todo", to: "in_progress", expected: true },
      { from: "in_progress", to: "done", expected: true },
      { from: "done", to: "todo", expected: false },
      { from: "rejected", to: "in_progress", expected: false },
    ] as const;

    for (const testCase of cases) {
      expect(canFeatureTransition(testCase.from, testCase.to)).toBe(testCase.expected);
    }
  });

  it("validates task transitions with table-driven cases", () => {
    const cases = [
      { from: "queued", to: "running", expected: true },
      { from: "running", to: "failed", expected: true },
      { from: "failed", to: "queued", expected: true },
      { from: "completed", to: "running", expected: false },
      { from: "cancelled", to: "queued", expected: false },
    ] as const;

    for (const testCase of cases) {
      expect(canTaskTransition(testCase.from, testCase.to)).toBe(testCase.expected);
    }
  });

  it("throws InvalidTransitionError with stable metadata for invalid assertions", () => {
    expect(() => assertProjectTransition("draft", "completed")).toThrow(InvalidTransitionError);

    try {
      assertProjectTransition("draft", "completed");
      throw new Error("expected InvalidTransitionError");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTransitionError);
      const typed = error as InvalidTransitionError;
      expect(typed.statusCode).toBe(409);
      expect(typed.entity).toBe("project");
      expect(typed.from).toBe("draft");
      expect(typed.to).toBe("completed");
    }
  });

  it("keeps assert helpers strict for all entities", () => {
    expect(() => assertWorkstreamTransition("pending", "completed")).toThrow(InvalidTransitionError);
    expect(() => assertFeatureTransition("done", "todo")).toThrow(InvalidTransitionError);
    expect(() => assertTaskTransition("completed", "queued")).toThrow(InvalidTransitionError);
  });
});
