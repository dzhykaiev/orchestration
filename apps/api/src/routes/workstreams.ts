import type { FastifyPluginAsync } from "fastify";

// TODO: Implement workstream endpoints per contracts/api/workstreams.ts

export const workstreamRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    return { workstream: null };
  });

  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    return { workstream: null };
  });
};
