import { HttpResponse } from 'msw';

import type { ApiError, MeetingType, Slot, SlotDay } from '../src/generated/index.ts';
import { handleGetMeetingType, handleListSlots } from '../src/generated/msw.gen.ts';
import { server } from './msw.ts';

/** A meeting type the server knows, for tests of its page `/book/<id>`. */
export const id = '7d3c2a4e-0f6b-4a8e-9d51-2b6f1c8e4a10';

export const meetingType: MeetingType = {
  id,
  name: 'Разбор резюме',
  description: 'Пройдёмся по резюме и сопроводительному письму.',
  durationMinutes: 30,
};

export const notFound: ApiError = { code: 'meeting_type_not_found', message: 'No meeting type' };

/** The booking window as the server sees it on Monday, 9 November 2026: 10 to 23 November. */
const windowDates = [
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
];

/** The 14 days of the window, with slots only on the given days. Slots are in Moscow time. */
export function slotDays(slots: Record<string, Slot[]> = {}): SlotDay[] {
  return windowDates.map((date) => ({ date, slots: slots[date] ?? [] }));
}

/** Answers for the meeting type above: other ids are not found. */
export function serve(days: SlotDay[]) {
  server.use(
    handleGetMeetingType(({ params }) =>
      params.meetingTypeId === id
        ? HttpResponse.json(meetingType)
        : HttpResponse.json(notFound, { status: 404 }),
    ),
    handleListSlots(({ params }) =>
      params.meetingTypeId === id
        ? HttpResponse.json(days)
        : HttpResponse.json(notFound, { status: 404 }),
    ),
  );
}

export const thursdaySlots: Slot[] = [
  { start: '2026-11-12T09:00:00+03:00', end: '2026-11-12T09:30:00+03:00' },
  { start: '2026-11-12T09:30:00+03:00', end: '2026-11-12T10:00:00+03:00' },
];
