import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type {
  Commitment,
  CommitmentCategory,
  CommitmentOccurrence,
  CommitmentRecurrence,
} from '@/types';
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
import { useFormatters } from '@/hooks/use-formatters';
import { createId } from '@/lib/utils';
import { toInputDateTime, fromInputDateTime, nowInputDateTime } from '@/lib/form';
import { toDateKey } from '@/lib/date';
import { defaultWeekdays, isRecurring, normalizeWeekdays } from '@/lib/recurrence';
import { cn } from '@/lib/utils';

interface CommitmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The series being edited (id is the series id). */
  commitment?: Commitment | null;
  /** The concrete occurrence the student clicked, when editing from the week. */
  occurrence?: CommitmentOccurrence | null;
}

type EditScope = 'series' | 'occurrence';

interface FormState {
  title: string;
  category: CommitmentCategory;
  start: string;
  end: string;
  notes: string;
  recurrence: CommitmentRecurrence;
  weekdays: number[];
  until: string;
  scope: EditScope;
}

const CATEGORIES: CommitmentCategory[] = ['class', 'work', 'appointment', 'personal', 'rest'];

const CATEGORY_KEY: Record<CommitmentCategory, string> = {
  class: 'common.categoryClass',
  work: 'common.categoryWork',
  appointment: 'common.categoryAppointment',
  personal: 'common.categoryPersonal',
  rest: 'common.categoryRest',
};

/** Monday-first weekday indexes used by the editor (JS: 0 = Sunday). */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
/** 2 January 2024 is a Tuesday; 1 January 2024 is a Monday. */
const REFERENCE_MONDAY = new Date(2024, 0, 1);

function initialState(
  commitment?: Commitment | null,
  occurrence?: CommitmentOccurrence | null,
): FormState {
  const source = commitment ?? occurrence ?? null;
  if (source) {
    const weekly = isRecurring(source);
    return {
      title: source.title,
      category: source.category,
      start: toInputDateTime(source.start),
      end: toInputDateTime(source.end),
      notes: source.notes,
      recurrence: weekly ? 'weekly' : 'none',
      weekdays:
        weekly && source.weekdays?.length
          ? normalizeWeekdays(source.weekdays)
          : defaultWeekdays(source.start),
      until: source.recurrenceUntil ?? '',
      scope: 'series',
    };
  }
  return {
    title: '',
    category: 'class',
    start: nowInputDateTime(60),
    end: nowInputDateTime(150),
    notes: '',
    recurrence: 'none',
    weekdays: defaultWeekdays(nowInputDateTime(60)),
    until: '',
    scope: 'series',
  };
}

