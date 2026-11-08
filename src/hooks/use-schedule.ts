import { useMemo } from 'react';
import { useClock } from '@/hooks/use-clock';
import { buildSchedule } from '@/lib/scheduling/engine';
import { useApp } from '@/hooks/use-app';
import type { ScheduleResult } from '@/types';

/**
 * Computes the weekly schedule for the given week. Recomputed only when the
 * underlying data or the week changes; the scheduling engine stays pure.
 */
export function useWeekSchedule(weekStart: Date): ScheduleResult {
  const { tasks, commitments, preferences } = useApp();
  const now = useClock();
  const weekKey = weekStart.getTime();

  return useMemo(
    () => buildSchedule({ tasks, commitments, preferences, weekStart, now }),
    // weekKey stands in for the Date instance to keep the dependency stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, commitments, preferences, weekKey, now],
  );
}
