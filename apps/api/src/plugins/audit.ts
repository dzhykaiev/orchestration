import { auditLogRepo } from "@orchestration/db";
import type { AuditAction } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parse a request URL to extract entity type, entity ID, and project ID.
 *
 * Supports patterns like:
 *   /api/projects/:id
 *   /api/projects/:id/plan
 *   /api/projects/:id/workstreams
 *   /api/workstreams/:id
 *   /api/tasks/:id
 *   /api/workspaces/:id
 *   /api/features/:id
 *   /api/escalations/:id
 *   /api/artifacts/:id
 */
function parseRoute(url: string): {
  entityType?: string;
  entityId?: string;
  projectId?: string;
} {
  // Strip query string
  const path = url.split("?")[0] ?? "";
  const segments = path.split("/").filter(Boolean);

  // segments: ["api", "projects", "<id>", "plan", ...]
  if (segments[0] !== "api" || segments.length < 2) return {};

  const resource = segments[1];
  const resourceId = segments[2] && UUID_RE.test(segments[2]) ? segments[2] : undefined;

  // Determine the deepest entity type from the URL
  // e.g., /api/projects/:id/artifacts -> entityType = "artifact"
  // e.g., /api/projects/:id -> entityType = "project"
  let entityType: string | undefined;
  let entityId: string | undefined;
  let projectId: string | undefined;

  // Check for nested resources: /api/<parent>/:parentId/<child>/:childId
  const nestedResource = segments[3];
  if (segments.length >= 4 && resourceId && nestedResource) {
    const nestedId = segments[4] && UUID_RE.test(segments[4]) ? segments[4] : undefined;

    // The nested resource is the main entity
    entityType = singularize(nestedResource);
    entityId = nestedId;

    // If parent is "projects", extract projectId
    if (resource === "projects") {
      projectId = resourceId;
    }
  } else {
    entityType = resource ? singularize(resource) : undefined;
    entityId = resourceId;

    if (resource === "projects") {
      projectId = resourceId;
    }
  }

  return { entityType, entityId, projectId };
}

function singularize(plural: string): string {
  if (plural.endsWith("ies")) return `${plural.slice(0, -3)}y`;
  if (plural.endsWith("ses")) return plural.slice(0, -2);
  if (plural.endsWith("s")) return plural.slice(0, -1);
  return plural;
}

function methodToAction(method: string): AuditAction {
  switch (method) {
    case "POST":
      return "created";
    case "PATCH":
      return "updated";
    case "DELETE":
      return "updated"; // "deleted" is not in AuditAction union
    default:
      return "updated";
  }
}

const auditPluginImpl: FastifyPluginAsync = async (app) => {
  app.addHook("onResponse", async (request, reply) => {
    // Only log successful mutations
    if (!["POST", "PATCH", "DELETE"].includes(request.method)) return;
    if (reply.statusCode >= 400) return;

    const { entityType, entityId, projectId } = parseRoute(request.url);
    if (!entityType) return;

    const action = methodToAction(request.method);

    try {
      await auditLogRepo.createAuditLog({
        projectId: projectId || undefined,
        entityType,
        entityId: entityId || "unknown",
        action,
        actorType: "user",
        metadata: {
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
        },
      });
    } catch (err) {
      request.log.warn({ err }, "Failed to create audit log");
    }
  });
};

export const auditPlugin = fp(auditPluginImpl, {
  name: "audit",
});
