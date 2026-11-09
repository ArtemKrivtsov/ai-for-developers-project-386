import { randomUUID } from 'node:crypto';

import type {
  Meeting,
  MeetingType,
  NewMeeting,
  NewMeetingType,
  Slot,
  SlotDay,
} from './generated/types.gen.ts';

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
  /**
   * Creates a meeting of the meeting type for the guest. The start must be one of the slots
   * `listSlots` would give right now: first it is looked up among the slots ignoring meetings,
   * then checked against the meetings of every meeting type.
   */
  createMeeting(meetingTypeId: string, meeting: NewMeeting): CreateMeetingResult;
  /** Meetings of every meeting type that end after `now`, nearest first. */
  listUpcomingMeetings(): Meeting[];
};

export type CreateMeetingResult =
  | { status: 'created'; meeting: Meeting }
  | { status: 'meetingTypeNotFound' }
  /** No slot of the booking window starts then, even before meetings take any. */
  | { status: 'outsideSlots' }
  /** The slot overlaps a meeting of some meeting type. */
  | { status: 'conflict' };

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
  /** Meetings of every meeting type in the order they were created. */
  const meetings: Meeting[] = [];

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
      slots: slotsOn(date, meetingType.durationMinutes).filter(isFree),
    }));
  }

  /** Whether the slot overlaps no meeting of any meeting type. */
  function isFree(slot: Slot) {
    return !meetings.some((meeting) => overlaps(slot, meeting));
  }

  // Synchronous on purpose (ADR 0003): with no `await` between checking the slot and saving
  // the meeting, a concurrent request cannot take the time in between and sees this meeting.
  function createMeeting(
    meetingTypeId: string,
    { start, guestName, guestEmail }: NewMeeting,
  ): CreateMeetingResult {
    const meetingType = getMeetingType(meetingTypeId);
    if (!meetingType) return { status: 'meetingTypeNotFound' };
    const moment = momentOf(start);
    const slot = bookingWindow(now())
      .flatMap((date) => slotsOn(date, meetingType.durationMinutes))
      .find((candidate) => moment?.equals(Temporal.Instant.from(candidate.start)));
    if (!slot) return { status: 'outsideSlots' };
    if (!isFree(slot)) return { status: 'conflict' };

    const meeting: Meeting = {
      id: randomUUID(),
      meetingType,
      start: slot.start,
      end: slot.end,
      guestName: guestName.trim(),
      guestEmail,
    };
    meetings.push(meeting);
    return { status: 'created', meeting };
  }

  /** A meeting is upcoming until it ends, so the one going on now is in the list. */
  function listUpcomingMeetings() {
    const current = now().toISOString();
    return meetings
      .filter((meeting) => isEarlier(current, meeting.end))
      .sort((a, b) => compareMoments(a.start, b.start));
  }

  starterMeetingTypes.forEach(createMeetingType);

  return {
    listMeetingTypes: () => [...meetingTypes],
    createMeetingType,
    getMeetingType,
    listSlots,
    createMeeting,
    listUpcomingMeetings,
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

/**
 * Whether two times share any moment. They are half-open, `[start, end)`, so a meeting may start
 * exactly when another one ends.
 */
function overlaps(a: Slot, b: Slot) {
  return isEarlier(a.start, b.end) && isEarlier(b.start, a.end);
}

/**
 * The moment of a date-time from a request. The contract's `date-time` format admits a few
 * strings Temporal cannot read, such as fractions finer than nanoseconds: they name no moment.
 */
function momentOf(dateTime: string): Temporal.Instant | undefined {
  try {
    return Temporal.Instant.from(dateTime);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

/** Whether one offset date-time is earlier than another as a moment, whatever their offsets. */
function isEarlier(a: string, b: string) {
  return compareMoments(a, b) < 0;
}

/** Compares two offset date-times as moments, whatever their offsets. */
function compareMoments(a: string, b: string) {
  return Temporal.Instant.compare(Temporal.Instant.from(a), Temporal.Instant.from(b));
}

/** Like `2026-11-10T09:00:00+03:00`: the offset without the zone name. */
function offsetDateTime(time: Temporal.ZonedDateTime) {
  return time.toString({ timeZoneName: 'never' });
}
