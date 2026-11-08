import { addDays, isValid, parseISO, startOfDay } from 'date-fns';
import type { Commitment, CommitmentOccurrence } from '@/types';
import { combineDayAndTime, minutesToTime, toDateKey, toLocalIso } from '@/lib/date';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY.test(value);
}

/** Keeps only whole weekday numbers 0–6, de-duplicated and sorted. */
export function normalizeWeekdays(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const days = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6);
  return Array.from(new Set(days)).sort((a, b) => a - b);
}

export function isRecurring(commitment: Commitment): boolean {
  return commitment.recurrence === 'weekly' && (commitment.weekdays?.length ?? 0) > 0;
}

/**
 * Expands weekly series into concrete occurrences that overlap the given window.
 *
 * A weekly series is defined by its first occurrence (`start`/`end`), the set of
 * weekdays it repeats on, an optional inclusive `recurrenceUntil` date and
 * `exceptions` (dates removed from the series, e.g. a cancelled class).
 * One-time commitments pass through unchanged.
 */
export function expandCommitments(
  commitments: Commitment[],
  rangeStart: Date,
  rangeEnd: Date,
): CommitmentOccurrence[] {
  const windowStart = startOfDay(rangeStart);
  const windowEnd = startOfDay(rangeEnd);
  const occurrences: CommitmentOccurrence[] = [];

  for (const commitment of commitments) {
    const start = parseISO(commitment.start);
    const end = parseISO(commitment.end);
    if (!isValid(start) || !isValid(end) || end <= start) continue;

    if (!isRecurring(commitment)) {
      if (end > windowStart && start < rangeEnd) {
        occurrences.push({
          ...commitment,
          occurrenceId: commitment.id,
          dateKey: toDateKey(start),
          isRecurring: false,
        });
      }
      continue;
    }

    const weekdays = new Set(normalizeWeekdays(commitment.weekdays));
    const exceptions = new Set(commitment.exceptions ?? []);
    const seriesStart = startOfDay(start);
    const until = isDateKey(commitment.recurrenceUntil)
      ? startOfDay(parseISO(`${commitment.recurrenceUntil}T00:00:00`))
      : null;
    const timeOfDay = minutesToTime(start.getHours() * 60 + start.getMinutes());
    const durationMs = end.getTime() - start.getTime();

    // Never generate an occurrence before the series started or after it ends.
    let cursor = windowStart > seriesStart ? windowStart : seriesStart;
    const lastDay = until && until < windowEnd ? until : windowEnd;
    let guard = 0;

    while (cursor < windowEnd && cursor <= lastDay && guard < 800) {
      guard += 1;
      const key = toDateKey(cursor);
      if (weekdays.has(cursor.getDay()) && !exceptions.has(key)) {
        const occurrenceStart = combineDayAndTime(cursor, timeOfDay);
        const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
        if (occurrenceStart >= seriesStart && occurrenceEnd > rangeStart && occurrenceStart < rangeEnd) {
          occurrences.push({
            ...commitment,
            occurrenceId: `${commitment.id}::${key}`,
            dateKey: key,
            start: toLocalIso(occurrenceStart),
            end: toLocalIso(occurrenceEnd),
            isRecurring: true,
          });
        }
      }
      cursor = addDays(cursor, 1);
    }
  }

  return occurrences.sort(
    (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime(),
  );
}

/** Weekday of the first occurrence, used as the default series rule. */
export function weekdayOf(iso: string): number {
  const date = parseISO(iso);
  return isValid(date) ? date.getDay() : 1;
}

/** Human-readable weekday labels come from the formatter layer; this is the data default. */
export function defaultWeekdays(iso: string): number[] {
  return [weekdayOf(iso)];
}
