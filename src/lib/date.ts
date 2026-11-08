import { addDays, differenceInMinutes, isValid, parseISO, startOfDay, startOfWeek } from 'date-fns';

/** Scheduling granularity — every generated block is a multiple of this. */
export const SLOT_MINUTES = 30;

/** Longest continuous study block before a break is required. */
export const MAX_BLOCK_MINUTES = 90;

export const MINUTES_PER_DAY = 24 * 60;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && TIME_PATTERN.test(value);
}

/** "09:30" → 570 */
export function parseTimeToMinutes(value: string): number {
  if (!isValidTime(value)) return 0;
  const [hours, minutes] = value.split(':');
  return Number(hours) * 60 + Number(minutes);
}

/** 570 → "09:30" */
export function minutesToTime(totalMinutes: number): string {
  const wrapped = ((Math.round(totalMinutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours = Math.floor(wrapped / 60);
  const minutes = wrapped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Combine a calendar day with an "HH:mm" time. */
export function combineDayAndTime(day: Date, time: string): Date {
  const start = startOfDay(day);
  const minutes = parseTimeToMinutes(time);
  start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return start;
}

export function startOfWeekMonday(date: Date): Date {
  return startOfDay(startOfWeek(date, { weekStartsOn: 1 }));
}

export function weekStartFor(date: Date): Date {
  return startOfWeekMonday(date);
}

/** Round a datetime up to the next scheduling boundary. */
export function ceilToSlot(date: Date): Date {
  const step = SLOT_MINUTES * 60_000;
  // Align to the student's wall clock, not UTC's half-hour boundaries.
  // Adding elapsed milliseconds also preserves the selected occurrence of a
  // repeated DST hour instead of reconstructing an ambiguous local datetime.
  const remainder = (date.getMinutes() % SLOT_MINUTES) * 60_000 +
    date.getSeconds() * 1000 + date.getMilliseconds();
  return new Date(date.getTime() + (remainder === 0 ? 0 : step - remainder));
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Local-time ISO string without a Z suffix, so the wall clock survives a reload. */
export function toLocalIso(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 19);
}

export function parseLocal(value: string): Date | null {
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
}

export function parseLocalOr(value: string, fallback: Date): Date {
  return parseLocal(value) ?? fallback;
}

export function durationMinutes(start: string | Date, end: string | Date): number {
  const a = typeof start === 'string' ? parseISO(start) : start;
  const b = typeof end === 'string' ? parseISO(end) : end;
  if (!isValid(a) || !isValid(b)) return 0;
  return Math.max(0, differenceInMinutes(b, a));
}

export function durationParts(minutes: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.round(minutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

/** Add days while keeping the same local wall-clock time. */
export function addLocalDays(date: Date, days: number): Date {
  return addDays(date, days);
}

/** Clamp minutes to a day key list helper used by scheduling. */
export function rangeDays(start: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}
