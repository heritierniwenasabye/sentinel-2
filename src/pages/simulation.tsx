import { addDays } from 'date-fns';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, RotateCcw, TriangleAlert } from 'lucide-react';
import type { ScenarioOp } from '@/types';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ScenarioBuilder } from '@/components/simulation/scenario-builder';
import { PendingChanges } from '@/components/simulation/pending-changes';
import { ComparisonPanel } from '@/components/simulation/comparison-panel';
import { ComparisonChart } from '@/components/simulation/comparison-chart';
import { Explanations } from '@/components/simulation/explanations';
import { useClock } from '@/hooks/use-clock';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { compareScenario } from '@/lib/simulation/engine';
import { describeOp } from '@/lib/simulation/describe';
import { useFormatters } from '@/hooks/use-formatters';
import { commitScenario } from '@/lib/simulation/scenario';
import { analyzeWorkload } from '@/lib/analytics/workload';
import { startOfWeekMonday } from '@/lib/date';

export function SimulationPage() {
  const { t } = useTranslation();
  const { data, preferences, replaceData } = useApp();
  const format = useFormatters();
  const { notify } = useToast();
  const [ops, setOps] = useState<ScenarioOp[]>([]);
  const [applyOpen, setApplyOpen] = useState(false);

  const now = useClock();
  const weekKey = startOfWeekMonday(now).getTime();
  const weekStart = useMemo(() => new Date(weekKey), [weekKey]);
  const comparison = useMemo(
    () => compareScenario(data, { weekStart, ops, now }),
    [data, weekStart, ops, now],
  );

  const baselineAnalysis = useMemo(
    () => analyzeWorkload(comparison.baseline, preferences.minBreakMinutes),
    [comparison.baseline, preferences.minBreakMinutes],
  );
  const simulatedAnalysis = useMemo(
    () => analyzeWorkload(comparison.simulated, preferences.minBreakMinutes),
    [comparison.simulated, preferences.minBreakMinutes],
  );

  const hasChanges = ops.length > 0;
  const includesScreenTime = ops.some((op) => op.type === 'screen-time');

  const handleApply = () => {
    replaceData(commitScenario(data, ops, weekStart));
    setOps([]);
    notify({ title: t('simulation.actions.applied') });
  };

  return (
    <div className="page-enter flex flex-col gap-5">
      <PageHeader
        title={t('simulation.title')}
        subtitle={t('simulation.subtitle')}
        meta={<div className="flex max-w-2xl flex-col gap-1 text-xs leading-relaxed text-muted-foreground"><p>{t('simulation.intro')}</p><p>{t('simulation.weekScope', { start: format.date(weekStart, 'd MMM'), end: format.date(addDays(weekStart, 6), 'd MMM yyyy') })}</p></div>}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setOps([]);
                notify({ title: t('simulation.actions.resetDone') });
              }}
              disabled={!hasChanges}
            >
              <RotateCcw aria-hidden="true" />
              {t('simulation.actions.reset')}
            </Button>
            <Button onClick={() => setApplyOpen(true)} disabled={!hasChanges}>
              <Play aria-hidden="true" />
              {t('simulation.actions.apply')}
            </Button>
          </>
        }
      />

      {hasChanges ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary-soft/50 px-3 py-2 text-xs leading-relaxed text-foreground"
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-primary" />
          {t('simulation.compare.pendingBanner', { count: ops.length })}
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ScenarioBuilder
            weekStart={weekStart}
            tasks={data.tasks}
            commitments={data.commitments}
            preferences={preferences}
            onAdd={(op) => setOps((current) => [...current, op])}
          />
          <PendingChanges
            ops={ops}
            data={data}
            onRemove={(index) =>
              setOps((current) => current.filter((_, position) => position !== index))
            }
          />
          {includesScreenTime ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
              {t('simulation.actions.screenTimeNote')}
            </p>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <ComparisonPanel
            baseline={comparison.baseline}
            simulated={comparison.simulated}
            baselineAnalysis={baselineAnalysis}
            simulatedAnalysis={simulatedAnalysis}
            hasChanges={hasChanges}
          />
          <ComparisonChart baseline={comparison.baseline} simulated={comparison.simulated} />
          <Explanations explanations={comparison.explanations} />
        </div>
      </div>

      <ConfirmDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        title={t('simulation.actions.applyTitle')}
        description={t('simulation.actions.applyDescription')}
        confirmLabel={t('simulation.actions.applyConfirm')}
        cancelLabel={t('simulation.actions.cancel')}
        onConfirm={handleApply}
        details={
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-md border border-border bg-muted/40 p-2.5">
            {ops.map((op, index) => (
              <li key={index} className="flex flex-col gap-0.5 text-xs leading-relaxed text-foreground">
                {describeOp(op, data, format).map((line, lineIndex) => (
                  <p key={lineIndex}>{t(line.key, line.params)}</p>
                ))}
              </li>
            ))}
          </ul>
        }
      />
    </div>
  );
}
