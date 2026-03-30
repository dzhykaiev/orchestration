import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { FileChange } from "./response-parser.js";

const OUTPUT_BASE = process.env.OUTPUT_DIR || "./output";

export async function writeFiles(
  projectId: string,
  files: FileChange[],
): Promise<string[]> {
  const projectDir = resolve(OUTPUT_BASE, projectId);
  const written: string[] = [];

  for (const file of files) {
    const fullPath = join(projectDir, file.path);

    // Prevent path traversal
    if (!fullPath.startsWith(projectDir)) {
      throw new Error(`Path traversal detected: ${file.path}`);
    }

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");
    written.push(file.path);
  }

  return written;
}
