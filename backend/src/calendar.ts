import { randomUUID } from 'node:crypto';

import type { MeetingType, NewMeetingType, Slot, SlotDay } from './generated/types.gen.ts';

/** Tells the current moment. The app passes real time, tests pass a fixed one. */
export type Clock = () => Date;

export type Calendar = {
  /** Meeting types in creation order. */
  listMeetingTypes(): MeetingType[];
  /** Adds a meeting type to the end of the list, trimming spaces around its texts. */
  createMeetingType(meetingType: NewMeetingType): MeetingType;
  /** The meeting type with this id, if there is one. */
  getMeetingType(id: string): MeetingType | undefined;
  /** Slots of the meeting type for each day of the booking window, or nothing for an unknown id. */
  listSlots(meetingTypeId: string): SlotDay[] | undefined;
};

// The owner's time rules. They are fixed: no environment variables and no settings in the UI.
/** The owner's time zone, UTC+3 all year round. The container's own time zone is never used. */
const timeZone = 'Europe/Moscow';
/** The booking window: this many calendar days starting tomorrow. */
const windowDays = 14;
/** Working days by `dayOfWeek`: Monday is 1, Sunday is 7. */
const workingDays: readonly number[] = [1, 2, 3, 4, 5];
const workdayStart = Temporal.PlainTime.from('09:00');
/** A meeting ends no later than this. */
const workdayEnd = Temporal.PlainTime.from('18:00');
/** Slots start this often from the start of the working day, whatever the duration. */
const slotStepMinutes = 30;

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
 * meeting types. The time rules ask `now` and nothing else for the current moment.
 */
export function createCalendar({ now }: { now: Clock }): Calendar {
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

  function getMeetingType(id: string) {
    return meetingTypes.find((meetingType) => meetingType.id === id);
  }

  function listSlots(meetingTypeId: string) {
    const meetingType = getMeetingType(meetingTypeId);
    if (!meetingType) return undefined;
    return bookingWindow(now()).map((date) => ({
      date: date.toString(),
      slots: slotsOn(date, meetingType.durationMinutes),
    }));
  }

  starterMeetingTypes.forEach(createMeetingType);

  return {
    listMeetingTypes: () => [...meetingTypes],
    createMeetingType,
    getMeetingType,
    listSlots,
  };
}

/** The days of the booking window in the owner's time zone. */
function bookingWindow(now: Date): Temporal.PlainDate[] {
  const today = Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(timeZone)
    .toPlainDate();
  return Array.from({ length: windowDays }, (_, index) => today.add({ days: index + 1 }));
}

/** Every slot of the day that fits in the working hours, ignoring meetings. */
function slotsOn(date: Temporal.PlainDate, durationMinutes: number): Slot[] {
  if (!workingDays.includes(date.dayOfWeek)) return [];

  const close = date.toZonedDateTime({ timeZone, plainTime: workdayEnd });
  const slots: Slot[] = [];
  let start = date.toZonedDateTime({ timeZone, plainTime: workdayStart });
  let end = start.add({ minutes: durationMinutes });
  while (Temporal.ZonedDateTime.compare(end, close) <= 0) {
    slots.push({ start: offsetDateTime(start), end: offsetDateTime(end) });
    start = start.add({ minutes: slotStepMinutes });
    end = start.add({ minutes: durationMinutes });
  }
  return slots;
}

/** Like `2026-11-10T09:00:00+03:00`: the offset without the zone name. */
function offsetDateTime(time: Temporal.ZonedDateTime) {
  return time.toString({ timeZoneName: 'never' });
}
