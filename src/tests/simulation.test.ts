import { describe, expect, it } from 'vitest';
import type { AppData, Commitment, DigitalUsageEntry, ScenarioOp, Task } from '@/types';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { compareScenario } from '@/lib/simulation/engine';
import { applyScenario, commitScenario } from '@/lib/simulation/scenario';
import { toLocalIso, toDateKey } from '@/lib/date';
import { summarizeUsage, simulateReduction } from '@/lib/analytics/habits';
import { addDays } from 'date-fns';

const weekStart = new Date(2025, 4, 5, 0, 0, 0);
const now = new Date(2025, 4, 5, 8, 0, 0);

function makeTask(id: string, minutes: number, deadline: Date): Task {
  return {
    id,
    title: `Task ${id}`,
    course: 'Course',
    description: '',
    deadline: toLocalIso(deadline),
    estimatedMinutes: minutes,
    priority: 'high',
    completed: false,
    createdAt: toLocalIso(weekStart),
  };
}

function makeUsage(id: string, daysAgo: number, minutes: number, category: DigitalUsageEntry['category']): DigitalUsageEntry {
  return {
    id,
    app: 'Instagram',
    date: toDateKey(addDays(now, -daysAgo)),
    minutes,
    category,
    createdAt: toLocalIso(now),
  };
}

function makeData(overrides: Partial<AppData> = {}): AppData {
  return {
    version: 3,
    courses: [],
    tasks: [makeTask('a', 240, new Date(2025, 4, 6, 23, 59)), makeTask('b', 180, new Date(2025, 4, 7, 23, 59))],
    commitments: [],
    usage: [makeUsage('u1', 1, 300, 'social'), makeUsage('u2', 2, 120, 'education')],
    preferences: {
      ...DEFAULT_PREFERENCES,
      studyStart: '09:00',
      studyEnd: '17:00',
      maxDailyStudyMinutes: 120,
      minBreakMinutes: 15,
    },
    demoLoaded: false,
    ...overrides,
  };
}

describe('simulation', () => {
  it('never mutates the source data', () => {
    const data = makeData();
    const snapshot = JSON.stringify(data);
    const shift: ScenarioOp = {
      type: 'add-commitment',
      commitment: {
        id: 'shift',
        title: 'Extra shift',
        category: 'work',
        start: toLocalIso(new Date(2025, 4, 5, 13, 0)),
        end: toLocalIso(new Date(2025, 4, 5, 17, 0)),
        notes: '',
      },
    };

    const comparison = compareScenario(data, { weekStart, now, ops: [shift] });
    applyScenario(data, [shift], weekStart);

    expect(JSON.stringify(data)).toBe(snapshot);
    expect(comparison.simulated.totals.plannedMinutes).toBeLessThanOrEqual(
      comparison.baseline.totals.plannedMinutes,
    );
    expect(comparison.explanations.length).toBeGreaterThan(0);
  });

  it('removing a commitment increases available capacity', () => {
    const blocker: Commitment = {
      id: 'class',
      title: 'Long class',
      category: 'class',
      start: toLocalIso(new Date(2025, 4, 5, 9, 0)),
      end: toLocalIso(new Date(2025, 4, 5, 17, 0)),
      notes: '',
    };
    const data = makeData({ commitments: [blocker] });

    const comparison = compareScenario(data, {
      weekStart,
      now,
      ops: [{ type: 'remove-commitment', commitmentId: 'class' }],
    });

    expect(comparison.simulated.totals.capacityMinutes).toBeGreaterThan(
      comparison.baseline.totals.capacityMinutes,
    );
  });

  it('caps a screen-time reduction at recorded discretionary minutes', () => {
    const summary = summarizeUsage(makeData().usage, now);
    expect(summary.recentDiscretionaryMinutes).toBe(300);

    const result = simulateReduction(summary, 900, true);
    expect(result.recoveredMinutes).toBe(300);
    expect(result.capped).toBe(true);
    expect(result.dailyRecoveredMinutes).toBe(30);

    const comparison = compareScenario(makeData(), {
      weekStart,
      now,
      ops: [{ type: 'screen-time', weeklyReductionMinutes: 900, allocateToSchedule: true }],
    });
    expect(comparison.simulated.totals.capacityMinutes).toBeGreaterThan(
      comparison.baseline.totals.capacityMinutes,
    );
  });

  it('commits an applied scenario into new data', () => {
    const data = makeData();
    const next = commitScenario(
      data,
      [
        {
          type: 'update-task',
          taskId: 'a',
          patch: { estimatedMinutes: 60 },
        },
      ],
      weekStart,
    );

    expect(next.tasks.find((task) => task.id === 'a')?.estimatedMinutes).toBe(60);
    expect(data.tasks.find((task) => task.id === 'a')?.estimatedMinutes).toBe(240);
    expect(next).not.toBe(data);
  });
});
