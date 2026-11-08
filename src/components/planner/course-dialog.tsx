import { radioKeyboard } from '@/lib/radio-keyboard';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { Course, CourseColor } from '@/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/field';
import { DatePicker } from '@/components/ui/date-picker';
import { Label, FieldError } from '@/components/ui/label';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { createId } from '@/lib/utils';
import { toLocalIso } from '@/lib/date';
import { COURSE_COLORS, COURSE_COLOR_CLASS } from '@/lib/courses';
import { cn } from '@/lib/utils';

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course | null;
}

interface FormState {
  name: string;
  code: string;
  color: CourseColor;
  instructor: string;
  semesterStart: string;
  semesterEnd: string;
}

function initialState(course?: Course | null): FormState {
  if (course) {
    return {
      name: course.name,
      code: course.code,
      color: course.color,
      instructor: course.instructor,
      semesterStart: course.semesterStart,
      semesterEnd: course.semesterEnd,
    };
  }
  return {
    name: '',
    code: '',
    color: 'blue',
    instructor: '',
    semesterStart: '',
    semesterEnd: '',
  };
}

export function CourseDialog({ open, onOpenChange, course }: CourseDialogProps) {
  const { t } = useTranslation();
  const { addCourse, updateCourse, courses } = useApp();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(course));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialState(course));
      setErrors({});
    }
  }, [open, course]);

  const isEditing = Boolean(course);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const name = form.name.trim();
    if (!name) {
      nextErrors.name = t('courses.errorName');
    } else if (
      courses.some(
        (item) =>
          item.id !== course?.id && item.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      nextErrors.name = t('courses.errorDuplicate');
    }
    if (
      form.semesterStart &&
      form.semesterEnd &&
      form.semesterEnd < form.semesterStart
    ) {
      nextErrors.semesterEnd = t('courses.errorSemester');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      name,
      code: form.code.trim(),
      color: form.color,
      instructor: form.instructor.trim(),
      semesterStart: form.semesterStart,
      semesterEnd: form.semesterEnd,
    };

    if (course) {
      updateCourse(course.id, payload);
      notify({ title: t('courses.updated') });
    } else {
      addCourse({
        id: createId('course'),
        archived: false,
        createdAt: toLocalIso(new Date()),
        ...payload,
      });
      notify({ title: t('courses.created') });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('courses.editTitle') : t('courses.addTitle')}</DialogTitle>
          <DialogDescription>{t('courses.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-name">
                {t('courses.name')}
                <span className="ml-1 text-critical" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="course-name"
              maxLength={120}
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={t('courses.namePlaceholder')}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'course-name-error' : undefined}
                autoFocus
                required
              />
              <FieldError id="course-name-error">{errors.name}</FieldError>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-code">{t('courses.code')}</Label>
              <Input
                id="course-code"
              maxLength={40}
                value={form.code}
                onChange={(event) =>
                  setForm((current) => ({ ...current, code: event.target.value }))
                }
                placeholder="COMP 101"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-foreground">{t('courses.color')}</span>
            <div role="radiogroup" onKeyDown={radioKeyboard} aria-label={t('courses.color')} className="flex flex-wrap gap-2">
              {COURSE_COLORS.map((color) => {
                const active = form.color === color;
                return (
                  <button
                    key={color}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-label={t(`courses.colors.${color}`)}
                    title={t(`courses.colors.${color}`)}
                    onClick={() => setForm((current) => ({ ...current, color }))}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md border transition-colors',
                      active ? 'border-primary ring-2 ring-ring/30' : 'border-border hover:bg-muted',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn('size-3.5 rounded-full', COURSE_COLOR_CLASS[color])}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course-instructor">{t('courses.instructor')}</Label>
            <Input
              id="course-instructor"
              maxLength={120}
              value={form.instructor}
              onChange={(event) =>
                setForm((current) => ({ ...current, instructor: event.target.value }))
              }
              placeholder={t('courses.instructorPlaceholder')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-semester-start">{t('courses.semesterStart')}</Label>
              <div className="flex items-center gap-1">
                <DatePicker
                  id="course-semester-start"
                  value={form.semesterStart}
                  onChange={(next) => setForm((current) => ({ ...current, semesterStart: next }))}
                />
                {form.semesterStart ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('courses.clearDate')}
                    onClick={() => setForm((current) => ({ ...current, semesterStart: '' }))}
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="course-semester-end">{t('courses.semesterEnd')}</Label>
              <div className="flex items-center gap-1">
                <DatePicker
                  id="course-semester-end"
                  value={form.semesterEnd}
                  onChange={(next) => setForm((current) => ({ ...current, semesterEnd: next }))}
                  invalid={Boolean(errors.semesterEnd)}
                />
                {form.semesterEnd ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t('courses.clearDate')}
                    onClick={() => setForm((current) => ({ ...current, semesterEnd: '' }))}
                  >
                    <X aria-hidden="true" className="size-3.5" />
                  </Button>
                ) : null}
              </div>
              <FieldError id="course-semester-error">{errors.semesterEnd}</FieldError>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{isEditing ? t('common.save') : t('courses.add')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
