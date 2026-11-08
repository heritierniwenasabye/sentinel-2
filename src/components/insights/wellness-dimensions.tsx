import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Activity, BookOpen, HeartHandshake, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CommitmentOccurrence, ScheduleResult, WorkloadAnalysis } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';
import { durationMinutes } from '@/lib/date';

interface WellnessDimensionsProps {
  schedule: ScheduleResult;
  analysis: WorkloadAnalysis;
  commitments: CommitmentOccurrence[];
  tasks: { completed: boolean }[];
  sleepStart: string;
  sleepEnd: string;
  workMinutes: number;
}

interface DimensionCard {
  key: 'intellectual' | 'emotional' | 'financial' | 'physical';
  icon: LucideIcon;
  metric: string | null;
  action: string;
  to: string;
}

export function WellnessDimensions({
  schedule,
  analysis,
  commitments,
  tasks,
  sleepStart,
  sleepEnd,
  workMinutes,
}: WellnessDimensionsProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const openTasks = tasks.filter((task) => !task.completed).length;
  const workCommitments = commitments.filter((commitment) => commitment.category === 'work').length;

  const cards: DimensionCard[] = [
    {
      key: 'intellectual',
      icon: BookOpen,
      metric:
        openTasks > 0
          ? t('wellness.intellectual.metric', {
              scheduled: schedule.totals.scheduledTaskCount,
              total: openTasks,
              planned: format.duration(schedule.totals.plannedMinutes),
            })
          : null,
      action: t('wellness.intellectual.action'),
      to: '/planner',
    },
    {
      key: 'emotional',
      icon: HeartHandshake,
      metric: t('wellness.emotional.metric', {
        score: analysis.score,
        unscheduled: format.duration(schedule.totals.unscheduledMinutes),
      }),
      action: t('wellness.emotional.action'),
      to: '/simulation',
    },
    {
      key: 'financial',
      icon: Wallet,
      metric:
        workCommitments > 0
          ? t('wellness.financial.metric', {
              hours: format.duration(workMinutes),
              count: workCommitments,
            })
          : null,
      action: t('wellness.financial.action'),
      to: '/simulation',
    },
    {
      key: 'physical',
      icon: Activity,
      metric: t('wellness.physical.metric', {
        sleep: `${sleepStart}–${sleepEnd}`,
        breaks: analysis.breakOpportunities,
      }),
      action: t('wellness.physical.action'),
      to: '/settings',
    },
  ];

  const restMinutes = commitments
    .filter((commitment) => commitment.category === 'rest')
    .reduce((total, commitment) => total + durationMinutes(commitment.start, commitment.end), 0);

  return (
    <SectionCard title={t('wellness.title')} subtitle={t('wellness.subtitle')}>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.key}
              className="flex flex-col gap-1.5 rounded-md border border-border p-3"
            >
              <p className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <span className="flex size-6 items-center justify-center rounded-sm bg-primary-soft text-primary">
                  <Icon aria-hidden="true" className="size-3.5" />
                </span>
                {t(`wellness.${card.key}.title`)}
              </p>
              <p className="text-2xs leading-relaxed text-muted-foreground">
                {t(`wellness.${card.key}.body`)}
              </p>
              <p className="mt-0.5 text-2xs tabular-nums text-foreground">
                {card.metric ?? t('wellness.notEnough')}
              </p>
              <Link
                to={card.to}
                className="mt-auto pt-1 text-2xs font-medium text-primary hover:underline"
              >
                {card.action} →
              </Link>
            </article>
          );
        })}
      </div>
      {restMinutes > 0 ? (
        <p className="mt-3 text-2xs tabular-nums text-muted-foreground">
          {t('planner.legendCommitment')} · {format.duration(restMinutes)}
        </p>
      ) : null}
    </SectionCard>
  );
}
