import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

export interface FileSnapshot {
  path: string;
  mtimeMs: number;
}

/**
 * Recursively list all files in a directory (excluding node_modules and .git).
 */
export async function listFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      if (entry.isDirectory()) {
        const sub = await listFilesRecursive(fullPath);
        results.push(...sub);
      } else {
        results.push(fullPath);
      }
    }
  } catch {
    // directory doesn't exist yet
  }
  return results;
}

/**
 * Snapshot files with their modification times for detecting changes.
 */
export async function snapshotFiles(dir: string): Promise<Map<string, number>> {
  const files = await listFilesRecursive(dir);
  const snapshot = new Map<string, number>();
  for (const file of files) {
    try {
      const s = await stat(file);
      snapshot.set(file, s.mtimeMs);
    } catch {
      // file may have been deleted between listing and stat
    }
  }
  return snapshot;
}

/**
 * Find files that were created or modified between two snapshots.
 */
export function diffSnapshots(before: Map<string, number>, after: Map<string, number>): string[] {
  const changed: string[] = [];
  for (const [path, mtimeMs] of after) {
    const prevMtime = before.get(path);
    if (prevMtime === undefined || mtimeMs > prevMtime) {
      changed.push(path);
    }
  }
  return changed;
}
