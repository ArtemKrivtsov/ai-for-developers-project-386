import type { Calendar } from './calendar.ts';
import type { RouteHandlers } from './generated/fastify.gen.ts';
import type { ApiError } from './generated/types.gen.ts';

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

    async getMeetingType(request, reply) {
      const meetingType = calendar.getMeetingType(request.params.meetingTypeId);
      if (!meetingType) return reply.code(404).send(meetingTypeNotFound);
      return reply.code(200).send(meetingType);
    },

    async listSlots(request, reply) {
      const days = calendar.listSlots(request.params.meetingTypeId);
      if (!days) return reply.code(404).send(meetingTypeNotFound);
      return reply.code(200).send(days);
    },
  };
}

const meetingTypeNotFound: ApiError = {
  code: 'meeting_type_not_found',
  message: 'No meeting type has this id',
};
