import { randomUUID } from 'node:crypto';

import type { MeetingType } from './generated/types.gen.ts';

export type Calendar = {
  /** Meeting types in creation order. */
  listMeetingTypes(): MeetingType[];
};

const starterMeetingTypes: Omit<MeetingType, 'id'>[] = [
  {
    name: 'Знакомство',
    description: 'Короткий звонок, чтобы познакомиться и обсудить задачу.',
    durationMinutes: 30,
  },
  {
    name: 'Консультация',
    description: 'Подробный разбор вашего вопроса с рекомендациями.',
    durationMinutes: 60,
  },
];

/**
 * The owner's calendar. Handlers reach the data only through it. Data lives in the memory
 * of the process (ADR 0003), so every calendar starts with an empty store and gets the starter
 * meeting types.
 */
export function createCalendar(): Calendar {
  const meetingTypes: MeetingType[] = starterMeetingTypes.map((meetingType) => ({
    id: randomUUID(),
    ...meetingType,
  }));

  return {
    listMeetingTypes: () => [...meetingTypes],
  };
}
