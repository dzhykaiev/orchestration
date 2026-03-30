import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { db, client, schema } from "@orchestration/db";

declare module "fastify" {
  interface FastifyInstance {
    db: typeof db;
    dbClient: typeof client;
    schema: typeof schema;
  }
}

const databasePluginImpl: FastifyPluginAsync = async (app) => {
  app.decorate("db", db);
  app.decorate("dbClient", client);
  app.decorate("schema", schema);

  app.addHook("onClose", async () => {
    await client.end();
  });
};

export const databasePlugin = fp(databasePluginImpl, {
  name: "database",
});
