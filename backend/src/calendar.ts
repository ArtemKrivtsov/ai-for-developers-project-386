import { randomUUID } from 'node:crypto';

import type { MeetingType, NewMeetingType } from './generated/types.gen.ts';

export type Calendar = {
  /** Meeting types in creation order. */
  listMeetingTypes(): MeetingType[];
  /** Adds a meeting type to the end of the list, trimming spaces around its texts. */
  createMeetingType(meetingType: NewMeetingType): MeetingType;
};

const starterMeetingTypes: NewMeetingType[] = [
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
  const meetingTypes: MeetingType[] = [];

  function createMeetingType({ name, description, durationMinutes }: NewMeetingType) {
    const meetingType: MeetingType = {
      id: randomUUID(),
      name: name.trim(),
      description: description?.trim() ?? '',
      durationMinutes,
    };
    meetingTypes.push(meetingType);
    return meetingType;
  }

  starterMeetingTypes.forEach(createMeetingType);

  return {
    listMeetingTypes: () => [...meetingTypes],
    createMeetingType,
  };
}
