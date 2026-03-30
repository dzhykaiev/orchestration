import type { FastifyPluginAsync } from "fastify";
import { ZodError } from "zod";

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((error, request, reply) => {
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
