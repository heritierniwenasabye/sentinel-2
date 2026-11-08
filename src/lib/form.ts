import { format, isValid, parseISO } from 'date-fns';
import { toLocalIso } from '@/lib/date';

/** ISO string → value accepted by <input type="datetime-local">. */
export function toInputDateTime(value: string): string {
  const date = parseISO(value);
  if (!isValid(date)) return '';
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Combine a "yyyy-MM-dd" key and an "HH:mm" time into a stored local ISO
 * string. Built from local date parts so the day never shifts in timezones
 * behind or ahead of UTC.
 */
export function fromDateAndTime(dateKey: string, time: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) return null;
  const [hours, minutes] = (time || '23:59').split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    hours,
    minutes,
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : toLocalIso(date);
}

/** <input type="datetime-local"> value → stored local ISO string. */
export function fromInputDateTime(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return toLocalIso(date);
}

export function nowInputDateTime(offsetMinutes = 60): string {
  const date = new Date(Date.now() + offsetMinutes * 60_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function dateOnlyToLocalIso(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return toLocalIso(date);
}
