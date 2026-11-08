import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/lib/i18n';
import { AppProvider, useApp } from '@/hooks/use-app';
import { ToastProvider } from '@/components/ui/toast';
import { TaskList } from '@/components/planner/task-list';
import { useWeekSchedule } from '@/hooks/use-schedule';
import { buildSchedule } from '@/lib/scheduling/engine';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { startOfWeekMonday, toLocalIso } from '@/lib/date';
import type { Task } from '@/types';

const now = new Date();
const deadline = new Date(now.getTime() + 2 * 86400000);
deadline.setHours(23, 59, 0, 0);

function seed(tasks: Task[]) {
  window.localStorage.setItem(
    'sentinel.v2.data',
    JSON.stringify({
      schema: 3,
      savedAt: now.toISOString(),
      data: {
        version: 3,
        courses: [],
        tasks,
        commitments: [],
        usage: [],
        preferences: { ...DEFAULT_PREFERENCES, onboardingCompleted: true },
        demoLoaded: false,
      },
    }),
  );
}

function storedTasks(): Task[] {
  const raw = window.localStorage.getItem('sentinel.v2.data');
  const parsed = JSON.parse(raw ?? '{}') as { data?: { tasks?: Task[] } };
  return parsed.data?.tasks ?? [];
}

function Harness() {
  const { tasks, toggleTask } = useApp();
  const schedule = useWeekSchedule(startOfWeekMonday(new Date()));
  return (
    <TaskList
      tasks={tasks}
      schedule={schedule}
      onToggle={toggleTask}
      onEdit={() => undefined}
      onDelete={() => undefined}
    />
  );
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_lifecycle',
    title: 'Security Case Study',
    course: '',
    courseId: '',
    description: '',
    deadline: toLocalIso(deadline),
    estimatedMinutes: 180,
    completedMinutes: 0,
    priority: 'high',
    completed: false,
    createdAt: toLocalIso(now),
    ...overrides,
  };
}

function scheduleFor(tasks: Task[]) {
  return buildSchedule({
    tasks,
    commitments: [],
    preferences: DEFAULT_PREFERENCES,
    weekStart: startOfWeekMonday(new Date()),
    now: new Date(),
  });
}

describe('assignment lifecycle', () => {
  it('removes future study blocks when completed and restores them when reopened', async () => {
    const user = userEvent.setup();
    seed([makeTask()]);
    expect(scheduleFor(storedTasks()).blocks.length).toBeGreaterThan(0);

    render(
      <AppProvider>
        <ToastProvider>
          <Harness />
        </ToastProvider>
      </AppProvider>,
    );

    await user.click(screen.getByRole('checkbox', { name: /mark as complete/i }));

    await waitFor(() => expect(storedTasks()[0].completed).toBe(true));
    expect(scheduleFor(storedTasks()).blocks).toHaveLength(0);
    expect(scheduleFor(storedTasks()).totals.demandMinutes).toBe(0);

    await user.click(screen.getByRole('checkbox', { name: /mark as not complete/i }));
    await waitFor(() => expect(storedTasks()[0].completed).toBe(false));
    expect(scheduleFor(storedTasks()).blocks.length).toBeGreaterThan(0);
  });

  it('schedules only the remaining time after partial progress', () => {
    seed([makeTask({ completedMinutes: 120 })]);
    const schedule = scheduleFor(storedTasks());

    expect(schedule.totals.demandMinutes).toBe(60);
    expect(schedule.blocks.reduce((total, block) => total + block.minutes, 0)).toBe(60);
    expect(schedule.unscheduled).toHaveLength(0);
  });
});
