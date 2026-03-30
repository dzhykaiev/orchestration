import type { FastifyPluginAsync } from "fastify";

// TODO: Implement project CRUD endpoints per contracts/api/projects.ts
// - GET / — list projects
// - GET /:id — get project by ID
// - POST / — create project
// - PATCH /:id — update project
// - POST /:id/plan — trigger planning

export const projectRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    return { projects: [], total: 0 };
  });

  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    // TODO: Fetch from database
    return { project: null };
  });

  app.post("/", async (request) => {
    // TODO: Validate input, insert into database, emit project.created event
    return { project: null };
  });

  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    // TODO: Validate input, update in database
    return { project: null };
  });

  app.post<{ Params: { id: string } }>("/:id/plan", async (request) => {
    // TODO: Trigger orchestrator planning pipeline
    return { project: null, workstreams: [] };
  });
};
