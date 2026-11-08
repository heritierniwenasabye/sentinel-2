import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock } from 'lucide-react';
import { parseISO } from 'date-fns';
import type { Commitment, ScheduleResult } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/common/empty-state';
import { useFormatters } from '@/hooks/use-formatters';
import { toDateKey, durationMinutes } from '@/lib/date';

interface TodayScheduleProps {
  schedule: ScheduleResult;
  commitments: Commitment[];
  todayKey: string;
}

interface ScheduleItem {
  id: string;
  title: string;
  start: string;
  end: string;
  minutes: number;
  kind: 'study' | 'commitment';
  meta: string;
}

const CATEGORY_KEY: Record<Commitment['category'], string> = {
  class: 'common.categoryClass',
  work: 'common.categoryWork',
  appointment: 'common.categoryAppointment',
  personal: 'common.categoryPersonal',
  rest: 'common.categoryRest',
};

export function TodaySchedule({ schedule, commitments, todayKey }: TodayScheduleProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const items: ScheduleItem[] = [
    ...schedule.blocks
      .filter((block) => toDateKey(parseISO(block.start)) === todayKey)
      .map((block) => ({
        id: block.id,
        title: block.taskTitle,
        start: block.start,
        end: block.end,
        minutes: block.minutes,
        kind: 'study' as const,
        meta: block.course || t('overview.today.studyBlock'),
      })),
    ...commitments
      .filter((commitment) => toDateKey(parseISO(commitment.start)) === todayKey)
      .map((commitment) => ({
        id: commitment.id,
        title: commitment.title,
        start: commitment.start,
        end: commitment.end,
        minutes: durationMinutes(commitment.start, commitment.end),
        kind: 'commitment' as const,
        meta: t(CATEGORY_KEY[commitment.category]),
      })),
  ].sort((a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime());

  return (
    <SectionCard
      title={t('overview.today.title')}
      subtitle={t('overview.today.subtitle')}
      className="h-full"
      action={
        <span className="text-2xs tabular-nums text-muted-foreground">
          {format.date(`${todayKey}T12:00:00`, 'EEE d MMM')}
        </span>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={t('overview.today.empty')}
          hint={t('overview.today.emptyHint')}
          compact
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="w-[86px] shrink-0 text-2xs tabular-nums text-muted-foreground">
                <p className="font-medium text-foreground">
                  {format.time(item.start)}–{format.time(item.end)}
                </p>
                <p className="mt-0.5 flex items-center gap-1">
                  <Clock aria-hidden="true" className="size-3" />
                  {format.duration(item.minutes)}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                <p className="mt-0.5 truncate text-2xs text-muted-foreground">{item.meta}</p>
              </div>
              <Badge tone={item.kind === 'study' ? 'accent' : 'outline'}>
                {item.kind === 'study' ? t('overview.today.studyBlock') : item.meta}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
