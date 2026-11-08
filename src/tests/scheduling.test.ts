import { describe, expect, it } from 'vitest';
import type { Commitment, Task, UserPreferences } from '@/types';
import { buildSchedule } from '@/lib/scheduling/engine';
import { toLocalIso } from '@/lib/date';

const weekStart = new Date(2025, 4, 5, 0, 0, 0); // Monday 5 May 2025
const now = new Date(2025, 4, 5, 8, 0, 0); // Monday 08:00

const preferences: UserPreferences = {
  theme: 'light',
  language: 'en',
  displayName: '',
  studyStart: '09:00',
  studyEnd: '17:00',
  maxDailyStudyMinutes: 120,
  minBreakMinutes: 15,
  sleepStart: '23:00',
  sleepEnd: '07:00',
  focusBonusPerDayMinutes: 0,
  onboardingCompleted: true,
};

function task(id: string, deadline: Date, minutes: number, priority: Task['priority'] = 'medium'): Task {
  return {
    id,
    title: `Task ${id}`,
    course: 'Course',
    description: '',
    deadline: toLocalIso(deadline),
    estimatedMinutes: minutes,
    priority,
    completed: false,
    createdAt: toLocalIso(weekStart),
  };
}

function commitment(id: string, start: Date, end: Date): Commitment {
  return {
    id,
    title: `Commitment ${id}`,
    category: 'class',
    start: toLocalIso(start),
    end: toLocalIso(end),
    notes: '',
  };
}

describe('buildSchedule', () => {
  it('orders coursework by deadline before priority', () => {
    const earlierDeadline = task('earlier', new Date(2025, 4, 6, 23, 59), 120, 'low');
    const laterHighPriority = task('later', new Date(2025, 4, 7, 23, 59), 120, 'high');

    const result = buildSchedule({
      tasks: [laterHighPriority, earlierDeadline],
      commitments: [],
      preferences,
      weekStart,
      now,
    });

    const earlierBlocks = result.blocks.filter((block) => block.taskId === 'earlier');
    const laterBlocks = result.blocks.filter((block) => block.taskId === 'later');

    expect(earlierBlocks.length).toBeGreaterThan(0);
    expect(laterBlocks.length).toBeGreaterThan(0);
    expect(new Date(earlierBlocks[0].start).getDate()).toBe(5);
    expect(new Date(laterBlocks[0].start).getDate()).toBe(6);
    expect(result.totals.unscheduledMinutes).toBe(0);
  });

  it('uses priority as a tie-break for identical deadlines', () => {
    const low = task('low', new Date(2025, 4, 5, 23, 59), 90, 'low');
    const high = task('high', new Date(2025, 4, 5, 23, 59), 90, 'high');

    const result = buildSchedule({
      tasks: [low, high],
      commitments: [],
      preferences,
      weekStart,
      now,
    });

    const highBlocks = result.blocks.filter((block) => block.taskId === 'high');
    const lowBlocks = result.blocks.filter((block) => block.taskId === 'low');
    expect(highBlocks.length).toBeGreaterThan(0);
    expect(new Date(highBlocks[0].start).getTime()).toBeLessThan(
      new Date(lowBlocks[0].start).getTime(),
    );
  });

  it('never produces overlapping study blocks', () => {
    const result = buildSchedule({
      tasks: [
        task('a', new Date(2025, 4, 7, 23, 59), 180),
        task('b', new Date(2025, 4, 8, 23, 59), 180),
      ],
      commitments: [],
      preferences,
      weekStart,
      now,
    });

    const sorted = [...result.blocks].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
    for (let index = 1; index < sorted.length; index += 1) {
      expect(new Date(sorted[index].start).getTime()).toBeGreaterThanOrEqual(
        new Date(sorted[index - 1].end).getTime(),
      );
    }
  });

  it('never schedules work after the deadline', () => {
    const deadline = new Date(2025, 4, 5, 12, 0);
    const result = buildSchedule({
      tasks: [task('deadline', deadline, 240)],
      commitments: [],
      preferences,
      weekStart,
      now,
    });

    for (const block of result.blocks) {
      expect(new Date(block.end).getTime()).toBeLessThanOrEqual(deadline.getTime());
    }
    expect(result.totals.unscheduledMinutes).toBeGreaterThan(0);
    expect(result.infeasible).toBe(true);
  });

  it('reports an infeasible workload instead of dropping it', () => {
    const result = buildSchedule({
      tasks: [task('huge', new Date(2025, 4, 6, 23, 59), 600)],
      commitments: [commitment('block', new Date(2025, 4, 5, 9, 0), new Date(2025, 4, 5, 17, 0))],
      preferences: { ...preferences, maxDailyStudyMinutes: 60 },
      weekStart,
      now,
    });

    expect(result.infeasible).toBe(true);
    expect(result.unscheduled).toHaveLength(1);
    expect(result.unscheduled[0]?.reason).toBe('insufficient-time');
    expect(result.totals.unscheduledMinutes).toBe(540);
  });

  it('detects overlapping commitments', () => {
    const result = buildSchedule({
      tasks: [],
      commitments: [
        commitment('one', new Date(2025, 4, 5, 9, 0), new Date(2025, 4, 5, 11, 0)),
        commitment('two', new Date(2025, 4, 5, 10, 30), new Date(2025, 4, 5, 12, 0)),
      ],
      preferences,
      weekStart,
      now,
    });

    const overlaps = result.conflicts.filter((conflict) => conflict.type === 'commitment-overlap');
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]?.minutes).toBe(30);
  });

  it('respects the daily study maximum', () => {
    const result = buildSchedule({
      tasks: [task('a', new Date(2025, 4, 6, 23, 59), 300)],
      commitments: [],
      preferences,
      weekStart,
      now,
    });

    const monday = result.days.find((day) => day.date === '2025-05-05');
    expect(monday).toBeDefined();
    expect(monday?.studyMinutes).toBeLessThanOrEqual(preferences.maxDailyStudyMinutes);
  });

  it('marks overdue work without scheduling it in the past', () => {
    const result = buildSchedule({
      tasks: [task('late', new Date(2025, 4, 4, 23, 59), 60)],
      commitments: [],
      preferences,
      weekStart,
      now,
    });

    expect(result.blocks).toHaveLength(0);
    expect(result.unscheduled[0]?.reason).toBe('overdue');
    expect(result.conflicts.some((conflict) => conflict.type === 'overdue-task')).toBe(true);
  });

  it('gives overlapping weekly occurrences a unique conflict id per day', () => {
    const lecture: Commitment = {
      ...commitment('class', new Date(2025, 4, 5, 9, 0), new Date(2025, 4, 5, 10, 30)),
      title: 'Lecture',
      recurrence: 'weekly',
      weekdays: [1, 3],
      recurrenceUntil: '2025-05-31',
      exceptions: [],
    };
    const lab: Commitment = {
      ...commitment('lab', new Date(2025, 4, 5, 9, 30), new Date(2025, 4, 5, 11, 0)),
      title: 'Lab',
      recurrence: 'weekly',
      weekdays: [1, 3],
      recurrenceUntil: '2025-05-31',
      exceptions: [],
    };

    const result = buildSchedule({
      tasks: [],
      commitments: [lecture, lab],
      preferences,
      weekStart,
      now,
    });

    const overlaps = result.conflicts.filter((conflict) => conflict.type === 'commitment-overlap');
    expect(overlaps.length).toBeGreaterThan(1);
    const ids = overlaps.map((conflict) => conflict.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
