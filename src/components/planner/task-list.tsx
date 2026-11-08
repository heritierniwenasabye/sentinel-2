import { useTranslation } from 'react-i18next';
import { Check, Pencil, Trash2 } from 'lucide-react';
import type { ScheduleResult, Task } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { useFormatters } from '@/hooks/use-formatters';
import { remainingMinutesForTask } from '@/lib/scheduling/engine';
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { ClipboardList } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  schedule: ScheduleResult;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAdd?: () => void;
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

export function TaskList({ tasks, schedule, onToggle, onEdit, onDelete, onAdd }: TaskListProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const sorted = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
  });

  return (
    <SectionCard
      title={t('planner.tasksTitle')}
      subtitle={t('planner.tasksSubtitle')}
      action={
        <span className="text-2xs tabular-nums text-muted-foreground">
          {t('common.tasksCount', { count: tasks.length })}
        </span>
      }
    >
      {sorted.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={t('planner.tasksEmpty')}
          hint={t('planner.tasksEmptyHint')}
          compact
          action={
            onAdd ? (
              <Button size="sm" variant="secondary" onClick={onAdd}>
                {t('planner.newTask')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {sorted.map((task) => {
            const remaining = remainingMinutesForTask(task, schedule);
            return (
              <li
                key={task.id}
                className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0 sm:items-center"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={task.completed}
                  aria-label={
                    task.completed
                      ? t('planner.markIncomplete')
                      : t('planner.markComplete')
                  }
                  onClick={() => onToggle(task.id)}
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors sm:mt-0',
                    task.completed
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-card hover:border-primary',
                  )}
                >
                  {task.completed ? <Check aria-hidden="true" className="size-3" /> : null}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'truncate text-sm font-medium text-foreground',
                      task.completed && 'text-muted-foreground line-through',
                    )}
                    title={task.description || task.title}
                  >
                    {task.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-2xs text-muted-foreground">
                    <span className="truncate">{task.course || t('overview.deadlines.noCourse')}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {t('overview.deadlines.due', { date: format.date(task.deadline, 'd MMM, HH:mm') })}
                    </span>
                    {!task.completed ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {t('planner.remaining', { minutes: remaining })}
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Badge tone={PRIORITY_TONE[task.priority]} className="hidden sm:inline-flex">
                    {t(PRIORITY_LABEL[task.priority])}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onEdit(task)}
                    aria-label={`${t('common.edit')}: ${task.title}`}
                  >
                    <Pencil aria-hidden="true" className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(task)}
                    aria-label={`${t('common.delete')}: ${task.title}`}
                    className="hover:text-critical"
                  >
                    <Trash2 aria-hidden="true" className="size-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
