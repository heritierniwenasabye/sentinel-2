import { useTranslation } from 'react-i18next';
import type { ScheduleResult, WorkloadAnalysis } from '@/types';
import { useFormatters } from '@/hooks/use-formatters';
import { cn } from '@/lib/utils';

interface ComparisonPanelProps {
  baseline: ScheduleResult;
  simulated: ScheduleResult;
  baselineAnalysis: WorkloadAnalysis;
  simulatedAnalysis: WorkloadAnalysis;
  hasChanges: boolean;
}

interface MetricRowProps {
  label: string;
  value: string;
  emphasized?: boolean;
}

function MetricRow({ label, value, emphasized }: MetricRowProps) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-1.5 text-xs',
        emphasized && 'font-medium',
      )}
    >
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export function ComparisonPanel({
  baseline,
  simulated,
  baselineAnalysis,
  simulatedAnalysis,
  hasChanges,
}: ComparisonPanelProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const bandKey = (band: WorkloadAnalysis['band']) =>
    `insights.pressure.${band}` as const;

  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-1 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('simulation.compare.title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('simulation.compare.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3 text-2xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-sm bg-chart-1" />
            {t('simulation.compare.baseline')}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span aria-hidden="true" className="size-2 rounded-sm bg-primary" />
            {t('simulation.compare.simulated')}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-muted/30 p-3">
          <p className="label-caps">{t('simulation.compare.baseline')}</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
            {format.duration(baseline.totals.plannedMinutes)}
          </p>
          <p className="text-2xs text-muted-foreground">{t('simulation.compare.planned')}</p>
          <dl className="mt-3 flex flex-col divide-y divide-border/70">
            <MetricRow
              label={t('simulation.compare.unscheduled')}
              value={format.duration(baseline.totals.unscheduledMinutes)}
            />
            <MetricRow
              label={t('simulation.compare.available')}
              value={format.duration(baseline.totals.remainingCapacityMinutes)}
            />
            <MetricRow
              label={t('simulation.compare.conflicts')}
              value={format.number(baseline.conflicts.length)}
            />
            <MetricRow
              label={t('simulation.compare.pressure')}
              value={`${t(bandKey(baselineAnalysis.band))} · ${baselineAnalysis.score}`}
              emphasized
            />
          </dl>
        </div>

        <div className="rounded-md border border-primary/25 bg-primary-soft/40 p-3">
          <p className="label-caps text-primary">{t('simulation.compare.simulated')}</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums text-foreground">
            {format.duration(simulated.totals.plannedMinutes)}
          </p>
          <p className="text-2xs text-muted-foreground">{t('simulation.compare.planned')}</p>
          <dl className="mt-3 flex flex-col divide-y divide-border/70">
            <MetricRow
              label={t('simulation.compare.unscheduled')}
              value={format.duration(simulated.totals.unscheduledMinutes)}
            />
            <MetricRow
              label={t('simulation.compare.available')}
              value={format.duration(simulated.totals.remainingCapacityMinutes)}
            />
            <MetricRow
              label={t('simulation.compare.conflicts')}
              value={format.number(simulated.conflicts.length)}
            />
            <MetricRow
              label={t('simulation.compare.pressure')}
              value={`${t(bandKey(simulatedAnalysis.band))} · ${simulatedAnalysis.score}`}
              emphasized
            />
          </dl>
          <p className="mt-3 text-2xs leading-relaxed text-muted-foreground">
            {hasChanges ? t('simulation.compare.chartSubtitle') : t('simulation.compare.chartEmpty')}
          </p>
        </div>
      </div>
    </section>
  );
}
