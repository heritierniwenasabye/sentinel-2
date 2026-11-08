import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays } from 'date-fns';
import type { Priority, Task } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Label, FieldError } from '@/components/ui/label';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { createId } from '@/lib/utils';
import { fromDateAndTime, toInputDateTime } from '@/lib/form';
import { toDateKey, toLocalIso } from '@/lib/date';
import { courseLabel, matchCourseByName } from '@/lib/courses';

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  /** yyyy-MM-dd default for a new task — the planner passes the displayed week. */
  defaultDate?: string;
}

interface FormState {
  title: string;
  courseId: string;
  deadlineDate: string;
  deadlineTime: string;
  duration: string;
  completed: string;
  priority: Priority;
  description: string;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'common.priorityLow',
  medium: 'common.priorityMedium',
  high: 'common.priorityHigh',
};

function initialState(task?: Task | null, defaultDate?: string): FormState {
  if (task) {
    const [date, time] = toInputDateTime(task.deadline).split('T');
    return {
      title: task.title,
      courseId: task.courseId ?? '',
      deadlineDate: date || toDateKey(new Date()),
      deadlineTime: time || '23:59',
      duration: String(task.estimatedMinutes),
      completed: String(task.completedMinutes ?? 0),
      priority: task.priority,
      description: task.description,
    };
  }
  return {
    title: '',
    courseId: '',
    deadlineDate: defaultDate || toDateKey(addDays(new Date(), 2)),
    deadlineTime: '23:59',
    duration: '90',
    completed: '0',
    priority: 'medium',
    description: '',
  };
}

export function TaskDialog({ open, onOpenChange, task, defaultDate }: TaskDialogProps) {
  const { t } = useTranslation();
  const { addTask, updateTask, courses } = useApp();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(task, defaultDate));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      const next = initialState(task, defaultDate);
      // Legacy tasks stored only a course name: resolve it to the real record.
      if (task && !next.courseId && task.course) {
        const match = matchCourseByName(courses, task.course);
        if (match) next.courseId = match.id;
      }
      setForm(next);
      setErrors({});
    }
  }, [open, task, defaultDate, courses]);

  const courseOptions = useMemo(() => {
    const visible = courses.filter(
      (course) => !course.archived || course.id === form.courseId,
    );
    return [
      { value: '', label: t('overview.deadlines.noCourse') },
      ...visible.map((course) => ({ value: course.id, label: courseLabel(course) })),
    ];
  }, [courses, form.courseId, t]);

  const priorityOptions = useMemo(
    () => PRIORITIES.map((priority) => ({ value: priority, label: t(PRIORITY_LABEL[priority]) })),
    [t],
  );

  const isEditing = Boolean(task);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const duration = Number(form.duration);
    const completed = Number(form.completed || 0);

    if (!form.title.trim()) nextErrors.title = t('planner.taskDialog.errorTitle');
    const deadline = fromDateAndTime(form.deadlineDate, form.deadlineTime);
    if (!deadline) nextErrors.deadlineDate = t('planner.taskDialog.errorDeadline');
    if (!Number.isFinite(duration) || duration < 30 || duration > 2400) {
      nextErrors.duration = t('planner.taskDialog.errorDuration');
    }
    if (!Number.isFinite(completed) || completed < 0 || completed > duration) {
      nextErrors.completed = t('planner.taskDialog.errorCompleted');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const course = courses.find((item) => item.id === form.courseId);
    const payload = {
      title: form.title.trim(),
      courseId: course?.id ?? '',
      course: course?.name ?? '',
      deadline: deadline as string,
      estimatedMinutes: Math.round(duration),
      completedMinutes: Math.round(completed),
      priority: form.priority,
      description: form.description.trim(),
    };

    if (task) {
      updateTask(task.id, payload);
      notify({ title: t('toast.taskUpdated') });
    } else {
      addTask({
        id: createId('task'),
        completed: false,
        createdAt: toLocalIso(new Date()),
        ...payload,
      });
      notify({ title: t('toast.taskCreated') });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('planner.taskDialog.editTitle') : t('planner.taskDialog.addTitle')}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t('planner.taskDialog.editDescription')
              : t('planner.taskDialog.addDescription')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">
              {t('planner.taskDialog.titleLabel')}
              <span className="ml-1 text-critical" aria-hidden="true">
                *
              </span>
            </Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder={t('planner.taskDialog.titlePlaceholder')}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'task-title-error' : undefined}
              autoFocus
              required
            />
            <FieldError id="task-title-error">{errors.title}</FieldError>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-course">{t('planner.taskDialog.courseLabel')}</Label>
              <Select
                id="task-course"
                value={form.courseId}
                onChange={(next) => setForm((current) => ({ ...current, courseId: next }))}
                options={courseOptions}
                aria-describedby="task-course-hint"
              />
              <p id="task-course-hint" className="text-2xs leading-relaxed text-muted-foreground">
                {courses.length === 0
                  ? t('planner.taskDialog.noCourses')
                  : t('planner.taskDialog.courseHint')}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-priority">{t('planner.taskDialog.priorityLabel')}</Label>
              <Select
                id="task-priority"
                value={form.priority}
                onChange={(next) =>
                  setForm((current) => ({ ...current, priority: next as Priority }))
                }
                options={priorityOptions}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-deadline">{t('planner.taskDialog.deadlineLabel')}</Label>
              <DatePicker
                id="task-deadline"
                value={form.deadlineDate}
                onChange={(next) =>
                  setForm((current) => ({ ...current, deadlineDate: next }))
                }
                invalid={Boolean(errors.deadlineDate)}
                describedBy={errors.deadlineDate ? 'task-deadline-error' : undefined}
              />
              <FieldError id="task-deadline-error">{errors.deadlineDate}</FieldError>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-deadline-time">{t('planner.taskDialog.timeLabel')}</Label>
              <Input
                id="task-deadline-time"
                type="time"
                value={form.deadlineTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, deadlineTime: event.target.value }))
                }
                aria-invalid={Boolean(errors.deadlineDate)}
                aria-describedby={errors.deadlineDate ? 'task-deadline-error' : undefined}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-duration">{t('planner.taskDialog.durationLabel')}</Label>
              <Input
                id="task-duration"
                type="number"
                inputMode="numeric"
                min={30}
                max={2400}
                step={30}
                value={form.duration}
                onChange={(event) => setForm((current) => ({ ...current, duration: event.target.value }))}
                placeholder={t('planner.taskDialog.durationPlaceholder')}
                aria-invalid={Boolean(errors.duration)}
                aria-describedby={errors.duration ? 'task-duration-error' : undefined}
                required
              />
              <FieldError id="task-duration-error">{errors.duration}</FieldError>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-completed">{t('planner.taskDialog.completedLabel')}</Label>
              <Input
                id="task-completed"
                type="number"
                inputMode="numeric"
                min={0}
                max={2400}
                step={15}
                value={form.completed}
                onChange={(event) => setForm((current) => ({ ...current, completed: event.target.value }))}
                aria-invalid={Boolean(errors.completed)}
                aria-describedby={
                  errors.completed ? 'task-completed-error' : 'task-completed-hint'
                }
              />
              <p id="task-completed-hint" className="text-2xs leading-relaxed text-muted-foreground">
                {t('planner.taskDialog.completedHint')}
              </p>
              <FieldError id="task-completed-error">{errors.completed}</FieldError>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-description">{t('planner.taskDialog.descriptionLabel')}</Label>
            <Textarea
              id="task-description"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder={t('planner.taskDialog.descriptionPlaceholder')}
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {isEditing ? t('planner.taskDialog.save') : t('planner.taskDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
