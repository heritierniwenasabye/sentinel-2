import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormatters } from '@/hooks/use-formatters';

interface WeekNavigatorProps {
  weekStart: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  isCurrentWeek: boolean;
}

export function WeekNavigator({
  weekStart,
  onPrevious,
  onNext,
  onToday,
  isCurrentWeek,
}: WeekNavigatorProps) {
  const { t } = useTranslation();
  const format = useFormatters();
  const weekEnd = new Date(weekStart.getTime() + 6 * 86400000);

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrevious}
          aria-label={t('planner.previousWeek')}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <p className="min-w-[150px] text-center text-sm font-medium tabular-nums text-foreground sm:min-w-[190px]">
          {t('planner.weekRange', {
            start: format.date(weekStart, 'd MMM'),
            end: format.date(weekEnd, 'd MMM yyyy'),
          })}
        </p>
        <Button variant="ghost" size="icon-sm" onClick={onNext} aria-label={t('planner.nextWeek')}>
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={onToday}
        disabled={isCurrentWeek}
        className="self-start sm:self-auto"
      >
        {t('planner.thisWeek')}
      </Button>
    </div>
  );
}
