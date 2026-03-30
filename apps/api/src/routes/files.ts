import type { FastifyPluginAsync } from "fastify";
import { readdir, stat, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || join(process.cwd(), "..", "orchestrator", "projects"));
const MAX_FILE_SIZE = 100 * 1024; // 100KB

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
      const { id } = request.params;
      const subPath = request.query.path || "";
      const projectDir = resolve(PROJECTS_DIR, id);
      const targetDir = resolve(projectDir, subPath);

      // Prevent path traversal
      if (!targetDir.startsWith(projectDir)) {
        return reply.status(400).send({ error: "Invalid path", statusCode: 400 });
      }

      // Check project dir exists
      try {
        const s = await stat(projectDir);
        if (!s.isDirectory()) {
          return reply.status(404).send({ error: "Project directory not found", statusCode: 404 });
        }
      } catch {
        return reply.status(404).send({ error: "Project directory not found", statusCode: 404 });
      }

      // Read directory
      let entries;
      try {
        entries = await readdir(targetDir, { withFileTypes: true });
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
      const { id } = request.params;
      const filePath = request.query.path;

      if (!filePath) {
        return reply.status(400).send({ error: "path query param is required", statusCode: 400 });
      }

      const projectDir = resolve(PROJECTS_DIR, id);
      const fullPath = resolve(projectDir, filePath);

      // Prevent path traversal
      if (!fullPath.startsWith(projectDir)) {
        return reply.status(400).send({ error: "Invalid path", statusCode: 400 });
      }

      // Check file exists and get stats
      let s;
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
        return reply.status(400).send({ error: "Binary files cannot be displayed", statusCode: 400 });
      }

      return { content: buffer.toString("utf-8"), path: filePath, size: s.size };
    },
  );
};
