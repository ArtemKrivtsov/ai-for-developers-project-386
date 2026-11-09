import type { Slot } from './generated/index.ts';

/** Formats a duration like «30 мин», «1 ч» or «1 ч 30 мин». */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

/** The caption next to times on the pages. */
export const moscowTimeNote = 'время московское (UTC+3)';

// Times are Moscow time in any browser: the formats fix the time zone and never use the browser's.
const moscowTime = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const moscowDay = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

// A plain date such as `2026-11-10` names a day of the owner's calendar. `new Date` reads it
// as midnight UTC, and formatting in UTC gives back the same day.
const longDate = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const shortDate = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
});

/** Formats a slot in Moscow time like «09:00–09:30». */
export function formatSlot({ start, end }: Slot): string {
  return `${moscowTime.format(new Date(start))}–${moscowTime.format(new Date(end))}`;
}

/** Formats the day and time of a meeting in Moscow time like «вторник, 10 ноября, 09:00–09:30». */
export function formatMeetingTime({ start, end }: Slot): string {
  return `${moscowDay.format(new Date(start))}, ${formatSlot({ start, end })}`;
}

/** Formats a plain date like «вторник, 10 ноября». */
export function formatDay(date: string): string {
  return longDate.format(new Date(date));
}

/** Formats the dates of the booking window like «10 нояб. – 23 нояб.». */
export function formatWindow(first: string, last: string): string {
  return `${shortDate.format(new Date(first))} – ${shortDate.format(new Date(last))}`;
}

/** The day of the month of a plain date: «10» for `2026-11-10`. */
export function formatDayOfMonth(date: string): string {
  return String(new Date(date).getUTCDate());
}

/** The column of a plain date in a week from Monday: 0 for Monday, 6 for Sunday. */
export function weekdayColumn(date: string): number {
  return (new Date(date).getUTCDay() + 6) % 7;
}
