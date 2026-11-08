import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import type { DigitalUsageEntry, UsageCategory } from '@/types';
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
import { Select } from '@/components/ui/select';
import { Label, FieldError } from '@/components/ui/label';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { createId } from '@/lib/utils';
import { isDateKey } from '@/lib/recurrence';
import { toLocalIso } from '@/lib/date';

interface UsageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: DigitalUsageEntry | null;
}

interface FormState {
  app: string;
  date: string;
  minutes: string;
  category: UsageCategory;
}

const CATEGORIES: UsageCategory[] = [
  'social',
  'entertainment',
  'education',
  'productivity',
  'other',
];

const CATEGORY_KEY: Record<UsageCategory, string> = {
  social: 'common.categorySocial',
  entertainment: 'common.categoryEntertainment',
  education: 'common.categoryEducation',
  productivity: 'common.categoryProductivity',
  other: 'common.categoryOther',
};

const SAMPLE_APPS = ['Instagram', 'TikTok', 'YouTube', 'Snapchat', 'Notion', 'Coursera'];

function initialState(entry?: DigitalUsageEntry | null): FormState {
  if (entry) {
    return {
      app: entry.app,
      date: entry.date,
      minutes: String(entry.minutes),
      category: entry.category,
    };
  }
  return {
    app: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    minutes: '',
    category: 'social',
  };
}

export function UsageDialog({ open, onOpenChange, entry }: UsageDialogProps) {
  const { t } = useTranslation();
  const { addUsage, updateUsage, usage } = useApp();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState>(() => initialState(entry));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (open) {
      setForm(initialState(entry));
      setErrors({});
    }
  }, [open, entry]);

  const apps = useMemo(
    () => Array.from(new Set([...SAMPLE_APPS, ...usage.map((item) => item.app)])).slice(0, 30),
    [usage],
  );

  const isEditing = Boolean(entry);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const minutes = Number(form.minutes);
    if (!form.app.trim()) nextErrors.app = t('habits.entryDialog.errorApp');
    if (!isDateKey(form.date) || form.date > format(new Date(), 'yyyy-MM-dd')) nextErrors.date = t('habits.entryDialog.errorDate');
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440) {
      nextErrors.minutes = t('habits.entryDialog.errorMinutes');
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = {
      app: form.app.trim(),
      date: form.date,
      minutes: Math.round(minutes),
      category: form.category,
    };

    if (entry) {
      updateUsage(entry.id, payload);
      notify({ title: t('toast.usageUpdated') });
    } else {
      addUsage({
        id: createId('usage'),
        createdAt: toLocalIso(new Date()),
        ...payload,
      });
      notify({ title: t('toast.usageCreated') });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('habits.entryDialog.editTitle') : t('habits.entryDialog.addTitle')}
          </DialogTitle>
          <DialogDescription>{t('habits.entryDialog.description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usage-app">{t('habits.entryDialog.appLabel')}</Label>
            <Input
              id="usage-app"
              maxLength={80}
              value={form.app}
              onChange={(event) => setForm((current) => ({ ...current, app: event.target.value }))}
              placeholder={t('habits.entryDialog.appPlaceholder')}
              list="usage-app-options"
              aria-invalid={Boolean(errors.app)}
              aria-describedby={errors.app ? 'usage-app-error' : undefined}
              autoFocus
            />
            <datalist id="usage-app-options">
              {apps.map((app) => (
                <option key={app} value={app} />
              ))}
            </datalist>
            <FieldError id="usage-app-error">{errors.app}</FieldError>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="usage-date">{t('habits.entryDialog.dateLabel')}</Label>
              <Input
                id="usage-date"
                type="date"
                max={format(new Date(), 'yyyy-MM-dd')}
                value={form.date}
                onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? 'usage-date-error' : undefined}
              />
              <FieldError id="usage-date-error">{errors.date}</FieldError>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="usage-minutes">{t('habits.entryDialog.minutesLabel')}</Label>
              <Input
                id="usage-minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={1440}
                value={form.minutes}
                onChange={(event) => setForm((current) => ({ ...current, minutes: event.target.value }))}
                placeholder={t('habits.entryDialog.minutesPlaceholder')}
                aria-invalid={Boolean(errors.minutes)}
                aria-describedby={errors.minutes ? 'usage-minutes-error' : undefined}
              />
              <FieldError id="usage-minutes-error">{errors.minutes}</FieldError>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usage-category">{t('habits.entryDialog.categoryLabel')}</Label>
            <Select
              id="usage-category"
              value={form.category}
              onChange={(next) =>
                setForm((current) => ({
                  ...current,
                  category: next as UsageCategory,
                }))
              }
              options={CATEGORIES.map((category) => ({
                value: category,
                label: t(CATEGORY_KEY[category]),
              }))}
            />
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">
              {isEditing ? t('habits.entryDialog.save') : t('habits.entryDialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
