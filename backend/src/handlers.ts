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

    async createMeeting(request, reply) {
      const result = calendar.createMeeting(request.params.meetingTypeId, request.body);
      switch (result.status) {
        case 'created':
          return reply.code(201).send(result.meeting);
        case 'meetingTypeNotFound':
          return reply.code(404).send(meetingTypeNotFound);
        case 'outsideSlots':
          return reply.code(400).send(startOutsideSlots);
        case 'conflict':
          return reply.code(409).send(conflict);
      }
    },

    async listUpcomingMeetings(_request, reply) {
      return reply.code(200).send(calendar.listUpcomingMeetings());
    },
  };
}

const meetingTypeNotFound: ApiError = {
  code: 'meeting_type_not_found',
  message: 'No meeting type has this id',
};

const startOutsideSlots: ApiError = {
  code: 'validation_error',
  message: 'No slot of the booking window starts at this time',
  field: 'start',
};

const conflict: ApiError = {
  code: 'conflict',
  message: 'The time overlaps another meeting',
};
