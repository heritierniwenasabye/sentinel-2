import { addDays } from 'date-fns';
import { useClock } from '@/hooks/use-clock';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/page-header';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { WorkloadChart } from '@/components/dashboard/workload-chart';
import { TodaySchedule } from '@/components/dashboard/today-schedule';
import { UpcomingDeadlines } from '@/components/dashboard/upcoming-deadlines';
import { PlanningInsight } from '@/components/dashboard/planning-insight';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { TaskDialog } from '@/components/planner/task-dialog';
import { useApp } from '@/hooks/use-app';
import { useWeekSchedule } from '@/hooks/use-schedule';
import { useFormatters } from '@/hooks/use-formatters';
import { analyzeWorkload } from '@/lib/analytics/workload';
import { startOfWeekMonday, toDateKey } from '@/lib/date';
import { Badge } from '@/components/ui/badge';

export function OverviewPage() {
  const { t } = useTranslation();
  const format = useFormatters();
  const { tasks, commitments, preferences, demoLoaded, loadDemo, data } = useApp();
  const { notify } = useToast();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);

  const today = useClock();
  const weekStart = useMemo(() => startOfWeekMonday(today), [today.getTime()]);
  const schedule = useWeekSchedule(weekStart);
  const analysis = useMemo(
    () => analyzeWorkload(schedule, preferences.minBreakMinutes),
    [schedule, preferences.minBreakMinutes],
  );

  const todayKey = toDateKey(today);
  const weekRange = `${format.date(weekStart, 'd MMM')} – ${format.date(addDays(weekStart, 6), 'd MMM')}`;
  const isEmpty = data.tasks.length === 0 && data.commitments.length === 0;

  return (
    <div className="page-enter flex flex-col gap-5">
      <PageHeader
        title={t('overview.title')}
        subtitle={t('overview.subtitle')}
        meta={
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>{format.date(today, 'EEEE d MMMM yyyy')}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">{t('overview.currentWeek', { range: weekRange })}</span>
            {demoLoaded ? <Badge tone="accent">{t('overview.demoNotice')}</Badge> : null}
          </div>
        }
        actions={
          <Button onClick={() => setTaskDialogOpen(true)}>
            <Plus aria-hidden="true" />
            {t('overview.newTask')}
          </Button>
        }
      />

      {isEmpty ? (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Sparkles aria-hidden="true" className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">{t('planner.tasksEmpty')}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{t('overview.workload.emptyHint')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setConfirmDemo(true)}>
              {t('settings.data.confirmDemo')}
            </Button>
            <Button onClick={() => setTaskDialogOpen(true)}>
              <Plus aria-hidden="true" />
              {t('overview.newTask')}
            </Button>
          </div>
        </div>
      ) : null}

      <MetricCards schedule={schedule} tasks={tasks} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <WorkloadChart schedule={schedule} />
        </div>
        <PlanningInsight schedule={schedule} analysis={analysis} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <TodaySchedule schedule={schedule} commitments={commitments} todayKey={todayKey} />
        </div>
        <UpcomingDeadlines tasks={tasks} schedule={schedule} />
      </div>

      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />

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
    </div>
  );
}
