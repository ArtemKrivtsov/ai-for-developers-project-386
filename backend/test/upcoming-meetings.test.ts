import type { FastifyInstance } from 'fastify';
import { expect, test } from 'vitest';

import { buildTestApp, request } from './api.ts';

/** Monday, 9 November 2026, noon in Moscow: the booking window runs from 10 to 23 November. */
const monday = () => new Date('2026-11-09T12:00:00+03:00');

async function createMeetingType(app: FastifyInstance, name: string, durationMinutes: number) {
  const response = await request(app, {
    method: 'POST',
    url: '/api/meeting-types',
    payload: { name, durationMinutes },
  });
  return response.json().id as string;
}

async function book(app: FastifyInstance, meetingTypeId: string, start: string, guestName: string) {
  const response = await request(app, {
    method: 'POST',
    url: `/api/meeting-types/${meetingTypeId}/meetings`,
    payload: { start, guestName, guestEmail: 'guest@example.com' },
  });
  expect(response.statusCode).toBe(201);
}

function listUpcomingMeetings(app: FastifyInstance) {
  return request(app, { method: 'GET', url: '/api/meetings' });
}

test('upcoming meetings of every meeting type come nearest first', async () => {
  const app = buildTestApp({ now: monday });
  const consultation = await createMeetingType(app, 'Консультация', 60);
  const introduction = await createMeetingType(app, 'Знакомство', 30);
  await book(app, consultation, '2026-11-11T10:00:00+03:00', 'Мария Иванова');
  await book(app, introduction, '2026-11-10T14:00:00+03:00', 'Иван Петров');
  await book(app, consultation, '2026-11-10T09:00:00+03:00', 'Анна Смирнова');

  const response = await listUpcomingMeetings(app);

  expect(response.statusCode).toBe(200);
  const meetings: { start: string; meetingType: { name: string }; guestName: string }[] =
    response.json();
  expect(
    meetings.map(({ start, meetingType, guestName }) => [start, meetingType.name, guestName]),
  ).toEqual([
    ['2026-11-10T09:00:00+03:00', 'Консультация', 'Анна Смирнова'],
    ['2026-11-10T14:00:00+03:00', 'Знакомство', 'Иван Петров'],
    ['2026-11-11T10:00:00+03:00', 'Консультация', 'Мария Иванова'],
  ]);
});

test('a meeting going on now stays in the list until it ends', async () => {
  let at = monday();
  const app = buildTestApp({ now: () => at });
  const meetingType = await createMeetingType(app, 'Знакомство', 30);
  await book(app, meetingType, '2026-11-10T09:00:00+03:00', 'Иван Петров');

  at = new Date('2026-11-10T09:29:59+03:00');
  const response = await listUpcomingMeetings(app);

  expect(response.statusCode).toBe(200);
  const meetings: { start: string; end: string; guestName: string }[] = response.json();
  expect(meetings.map(({ start, end, guestName }) => [start, end, guestName])).toEqual([
    ['2026-11-10T09:00:00+03:00', '2026-11-10T09:30:00+03:00', 'Иван Петров'],
  ]);
});

test('a meeting leaves the list when it ends', async () => {
  let at = monday();
  const app = buildTestApp({ now: () => at });
  const meetingType = await createMeetingType(app, 'Знакомство', 30);
  await book(app, meetingType, '2026-11-10T09:00:00+03:00', 'Иван Петров');
  await book(app, meetingType, '2026-11-10T10:00:00+03:00', 'Мария Иванова');

  at = new Date('2026-11-10T09:30:00+03:00');
  const response = await listUpcomingMeetings(app);

  expect(response.statusCode).toBe(200);
  const meetings: { start: string; guestName: string }[] = response.json();
  expect(meetings.map(({ start, guestName }) => [start, guestName])).toEqual([
    ['2026-11-10T10:00:00+03:00', 'Мария Иванова'],
  ]);
});
