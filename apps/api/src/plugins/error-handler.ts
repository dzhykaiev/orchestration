import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { ZodError } from "zod";

const errorHandlerPluginImpl: FastifyPluginAsync = async (app) => {
  app.setErrorHandler(
    (
      error: Error & { statusCode?: number; code?: string; validation?: unknown },
      request,
      reply,
    ) => {
      const requestId = request.id;

      // Zod validation errors
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: "Validation Error",
          statusCode: 400,
          requestId,
          details: error.flatten(),
        });
      }

      // Fastify content-type / JSON parse errors
      if (error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
        return reply.status(415).send({
          error: "Unsupported Media Type",
          statusCode: 415,
          requestId,
        });
      }

      if (error.code === "FST_ERR_CTP_INVALID_CONTENT_LENGTH" || error.statusCode === 400) {
        return reply.status(400).send({
          error: error.message || "Bad Request",
          statusCode: 400,
          requestId,
        });
      }

      // Custom application errors (NotFoundError, BusinessError)
      if (error.statusCode && error.statusCode < 500) {
        return reply.status(error.statusCode).send({
          error: error.message,
          statusCode: error.statusCode,
          requestId,
        });
      }

      // Unexpected errors — log full details, return generic message
      request.log.error(error);
      const statusCode = error.statusCode ?? 500;
      return reply.status(statusCode).send({
        error: statusCode === 500 ? "Internal Server Error" : error.message,
        statusCode,
        requestId,
      });
    },
  );

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: "Not Found",
      statusCode: 404,
      requestId: request.id,
    });
  });
};

export const errorHandlerPlugin = fp(errorHandlerPluginImpl, {
  name: "error-handler",
});
