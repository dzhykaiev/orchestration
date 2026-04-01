import { readFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { resolveCompanyRuntimeContext } from "../services/orchestration/company-runtime.js";
import { resolveWithinRoot } from "../services/runtime/company-paths.js";
const MAX_FILE_SIZE = 100 * 1024; // 100KB

const fileParamsSchema = z.object({
  id: z.string().uuid(),
});

const fileListQuerySchema = z.object({
  path: z.string().optional(),
});

const fileContentQuerySchema = z.object({
  path: z.string().min(1, "path query param is required"),
});

function isBinary(buffer: Buffer): boolean {
  // Check first 8KB for null bytes
  const len = Math.min(buffer.length, 8192);
  for (let i = 0; i < len; i++) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

export const fileRoutes: FastifyPluginAsync = async (app) => {
  // GET /:id/files — list file tree
  app.get<{ Params: { id: string }; Querystring: { path?: string } }>(
    "/:id/files",
    async (request, reply) => {
      const { id } = fileParamsSchema.parse(request.params);
      const { path: queryPath } = fileListQuerySchema.parse(request.query);
      const subPath = queryPath || "";
      const { projectRoot } = await resolveCompanyRuntimeContext(id);
      let targetDir: string;
      try {
        targetDir = resolveWithinRoot(projectRoot, subPath);
      } catch {
        return reply.status(400).send({ error: "Invalid path", statusCode: 400 });
      }

      // Check project dir exists
      try {
        const s = await stat(projectRoot);
        if (!s.isDirectory()) {
          return reply.status(404).send({ error: "Project directory not found", statusCode: 404 });
        }
      } catch {
        return reply.status(404).send({ error: "Project directory not found", statusCode: 404 });
      }

      // Read directory
      let entries: import("node:fs").Dirent[] | undefined;
      try {
        entries = (await readdir(targetDir, { withFileTypes: true })) as import("node:fs").Dirent[];
      } catch {
        return reply.status(404).send({ error: "Directory not found", statusCode: 404 });
      }

      const files = await Promise.all(
        entries
          .filter((e) => !e.name.startsWith("."))
          .map(async (entry) => {
            const entryPath = subPath ? join(subPath, entry.name) : entry.name;
            const fullPath = join(targetDir, entry.name);
            if (entry.isDirectory()) {
              return { name: entry.name, path: entryPath, type: "directory" as const };
            }
            try {
              const s = await stat(fullPath);
              return { name: entry.name, path: entryPath, type: "file" as const, size: s.size };
            } catch {
              return { name: entry.name, path: entryPath, type: "file" as const };
            }
          }),
      );

      // Sort: directories first, then alphabetically
      files.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return { files };
    },
  );

  // GET /:id/files/content — get file content
  app.get<{ Params: { id: string }; Querystring: { path: string } }>(
    "/:id/files/content",
    async (request, reply) => {
      const { id } = fileParamsSchema.parse(request.params);
      const { path: filePath } = fileContentQuerySchema.parse(request.query);

      const { projectRoot } = await resolveCompanyRuntimeContext(id);
      let fullPath: string;
      try {
        fullPath = resolveWithinRoot(projectRoot, filePath);
      } catch {
        return reply.status(400).send({ error: "Invalid path", statusCode: 400 });
      }

      // Check file exists and get stats
      let s: import("node:fs").Stats | undefined;
      try {
        s = await stat(fullPath);
      } catch {
        return reply.status(404).send({ error: "File not found", statusCode: 404 });
      }

      if (s.isDirectory()) {
        return reply.status(400).send({ error: "Path is a directory", statusCode: 400 });
      }

      if (s.size > MAX_FILE_SIZE) {
        return reply.status(400).send({
          error: `File too large (${(s.size / 1024).toFixed(0)}KB). Max is 100KB.`,
          statusCode: 400,
        });
      }

      const buffer = await readFile(fullPath);

      if (isBinary(buffer)) {
        return reply
          .status(400)
          .send({ error: "Binary files cannot be displayed", statusCode: 400 });
      }

      return { content: buffer.toString("utf-8"), path: filePath, size: s.size };
    },
  );
};
