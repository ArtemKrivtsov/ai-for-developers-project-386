import type { FastifyInstance } from 'fastify';
import { expect, test } from 'vitest';

import { buildTestApp, createMeeting, createMeetingType, monday, request } from './api.ts';

function listUpcomingMeetings(app: FastifyInstance) {
  return request(app, { method: 'GET', url: '/api/meetings' });
}

test('upcoming meetings of every meeting type come nearest first', async () => {
  const app = buildTestApp({ now: monday });
  const consultation = await createMeetingType(app, { name: 'Консультация', durationMinutes: 60 });
  const introduction = await createMeetingType(app, { name: 'Знакомство', durationMinutes: 30 });
  await createMeeting(app, consultation.id, {
    start: '2026-11-11T10:00:00+03:00',
    guestName: 'Мария Иванова',
  });
  await createMeeting(app, introduction.id, {
    start: '2026-11-10T14:00:00+03:00',
    guestName: 'Иван Петров',
  });
  await createMeeting(app, consultation.id, {
    start: '2026-11-10T09:00:00+03:00',
    guestName: 'Анна Смирнова',
  });

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
  const meetingType = await createMeetingType(app);
  await createMeeting(app, meetingType.id, { start: '2026-11-10T09:00:00+03:00' });

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
  const meetingType = await createMeetingType(app);
  await createMeeting(app, meetingType.id, { start: '2026-11-10T09:00:00+03:00' });
  await createMeeting(app, meetingType.id, {
    start: '2026-11-10T10:00:00+03:00',
    guestName: 'Мария Иванова',
  });

  at = new Date('2026-11-10T09:30:00+03:00');
  const response = await listUpcomingMeetings(app);

  expect(response.statusCode).toBe(200);
  const meetings: { start: string; guestName: string }[] = response.json();
  expect(meetings.map(({ start, guestName }) => [start, guestName])).toEqual([
    ['2026-11-10T10:00:00+03:00', 'Мария Иванова'],
  ]);
});
