import type { Insight, ScheduleConflict, ScheduleResult, UserPreferences, WorkloadAnalysis } from '@/types';
import type { HabitsSummary } from '@/lib/analytics/habits';

/**
 * Builds data-driven observations. `formatDay` receives a `yyyy-MM-dd` key and
 * returns a localised weekday/date label, so translations stay in the UI layer.
 */
export function buildWorkloadInsights(
  schedule: ScheduleResult,
  analysis: WorkloadAnalysis,
  habits: HabitsSummary | null,
  preferences: UserPreferences,
  formatDay: (dateKey: string) => string,
): Insight[] {
  const insights: Insight[] = [];
  const totals = schedule.totals;

  const overdue = schedule.unscheduled.filter((item) => item.reason === 'overdue');
  if (overdue.length > 0) {
    insights.push({
      id: 'overdue',
      key: 'insights.generated.overdue',
      params: { count: overdue.length },
      tone: 'critical',
    });
  }

  if (totals.unscheduledMinutes > 0) {
    insights.push({
      id: 'unscheduled',
      key: 'insights.generated.unscheduled',
      params: { hours: Math.round((totals.unscheduledMinutes / 60) * 10) / 10 },
      tone: 'critical',
    });
  }

  const overlaps = schedule.conflicts.filter(
    (conflict: ScheduleConflict) => conflict.type === 'commitment-overlap',
  );
  if (overlaps.length > 0) {
    insights.push({
      id: 'overlaps',
      key: 'insights.generated.conflicts',
      params: { count: overlaps.length },
      tone: 'warning',
    });
  }

  if (analysis.longestConsecutiveMinutes >= 120) {
    insights.push({
      id: 'consecutive',
      key: 'insights.generated.consecutive',
      params: { minutes: analysis.longestConsecutiveMinutes },
      tone: analysis.longestConsecutiveMinutes >= 180 ? 'warning' : 'info',
    });
  }

  if (analysis.daysWithoutBreak > 0) {
    const heavyDay = schedule.days.find(
      (day) =>
        day.studyMinutes > 0 &&
        analysis.overloadedDays.some((overloaded) => overloaded.date === day.date),
    );
    insights.push({
      id: 'breaks',
      key: 'insights.generated.noBreak',
      params: {
        day: formatDay(heavyDay?.date ?? analysis.overloadedDays[0]?.date ?? schedule.days[0]?.date ?? ''),
        minutes: preferences.minBreakMinutes,
        count: analysis.daysWithoutBreak,
      },
      tone: 'warning',
    });
  }

  const heaviestFixed = [...schedule.days].sort((a, b) => b.fixedMinutes - a.fixedMinutes)[0];
  if (heaviestFixed && heaviestFixed.fixedMinutes >= 300) {
    insights.push({
      id: 'fixedDay',
      key: 'insights.generated.highFixedDay',
      params: {
        day: formatDay(heaviestFixed.date),
        hours: Math.round((heaviestFixed.fixedMinutes / 60) * 10) / 10,
      },
      tone: 'info',
    });
  }

  if (habits && habits.recentMinutes > 0) {
    const screenHours = Math.round((habits.recentMinutes / 60) * 10) / 10;
    const studyHours = Math.round((totals.plannedMinutes / 60) * 10) / 10;
    if (habits.recentMinutes > totals.plannedMinutes && totals.plannedMinutes > 0) {
      insights.push({
        id: 'screenTime',
        key: 'insights.generated.screenTime',
        params: { hours: screenHours, studyHours },
        tone: 'info',
      });
    }
  }

  if (analysis.breakOpportunities > 0) {
    insights.push({
      id: 'breakChances',
      key: 'insights.generated.breaksAvailable',
      params: { count: analysis.breakOpportunities },
      tone: 'positive',
    });
  }

  if (totals.demandMinutes > 0 && totals.unscheduledMinutes === 0 && schedule.conflicts.length === 0) {
    insights.push({
      id: 'fits',
      key: 'insights.generated.fits',
      params: { hours: Math.round((totals.plannedMinutes / 60) * 10) / 10 },
      tone: 'positive',
    });
  } else if (totals.remainingCapacityMinutes >= 120 && totals.unscheduledMinutes === 0) {
    insights.push({
      id: 'headroom',
      key: 'insights.generated.headroom',
      params: { hours: Math.round((totals.remainingCapacityMinutes / 60) * 10) / 10 },
      tone: 'positive',
    });
  }

  if (totals.plannedMinutes === 0 && totals.demandMinutes === 0) {
    insights.push({ id: 'noStudy', key: 'insights.generated.noStudy', tone: 'info' });
  }

  return insights;
}

/** A short, single-sentence observation used on the Overview dashboard. */
export function buildPlanningInsight(
  schedule: ScheduleResult,
  analysis: WorkloadAnalysis,
  formatDay: (dateKey: string) => string,
): Insight | null {
  if (schedule.infeasible) {
    const next = schedule.unscheduled[0];
    if (next) {
      return {
        id: 'planning-unscheduled',
        key: 'overview.insight.unscheduled',
        params: { title: next.title, minutes: next.minutesRemaining },
        tone: 'critical',
      };
    }
  }

  const heaviest = [...schedule.days].sort((a, b) => b.fixedMinutes - a.fixedMinutes)[0];
  if (heaviest && heaviest.fixedMinutes >= 240) {
    return {
      id: 'planning-fixed',
      key: 'overview.insight.fixedLoad',
      params: { day: formatDay(heaviest.date), hours: Math.round((heaviest.fixedMinutes / 60) * 10) / 10 },
      tone: 'info',
    };
  }

  if (analysis.longestConsecutiveMinutes >= 120) {
    return {
      id: 'planning-consecutive',
      key: 'overview.insight.longSession',
      params: { minutes: analysis.longestConsecutiveMinutes },
      tone: 'warning',
    };
  }

  if (schedule.totals.plannedMinutes > 0) {
    return {
      id: 'planning-balanced',
      key: 'overview.insight.balanced',
      params: {
        hours: Math.round((schedule.totals.plannedMinutes / 60) * 10) / 10,
        remaining: Math.round((schedule.totals.remainingCapacityMinutes / 60) * 10) / 10,
      },
      tone: 'positive',
    };
  }

  return null;
}
