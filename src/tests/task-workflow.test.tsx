import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/lib/i18n';
import { AppProvider } from '@/hooks/use-app';
import { ToastProvider } from '@/components/ui/toast';
import { TaskDialog } from '@/components/planner/task-dialog';
import { buildSchedule } from '@/lib/scheduling/engine';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { compareScenario } from '@/lib/simulation/engine';
import { toLocalIso } from '@/lib/date';
import type { AppData, Task } from '@/types';

const WEEK_START = new Date(2026, 10, 2);
const NOW = new Date(2026, 10, 7, 8, 0, 0);

function storedTasks(): Task[] {
  const raw = window.localStorage.getItem('sentinel.v2.data');
  const parsed = JSON.parse(raw ?? '{}') as { data?: { tasks?: Task[] }; tasks?: Task[] };
  return parsed.data?.tasks ?? parsed.tasks ?? [];
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-next-week',
    title: 'Business Proposal',
    course: 'College Writing',
    description: '',
    deadline: toLocalIso(new Date(2026, 10, 9, 23, 59)),
    estimatedMinutes: 90,
    priority: 'high',
    completed: false,
    createdAt: toLocalIso(NOW),
    ...overrides,
  };
}

function seedCourse() {
  window.localStorage.setItem(
    'sentinel.v2.data',
    JSON.stringify({
      schema: 3,
      savedAt: new Date().toISOString(),
      data: {
        version: 3,
        courses: [
          {
            id: 'course_cw',
            name: 'College Writing',
            code: 'COMP 120',
            color: 'blue',
            instructor: '',
            semesterStart: '',
            semesterEnd: '',
            archived: false,
            createdAt: toLocalIso(NOW),
          },
        ],
        tasks: [],
        commitments: [],
        usage: [],
        preferences: { ...DEFAULT_PREFERENCES, onboardingCompleted: true },
        demoLoaded: false,
      },
    }),
  );
}

function renderDialog() {
  render(
    <AppProvider>
      <ToastProvider>
        <TaskDialog open onOpenChange={() => undefined} defaultDate="2026-11-08" />
      </ToastProvider>
    </AppProvider>,
  );
}

describe('assignment to schedule workflow', () => {
  it('creates a High-priority task for 9 Nov, persists it, and schedules real study blocks', async () => {
    const user = userEvent.setup();
    seedCourse();
    renderDialog();

    await user.type(
      document.getElementById('task-title') as HTMLInputElement,
      'Business Proposal',
    );

    // Course: linked by id through the listbox, not by typed text.
    await user.click(document.getElementById('task-course') as HTMLElement);
    await user.click(
      within(screen.getByRole('listbox')).getByRole('option', {
        name: 'COMP 120 · College Writing',
      }),
    );

    // Priority: Medium → High.
    const priority = document.getElementById('task-priority') as HTMLElement;
    expect(priority).toHaveTextContent('Medium');
    await user.click(priority);
    await user.click(within(screen.getByRole('listbox')).getAllByRole('option')[2]);
    expect(priority).toHaveTextContent('High');

    // Deadline: 9 November 2026 through the calendar.
    const deadlineTrigger = document.getElementById('task-deadline') as HTMLElement;
    await user.click(deadlineTrigger);
    const panel = screen.getByTestId('calendar-panel');
    await user.click(panel.querySelector('[data-day="2026-11-09"]') as HTMLElement);
    expect(deadlineTrigger).toHaveTextContent('9 Nov 2026');

    // Estimated study duration.
    fireEvent.change(document.getElementById('task-duration') as HTMLInputElement, {
      target: { value: '90' },
    });

    fireEvent.submit(document.querySelector('form') as HTMLFormElement);

    await waitFor(() => expect(storedTasks()).toHaveLength(1));
    const [task] = storedTasks();
    expect(task.title).toBe('Business Proposal');
    expect(task.course).toBe('College Writing');
    expect(task.courseId).toBe('course_cw');
    expect(task.priority).toBe('high');
    expect(task.estimatedMinutes).toBe(90);
    expect(task.deadline.startsWith('2026-11-09T')).toBe(true);

    const schedule = buildSchedule({
      tasks: storedTasks(),
      commitments: [],
      preferences: DEFAULT_PREFERENCES,
      weekStart: WEEK_START,
      now: NOW,
    });

    const blocks = schedule.blocks.filter((block) => block.taskId === task.id);
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.reduce((total, block) => total + block.minutes, 0)).toBe(90);
    for (const block of blocks) {
      const start = new Date(block.start).getTime();
      const end = new Date(block.end).getTime();
      expect(end).toBeGreaterThan(start);
      expect(end).toBeLessThanOrEqual(new Date(task.deadline).getTime());
    }
  });

  it('plans work that falls at the start of the following week', () => {
    const schedule = buildSchedule({
      tasks: [makeTask()],
      commitments: [],
      preferences: DEFAULT_PREFERENCES,
      weekStart: WEEK_START,
      now: NOW,
    });

    expect(schedule.blocks.length).toBeGreaterThan(0);
    expect(schedule.totals.demandMinutes).toBe(90);
    expect(schedule.unscheduled).toHaveLength(0);
  });

  it('leaves work beyond the look-ahead window for a later week', () => {
    const schedule = buildSchedule({
      tasks: [makeTask({ deadline: toLocalIso(new Date(2026, 11, 1, 23, 59)) })],
      commitments: [],
      preferences: DEFAULT_PREFERENCES,
      weekStart: WEEK_START,
      now: NOW,
    });

    expect(schedule.blocks).toHaveLength(0);
    expect(schedule.totals.demandMinutes).toBe(0);
  });

  it('reports the unscheduled remainder when capacity runs out', () => {
    const schedule = buildSchedule({
      tasks: [makeTask({ estimatedMinutes: 2400 })],
      commitments: [],
      preferences: { ...DEFAULT_PREFERENCES, maxDailyStudyMinutes: 60 },
      weekStart: WEEK_START,
      now: NOW,
    });

    expect(schedule.blocks.length).toBeGreaterThan(0);
    expect(schedule.unscheduled).toHaveLength(1);
    expect(schedule.unscheduled[0].reason).toBe('insufficient-time');
    expect(schedule.unscheduled[0].minutesRemaining).toBeGreaterThan(0);
    expect(schedule.totals.plannedMinutes + schedule.totals.unscheduledMinutes).toBe(2400);
  });

  it('keeps the simulation lab in sync with the saved task', () => {
    const task = makeTask();
    const data: AppData = {
      version: 3,
      courses: [],
      tasks: [task],
      commitments: [],
      usage: [],
      preferences: DEFAULT_PREFERENCES,
      demoLoaded: false,
    };

    const comparison = compareScenario(data, {
      weekStart: WEEK_START,
      now: NOW,
      ops: [{ type: 'update-task', taskId: task.id, patch: { estimatedMinutes: 180 } }],
    });

    expect(comparison.baseline.totals.demandMinutes).toBe(90);
    expect(comparison.simulated.totals.demandMinutes).toBe(180);
    expect(comparison.simulated.totals.plannedMinutes).toBeGreaterThan(
      comparison.baseline.totals.plannedMinutes,
    );
  });
});
