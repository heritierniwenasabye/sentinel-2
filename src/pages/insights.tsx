import { useClock } from '@/hooks/use-clock';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays } from 'date-fns';
import { AlertTriangle, CalendarClock, Clock3, Coffee, ListChecks, Timer, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { StatCard } from '@/components/common/stat-card';
import { PressureCard } from '@/components/insights/pressure-card';
import { InsightList } from '@/components/insights/insight-list';
import { WellnessDimensions } from '@/components/insights/wellness-dimensions';
import { useApp } from '@/hooks/use-app';
import { useWeekSchedule } from '@/hooks/use-schedule';
import { useFormatters } from '@/hooks/use-formatters';
import { analyzeWorkload, PRESSURE_WEIGHTS } from '@/lib/analytics/workload';
import { buildWorkloadInsights } from '@/lib/analytics/insights';
import { summarizeUsage } from '@/lib/analytics/habits';
import { durationMinutes, startOfWeekMonday, toDateKey } from '@/lib/date';
import { expandCommitments } from '@/lib/recurrence';
import { Badge } from '@/components/ui/badge';

export function InsightsPage() {
  const { t } = useTranslation();
  const format = useFormatters();
  const { usage, preferences, commitments, tasks } = useApp();
  const today = useClock();
  const todayKey = toDateKey(today);
  const weekStart = useMemo(() => startOfWeekMonday(today), [todayKey]);
  const schedule = useWeekSchedule(weekStart);

  const analysis = useMemo(
    () => analyzeWorkload(schedule, preferences.minBreakMinutes),
    [schedule, preferences.minBreakMinutes],
  );
  const habits = useMemo(() => summarizeUsage(usage), [usage]);
  const weekCommitments = useMemo(
    () => expandCommitments(commitments, weekStart, addDays(weekStart, 7)),
    [commitments, weekStart],
  );
  const workMinutes = useMemo(
    () =>
      weekCommitments
        .filter((commitment) => commitment.category === 'work')
        .reduce(
          (total, commitment) =>
            total + durationMinutes(commitment.start, commitment.end),
          0,
        ),
    [weekCommitments],
  );
  const insights = useMemo(
    () => buildWorkloadInsights(schedule, analysis, habits, preferences, (key) => format.weekday(key)),
    [schedule, analysis, habits, preferences, format],
  );

  const weeklyWorkload = schedule.totals.fixedMinutes + schedule.totals.plannedMinutes;
  const maxDayLoad = Math.max(
    1,
    ...schedule.days.map((day) => day.fixedMinutes + day.studyMinutes),
  );

  return (
    <div className="page-enter flex flex-col gap-5">
      <PageHeader
        title={t('insights.title')}
        subtitle={t('insights.subtitle')}
        meta={
          <Badge tone="outline">
            {t('insights.scopeTitle')} · {format.date(weekStart, 'd MMM')} –{' '}
            {format.date(addDays(weekStart, 6), 'd MMM')}
          </Badge>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label={t('insights.metrics.weeklyWorkload')}
          value={format.duration(weeklyWorkload)}
          hint={t('insights.metrics.weeklyWorkloadHint')}
          icon={TrendingUp}
        />
        <StatCard
          label={t('insights.metrics.plannedStudy')}
          value={format.duration(schedule.totals.plannedMinutes)}
          hint={t('insights.metrics.plannedStudyHint')}
          icon={Timer}
        />
        <StatCard
          label={t('insights.metrics.unscheduled')}
          value={format.duration(schedule.totals.unscheduledMinutes)}
          hint={t('insights.metrics.unscheduledHint', { count: analysis.unscheduledCount })}
          icon={ListChecks}
          tone={schedule.totals.unscheduledMinutes > 0 ? 'critical' : 'default'}
        />
        <StatCard
          label={t('insights.metrics.overloaded')}
          value={format.number(analysis.overloadedDays.length)}
          hint={t('insights.metrics.overloadedHint')}
          icon={AlertTriangle}
          tone={analysis.overloadedDays.length > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={t('insights.metrics.consecutive')}
          value={format.duration(analysis.longestConsecutiveMinutes)}
          hint={t('insights.metrics.consecutiveHint')}
          icon={CalendarClock}
        />
        <StatCard
          label={t('insights.metrics.breaks')}
          value={format.number(analysis.breakOpportunities)}
          hint={t('insights.metrics.breaksHint', { minutes: preferences.minBreakMinutes })}
          icon={Coffee}
        />
        <StatCard
          label={t('insights.metrics.conflicts')}
          value={format.number(analysis.conflictCount)}
          hint={t('insights.metrics.conflictsHint')}
          icon={AlertTriangle}
          tone={analysis.conflictCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={t('simulation.compare.available')}
          value={format.duration(schedule.totals.remainingCapacityMinutes)}
          hint={t('overview.metrics.availableHint')}
          icon={Clock3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PressureCard analysis={analysis} />
        <div className="lg:col-span-2">
          <InsightList insights={insights} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard title={t('insights.formula.title')} subtitle={t('insights.formula.subtitle')}>
            <ul className="flex flex-col gap-3">
              {analysis.components.map((component) => (
                <li key={component.key}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                    <p className="text-xs font-medium text-foreground">
                      {t(`insights.formula.${component.key}`)}
                    </p>
                    <p className="text-2xs tabular-nums text-muted-foreground">
                      {t('insights.formula.points', {
                        points: component.points,
                        weight: component.weight,
                      })}
                    </p>
                  </div>
                  <p className="mt-0.5 text-2xs leading-relaxed text-muted-foreground">
                    {t(`insights.formula.${component.key}Desc`)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(component.ratio * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 text-right text-2xs tabular-nums text-muted-foreground">
                      {component.unit === 'minutes'
                        ? format.duration(component.value)
                        : format.number(component.value)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-baseline justify-between border-t border-border pt-3">
              <p className="text-xs font-medium text-foreground">{t('insights.formula.total')}</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {analysis.score} / 100
              </p>
            </div>
            <p className="mt-1 text-2xs leading-relaxed text-muted-foreground">
              {t('insights.formula.totalHint')} ({Object.values(PRESSURE_WEIGHTS).join(' + ')} = 100)
            </p>
          </SectionCard>
        </div>

        <SectionCard title={t('insights.breakdown.title')} subtitle={t('insights.breakdown.subtitle')}>
          {weeklyWorkload === 0 ? (
            <p className="text-xs text-muted-foreground">{t('insights.breakdown.empty')}</p>
          ) : (
            <>
              <ul className="flex flex-col gap-2.5">
                {schedule.days.map((day) => {
                  const scale = maxDayLoad;
                  return (
                    <li key={day.date}>
                      <div className="flex items-baseline justify-between gap-2 text-2xs">
                        <span className="text-foreground">{format.weekdayShort(day.date)}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {format.duration(day.studyMinutes + day.fixedMinutes)}
                        </span>
                      </div>
                      <div className="mt-1 flex h-2 w-full overflow-hidden rounded-sm bg-muted">
                        <div
                          className="h-full bg-chart-1"
                          style={{ width: `${(day.fixedMinutes / scale) * 100}%` }}
                          aria-hidden="true"
                        />
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${(day.studyMinutes / scale) * 100}%` }}
                          aria-hidden="true"
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-3 flex items-center gap-3">
                <li className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span aria-hidden="true" className="size-2 rounded-sm bg-chart-1" />
                  {t('insights.breakdown.fixed')}
                </li>
                <li className="flex items-center gap-1.5 text-2xs text-muted-foreground">
                  <span aria-hidden="true" className="size-2 rounded-sm bg-primary" />
                  {t('insights.breakdown.study')}
                </li>
              </ul>
            </>
          )}
        </SectionCard>
      </div>

      <WellnessDimensions
        schedule={schedule}
        analysis={analysis}
        commitments={weekCommitments}
        tasks={tasks}
        sleepStart={preferences.sleepStart}
        sleepEnd={preferences.sleepEnd}
        workMinutes={workMinutes}
      />

      <p className="flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
        <Clock3 aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
        {t('insights.pressure.disclaimer')}
      </p>
    </div>
  );
}
