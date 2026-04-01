import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db, schema } from "@orchestration/db";
import { eq } from "drizzle-orm";

type SourceType = "legacy_projects_dir" | "repo_path";

interface SourceCandidate {
  type: SourceType;
  path: string;
}

interface MigrationResult {
  projectId: string;
  workspaceId: string;
  copied: boolean;
  sourceType?: SourceType;
  sourcePath?: string;
  targetPath: string;
  repoPathUpdated: boolean;
  status: "migrated" | "already_sandboxed" | "skipped";
  reason?: string;
}

const COPY_IGNORE = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "logs",
  "node_modules",
]);

async function isDirectory(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    return info.isDirectory();
  } catch {
    return false;
  }
}

async function dirHasContent(path: string): Promise<boolean> {
  try {
    const entries = await readdir(path);
    return entries.length > 0;
  } catch {
    return false;
  }
}

function isLikelyUnsafeRepoRoot(candidate: string, repoRoot: string): boolean {
  return resolve(candidate) === resolve(repoRoot);
}

function isWithinRoot(root: string, target: string): boolean {
  const rel = relative(root, target);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function resolveTargetPath(companiesDir: string, workspaceId: string, projectId: string): string {
  return resolve(companiesDir, workspaceId, "projects", projectId);
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    apply: args.has("--apply"),
    verbose: args.has("--verbose"),
    allowInternalRepoPath: args.has("--allow-internal-repo-path"),
  };
}

async function run() {
  const { apply, verbose, allowInternalRepoPath } = parseArgs();
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(__dirname, "../../../../");
  const companiesDir = resolve(process.env.COMPANIES_DIR || join(repoRoot, "companies"));
  const legacyProjectsDir = resolve(process.env.PROJECTS_DIR || join(repoRoot, "projects"));

  console.log(
    `[Backfill] Starting project sandbox backfill in ${apply ? "APPLY" : "DRY-RUN"} mode`,
  );
  console.log(`[Backfill] companiesDir: ${companiesDir}`);
  console.log(`[Backfill] legacyProjectsDir: ${legacyProjectsDir}`);

  const projects = await db
    .select({
      id: schema.projects.id,
      workspaceId: schema.projects.workspaceId,
      repoPath: schema.projects.repoPath,
      projectMode: schema.projects.projectMode,
    })
    .from(schema.projects);

  const results: MigrationResult[] = [];
  let copiedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const project of projects) {
    const targetPath = resolveTargetPath(companiesDir, project.workspaceId, project.id);
    const legacyPath = resolve(legacyProjectsDir, project.id);
    const repoPath = project.repoPath ? resolve(project.repoPath) : null;

    const targetExists = await isDirectory(targetPath);
    const targetHasContent = targetExists ? await dirHasContent(targetPath) : false;
    const legacyExists = await isDirectory(legacyPath);

    const candidates: SourceCandidate[] = [];
    if (legacyExists && legacyPath !== targetPath) {
      candidates.push({ type: "legacy_projects_dir", path: legacyPath });
    }
    if (
      repoPath &&
      repoPath !== targetPath &&
      (await isDirectory(repoPath)) &&
      !isLikelyUnsafeRepoRoot(repoPath, repoRoot) &&
      (allowInternalRepoPath || !isWithinRoot(repoRoot, repoPath))
    ) {
      candidates.push({ type: "repo_path", path: repoPath });
    }

    if (repoPath && repoPath !== targetPath && verbose) {
      if (isLikelyUnsafeRepoRoot(repoPath, repoRoot)) {
        console.warn(
          `[Backfill] ${project.id}: skipped repoPath candidate (matches repo root): ${repoPath}`,
        );
      } else if (!allowInternalRepoPath && isWithinRoot(repoRoot, repoPath)) {
        console.warn(
          `[Backfill] ${project.id}: skipped repoPath candidate inside monorepo root (use --allow-internal-repo-path to override): ${repoPath}`,
        );
      }
    }

    const selectedSource = candidates[0];
    const shouldCopy = !targetHasContent && Boolean(selectedSource);
    const shouldUpdateRepoPath = repoPath !== targetPath && (targetHasContent || shouldCopy);

    const result: MigrationResult = {
      projectId: project.id,
      workspaceId: project.workspaceId,
      copied: false,
      sourceType: selectedSource?.type,
      sourcePath: selectedSource?.path,
      targetPath,
      repoPathUpdated: false,
      status: "skipped",
    };

    if (!shouldCopy && !shouldUpdateRepoPath) {
      result.reason = "no source artifacts and target is empty";
      results.push(result);
      skippedCount += 1;
      continue;
    }

    if (shouldCopy && selectedSource) {
      if (apply) {
        await mkdir(targetPath, { recursive: true });
        await cp(selectedSource.path, targetPath, {
          recursive: true,
          force: false,
          filter: (src) => !COPY_IGNORE.has(src.split("/").pop() ?? ""),
        });
      }
      result.copied = true;
      copiedCount += 1;
    }

    if (shouldUpdateRepoPath) {
      if (apply) {
        await db
          .update(schema.projects)
          .set({ repoPath: targetPath, updatedAt: new Date() })
          .where(eq(schema.projects.id, project.id));

        await db.insert(schema.auditLogs).values({
          workspaceId: project.workspaceId,
          projectId: project.id,
          entityType: "project",
          entityId: project.id,
          action: "updated",
          actorType: "system",
          metadata: {
            kind: "sandbox_backfill",
            copied: shouldCopy,
            sourceType: selectedSource?.type ?? null,
            sourcePath: selectedSource?.path ?? null,
            targetPath,
            previousRepoPath: project.repoPath ?? null,
          },
        });
      }
      result.repoPathUpdated = true;
      updatedCount += 1;
    }

    result.status = shouldCopy ? "migrated" : "already_sandboxed";
    results.push(result);
  }

  for (const result of results) {
    console.log(
      `[Backfill] ${result.projectId} | ${result.status} | copied=${result.copied} | repoPathUpdated=${result.repoPathUpdated} | target=${result.targetPath}${result.sourcePath ? ` | source=${result.sourcePath}` : ""}${result.reason ? ` | reason=${result.reason}` : ""}`,
    );
  }

  console.log("[Backfill] Summary:");
  console.log(`  total: ${results.length}`);
  console.log(`  copied: ${copiedCount}`);
  console.log(`  repoPath updated: ${updatedCount}`);
  console.log(`  skipped: ${skippedCount}`);

  if (!apply) {
    console.log("[Backfill] DRY-RUN mode finished. Re-run with --apply to persist changes.");
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[Backfill] Failed:", error);
    process.exit(1);
  });
