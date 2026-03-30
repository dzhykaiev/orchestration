import { describe, expect, it } from "vitest";
import { parseFileChanges } from "./response-parser.js";

describe("parseFileChanges", () => {
  it("parses XML file tags", () => {
    const response = `Here is the implementation:

<file path="src/index.ts">
console.log("hello");
</file>

And another file:

<file path="src/utils.ts">
export function add(a: number, b: number) {
  return a + b;
}
</file>`;

    const files = parseFileChanges(response);
    expect(files).toHaveLength(2);
    expect(files[0]?.path).toBe("src/index.ts");
    expect(files[0]?.content).toContain('console.log("hello")');
    expect(files[1]?.path).toBe("src/utils.ts");
    expect(files[1]?.content).toContain("export function add");
  });

  it("falls back to annotated markdown blocks", () => {
    const response = `Here is the code:

\`\`\`typescript:src/main.ts
const x = 42;
\`\`\``;

    const files = parseFileChanges(response);
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("src/main.ts");
    expect(files[0]?.content).toContain("const x = 42");
  });

  it("returns empty array for no file blocks", () => {
    const response = "Just some text without any file blocks.";
    const files = parseFileChanges(response);
    expect(files).toHaveLength(0);
  });

  it("prefers XML tags over markdown blocks when both present", () => {
    const response = `
<file path="src/a.ts">
const a = 1;
</file>

\`\`\`typescript:src/b.ts
const b = 2;
\`\`\``;

    const files = parseFileChanges(response);
    // Should return XML files only (preferred format)
    expect(files).toHaveLength(1);
    expect(files[0]?.path).toBe("src/a.ts");
  });
});
