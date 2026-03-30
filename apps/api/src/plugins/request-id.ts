import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";

const requestIdPluginImpl: FastifyPluginAsync = async (app) => {
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  // Log request completion with timing
  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      "request completed",
    );
  });
};

export const requestIdPlugin = fp(requestIdPluginImpl, {
  name: "request-id",
});
