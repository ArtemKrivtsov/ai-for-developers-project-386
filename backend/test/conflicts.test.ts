import type { FastifyInstance } from 'fastify';
import { expect, test } from 'vitest';

import { buildTestApp, request } from './api.ts';

/** Monday, 9 November 2026, noon in Moscow: the booking window runs from 10 to 23 November. */
const monday = () => new Date('2026-11-09T12:00:00+03:00');

async function createMeetingType(app: FastifyInstance, durationMinutes: number) {
  const response = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: { name: 'Созвон', durationMinutes },
  });
  return response.json().id as string;
}

function book(app: FastifyInstance, meetingTypeId: string, start: string) {
  return request(app, {
    method: 'POST',
    url: `/api/meeting-types/${meetingTypeId}/meetings`,
    payload: { start, guestName: 'Иван Петров', guestEmail: 'ivan@example.com' },
  });
}

test('partial overlap: a 30-minute meeting at 10:30 inside a 60-minute meeting of another type at 10:00 is a conflict', async () => {
  const app = buildTestApp({ now: monday });
  const hour = await createMeetingType(app, 60);
  const halfHour = await createMeetingType(app, 30);
  expect((await book(app, hour, '2026-11-10T10:00:00+03:00')).statusCode).toBe(201);

  const response = await book(app, halfHour, '2026-11-10T10:30:00+03:00');

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ code: 'conflict', message: expect.any(String) });
});

test('partial overlap: a 60-minute meeting at 10:00 over a 30-minute meeting of another type at 10:30 is a conflict', async () => {
  const app = buildTestApp({ now: monday });
  const hour = await createMeetingType(app, 60);
  const halfHour = await createMeetingType(app, 30);
  expect((await book(app, halfHour, '2026-11-10T10:30:00+03:00')).statusCode).toBe(201);

  const response = await book(app, hour, '2026-11-10T10:00:00+03:00');

  expect(response.statusCode).toBe(409);
  expect(response.json()).toEqual({ code: 'conflict', message: expect.any(String) });
});

test('a 10:00–11:00 meeting takes the 30-minute slots at 10:00 and 10:30, and 11:00 right after it can be booked', async () => {
  const app = buildTestApp({ now: monday });
  const hour = await createMeetingType(app, 60);
  const halfHour = await createMeetingType(app, 30);
  expect((await book(app, hour, '2026-11-10T10:00:00+03:00')).statusCode).toBe(201);

  const slots = await request(app, { method: 'GET', url: `/api/meeting-types/${halfHour}/slots` });
  const [tuesday] = slots.json();
  expect(tuesday.date).toBe('2026-11-10');
  expect(tuesday.slots.slice(0, 4)).toEqual([
    { start: '2026-11-10T09:00:00+03:00', end: '2026-11-10T09:30:00+03:00' },
    { start: '2026-11-10T09:30:00+03:00', end: '2026-11-10T10:00:00+03:00' },
    { start: '2026-11-10T11:00:00+03:00', end: '2026-11-10T11:30:00+03:00' },
    { start: '2026-11-10T11:30:00+03:00', end: '2026-11-10T12:00:00+03:00' },
  ]);
  expect(tuesday.slots).toHaveLength(16);

  const response = await book(app, halfHour, '2026-11-10T11:00:00+03:00');

  expect(response.statusCode).toBe(201);
  expect(response.json()).toMatchObject({
    start: '2026-11-10T11:00:00+03:00',
    end: '2026-11-10T11:30:00+03:00',
  });
});

test.each([
  ['Z', '+03:00', '2026-11-10T07:00:00Z', '2026-11-10T10:00:00+03:00'],
  ['+03:00', 'Z', '2026-11-10T10:00:00+03:00', '2026-11-10T07:00:00Z'],
])(
  'a start in %s takes the slot for the same moment written with %s',
  async (_firstOffset, _secondOffset, first, second) => {
    const app = buildTestApp({ now: monday });
    const meetingType = await createMeetingType(app, 30);
    expect((await book(app, meetingType, first)).statusCode).toBe(201);

    const response = await book(app, meetingType, second);

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ code: 'conflict', message: expect.any(String) });
  },
);

test('of several concurrent requests for one slot exactly one books it and the rest get a conflict', async () => {
  const app = buildTestApp({ now: monday });
  const meetingType = await createMeetingType(app, 30);

  const responses = await Promise.all(
    Array.from({ length: 5 }, () => book(app, meetingType, '2026-11-10T10:00:00+03:00')),
  );

  expect(responses.map(({ statusCode }) => statusCode).toSorted()).toEqual([
    201, 409, 409, 409, 409,
  ]);
});

test('of several concurrent requests for overlapping times of different meeting types exactly one books its time and the rest get a conflict', async () => {
  const app = buildTestApp({ now: monday });
  // Every one of these times holds 10:30–10:45, so any two of them overlap.
  const times = [
    [120, '2026-11-10T09:00:00+03:00'],
    [90, '2026-11-10T09:30:00+03:00'],
    [60, '2026-11-10T10:00:00+03:00'],
    [45, '2026-11-10T10:00:00+03:00'],
    [30, '2026-11-10T10:30:00+03:00'],
    [15, '2026-11-10T10:30:00+03:00'],
  ] as const;
  const requests = await Promise.all(
    times.map(async ([durationMinutes, start]) => ({
      meetingType: await createMeetingType(app, durationMinutes),
      start,
    })),
  );

  const responses = await Promise.all(
    requests.map(({ meetingType, start }) => book(app, meetingType, start)),
  );

  expect(responses.map(({ statusCode }) => statusCode).toSorted()).toEqual([
    201, 409, 409, 409, 409, 409,
  ]);
});
