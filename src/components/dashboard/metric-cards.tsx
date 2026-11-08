import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarClock, Clock3, Timer } from 'lucide-react';
import type { ScheduleResult, Task } from '@/types';
import { StatCard } from '@/components/common/stat-card';
import { useFormatters } from '@/hooks/use-formatters';
import { parseISO } from 'date-fns';

interface MetricCardsProps {
  schedule: ScheduleResult;
  tasks: Task[];
}

export function MetricCards({ schedule, tasks }: MetricCardsProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const now = Date.now();
  const weekAhead = now + 7 * 24 * 60 * 60 * 1000;

  const upcoming = tasks.filter((task) => {
    if (task.completed) return false;
    const deadline = parseISO(task.deadline).getTime();
    return deadline >= now && deadline <= weekAhead;
  });

  const conflicts = schedule.conflicts.length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        label={t('overview.metrics.plannedStudy')}
        value={format.duration(schedule.totals.plannedMinutes)}
        hint={t('overview.metrics.plannedStudyHint')}
        icon={Timer}
      />
      <StatCard
        label={t('overview.metrics.deadlines')}
        value={format.number(upcoming.length)}
        hint={t('overview.metrics.deadlinesHint', { count: upcoming.length })}
        icon={CalendarClock}
      />
      <StatCard
        label={t('overview.metrics.available')}
        value={format.duration(schedule.totals.remainingCapacityMinutes)}
        hint={t('overview.metrics.availableHint')}
        icon={Clock3}
      />
      <StatCard
        label={t('overview.metrics.conflicts')}
        value={format.number(conflicts)}
        hint={t('overview.metrics.conflictsHint')}
        icon={AlertTriangle}
        tone={conflicts > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}
