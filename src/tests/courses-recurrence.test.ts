import { describe, expect, it } from 'vitest';
import { parseISO } from 'date-fns';
import type { Commitment, Task } from '@/types';
import { createEmptyData, mergeAppData, parseAppData } from '@/lib/storage/storage';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { buildSchedule, taskRemainingMinutes } from '@/lib/scheduling/engine';
import { expandCommitments } from '@/lib/recurrence';
import { toDateKey, toLocalIso } from '@/lib/date';

const MONDAY = new Date(2025, 4, 5, 0, 0, 0);
const NOW = new Date(2025, 4, 5, 8, 0, 0);

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_1',
    title: 'Essay',
    course: 'College Writing',
    description: '',
    deadline: toLocalIso(new Date(2025, 4, 9, 23, 59)),
    estimatedMinutes: 120,
    priority: 'medium',
    completed: false,
    createdAt: toLocalIso(NOW),
    ...overrides,
  };
}

function weeklyCommitment(overrides: Partial<Commitment> = {}): Commitment {
  return {
    id: 'series_1',
    title: 'Applied Mathematics — Lecture',
    category: 'class',
    start: toLocalIso(new Date(2025, 4, 5, 9, 0)),
    end: toLocalIso(new Date(2025, 4, 5, 11, 0)),
    notes: '',
    recurrence: 'weekly',
    weekdays: [1],
    recurrenceUntil: '',
    exceptions: [],
    ...overrides,
  };
}

describe('first-run data', () => {
  it('starts with no courses, tasks or demo records', () => {
    const data = createEmptyData();
    expect(data.courses).toEqual([]);
    expect(data.tasks).toEqual([]);
    expect(data.commitments).toEqual([]);
    expect(data.usage).toEqual([]);
    expect(data.demoLoaded).toBe(false);
    expect(data.preferences.onboardingCompleted).toBe(false);
  });

  it('migrates schema-2 course names into linked course records', () => {
    const result = parseAppData({
      data: {
        version: 2,
        tasks: [
          {
            id: 'a',
            title: 'Essay',
            course: 'College Writing',
            deadline: '2025-05-09T23:59:00',
            estimatedMinutes: 90,
            priority: 'high',
            completed: false,
          },
          {
            id: 'b',
            title: 'Revision',
            course: 'College Writing',
            deadline: '2025-05-10T23:59:00',
            estimatedMinutes: 60,
            priority: 'low',
            completed: false,
          },
        ],
        commitments: [],
        usage: [],
        preferences: {},
      },
    });

    expect(result.data?.courses).toHaveLength(1);
    const course = result.data?.courses[0];
    expect(course?.name).toBe('College Writing');
    expect(result.data?.tasks.every((item) => item.courseId === course?.id)).toBe(true);
    // Existing students are not interrupted by first-run setup.
    expect(result.data?.preferences.onboardingCompleted).toBe(true);
  });
});

describe('course relationships', () => {
  it('merges without destroying data and remaps imported course references', () => {
    const current = createEmptyData();
    current.courses = [
      {
        id: 'course_a',
        name: 'College Writing',
        code: 'COMP 120',
        color: 'blue',
        instructor: '',
        semesterStart: '',
        semesterEnd: '',
        archived: false,
        createdAt: toLocalIso(NOW),
      },
    ];
    current.tasks = [task({ id: 'task_a', courseId: 'course_a' })];

    const incoming = createEmptyData();
    incoming.courses = [
      // A duplicate by name but with a different id must not be added twice.
      {
        id: 'course_imported_duplicate',
        name: 'college writing',
        code: '',
        color: 'rose',
        instructor: '',
        semesterStart: '',
        semesterEnd: '',
        archived: false,
        createdAt: toLocalIso(NOW),
      },
      {
        id: 'course_b',
        name: 'Applied Mathematics',
        code: 'MATH 117',
        color: 'green',
        instructor: '',
        semesterStart: '',
        semesterEnd: '',
        archived: false,
        createdAt: toLocalIso(NOW),
      },
    ];
    incoming.tasks = [
      task({
        id: 'task_b',
        courseId: 'course_b',
        course: 'Applied Mathematics',
        deadline: toLocalIso(new Date(2025, 4, 10, 23, 59)),
      }),
    ];

    const { data, summary } = mergeAppData(current, incoming);

    expect(summary.courses).toBe(1);
    expect(summary.tasks).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(data.courses.map((course) => course.name)).toEqual([
      'College Writing',
      'Applied Mathematics',
    ]);
    expect(data.tasks).toHaveLength(2);
    expect(data.tasks.find((item) => item.id === 'task_b')?.courseId).toBe('course_b');
  });
});