export function CommitmentDialog({
  open,
  onOpenChange,
  commitment,
  occurrence,
}: CommitmentDialogProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const { addCommitment, updateCommitment, commitments } = useApp();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(commitment, occurrence));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialState(commitment, occurrence));
      setErrors({});
    }
  }, [open, commitment, occurrence]);

  const editingOccurrence = Boolean(occurrence);
  const series = useMemo(() => {
    if (!occurrence) return commitment ?? null;
    return commitments.find((item) => item.id === occurrence.id) ?? occurrence;
  }, [occurrence, commitment, commitments]);
  const editingRecurringSeries = Boolean(
    series && isRecurring(series) && (occurrence?.isRecurring ?? false),
  );

  const recurrenceOptions = [
    { value: 'none', label: t('recurrence.none') },
    { value: 'weekly', label: t('recurrence.weekly') },
  ];

  const scopeOptions = [
    { value: 'series', label: t('recurrence.editSeries') },
    { value: 'occurrence', label: t('recurrence.editOccurrence') },
  ];

  const weekdayLabels = useMemo(
    () =>
      WEEKDAY_ORDER.map((day, index) => {
        const date = new Date(REFERENCE_MONDAY.getTime() + index * 86400000);
        return { day, label: format.weekdayShort(toDateKey(date)) };
      }),
    [format],
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const start = fromInputDateTime(form.start);
    const end = fromInputDateTime(form.end);
    const weekdays = normalizeWeekdays(form.weekdays);

    if (!form.title.trim()) nextErrors.title = t('planner.commitmentDialog.errorTitle');
    if (!start || !end) {
      nextErrors.start = t('planner.commitmentDialog.errorDate');
    } else if (new Date(end) <= new Date(start)) {
      nextErrors.end = t('planner.commitmentDialog.errorRange');
    }
    if (form.recurrence === 'weekly' && weekdays.length === 0) {
      nextErrors.weekdays = t('recurrence.errorWeekdays');
    }
    if (form.until && form.start.slice(0, 10) > form.until) {
      nextErrors.until = t('recurrence.errorUntil');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload: Omit<Commitment, 'id'> = {
      title: form.title.trim(),
      category: form.category,
      start: start as string,
      end: end as string,
      notes: form.notes.trim(),
      recurrence: form.recurrence,
      weekdays: form.recurrence === 'weekly' ? weekdays : [],
      recurrenceUntil: form.recurrence === 'weekly' ? form.until : '',
      exceptions: [],
    };

    if (series && editingOccurrence && editingRecurringSeries) {
      if (form.scope === 'occurrence') {
        // Detach this date from the series, then store the edited copy.
        updateCommitment(series.id, {
          exceptions: Array.from(new Set([...(series.exceptions ?? []), occurrence!.dateKey])),
        });
        addCommitment({
          id: createId('commitment'),
          ...payload,
          recurrence: 'none',
          weekdays: [],
          recurrenceUntil: '',
          exceptions: [],
          seriesId: series.id,
        });
        notify({ title: t('recurrence.occurrenceUpdated') });
      } else {
        updateCommitment(series.id, {
          ...payload,
          exceptions: series.exceptions ?? [],
        });
        notify({ title: t('toast.commitmentUpdated') });
      }
      onOpenChange(false);
      return;
    }

    if (series) {
      updateCommitment(series.id, { ...payload, exceptions: series.exceptions ?? [] });
      notify({ title: t('toast.commitmentUpdated') });
    } else {
      addCommitment({
        id: createId('commitment'),
        ...payload,
      });
      notify({ title: t('toast.commitmentCreated') });
    }
    onOpenChange(false);
  };

  const isEditing = Boolean(series);
  const untilInvalid = Boolean(errors.until);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('planner.commitmentDialog.editTitle')
              : t('planner.commitmentDialog.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('planner.commitmentDialog.addDescription')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commitment-title">
                {t('planner.commitmentDialog.titleLabel')}
                <span className="ml-1 text-critical" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="commitment-title"
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder={t('planner.commitmentDialog.titlePlaceholder')}
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? 'commitment-title-error' : undefined}
                autoFocus
                required
              />
              <FieldError id="commitment-title-error">{errors.title}</FieldError>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commitment-category">
                {t('planner.commitmentDialog.categoryLabel')}
              </Label>
              <Select
                id="commitment-category"
                value={form.category}
                onChange={(next) =>
                  setForm((current) => ({
                    ...current,
                    category: next as CommitmentCategory,
                  }))
                }
                options={CATEGORIES.map((category) => ({
                  value: category,
                  label: t(CATEGORY_KEY[category]),
                }))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commitment-start">{t('planner.commitmentDialog.startLabel')}</Label>
              <Input
                id="commitment-start"
                type="datetime-local"
                value={form.start}
                onChange={(event) =>
                  setForm((current) => ({ ...current, start: event.target.value }))
                }
                aria-invalid={Boolean(errors.start)}
                aria-describedby={errors.start ? 'commitment-start-error' : undefined}
                required
              />
              <FieldError id="commitment-start-error">{errors.start}</FieldError>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commitment-end">{t('planner.commitmentDialog.endLabel')}</Label>
              <Input
                id="commitment-end"
                type="datetime-local"
                value={form.end}
                onChange={(event) => setForm((current) => ({ ...current, end: event.target.value }))}
                aria-invalid={Boolean(errors.end)}
                aria-describedby={errors.end ? 'commitment-end-error' : undefined}
                required
              />
              <FieldError id="commitment-end-error">{errors.end}</FieldError>
            </div>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="commitment-recurrence">{t('recurrence.label')}</Label>
                <Select
                  id="commitment-recurrence"
                  value={form.recurrence}
                  onChange={(next) =>
                    setForm((current) => ({
                      ...current,
                      recurrence: next as CommitmentRecurrence,
                      weekdays:
                        next === 'weekly' && current.weekdays.length === 0
                          ? defaultWeekdays(current.start)
                          : current.weekdays,
                    }))
                  }
                  options={recurrenceOptions}
                />
              </div>
              {form.recurrence === 'weekly' ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="commitment-until">{t('recurrence.until')}</Label>
                  <div className="flex items-center gap-1">
                    <DatePicker
                      id="commitment-until"
                      value={form.until}
                      onChange={(next) => setForm((current) => ({ ...current, until: next }))}
                      invalid={untilInvalid}
                      describedBy={untilInvalid ? 'commitment-until-error' : 'commitment-until-hint'}
                    />
                    {form.until ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('courses.clearDate')}
                        onClick={() => setForm((current) => ({ ...current, until: '' }))}
                      >
                        <X aria-hidden="true" className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                  <p id="commitment-until-hint" className="text-2xs text-muted-foreground">
                    {t('recurrence.untilHint')}
                  </p>
                  <FieldError id="commitment-until-error">{errors.until}</FieldError>
                </div>
              ) : null}
            </div>

            {form.recurrence === 'weekly' ? (
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="text-xs font-medium text-foreground">{t('recurrence.weekdays')}</span>
                <div role="group" aria-label={t('recurrence.weekdays')} className="flex flex-wrap gap-1.5">
                  {weekdayLabels.map(({ day, label }) => {
                    const active = form.weekdays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            weekdays: active
                              ? current.weekdays.filter((item) => item !== day)
                              : normalizeWeekdays([...current.weekdays, day]),
                          }))
                        }
                        className={cn(
                          'min-w-10 rounded-sm border px-2 py-1 text-2xs font-medium transition-colors',
                          active
                            ? 'border-primary/40 bg-primary-soft text-primary'
                            : 'border-border text-muted-foreground hover:bg-muted',
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <FieldError id="commitment-weekdays-error">{errors.weekdays}</FieldError>
              </div>
            ) : null}

            {editingOccurrence && editingRecurringSeries ? (
              <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
                <Label htmlFor="commitment-scope">{t('recurrence.scopeLabel')}</Label>
                <Select
                  id="commitment-scope"
                  value={form.scope}
                  onChange={(next) =>
                    setForm((current) => ({
                      ...current, scope: next as EditScope,
                      start: toInputDateTime((next === 'occurrence' ? occurrence : series)!.start),
                      end: toInputDateTime((next === 'occurrence' ? occurrence : series)!.end),
                    }))
                  }
                  options={scopeOptions}
                />
                <p className="text-2xs leading-relaxed text-muted-foreground">
                  {form.scope === 'series' ? t('recurrence.scopeSeriesHint') : t('recurrence.scopeOccurrenceHint')}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="commitment-notes">{t('planner.commitmentDialog.notesLabel')}</Label>
            <Textarea
              id="commitment-notes"
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder={t('planner.commitmentDialog.notesPlaceholder')}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {isEditing
                ? t('planner.commitmentDialog.save')
                : t('planner.commitmentDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
