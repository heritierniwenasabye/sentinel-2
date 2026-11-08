import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { UnscheduledItem } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { Badge } from '@/components/ui/badge';
import { useFormatters } from '@/hooks/use-formatters';

export function UnscheduledList({ items }: { items: UnscheduledItem[] }) {
  const { t } = useTranslation();
  const format = useFormatters();

  return (
    <SectionCard title={t('planner.unscheduledTitle')} subtitle={t('planner.unscheduledSubtitle')}>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
          <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-success" />
          {t('planner.unscheduledEmpty')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.taskId} className="rounded-md border border-critical/25 bg-critical/5 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 flex-1 text-xs font-medium text-foreground">{item.title}</p>
                <Badge tone="critical">{format.duration(item.minutesRemaining)}</Badge>
              </div>
              <p className="mt-1 flex items-start gap-1.5 text-2xs leading-relaxed text-muted-foreground">
                <AlertCircle aria-hidden="true" className="mt-0.5 size-3 shrink-0" />
                {item.reason === 'overdue'
                  ? t('planner.unscheduledReasonOverdue')
                  : t('planner.unscheduledReasonInsufficient')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
