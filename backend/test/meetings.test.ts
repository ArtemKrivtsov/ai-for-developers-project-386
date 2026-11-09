import type { FastifyInstance } from 'fastify';
import { expect, test } from 'vitest';

import { buildTestApp, request } from './api.ts';

/** Monday, 9 November 2026, noon in Moscow: the booking window runs from 10 to 23 November. */
const monday = () => new Date('2026-11-09T12:00:00+03:00');

async function createMeetingType(app: FastifyInstance, durationMinutes: number) {
  const response = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: { name: 'Созвон', description: 'Обсудим задачу.', durationMinutes },
  });
  return response.json();
}

function book(app: FastifyInstance, meetingTypeId: string, meeting: Record<string, unknown>) {
  return request(app, {
    method: 'POST',
    url: `/api/meeting-types/${meetingTypeId}/meetings`,
    payload: { guestName: 'Иван Петров', guestEmail: 'ivan@example.com', ...meeting },
  });
}

test('a meeting booked on a slot comes back with its whole meeting type and its end', async () => {
  const app = buildTestApp({ now: monday });
  const meetingType = await createMeetingType(app, 60);

  const response = await book(app, meetingType.id, {
    start: '2026-11-10T09:30:00+03:00',
    guestName: 'Иван Петров',
    guestEmail: 'Ivan.Petrov@Example.com',
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toEqual({
    id: expect.any(String),
    meetingType: {
      id: meetingType.id,
      name: 'Созвон',
      description: 'Обсудим задачу.',
      durationMinutes: 60,
    },
    start: '2026-11-10T09:30:00+03:00',
    end: '2026-11-10T10:30:00+03:00',
    guestName: 'Иван Петров',
    guestEmail: 'Ivan.Petrov@Example.com',
  });
});

test('booking a meeting of an unknown meeting type fails with meeting_type_not_found', async () => {
  const app = buildTestApp({ now: monday });

  const response = await book(app, '5b0e8f2c-3d71-4a96-b8e4-1c2f7a9d6e30', {
    start: '2026-11-10T09:00:00+03:00',
  });

  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ code: 'meeting_type_not_found', message: expect.any(String) });
});

test('the server trims spaces around the guest name and keeps the email as it is', async () => {
  const app = buildTestApp({ now: monday });
  const meetingType = await createMeetingType(app, 30);

  const response = await book(app, meetingType.id, {
    start: '2026-11-10T09:00:00+03:00',
    guestName: ' \tИван Петров \n',
    guestEmail: 'Ivan@Example.COM',
  });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    guestName: 'Иван Петров',
    guestEmail: 'Ivan@Example.COM',
  });
});

test.each([
  ['start is missing', { start: undefined }, 'start'],
  ['start has no offset', { start: '2026-11-10T09:00:00' }, 'start'],
  ['start is not a date and time', { start: 'завтра в 9' }, 'start'],
  ['guestName is missing', { guestName: undefined }, 'guestName'],
  ['guestName is empty', { guestName: '' }, 'guestName'],
  ['guestName has only spaces', { guestName: '   ' }, 'guestName'],
  ['guestName is longer than 100 characters', { guestName: 'я'.repeat(101) }, 'guestName'],
  ['guestEmail is missing', { guestEmail: undefined }, 'guestEmail'],
  ['guestEmail is not an email', { guestEmail: 'ivan.example.com' }, 'guestEmail'],
  [
    'guestEmail is longer than 254 characters',
    { guestEmail: `${'a'.repeat(243)}@example.com` },
    'guestEmail',
  ],
])('booking a meeting fails with a validation error when %s', async (_case, change, field) => {
  const app = buildTestApp({ now: monday });
  const meetingType = await createMeetingType(app, 30);

  const response = await book(app, meetingType.id, {
    start: '2026-11-10T09:00:00+03:00',
    ...change,
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({ code: 'validation_error', message: expect.any(String), field });
});

test('booking a meeting of a meeting type id that is not a UUID fails with a validation error', async () => {
  const app = buildTestApp({ now: monday });

  const response = await book(app, 'not-a-uuid', { start: '2026-11-10T09:00:00+03:00' });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({
    code: 'validation_error',
    message: expect.any(String),
    field: 'meetingTypeId',
  });
});

test.each([
  ['is off the 30-minute step', 30, '2026-11-10T09:15:00+03:00'],
  ['is on a Saturday', 30, '2026-11-14T10:00:00+03:00'],
  ['is today, before the booking window', 30, '2026-11-09T15:00:00+03:00'],
  ['is on the 15th day, after the booking window', 30, '2026-11-24T10:00:00+03:00'],
  ['is before the working day', 30, '2026-11-10T08:30:00+03:00'],
  ['leaves a 60-minute meeting ending after 18:00', 60, '2026-11-10T17:30:00+03:00'],
  ['has fractions finer than nanoseconds', 30, '2026-11-10T09:00:00.0000000001+03:00'],
])(
  'booking a meeting whose start %s fails with a validation error of start',
  async (_case, durationMinutes, start) => {
    const app = buildTestApp({ now: monday });
    const meetingType = await createMeetingType(app, durationMinutes);

    const response = await book(app, meetingType.id, { start });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      code: 'validation_error',
      message: expect.any(String),
      field: 'start',
    });
  },
);

test('booking a slot that is already taken fails with a conflict', async () => {
  const app = buildTestApp({ now: monday });
  const meetingType = await createMeetingType(app, 30);
  const first = await book(app, meetingType.id, { start: '2026-11-10T10:00:00+03:00' });
  expect(first.statusCode).toBe(201);

  const response = await book(app, meetingType.id, {
    start: '2026-11-10T10:00:00+03:00',
    guestName: 'Мария Иванова',
    guestEmail: 'maria@example.com',
  });

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ code: 'conflict', message: expect.any(String) });
});

test('a booked slot is no longer offered by its meeting type or by another one', async () => {
  const app = buildTestApp({ now: monday });
  const booked = await createMeetingType(app, 30);
  const other = await createMeetingType(app, 30);
  await book(app, booked.id, { start: '2026-11-10T10:00:00+03:00' });

  for (const meetingType of [booked, other]) {
    const response = await request(app, {
      method: 'GET',
      url: `/api/meeting-types/${meetingType.id}/slots`,
    });
    const [tuesday] = response.json();
    expect(tuesday.date).toBe('2026-11-10');
    expect(tuesday.slots.slice(0, 3)).toEqual([
      { start: '2026-11-10T09:00:00+03:00', end: '2026-11-10T09:30:00+03:00' },
      { start: '2026-11-10T09:30:00+03:00', end: '2026-11-10T10:00:00+03:00' },
      { start: '2026-11-10T10:30:00+03:00', end: '2026-11-10T11:00:00+03:00' },
    ]);
    expect(tuesday.slots).toHaveLength(17);
  }
});

test('a start with another offset books the same moment and comes back in Moscow time', async () => {
  const app = buildTestApp({ now: monday });
  const meetingType = await createMeetingType(app, 30);

  const response = await book(app, meetingType.id, { start: '2026-11-10T06:00:00Z' });

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    start: '2026-11-10T09:00:00+03:00',
    end: '2026-11-10T09:30:00+03:00',
  });
});
