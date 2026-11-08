import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { ScheduleConflict } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { useFormatters } from '@/hooks/use-formatters';

export function ConflictList({ conflicts }: { conflicts: ScheduleConflict[] }) {
  const { t } = useTranslation();
  const format = useFormatters();

  return (
    <SectionCard title={t('planner.conflictsTitle')} subtitle={t('planner.conflictsSubtitle')}>
      {conflicts.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
          {t('planner.conflictsEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {conflicts.map((conflict) => (
            <li
              key={conflict.id}
              className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/5 px-3 py-2"
            >
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 size-3.5 shrink-0 text-warning"
              />
              <p className="text-xs leading-relaxed text-foreground">
                {conflict.type === 'commitment-overlap'
                  ? t('planner.conflictOverlap', {
                      a: conflict.titles[0],
                      b: conflict.titles[1],
                      minutes: conflict.minutes ?? 0,
                      date: conflict.date ? format.date(`${conflict.date}T12:00:00`, 'EEE d MMM') : '',
                    })
                  : t('planner.conflictOverdue', {
                      title: conflict.titles[0],
                      date: conflict.date ? format.date(`${conflict.date}T12:00:00`, 'd MMM') : '',
                    })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
