import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  Database,
  Globe2,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Settings2,
  Sun,
  Trash2,
} from 'lucide-react';
import type { Language, Theme } from '@/types';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Label, FieldError } from '@/components/ui/label';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { useFormatters } from '@/hooks/use-formatters';
import { DataManager } from '@/components/settings/data-manager';
import { SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: { value: Theme; labelKey: string; hintKey: string; icon: typeof Sun }[] = [
  { value: 'light', labelKey: 'settings.appearance.light', hintKey: 'settings.appearance.lightHint', icon: Sun },
  { value: 'dark', labelKey: 'settings.appearance.dark', hintKey: 'settings.appearance.darkHint', icon: Moon },
  { value: 'system', labelKey: 'settings.appearance.system', hintKey: 'settings.appearance.systemHint', icon: Monitor },
];

interface PlanningForm {
  studyStart: string;
  studyEnd: string;
  maxDaily: string;
  minBreak: string;
  sleepStart: string;
  sleepEnd: string;
  focusBonus: string;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const format = useFormatters();
  const {
    preferences,
    updatePreferences,
    data,
    loadDemo,
    clearAll,
    demoLoaded,
  } = useApp();
  const { notify } = useToast();

  const [form, setForm] = useState<PlanningForm>({
    studyStart: preferences.studyStart,
    studyEnd: preferences.studyEnd,
    maxDaily: String(preferences.maxDailyStudyMinutes),
    minBreak: String(preferences.minBreakMinutes),
    sleepStart: preferences.sleepStart,
    sleepEnd: preferences.sleepEnd,
    focusBonus: String(preferences.focusBonusPerDayMinutes),
  });
  const [error, setError] = useState<string | null>(null);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [confirmResetDemo, setConfirmResetDemo] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSave = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.studyEnd <= form.studyStart) {
      setError(t('settings.planning.errorWindow'));
      return;
    }
    const maxDaily = Number(form.maxDaily);
    const minBreak = Number(form.minBreak);
    const focusBonus = Number(form.focusBonus);
    if (
      !Number.isFinite(maxDaily) ||
      !Number.isFinite(minBreak) ||
      !Number.isFinite(focusBonus) ||
      maxDaily < 30 ||
      minBreak < 5 ||
      focusBonus < 0
    ) {
      setError(t('settings.planning.errorNumbers'));
      return;
    }
    setError(null);
    updatePreferences({
      studyStart: form.studyStart,
      studyEnd: form.studyEnd,
      maxDailyStudyMinutes: Math.round(maxDaily),
      minBreakMinutes: Math.round(minBreak),
      sleepStart: form.sleepStart,
      sleepEnd: form.sleepEnd,
      focusBonusPerDayMinutes: Math.round(focusBonus),
    });
    notify({ title: t('settings.planning.saved') });
  };

  return (
    <div className="page-enter flex flex-col gap-5">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title={t('settings.planning.title')}
          subtitle={t('settings.planning.subtitle')}
          action={<Settings2 aria-hidden="true" className="size-4 text-muted-foreground" />}
        >
          <form onSubmit={handleSave} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="study-start">{t('settings.planning.studyStart')}</Label>
                <Input
                  id="study-start"
                  type="time"
                  value={form.studyStart}
                  onChange={(event) => setForm((current) => ({ ...current, studyStart: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="study-end">{t('settings.planning.studyEnd')}</Label>
                <Input
                  id="study-end"
                  type="time"
                  value={form.studyEnd}
                  onChange={(event) => setForm((current) => ({ ...current, studyEnd: event.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="max-daily">{t('settings.planning.maxDaily')}</Label>
                <Input
                  id="max-daily"
                  type="number"
                  min={30}
                  max={960}
                  step={15}
                  value={form.maxDaily}
                  onChange={(event) => setForm((current) => ({ ...current, maxDaily: event.target.value }))}
                />
                <p className="text-2xs text-muted-foreground">{t('settings.planning.maxDailyHint')}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="min-break">{t('settings.planning.minBreak')}</Label>
                <Input
                  id="min-break"
                  type="number"
                  min={5}
                  max={120}
                  step={5}
                  value={form.minBreak}
                  onChange={(event) => setForm((current) => ({ ...current, minBreak: event.target.value }))}
                />
                <p className="text-2xs text-muted-foreground">{t('settings.planning.minBreakHint')}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sleep-start">{t('settings.planning.sleepStart')}</Label>
                <Input
                  id="sleep-start"
                  type="time"
                  value={form.sleepStart}
                  onChange={(event) => setForm((current) => ({ ...current, sleepStart: event.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sleep-end">{t('settings.planning.sleepEnd')}</Label>
                <Input
                  id="sleep-end"
                  type="time"
                  value={form.sleepEnd}
                  onChange={(event) => setForm((current) => ({ ...current, sleepEnd: event.target.value }))}
                />
              </div>
            </div>
            <p className="text-2xs leading-relaxed text-muted-foreground">{t('settings.planning.sleepHint')}</p>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="focus-bonus">{t('settings.planning.focusBonus')}</Label>
              <Input
                id="focus-bonus"
                type="number"
                min={0}
                max={240}
                step={30}
                value={form.focusBonus}
                onChange={(event) => setForm((current) => ({ ...current, focusBonus: event.target.value }))}
              />
              <p className="text-2xs leading-relaxed text-muted-foreground">
                {t('settings.planning.focusBonusHint')}
              </p>
            </div>

            <FieldError id="planning-error">{error ?? undefined}</FieldError>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-2xs tabular-nums text-muted-foreground">
                {t('settings.planning.capacity', {
                  hours: format.number(Math.round(((Number(form.maxDaily) || 0) * 7) / 60)),
                })}
              </span>
              <Button type="submit">{t('common.save')}</Button>
            </div>
          </form>
        </SectionCard>

        <div className="flex flex-col gap-4">
          <SectionCard
            title={t('settings.appearance.title')}
            subtitle={t('settings.appearance.subtitle')}
            action={<Palette aria-hidden="true" className="size-4 text-muted-foreground" />}
          >
            <div role="radiogroup" aria-label={t('settings.appearance.title')} className="grid gap-2 sm:grid-cols-3">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = preferences.theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => updatePreferences({ theme: option.value })}
                    className={cn(
                      'flex flex-col items-start gap-1 rounded-md border px-3 py-2.5 text-left transition-colors',
                      active
                        ? 'border-primary/40 bg-primary-soft/60'
                        : 'border-border hover:bg-muted',
                    )}
                  >
                    <span className="flex w-full items-center justify-between">
                      <Icon aria-hidden="true" className="size-4 text-muted-foreground" strokeWidth={1.75} />
                      {active ? <Check aria-hidden="true" className="size-3.5 text-primary" /> : null}
                    </span>
                    <span className="text-xs font-medium text-foreground">{t(option.labelKey)}</span>
                    <span className="text-2xs text-muted-foreground">{t(option.hintKey)}</span>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <SectionCard
            title={t('settings.language.title')}
            subtitle={t('settings.language.subtitle')}
            action={<Globe2 aria-hidden="true" className="size-4 text-muted-foreground" />}
          >
            <div role="radiogroup" aria-label={t('settings.language.title')} className="flex flex-col gap-1">
              {SUPPORTED_LANGUAGES.map((language) => {
                const active = preferences.language === language.code;
                return (
                  <button
                    key={language.code}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => updatePreferences({ language: language.code as Language })}
                    className={cn(
                      'flex items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors',
                      active ? 'bg-nav-active font-medium text-foreground' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    <span>{language.label}</span>
                    <span className="flex items-center gap-2">
                      <span className="text-2xs uppercase tracking-wide text-muted-foreground">
                        {language.code}
                      </span>
                      {active ? <Check aria-hidden="true" className="size-3.5 text-primary" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-2xs leading-relaxed text-muted-foreground">
              {t('settings.language.hint')}
            </p>
          </SectionCard>
        </div>
      </div>

      <SectionCard
        title={t('settings.data.title')}
        subtitle={t('settings.data.subtitle')}
        action={<Database aria-hidden="true" className="size-4 text-muted-foreground" />}
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <DataManager />

            <div className="rounded-md border border-border p-3">
              <p className="flex items-center gap-2 text-xs font-medium text-foreground">
                {t('settings.data.demo')}
                {demoLoaded ? <Badge tone="accent">{t('settings.data.demoActive')}</Badge> : null}
              </p>
              <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                {t('settings.data.demoHint')}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmDemo(true)}>
                  {t('settings.data.confirmDemo')}
                </Button>
                {demoLoaded ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmResetDemo(true)}
                  >
                    <RotateCcw aria-hidden="true" />
                    {t('settings.data.resetDemo')}
                  </Button>
                ) : null}
              </div>
              {demoLoaded ? (
                <p className="mt-1.5 text-2xs leading-relaxed text-muted-foreground">
                  {t('settings.data.resetDemoHint')}
                </p>
              ) : null}
            </div>

            <div className="rounded-md border border-critical/25 p-3">
              <p className="text-xs font-medium text-foreground">{t('settings.data.clear')}</p>
              <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                {t('settings.data.clearHint')}
              </p>
              <Button variant="destructive" size="sm" className="mt-2" onClick={() => setConfirmClear(true)}>
                <Trash2 aria-hidden="true" />
                {t('settings.data.clear')}
              </Button>
            </div>
          </div>

          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
            {t('settings.data.localNotice')}
          </p>
        </div>
      </SectionCard>

      <SectionCard title={t('settings.about.title')}>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('settings.about.body')}</p>
        <p className="mt-2 text-2xs tabular-nums text-muted-foreground">
          {t('settings.about.version')} · {t('common.tasksCount', { count: data.tasks.length })}
        </p>
      </SectionCard>

      <ConfirmDialog
        open={confirmDemo}
        onOpenChange={setConfirmDemo}
        title={t('settings.data.demoTitle')}
        description={t('settings.data.demoBody')}
        confirmLabel={t('settings.data.confirmDemo')}
        onConfirm={() => {
          loadDemo();
          notify({ title: t('settings.data.demoLoaded') });
        }}
      />

      <ConfirmDialog
        open={confirmResetDemo}
        onOpenChange={setConfirmResetDemo}
        title={t('settings.data.resetDemoTitle')}
        description={t('settings.data.resetDemoBody')}
        confirmLabel={t('settings.data.resetDemo')}
        onConfirm={() => {
          loadDemo();
          notify({ title: t('settings.data.demoReset') });
        }}
      />

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('settings.data.clearTitle')}
        description={t('settings.data.clearBody')}
        confirmLabel={t('settings.data.confirmClear')}
        destructive
        onConfirm={() => {
          clearAll();
          notify({ title: t('settings.data.cleared') });
        }}
      />

    </div>
  );
}
