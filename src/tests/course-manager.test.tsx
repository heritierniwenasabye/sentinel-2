import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/lib/i18n';
import { AppProvider } from '@/hooks/use-app';
import { ToastProvider } from '@/components/ui/toast';
import { CourseManager } from '@/components/planner/course-manager';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import type { Course, Task } from '@/types';
import { toLocalIso } from '@/lib/date';

const COURSE: Course = {
  id: 'course_writing',
  name: 'College Writing',
  code: 'COMP 120',
  color: 'amber',
  instructor: '',
  semesterStart: '',
  semesterEnd: '',
  archived: false,
  createdAt: toLocalIso(new Date(2025, 4, 1)),
};

const TASK: Task = {
  id: 'task_essay',
  title: 'Argumentative essay',
  course: 'College Writing',
  courseId: 'course_writing',
  description: '',
  deadline: toLocalIso(new Date(2025, 4, 9, 23, 59)),
  estimatedMinutes: 120,
  priority: 'high',
  completed: false,
  createdAt: toLocalIso(new Date(2025, 4, 1)),
};

interface Stored {
  courses: Course[];
  tasks: Task[];
}

function seed(courses: Course[], tasks: Task[] = []) {
  window.localStorage.setItem(
    'sentinel.v2.data',
    JSON.stringify({
      schema: 3,
      savedAt: new Date().toISOString(),
      data: {
        version: 3,
        courses,
        tasks,
        commitments: [],
        usage: [],
        preferences: { ...DEFAULT_PREFERENCES, onboardingCompleted: true },
        demoLoaded: false,
      },
    }),
  );
}

function stored(): Stored {
  const raw = window.localStorage.getItem('sentinel.v2.data');
  const parsed = JSON.parse(raw ?? '{}') as { data?: Stored };
  return { courses: parsed.data?.courses ?? [], tasks: parsed.data?.tasks ?? [] };
}

function renderManager() {
  render(
    <AppProvider>
      <ToastProvider>
        <CourseManager />
      </ToastProvider>
    </AppProvider>,
  );
}

describe('course management', () => {
  it('creates a course through the dialog and persists it', async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getAllByRole('button', { name: 'Add course' })[0]);
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText(/Course name/i), 'Applied Mathematics');
    await user.type(within(dialog).getByLabelText(/Course code/i), 'MATH 117');
    await user.click(within(dialog).getByRole('button', { name: 'Add course' }));

    await waitFor(() => expect(stored().courses).toHaveLength(1));
    expect(stored().courses[0].name).toBe('Applied Mathematics');
    expect(stored().courses[0].code).toBe('MATH 117');
  });

  it('edits and archives an existing course', async () => {
    const user = userEvent.setup();
    seed([COURSE]);
    renderManager();

    await user.click(screen.getByRole('button', { name: 'Edit: College Writing' }));
    const dialog = screen.getByRole('dialog');
    const nameInput = within(dialog).getByLabelText(/Course name/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'College Writing II');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(stored().courses[0].name).toBe('College Writing II'));

    await user.click(screen.getByRole('button', { name: 'Archive: College Writing II' }));
    await waitFor(() => expect(stored().courses[0].archived).toBe(true));
  });

  it('asks before deleting and keeps unlinked assignments when asked', async () => {
    const user = userEvent.setup();
    seed([COURSE], [TASK]);
    renderManager();

    await user.click(screen.getByRole('button', { name: 'Delete: College Writing' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/linked assignments/i)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /Keep assignments/i }));

    await waitFor(() => expect(stored().courses).toHaveLength(0));
    expect(stored().tasks).toHaveLength(1);
    expect(stored().tasks[0].courseId).toBe('');
  });
});
