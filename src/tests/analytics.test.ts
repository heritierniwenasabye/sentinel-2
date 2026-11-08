import { describe, expect, it } from 'vitest';
import { addDays } from 'date-fns';
import type { DigitalUsageEntry, ScheduleResult, UserPreferences } from '@/types';
import { summarizeUsage, simulateReduction, DISCRETIONARY_CATEGORIES } from '@/lib/analytics/habits';
import { analyzeWorkload, pressureBand, PRESSURE_WEIGHTS } from '@/lib/analytics/workload';
import { buildSchedule } from '@/lib/scheduling/engine';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { toDateKey, toLocalIso } from '@/lib/date';
import { buildWorkloadInsights } from '@/lib/analytics/insights';

const now = new Date(2025, 4, 7, 12, 0, 0);

function entry(id: string, daysAgo: number, app: string, minutes: number, category: DigitalUsageEntry['category']): DigitalUsageEntry {
  return {
    id,
    app,
    date: toDateKey(addDays(now, -daysAgo)),
    minutes,
    category,
    createdAt: toLocalIso(now),
  };
}

const entries: DigitalUsageEntry[] = [
  entry('1', 0, 'Instagram', 60, 'social'),
  entry('2', 0, 'YouTube', 90, 'entertainment'),
  entry('3', 1, 'Instagram', 30, 'social'),
  entry('4', 1, 'Coursera', 45, 'education'),
  entry('5', 9, 'TikTok', 40, 'social'),
];

const preferences: UserPreferences = { ...DEFAULT_PREFERENCES };

function emptySchedule(overrides: Partial<ScheduleResult['totals']> = {}): ScheduleResult {
  const weekStart = new Date(2025, 4, 5);
  return {
    weekStart: weekStart.toISOString(),
    weekEnd: new Date(weekStart.getTime() + 7 * 86400000).toISOString(),
    blocks: [],
    days: Array.from({ length: 7 }, (_, index) => ({
      date: toDateKey(addDays(weekStart, index)),
      fixedMinutes: 0,
      studyMinutes: 0,
      freeMinutes: 0,
      capacityMinutes: 0,
    })),
    unscheduled: [],
    conflicts: [],
    totals: {
      plannedMinutes: 0,
      fixedMinutes: 0,
      freeMinutes: 0,
      capacityMinutes: 0,
      remainingCapacityMinutes: 0,
      demandMinutes: 0,
      unscheduledMinutes: 0,
      scheduledTaskCount: 0,
      ...overrides,
    },
    infeasible: false,
    generatedAt: now.toISOString(),
  };
}

describe('habits analytics', () => {
  it('aggregates totals, days and averages', () => {
    const summary = summarizeUsage(entries, now);
    expect(summary.totalMinutes).toBe(265);
    expect(summary.recordedDays).toBe(3);
    expect(summary.dailyAverageMinutes).toBe(88);
    expect(summary.entryCount).toBe(5);
    expect(summary.recentMinutes).toBe(225);
  });

  it('breaks usage down by app and category', () => {
    const summary = summarizeUsage(entries, now);
    expect(summary.byApp[0]?.app).toBe('Instagram');
    expect(summary.byApp[0]?.minutes).toBe(90);
    expect(summary.byCategory[0]?.category).toBe('social');
    expect(summary.byCategory[0]?.minutes).toBe(130);
    expect(summary.topCategory).toBe('social');
  });

  it('counts only discretionary categories as eligible', () => {
    const summary = summarizeUsage(entries, now);
    const discretionary = entries
      .filter((item) => DISCRETIONARY_CATEGORIES.includes(item.category))
      .reduce((total, item) => total + item.minutes, 0);
    expect(summary.discretionaryMinutes).toBe(discretionary);
    expect(summary.recentDiscretionaryMinutes).toBe(180);
  });

  it('caps reductions and only allocates whole 30-minute blocks', () => {
    const summary = summarizeUsage(entries, now);
    const capped = simulateReduction(summary, 600, true);
    expect(capped.recoveredMinutes).toBe(180);
    expect(capped.capped).toBe(true);
    // 180 minutes spread over seven days is below one 30-minute block per day.
    expect(capped.dailyRecoveredMinutes).toBe(0);
    const weekly = simulateReduction(summarizeUsage(entries, now), 900, true);
    expect(weekly.recoveredMinutes).toBe(180);

    const noAllocation = simulateReduction(summary, 120, false);
    expect(noAllocation.recoveredMinutes).toBe(120);
    expect(noAllocation.dailyRecoveredMinutes).toBe(0);
  });
});

describe('workload pressure', () => {
  it('stays within bounds and uses weights totalling 100', () => {
    expect(Object.values(PRESSURE_WEIGHTS).reduce((total, weight) => total + weight, 0)).toBe(100);

    const empty = analyzeWorkload(emptySchedule(), 15);
    expect(empty.score).toBe(0);
    expect(empty.band).toBe('balanced');

    const busy = analyzeWorkload(
      emptySchedule({
        plannedMinutes: 900,
        capacityMinutes: 600,
        demandMinutes: 1200,
        unscheduledMinutes: 300,
        remainingCapacityMinutes: 0,
      }),
      15,
    );
    expect(busy.score).toBeGreaterThanOrEqual(0);
    expect(busy.score).toBeLessThanOrEqual(100);
    expect(busy.band).toBe(pressureBand(busy.score));
    expect(busy.unscheduledCount).toBe(0);
  });

  it('increases when coursework cannot be scheduled', () => {
    const weekStart = new Date(2025, 4, 5);
    const schedule = buildSchedule({
      tasks: [
        {
          id: 'big',
          title: 'Huge essay',
          course: 'Writing',
          description: '',
          deadline: toLocalIso(new Date(2025, 4, 6, 23, 59)),
          estimatedMinutes: 600,
          priority: 'high',
          completed: false,
          createdAt: toLocalIso(weekStart),
        },
      ],
      commitments: [],
      preferences: { ...preferences, maxDailyStudyMinutes: 60 },
      weekStart,
      now: new Date(2025, 4, 5, 8, 0),
    });
    const analysis = analyzeWorkload(schedule, preferences.minBreakMinutes);
    expect(analysis.score).toBeGreaterThan(40);
    expect(analysis.unscheduledCount).toBe(1);
    expect(analysis.unscheduledMinutes).toBeGreaterThan(0);
  });

  it('generates insights with translatable keys', () => {
    const weekStart = new Date(2025, 4, 5);
    const schedule = buildSchedule({
      tasks: [],
      commitments: [],
      preferences,
      weekStart,
      now: new Date(2025, 4, 5, 8, 0),
    });
    const analysis = analyzeWorkload(schedule, preferences.minBreakMinutes);
    const insights = buildWorkloadInsights(schedule, analysis, summarizeUsage(entries, now), preferences, (key) => key);
    expect(insights.length).toBeGreaterThan(0);
    for (const insight of insights) {
      expect(insight.key.startsWith('insights.generated.')).toBe(true);
    }
  });
});
