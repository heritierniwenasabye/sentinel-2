import { useTranslation } from 'react-i18next';
import { CalendarClock, Pencil, Repeat, Trash2 } from 'lucide-react';
import { parseISO } from 'date-fns';
import type { CommitmentCategory, CommitmentOccurrence } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { useFormatters } from '@/hooks/use-formatters';
import { durationMinutes, toDateKey } from '@/lib/date';

interface CommitmentListProps {
  commitments: CommitmentOccurrence[];
  onEdit: (occurrence: CommitmentOccurrence) => void;
  onDelete: (occurrence: CommitmentOccurrence) => void;
  onAdd?: () => void;
}

const CATEGORY_KEY: Record<CommitmentCategory, string> = {
  class: 'common.categoryClass',
  work: 'common.categoryWork',
  appointment: 'common.categoryAppointment',
  personal: 'common.categoryPersonal',
  rest: 'common.categoryRest',
};

const CATEGORY_DOT: Record<CommitmentCategory, string> = {
  class: 'bg-chart-1',
  work: 'bg-chart-4',
  appointment: 'bg-muted-foreground',
  personal: 'bg-foreground/60',
  rest: 'bg-success/70',
};

export function CommitmentList({ commitments, onEdit, onDelete, onAdd }: CommitmentListProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const sorted = [...commitments].sort(
    (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime(),
  );

  const groups = sorted.reduce<{ date: string; items: CommitmentOccurrence[] }[]>(
    (accumulator, item) => {
      const key = toDateKey(parseISO(item.start));
      const existing = accumulator.find((group) => group.date === key);
      if (existing) existing.items.push(item);
      else accumulator.push({ date: key, items: [item] });
      return accumulator;
    },
    [],
  );

  return (
    <SectionCard
      title={t('planner.commitmentsTitle')}
      subtitle={t('planner.commitmentsSubtitle')}
      action={
        <span className="text-2xs tabular-nums text-muted-foreground">
          {t('common.entriesCount', { count: commitments.length })}
        </span>
      }
    >
      {groups.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={t('planner.commitmentsEmpty')}
          hint={t('planner.commitmentsEmptyHint')}
          compact
          action={
            onAdd ? (
              <Button size="sm" variant="secondary" onClick={onAdd}>
                {t('planner.newCommitment')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <div key={group.date}>
              <p className="label-caps pb-1.5">{format.weekday(group.date)}</p>
              <ul className="flex flex-col divide-y divide-border">
                {group.items.map((commitment) => (
                  <li
                    key={commitment.occurrenceId}
                    className="flex items-start gap-2 py-2 first:pt-0 last:pb-0"
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-1.5 shrink-0 rounded-full ${CATEGORY_DOT[commitment.category]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm text-foreground">
                        <span className="truncate">{commitment.title}</span>
                        {commitment.isRecurring ? (
                          <span
                            title={t('recurrence.weekly')}
                            aria-label={t('recurrence.weekly')}
                            className="text-muted-foreground"
                          >
                            <Repeat aria-hidden="true" className="size-3" />
                          </span>
                        ) : null}
                        {commitment.seriesId ? (
                          <span
                            title={t('recurrence.detached')}
                            aria-label={t('recurrence.detached')}
                            className="text-2xs text-muted-foreground"
                          >
                            *
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-2xs tabular-nums text-muted-foreground">
                        <span>
                          {format.time(commitment.start)}–{format.time(commitment.end)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{format.duration(durationMinutes(commitment.start, commitment.end))}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t(CATEGORY_KEY[commitment.category])}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onEdit(commitment)}
                        aria-label={`${t('common.edit')}: ${commitment.title}`}
                      >
                        <Pencil aria-hidden="true" className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(commitment)}
                        aria-label={`${t('common.delete')}: ${commitment.title}`}
                        className="hover:text-critical"
                      >
                        <Trash2 aria-hidden="true" className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
