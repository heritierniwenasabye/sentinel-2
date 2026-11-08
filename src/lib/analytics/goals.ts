import type { DigitalUsageEntry, UsageGoal } from '@/types';
import { toDateKey } from '@/lib/date';
export function goalProgress(goal: UsageGoal, usage: DigitalUsageEntry[], now: Date) {
  const rows = usage.filter(entry => entry.date === toDateKey(now) && entry.app.trim().toLowerCase() === goal.app.trim().toLowerCase());
  const minutes = rows.reduce((sum, row) => sum + row.minutes, 0);
  return { recorded: rows.length > 0, minutes, remaining: Math.max(0, goal.dailyLimitMinutes - minutes), over: Math.max(0, minutes - goal.dailyLimitMinutes) };
}
