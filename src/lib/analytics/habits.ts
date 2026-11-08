import { addDays, isSameDay, parseISO } from 'date-fns';
import type { DigitalUsageEntry, UsageCategory } from '@/types';
import { percent } from '@/lib/utils';
import { toDateKey } from '@/lib/date';

export const DISCRETIONARY_CATEGORIES: UsageCategory[] = ['social', 'entertainment', 'other'];

export const USAGE_CATEGORIES: UsageCategory[] = [
  'social',
  'entertainment',
  'education',
  'productivity',
  'other',
];

export interface HabitsSummary {
  totalMinutes: number;
  entryCount: number;
  /** Distinct calendar days that have at least one entry. */
  recordedDays: number;
  dailyAverageMinutes: number;
  /** Rolling seven-day window ending today (oldest first). */
  last7Days: { date: string; minutes: number }[];
  recentMinutes: number;
  /** Social + entertainment + other across all recorded entries. */
  discretionaryMinutes: number;
  /** Social + entertainment + other inside the rolling seven-day window. */
  recentDiscretionaryMinutes: number;
  byApp: { app: string; minutes: number; category: UsageCategory; share: number }[];
  byCategory: { category: UsageCategory; minutes: number; share: number }[];
  topCategory: UsageCategory | null;
}

const EMPTY_SUMMARY: HabitsSummary = {
  totalMinutes: 0,
  entryCount: 0,
  recordedDays: 0,
  dailyAverageMinutes: 0,
  last7Days: [],
  recentMinutes: 0,
  discretionaryMinutes: 0,
  recentDiscretionaryMinutes: 0,
  byApp: [],
  byCategory: [],
  topCategory: null,
};

export function summarizeUsage(entries: DigitalUsageEntry[], now: Date = new Date()): HabitsSummary {
  if (entries.length === 0) {
    return {
      ...EMPTY_SUMMARY,
      last7Days: Array.from({ length: 7 }, (_, index) => ({
        date: toDateKey(addDays(now, index - 6)),
        minutes: 0,
      })),
    };
  }

  const totalMinutes = entries.reduce((total, entry) => total + entry.minutes, 0);
  const days = new Set(entries.map((entry) => entry.date));
  const recordedDays = days.size;

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(now, index - 6);
    const key = toDateKey(day);
    const minutes = entries.reduce((total, entry) => {
      if (entry.date !== key) return total;
      return total + entry.minutes;
    }, 0);
    return { date: key, minutes };
  });

  const recentKeys = new Set(last7Days.map((day) => day.date));
  const recentEntries = entries.filter((entry) => recentKeys.has(entry.date));
  const recentMinutes = recentEntries.reduce((total, entry) => total + entry.minutes, 0);

  const isDiscretionary = (category: UsageCategory) => DISCRETIONARY_CATEGORIES.includes(category);
  const discretionaryMinutes = entries
    .filter((entry) => isDiscretionary(entry.category))
    .reduce((total, entry) => total + entry.minutes, 0);
  const recentDiscretionaryMinutes = recentEntries
    .filter((entry) => isDiscretionary(entry.category))
    .reduce((total, entry) => total + entry.minutes, 0);

  const appTotals = new Map<string, { minutes: number; category: UsageCategory }>();
  for (const entry of entries) {
    const key = entry.app.trim();
    const existing = appTotals.get(key);
    if (existing) {
      existing.minutes += entry.minutes;
    } else {
      appTotals.set(key, { minutes: entry.minutes, category: entry.category });
    }
  }
  const byApp = Array.from(appTotals.entries())
    .map(([app, value]) => ({
      app,
      minutes: value.minutes,
      category: value.category,
      share: percent(value.minutes, totalMinutes),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const categoryTotals = new Map<UsageCategory, number>();
  for (const entry of entries) {
    categoryTotals.set(entry.category, (categoryTotals.get(entry.category) ?? 0) + entry.minutes);
  }
  const byCategory = USAGE_CATEGORIES.map((category) => {
    const minutes = categoryTotals.get(category) ?? 0;
    return { category, minutes, share: percent(minutes, totalMinutes) };
  })
    .filter((row) => row.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return {
    totalMinutes,
    entryCount: entries.length,
    recordedDays,
    dailyAverageMinutes: recordedDays > 0 ? Math.round(totalMinutes / recordedDays) : 0,
    last7Days,
    recentMinutes,
    discretionaryMinutes,
    recentDiscretionaryMinutes,
    byApp,
    byCategory,
    topCategory: byCategory[0]?.category ?? null,
  };
}

/** Minutes recorded on a single calendar day (used by the day filter). */
export function minutesForDay(entries: DigitalUsageEntry[], day: Date): number {
  return entries
    .filter((entry) => isSameDay(parseISO(`${entry.date}T00:00:00`), day))
    .reduce((total, entry) => total + entry.minutes, 0);
}

export interface ReductionSimulation {
  requestedMinutes: number;
  /** Discretionary minutes actually available to reduce inside the recent week. */
  eligibleMinutes: number;
  recoveredMinutes: number;
  /** Whole 30-minute blocks that could be added to each day of a week. */
  dailyRecoveredMinutes: number;
  capped: boolean;
}

/**
 * A screen-time reduction only ever recovers discretionary minutes from the
 * recorded seven-day window. Education and productivity usage is preserved, so
 * the same minute can never be counted twice or claimed as study time silently.
 */
export function simulateReduction(
  summary: HabitsSummary,
  weeklyMinutes: number,
  allocateToSchedule: boolean,
): ReductionSimulation {
  const requestedMinutes = Math.max(0, Math.round(weeklyMinutes));
  const eligibleMinutes = summary.recentDiscretionaryMinutes;
  const recoveredMinutes = Math.min(requestedMinutes, eligibleMinutes);
  const dailyRecoveredMinutes = allocateToSchedule
    ? Math.floor(recoveredMinutes / 7 / 30) * 30
    : 0;
  return {
    requestedMinutes,
    eligibleMinutes,
    recoveredMinutes,
    dailyRecoveredMinutes,
    capped: requestedMinutes > eligibleMinutes,
  };
}
