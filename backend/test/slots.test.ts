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

test('slots cover 14 days from tomorrow, and weekends have none', async () => {
  const app = buildTestApp({ now: monday });
  const id = await createMeetingType(app, 30);

  const response = await request(app, { method: 'GET', url: `/api/meeting-types/${id}/slots` });

  expect(response.statusCode).toBe(200);
  const days: { date: string; slots: unknown[] }[] = response.json();
  expect(days.map(({ date }) => date)).toEqual([
    '2026-11-10',
    '2026-11-11',
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
    '2026-11-20',
    '2026-11-21',
    '2026-11-22',
    '2026-11-23',
  ]);
  const daysWithoutSlots = days.filter(({ slots }) => slots.length === 0).map(({ date }) => date);
  expect(daysWithoutSlots).toEqual(['2026-11-14', '2026-11-15', '2026-11-21', '2026-11-22']);
});

test('the booking window starts the day after the Moscow date, not the UTC one', async () => {
  // 22:30 UTC on Monday is already 01:30 on Tuesday in Moscow.
  const app = buildTestApp({ now: () => new Date('2026-11-09T22:30:00Z') });
  const id = await createMeetingType(app, 30);

  const response = await request(app, { method: 'GET', url: `/api/meeting-types/${id}/slots` });

  const days: { date: string }[] = response.json();
  expect(days.at(0)?.date).toBe('2026-11-11');
  expect(days.at(-1)?.date).toBe('2026-11-24');
});

test('a 30-minute meeting type has 18 slots on a working day, from 09:00 every 30 minutes', async () => {
  const app = buildTestApp({ now: monday });
  const id = await createMeetingType(app, 30);

  const response = await request(app, { method: 'GET', url: `/api/meeting-types/${id}/slots` });

  const [tuesday] = response.json();
  expect(tuesday.date).toBe('2026-11-10');
  expect(tuesday.slots[0]).toEqual({
    start: '2026-11-10T09:00:00+03:00',
    end: '2026-11-10T09:30:00+03:00',
  });
  expect(tuesday.slots.map(({ start }: { start: string }) => start.slice(11, 16))).toEqual([
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '13:00',
    '13:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
  ]);
});

test.each([
  [30, '09:30', { start: '2026-11-10T17:30:00+03:00', end: '2026-11-10T18:00:00+03:00' }],
  [60, '10:00', { start: '2026-11-10T17:00:00+03:00', end: '2026-11-10T18:00:00+03:00' }],
  [120, '11:00', { start: '2026-11-10T16:00:00+03:00', end: '2026-11-10T18:00:00+03:00' }],
])(
  'a %i-minute meeting type gets slots every 30 minutes, ending at %s first and at 18:00 last',
  async (durationMinutes, firstEnd, lastSlot) => {
    const app = buildTestApp({ now: monday });
    const id = await createMeetingType(app, durationMinutes);

    const response = await request(app, {
      method: 'GET',
      url: `/api/meeting-types/${id}/slots`,
    });

    const [tuesday] = response.json();
    expect(tuesday.slots[0]).toEqual({
      start: '2026-11-10T09:00:00+03:00',
      end: `2026-11-10T${firstEnd}:00+03:00`,
    });
    expect(tuesday.slots[1].start).toBe('2026-11-10T09:30:00+03:00');
    expect(tuesday.slots.at(-1)).toEqual(lastSlot);
  },
);

test('slots of an unknown meeting type are refused with meeting_type_not_found', async () => {
  const app = buildTestApp({ now: monday });

  const response = await request(app, {
    method: 'GET',
    url: '/api/meeting-types/5b0e8f2c-3d71-4a96-b8e4-1c2f7a9d6e30/slots',
  });

  expect(response.statusCode).toBe(404);
  expect(response.json()).toEqual({ code: 'meeting_type_not_found', message: expect.any(String) });
});

test('slots of a meeting type id that is not a UUID fail with a validation error', async () => {
  const app = buildTestApp({ now: monday });

  const response = await request(app, {
    method: 'GET',
    url: '/api/meeting-types/not-a-uuid/slots',
  });

  expect(response.statusCode).toBe(400);
  expect(response.json()).toEqual({
    code: 'validation_error',
    message: expect.any(String),
    field: 'meetingTypeId',
  });
});
