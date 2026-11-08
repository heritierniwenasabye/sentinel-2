import { differenceInMinutes, parseISO } from 'date-fns';
import type {
  DayLoad,
  PressureBand,
  PressureComponent,
  ScheduleResult,
  StudyBlock,
  WorkloadAnalysis,
} from '@/types';
import { toDateKey } from '@/lib/date';
import { clamp, round } from '@/lib/utils';

/**
 * Weights of the Workload Pressure planning indicator. They always total 100.
 * Every component is normalised to 0..1 before weighting, so the published
 * formula in the UI matches the computation exactly.
 */
export const PRESSURE_WEIGHTS = {
  demand: 40,
  unscheduled: 25,
  conflicts: 15,
  consecutive: 12,
  breaks: 8,
} as const;

/** Continuous study above this many minutes is treated as a full stressor. */
export const CONSECUTIVE_REFERENCE_MINUTES = 180;

/** Commitment hours in one day that count as a heavy fixed load. */
export const HEAVY_FIXED_MINUTES = 300;

interface StudyInterval {
  start: Date;
  end: Date;
}

export function studyIntervalsForDay(blocks: StudyBlock[], dateKey: string): StudyInterval[] {
  const intervals = blocks
    .filter((block) => toDateKey(parseISO(block.start)) === dateKey)
    .map((block) => ({ start: parseISO(block.start), end: parseISO(block.end) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: StudyInterval[] = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval.start.getTime() <= last.end.getTime()) {
      if (interval.end > last.end) last.end = interval.end;
    } else {
      merged.push({ start: interval.start, end: interval.end });
    }
  }
  return merged;
}

export function pressureBand(score: number): PressureBand {
  if (score < 34) return 'balanced';
  if (score < 67) return 'elevated';
  return 'high';
}

export function analyzeWorkload(schedule: ScheduleResult, minBreakMinutes: number): WorkloadAnalysis {
  const totals = schedule.totals;

  let longestConsecutiveMinutes = 0;
  let breakOpportunities = 0;
  let daysWithoutBreak = 0;
  let studyDays = 0;

  for (const day of schedule.days) {
    const intervals = studyIntervalsForDay(schedule.blocks, day.date);
    if (intervals.length === 0) continue;
    studyDays += 1;

    for (const interval of intervals) {
      longestConsecutiveMinutes = Math.max(
        longestConsecutiveMinutes,
        differenceInMinutes(interval.end, interval.start),
      );
    }

    let gaps = 0;
    for (let index = 1; index < intervals.length; index += 1) {
      const previous = intervals[index - 1];
      const current = intervals[index];
      const gap = differenceInMinutes(current.start, previous.end);
      if (gap >= minBreakMinutes) gaps += 1;
    }
    breakOpportunities += gaps;
    if (gaps === 0) daysWithoutBreak += 1;
  }

  const demandRatio =
    totals.demandMinutes > 0
      ? clamp(totals.demandMinutes / Math.max(totals.capacityMinutes, 30), 0, 1)
      : 0;
  const unscheduledRatio =
    totals.demandMinutes > 0
      ? clamp(totals.unscheduledMinutes / Math.max(totals.demandMinutes, 1), 0, 1)
      : 0;
  const conflictRatio = clamp(schedule.conflicts.length / 4, 0, 1);
  const consecutiveRatio = clamp(longestConsecutiveMinutes / CONSECUTIVE_REFERENCE_MINUTES, 0, 1);
  const breakRatio = studyDays > 0 ? clamp(daysWithoutBreak / studyDays, 0, 1) : 0;

  const components: PressureComponent[] = [
    {
      key: 'demand',
      ratio: demandRatio,
      weight: PRESSURE_WEIGHTS.demand,
      points: round(demandRatio * PRESSURE_WEIGHTS.demand),
      value: totals.demandMinutes,
      unit: 'minutes',
    },
    {
      key: 'unscheduled',
      ratio: unscheduledRatio,
      weight: PRESSURE_WEIGHTS.unscheduled,
      points: round(unscheduledRatio * PRESSURE_WEIGHTS.unscheduled),
      value: totals.unscheduledMinutes,
      unit: 'minutes',
    },
    {
      key: 'conflicts',
      ratio: conflictRatio,
      weight: PRESSURE_WEIGHTS.conflicts,
      points: round(conflictRatio * PRESSURE_WEIGHTS.conflicts),
      value: schedule.conflicts.length,
      unit: 'count',
    },
    {
      key: 'consecutive',
      ratio: consecutiveRatio,
      weight: PRESSURE_WEIGHTS.consecutive,
      points: round(consecutiveRatio * PRESSURE_WEIGHTS.consecutive),
      value: longestConsecutiveMinutes,
      unit: 'minutes',
    },
    {
      key: 'breaks',
      ratio: breakRatio,
      weight: PRESSURE_WEIGHTS.breaks,
      points: round(breakRatio * PRESSURE_WEIGHTS.breaks),
      value: daysWithoutBreak,
      unit: 'count',
    },
  ];

  const score = Math.round(clamp(components.reduce((total, component) => total + component.points, 0), 0, 100));

  const overloadedDays = schedule.days.filter(
    (day: DayLoad) =>
      day.fixedMinutes >= HEAVY_FIXED_MINUTES ||
      (day.capacityMinutes > 0 && day.studyMinutes >= day.capacityMinutes * 0.85),
  );

  return {
    score,
    band: pressureBand(score),
    components,
    longestConsecutiveMinutes,
    breakOpportunities,
    daysWithoutBreak,
    studyDays,
    overloadedDays,
    totalStudyMinutes: totals.plannedMinutes,
    totalFixedMinutes: totals.fixedMinutes,
    unscheduledMinutes: totals.unscheduledMinutes,
    unscheduledCount: schedule.unscheduled.length,
    conflictCount: schedule.conflicts.length,
    insights: [],
  };
}