describe('weekly recurrence', () => {
  it('expands a series onto each selected weekday inside the window', () => {
    const occurrences = expandCommitments(
      [weeklyCommitment({ weekdays: [1, 3] })],
      MONDAY,
      new Date(2025, 4, 13),
    );

    expect(occurrences.map((item) => item.dateKey)).toEqual([
      '2025-05-05',
      '2025-05-07',
      '2025-05-12',
    ]);
    expect(occurrences[0].occurrenceId).toBe('series_1::2025-05-05');
    expect(occurrences[0].isRecurring).toBe(true);
    // The wall-clock time is preserved on every occurrence.
    expect(parseISO(occurrences[1].start).getHours()).toBe(9);
  });

  it('skips exceptions and stops at the end date', () => {
    const exceptions = expandCommitments(
      [weeklyCommitment({ exceptions: ['2025-05-07'] })],
      MONDAY,
      new Date(2025, 4, 13),
    );
    expect(exceptions.map((item) => item.dateKey)).toEqual(['2025-05-05', '2025-05-12']);

    const bounded = expandCommitments(
      [weeklyCommitment({ recurrenceUntil: '2025-05-06' })],
      MONDAY,
      new Date(2025, 4, 13),
    );
    expect(bounded.map((item) => item.dateKey)).toEqual(['2025-05-05']);
  });

  it('keeps one-off commitments as a single occurrence', () => {
    const occurrences = expandCommitments(
      [weeklyCommitment({ recurrence: 'none', weekdays: [], id: 'one_off' })],
      MONDAY,
      new Date(2025, 4, 12),
    );
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].occurrenceId).toBe('one_off');
    expect(occurrences[0].isRecurring).toBe(false);
  });

  it('blocks study time inside a recurring class in the scheduling engine', () => {
    const schedule = buildSchedule({
      tasks: [task()],
      commitments: [weeklyCommitment()],
      preferences: {
        ...DEFAULT_PREFERENCES,
        studyStart: '09:00',
        studyEnd: '17:00',
        maxDailyStudyMinutes: 120,
      },
      weekStart: MONDAY,
      now: NOW,
    });

    expect(schedule.blocks.length).toBeGreaterThan(0);
    for (const block of schedule.blocks) {
      const day = toDateKey(parseISO(block.start));
      if (day === '2025-05-05') {
        const start = parseISO(block.start).getTime();
        const end = parseISO(block.end).getTime();
        expect(end <= new Date(2025, 4, 5, 9, 0).getTime() || start >= new Date(2025, 4, 5, 11, 0).getTime()).toBe(true);
      }
    }
    const mondayBlocks = schedule.blocks.filter(
      (block) => toDateKey(parseISO(block.start)) === '2025-05-05',
    );
    // Monday remains usable after the class ends at 11:00.
    expect(mondayBlocks.every((block) => parseISO(block.start).getHours() >= 11)).toBe(true);
  });
});

describe('completed study time', () => {
  it('schedules only the remaining minutes and reports the reduced demand', () => {
    const partiallyDone = task({ estimatedMinutes: 180, completedMinutes: 90 });
    expect(taskRemainingMinutes(partiallyDone)).toBe(90);

    const schedule = buildSchedule({
      tasks: [partiallyDone],
      commitments: [],
      preferences: DEFAULT_PREFERENCES,
      weekStart: MONDAY,
      now: NOW,
    });

    expect(schedule.totals.demandMinutes).toBe(90);
    expect(schedule.totals.plannedMinutes).toBe(90);
    expect(schedule.unscheduled).toHaveLength(0);
  });
});
