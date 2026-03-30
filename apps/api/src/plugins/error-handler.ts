import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";

const errorHandlerPluginImpl: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Validation Error",
        statusCode: 400,
        details: error.flatten(),
      });
    }

    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({
      error: error.message || "Internal Server Error",
      statusCode,
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: "Not Found", statusCode: 404 });
  });
};

export const errorHandlerPlugin = fp(errorHandlerPluginImpl, {
  name: "error-handler",
});
