import type { RouteHandlers } from "./generated/fastify.gen.ts";

export const handlers: RouteHandlers = {
  async getHealth(_request, reply) {
    return reply.code(200).send({ status: "ok" });
  },
};
