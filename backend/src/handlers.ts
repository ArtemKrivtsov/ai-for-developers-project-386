import type { Calendar } from './calendar.ts';
import type { RouteHandlers } from './generated/fastify.gen.ts';

export function createHandlers(calendar: Calendar): RouteHandlers {
  return {
    async getHealth(_request, reply) {
      return reply.code(200).send({ status: 'ok' });
    },

    async listMeetingTypes(_request, reply) {
      return reply.code(200).send(calendar.listMeetingTypes());
    },

    async createMeetingType(request, reply) {
      return reply.code(201).send(calendar.createMeetingType(request.body));
    },
  };
}
