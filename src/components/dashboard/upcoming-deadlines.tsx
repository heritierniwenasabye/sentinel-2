import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarX2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import type { ScheduleResult, Task } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { useFormatters } from '@/hooks/use-formatters';
import { remainingMinutesForTask } from '@/lib/scheduling/engine';
import { cn } from '@/lib/utils';

interface UpcomingDeadlinesProps {
  tasks: Task[];
  schedule: ScheduleResult;
}

const PRIORITY_LABEL: Record<Task['priority'], string> = {
  low: 'common.priorityLow',
  medium: 'common.priorityMedium',
  high: 'common.priorityHigh',
};

const PRIORITY_TONE: Record<Task['priority'], 'neutral' | 'warning' | 'critical'> = {
  low: 'neutral',
  medium: 'warning',
  high: 'critical',
};

export function UpcomingDeadlines({ tasks, schedule }: UpcomingDeadlinesProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const now = Date.now();

  const upcoming = tasks
    .filter((task) => !task.completed)
    .sort((a, b) => parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime())
    .slice(0, 5);

  return (
    <SectionCard
      title={t('overview.deadlines.title')}
      subtitle={t('overview.deadlines.subtitle')}
      className="h-full"
      action={
        <Link
          to="/planner"
          className="flex items-center gap-1 text-2xs font-medium text-primary hover:underline"
        >
          {t('overview.deadlines.openPlanner')}
          <ArrowRight aria-hidden="true" className="size-3" />
        </Link>
      }
    >
      {upcoming.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={t('overview.deadlines.empty')}
          hint={t('overview.deadlines.emptyHint')}
          compact
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {upcoming.map((task) => {
            const overdue = parseISO(task.deadline).getTime() < now;
            const remaining = remainingMinutesForTask(task, schedule);
            return (
              <li key={task.id} className="flex flex-col gap-1 py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {task.title}
                  </p>
                  <Badge tone={PRIORITY_TONE[task.priority]}>
                    {t(PRIORITY_LABEL[task.priority])}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
                  <span className="truncate">{task.course || t('overview.deadlines.noCourse')}</span>
                  <span aria-hidden="true">·</span>
                  <span className={cn('tabular-nums', overdue && 'text-critical')}>
                    {overdue
                      ? t('overview.deadlines.overdue')
                      : t('overview.deadlines.due', { date: format.dateTime(task.deadline) })}
                  </span>
                </div>
                <p className="text-2xs tabular-nums text-muted-foreground">
                  {t('overview.deadlines.remaining')}: {format.duration(remaining)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
