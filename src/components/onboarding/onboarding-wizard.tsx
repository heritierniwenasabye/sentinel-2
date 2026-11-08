import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Moon, Monitor, ShieldCheck, Sun } from 'lucide-react';
import type { Language, Priority, Theme } from '@/types';
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
import { DatePicker } from '@/components/ui/date-picker';
import { Label, FieldError } from '@/components/ui/label';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { createId } from '@/lib/utils';
import { addDays, startOfWeek } from 'date-fns';
import { toDateKey, toLocalIso } from '@/lib/date';
import { fromDateAndTime } from '@/lib/form';
import { COURSE_COLORS, COURSE_COLOR_CLASS } from '@/lib/courses';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 5;

const THEME_OPTIONS: { value: Theme; labelKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'settings.appearance.light', icon: Sun },
  { value: 'dark', labelKey: 'settings.appearance.dark', icon: Moon },
  { value: 'system', labelKey: 'settings.appearance.system', icon: Monitor },
];

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

/** Sunday of the current week, used as the first suggested deadline. */
function defaultDeadline(): string {
  return toDateKey(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6));
}

export function OnboardingWizard() {
  const { t } = useTranslation();
  const {
    preferences,
    updatePreferences,
    addCourse,
    addTask,
  } = useApp();
  const { notify } = useToast();
  const [step, setStep] = useState(0);

  const [name, setName] = useState(preferences.displayName);
  const [studyStart, setStudyStart] = useState(preferences.studyStart);
  const [studyEnd, setStudyEnd] = useState(preferences.studyEnd);
  const [maxDaily, setMaxDaily] = useState(String(preferences.maxDailyStudyMinutes));
  const [sleepStart, setSleepStart] = useState(preferences.sleepStart);
  const [sleepEnd, setSleepEnd] = useState(preferences.sleepEnd);
  const [theme, setTheme] = useState<Theme>(preferences.theme);
  const [language, setLanguage] = useState<Language>(preferences.language);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [color, setColor] = useState(COURSE_COLORS[0]);
  const [taskTitle, setTaskTitle] = useState('');
  const [duration, setDuration] = useState('90');
  const [priority, setPriority] = useState<Priority>('medium');
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [error, setError] = useState<string | null>(null);

  const open = !preferences.onboardingCompleted;

  const priorityOptions = useMemo(
    () =>
      PRIORITIES.map((value) => ({
        value,
        label: t(
          value === 'low'
            ? 'common.priorityLow'
            : value === 'medium'
              ? 'common.priorityMedium'
              : 'common.priorityHigh',
        ),
      })),
    [t],
  );

  const languageOptions = useMemo(
    () => SUPPORTED_LANGUAGES.map((item) => ({ value: item.code, label: item.label })),
    [],
  );

  const complete = (withData: boolean) => {
    updatePreferences({
      displayName: name.trim(),
      studyStart,
      studyEnd,
      maxDailyStudyMinutes: Math.round(Number(maxDaily) || preferences.maxDailyStudyMinutes),
      sleepStart,
      sleepEnd,
      theme,
      language,
      onboardingCompleted: true,
    });

    if (withData) {
      let courseId = '';
      if (courseName.trim()) {
        courseId = createId('course');
        addCourse({
          id: courseId,
          name: courseName.trim(),
          code: courseCode.trim(),
          color,
          instructor: '',
          semesterStart: '',
          semesterEnd: '',
          archived: false,
          createdAt: toLocalIso(new Date()),
        });
      }
      if (taskTitle.trim()) {
        const due = fromDateAndTime(deadline, '23:59');
        if (due) {
          addTask({
            id: createId('task'),
            title: taskTitle.trim(),
            course: courseName.trim(),
            courseId,
            description: '',
            deadline: due,
            estimatedMinutes: Math.round(Number(duration) || 90),
            completedMinutes: 0,
            priority,
            completed: false,
            createdAt: toLocalIso(new Date()),
          });
        }
      }
      notify({ title: t('onboarding.created') });
    }
  };

  const skip = () => {
    updatePreferences({ onboardingCompleted: true });
  };

  const next = () => {
    setError(null);
    if (step === 1) {
      if (studyEnd <= studyStart) {
        setError(t('settings.planning.errorWindow'));
        return;
      }
      const minutes = Number(maxDaily);
      if (!Number.isFinite(minutes) || minutes < 30 || minutes > 960) {
        setError(t('settings.planning.errorNumbers'));
        return;
      }
    }
    if (step === 3 && !courseName.trim()) {
      setError(t('onboarding.errorCourse'));
      return;
    }
    if (step === 4) {
      if (!taskTitle.trim()) {
        setError(t('onboarding.errorTitle'));
        return;
      }
      const minutes = Number(duration);
      if (!Number.isFinite(minutes) || minutes < 30 || minutes > 2400) {
        setError(t('planner.taskDialog.errorDuration'));
        return;
      }
      complete(true);
      return;
    }
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (!value ? skip() : undefined)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <p className="text-2xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {t('onboarding.stepOf', { current: step + 1, total: TOTAL_STEPS })}
          </p>
          <DialogTitle>{t('onboarding.title')}</DialogTitle>
          <DialogDescription>{t('onboarding.subtitle')}</DialogDescription>
        </DialogHeader>

        <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {step === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{t('onboarding.welcomeTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('onboarding.welcomeBody')}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onboarding-name">{t('onboarding.nameLabel')}</Label>
              <Input
                id="onboarding-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('onboarding.namePlaceholder')}
                maxLength={80}
              />
            </div>
            <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
              {t('onboarding.disclosure')}
            </p>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{t('onboarding.planningTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('onboarding.planningBody')}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-study-start">{t('onboarding.studyStart')}</Label>
                <Input
                  id="onboarding-study-start"
                  type="time"
                  value={studyStart}
                  onChange={(event) => setStudyStart(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-study-end">{t('onboarding.studyEnd')}</Label>
                <Input
                  id="onboarding-study-end"
                  type="time"
                  value={studyEnd}
                  onChange={(event) => setStudyEnd(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-sleep-start">{t('onboarding.sleepStart')}</Label>
                <Input
                  id="onboarding-sleep-start"
                  type="time"
                  value={sleepStart}
                  onChange={(event) => setSleepStart(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-sleep-end">{t('onboarding.sleepEnd')}</Label>
                <Input
                  id="onboarding-sleep-end"
                  type="time"
                  value={sleepEnd}
                  onChange={(event) => setSleepEnd(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="onboarding-max-daily">{t('onboarding.maxDaily')}</Label>
                <Input
                  id="onboarding-max-daily"
                  type="number"
                  min={30}
                  max={960}
                  step={15}
                  value={maxDaily}
                  onChange={(event) => setMaxDaily(event.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{t('onboarding.appearanceTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('onboarding.appearanceBody')}
            </p>
            <div role="radiogroup" aria-label={t('onboarding.appearanceTitle')} className="grid gap-2 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setTheme(option.value);
                      updatePreferences({ theme: option.value });
                    }}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors',
                      active ? 'border-primary/40 bg-primary-soft/60' : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                      {t(option.labelKey)}
                    </span>
                    {active ? <Check aria-hidden="true" className="size-3.5 text-primary" /> : null}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onboarding-language">{t('settings.language.title')}</Label>
              <Select
                id="onboarding-language"
                value={language}
                onChange={(value) => {
                  const nextLanguage = value as Language;
                  setLanguage(nextLanguage);
                  updatePreferences({ language: nextLanguage });
                }}
                options={languageOptions}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{t('onboarding.courseTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('onboarding.courseBody')}
            </p>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-course-name">{t('onboarding.courseName')}</Label>
                <Input
                  id="onboarding-course-name"
                  value={courseName}
                  onChange={(event) => setCourseName(event.target.value)}
                  placeholder={t('onboarding.courseNamePlaceholder')}
                  maxLength={120}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-course-code">{t('onboarding.courseCode')}</Label>
                <Input
                  id="onboarding-course-code"
                  value={courseCode}
                  onChange={(event) => setCourseCode(event.target.value)}
                  placeholder="COMP 101"
                  maxLength={40}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-foreground">{t('courses.color')}</span>
              <div role="radiogroup" aria-label={t('courses.color')} className="flex flex-wrap gap-2">
                {COURSE_COLORS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={color === value}
                    aria-label={t(`courses.colors.${value}`)}
                    onClick={() => setColor(value)}
                    className={cn(
                      'flex size-8 items-center justify-center rounded-md border',
                      color === value ? 'border-primary ring-2 ring-ring/30' : 'border-border',
                    )}
                  >
                    <span aria-hidden="true" className={cn('size-3.5 rounded-full', COURSE_COLOR_CLASS[value])} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">{t('onboarding.taskTitle')}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('onboarding.taskBody')}
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="onboarding-task-title">{t('onboarding.taskName')}</Label>
              <Input
                id="onboarding-task-title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder={t('onboarding.taskNamePlaceholder')}
                maxLength={200}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-duration">{t('onboarding.duration')}</Label>
                <Input
                  id="onboarding-duration"
                  type="number"
                  min={30}
                  max={2400}
                  step={30}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboarding-priority">{t('onboarding.priority')}</Label>
                <Select
                  id="onboarding-priority"
                  value={priority}
                  onChange={(value) => setPriority(value as Priority)}
                  options={priorityOptions}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 sm:max-w-[280px]">
              <Label htmlFor="onboarding-deadline">{t('onboarding.deadline')}</Label>
              <DatePicker id="onboarding-deadline" value={deadline} onChange={setDeadline} />
            </div>
          </div>
        ) : null}

        <FieldError id="onboarding-error">{error ?? undefined}</FieldError>

        <DialogFooter className="sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={skip}>
              {t('onboarding.skip')}
            </Button>
            {step > 0 ? (
              <Button variant="secondary" onClick={() => setStep((current) => current - 1)}>
                <ArrowLeft aria-hidden="true" />
                {t('onboarding.back')}
              </Button>
            ) : null}
          </div>
          <Button onClick={next}>
            {step === TOTAL_STEPS - 1 ? t('onboarding.finish') : t('onboarding.next')}
            <ArrowRight aria-hidden="true" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
