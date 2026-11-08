import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, Gauge } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Label, FieldError } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionCard } from '@/components/common/section-card';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { useFormatters } from '@/hooks/use-formatters';
import { simulateReduction, type HabitsSummary } from '@/lib/analytics/habits';

export function HabitSimulator({ summary }: { summary: HabitsSummary }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const { preferences, updatePreferences } = useApp();
  const { notify } = useToast();
  const [reduction, setReduction] = useState('180');
  const [allocate, setAllocate] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const minutes = Number(reduction);
  const valid = Number.isFinite(minutes) && minutes >= 0;
  const result = simulateReduction(summary, valid ? minutes : 0, allocate);
  const hasDiscretionary = summary.recentDiscretionaryMinutes > 0;

  const handleSave = () => {
    if (!valid || result.recoveredMinutes <= 0) {
      setError(t('habits.simulator.notEnough'));
      return;
    }
    setError(null);
    updatePreferences({ focusBonusPerDayMinutes: result.dailyRecoveredMinutes });
    notify({
      title: t('habits.simulator.reductionComplete'),
      description: t('habits.simulator.applied', { minutes: result.dailyRecoveredMinutes }),
    });
  };

  return (
    <SectionCard
      title={t('habits.simulator.title')}
      subtitle={t('habits.simulator.subtitle')}
      action={
        <Link
          to="/simulation"
          className="flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
        >
          {t('habits.simulator.openLab')}
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-reduction">{t('habits.simulator.reductionLabel')}</Label>
            <Input
              id="habit-reduction"
              type="number"
              min={0}
              max={1440}
              step={30}
              value={reduction}
              onChange={(event) => {
                setReduction(event.target.value);
                setError(null);
              }}
              placeholder={t('habits.simulator.reductionPlaceholder')}
            />
            <FieldError id="habit-reduction-error">{error ?? undefined}</FieldError>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-border bg-muted/30 p-2.5">
              <p className="label-caps">{t('habits.simulator.recovered')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {valid ? format.duration(result.recoveredMinutes) : '—'}
              </p>
            </div>
            <div className="rounded-md border border-border bg-muted/30 p-2.5">
              <p className="label-caps">{t('habits.simulator.eligible')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {format.duration(summary.recentDiscretionaryMinutes)}
              </p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">{t('habits.simulator.allocate')}</p>
              <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                {t('habits.simulator.allocateHint')}
              </p>
            </div>
            <Switch
              checked={allocate}
              onCheckedChange={setAllocate}
              aria-label={t('habits.simulator.allocate')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={handleSave} disabled={!hasDiscretionary || !valid}>
              <Gauge aria-hidden="true" />
              {t('habits.simulator.apply')}
            </Button>
            {preferences.focusBonusPerDayMinutes > 0 ? (
              <span className="text-2xs tabular-nums text-muted-foreground">
                {t('habits.simulator.applied', { minutes: preferences.focusBonusPerDayMinutes })}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-md border border-border bg-muted/20 p-3">
          <div>
            <p className="text-xs font-medium text-foreground">{t('habits.suggestionsTitle')}</p>
            <ul className="mt-2 flex flex-col gap-2 text-xs leading-relaxed text-muted-foreground">
              {summary.byCategory.find((row) => row.category === 'social') ? (
                <li>
                  {t('habits.suggestionSocial', {
                    share: format.percent(
                      summary.byCategory.find((row) => row.category === 'social')?.share ?? 0,
                    ),
                  })}
                </li>
              ) : null}
              {summary.byCategory.find((row) => row.category === 'education') ? (
                <li>
                  {t('habits.suggestionEducation', {
                    share: format.percent(
                      summary.byCategory.find((row) => row.category === 'education')?.share ?? 0,
                    ),
                  })}
                </li>
              ) : null}
              <li>{t('habits.suggestionAverage', { minutes: summary.dailyAverageMinutes })}</li>
              {result.capped ? <li className="text-warning">{t('habits.simulator.capped')}</li> : null}
            </ul>
          </div>
          <p className="text-2xs leading-relaxed text-muted-foreground">
            {t('habits.simulator.disclaimer')}
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
