import type { FastifyPluginAsync } from "fastify";

// TODO: Implement task endpoints per contracts/api/agent-tasks.ts

export const taskRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request) => {
    // TODO: Create agent task, add to BullMQ queue
    return { task: null };
  });

  app.post<{ Params: { id: string } }>("/:id/complete", async (request) => {
    // TODO: Mark task complete, update workstream progress
    return { success: true };
  });
};
