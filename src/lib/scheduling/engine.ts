import { addDays, addMinutes, differenceInMinutes, parseISO } from 'date-fns';
import type {
  Commitment,
  CommitmentOccurrence,
  DayLoad,
  ScheduleConflict,
  ScheduleResult,
  ScheduleTotals,
  StudyBlock,
  Task,
  UnscheduledItem,
  UserPreferences,
} from '@/types';
import {
  MAX_BLOCK_MINUTES,
  SLOT_MINUTES,
  parseTimeToMinutes,
  combineDayAndTime,
  startOfWeekMonday,
  toDateKey,
  ceilToSlot,
} from '@/lib/date';
import { normalizePreferences } from '@/lib/preferences';
import { expandCommitments } from '@/lib/recurrence';

export interface Interval {
  start: Date;
  end: Date;
}

export interface StudySlot extends Interval {
  taken: boolean;
}

export interface ScheduleInput {
  tasks: Task[];
  commitments: Commitment[];
  preferences: UserPreferences;
  /** Any date inside the week to plan. Normalised to Monday 00:00. */
  weekStart: Date;
  /** Reference "now" — slots in the past are never used. Defaults to the real clock. */
  now?: Date;
  /**
   * Extra study capacity per yyyy-MM-dd date key. Used by the Simulation Lab for
   * recovered focus time; never treated as a task so nothing is double counted.
   */
  capacityBonusByDay?: Record<string, number>;
}

interface DayPlan {
  date: Date;
  dateKey: string;
  slots: StudySlot[];
  capacityMinutes: number;
  plannedMinutes: number;
  fixedMinutes: number;
  freeMinutes: number;
  breakUntil: Date | null;
}

interface RawBlock {
  taskId: string;
  taskTitle: string;
  course: string;
  priority: Task['priority'];
  start: Date;
  end: Date;
  minutes: number;
}

/* ------------------------------------------------------------------ */
/* Interval helpers                                                    */
/* ------------------------------------------------------------------ */

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start.getTime() <= last.end.getTime()) {
      if (interval.end > last.end) last.end = interval.end;
    } else {
      merged.push({ start: interval.start, end: interval.end });
    }
  }
  return merged;
}

export function subtractIntervals(base: Interval, busy: Interval[]): Interval[] {
  const result: Interval[] = [];
  let cursor = base.start.getTime();
  const end = base.end.getTime();

  for (const interval of busy) {
    const bStart = interval.start.getTime();
    const bEnd = interval.end.getTime();
    if (bEnd <= cursor) continue;
    if (bStart >= end) break;
    if (bStart > cursor) {
      result.push({ start: new Date(cursor), end: new Date(Math.min(bStart, end)) });
    }
    cursor = Math.max(cursor, Math.min(bEnd, end));
    if (cursor >= end) break;
  }
  if (cursor < end) result.push({ start: new Date(cursor), end: new Date(end) });
  return result.filter((interval) => interval.end > interval.start);
}

/** Sleep windows may wrap midnight, so a day inherits the tail of the night before. */
export function sleepIntervals(dayStart: Date, preferences: UserPreferences): Interval[] {
  const start = parseTimeToMinutes(preferences.sleepStart);
  const end = parseTimeToMinutes(preferences.sleepEnd);
  if (start === end) return [];
  if (start > end) {
    // Sleep wraps midnight: the small hours and the late evening are both unavailable.
    return [
      { start: new Date(dayStart), end: combineDayAndTime(dayStart, preferences.sleepEnd) },
      { start: combineDayAndTime(dayStart, preferences.sleepStart), end: combineDayAndTime(addDays(dayStart, 1), preferences.sleepEnd) },
    ];
  }
  return [{ start: combineDayAndTime(dayStart, preferences.sleepStart), end: combineDayAndTime(dayStart, preferences.sleepEnd) }];
}

/* ------------------------------------------------------------------ */
/* Core engine                                                         */
/* ------------------------------------------------------------------ */

/**
 * Work due shortly after the displayed week is planned early: a deadline on
 * Monday should be prepared during the week before it, not discovered on the
 * day. Another engine run in the following week produces that week's plan.
 */
export const SCHEDULING_LOOKAHEAD_DAYS = 7;

const PRIORITY_RANK: Record<Task['priority'], number> = { high: 3, medium: 2, low: 1 };

function buildDayPlan(
  dayStart: Date,
  input: ScheduleInput,
  preferences: UserPreferences,
  minStart: Date,
): DayPlan {
  const dayEnd = addDays(dayStart, 1);
  const studyStartMin = parseTimeToMinutes(preferences.studyStart);
  const studyEndMin = parseTimeToMinutes(preferences.studyEnd);
  const windowStart = combineDayAndTime(dayStart, preferences.studyStart);
  const windowEnd = combineDayAndTime(dayStart, preferences.studyEnd);

  const busy: Interval[] = [];
  for (const interval of sleepIntervals(dayStart, preferences)) {
    busy.push({ start: new Date(interval.start), end: new Date(interval.end) });
  }
  let fixedMinutes = 0;
  for (const commitment of input.commitments) {
    const start = parseISO(commitment.start);
    const end = parseISO(commitment.end);
    if (!(end > dayStart) || !(start < dayEnd)) continue;
    const clippedStart = start < dayStart ? dayStart : start;
    const clippedEnd = end > dayEnd ? dayEnd : end;
    fixedMinutes += Math.max(0, differenceInMinutes(clippedEnd, clippedStart));
    busy.push({ start: clippedStart, end: clippedEnd });
  }

  const merged = mergeIntervals(busy);
  const free =
    studyEndMin > studyStartMin
      ? mergeIntervals(subtractIntervals({ start: windowStart, end: windowEnd }, merged))
      : [];

  const slots: StudySlot[] = [];
  for (const interval of free) {
    let cursor = new Date(interval.start);
    while (addMinutes(cursor, SLOT_MINUTES) <= interval.end) {
      const slotEnd = addMinutes(cursor, SLOT_MINUTES);
      if (cursor.getTime() >= minStart.getTime()) {
        slots.push({ start: new Date(cursor), end: slotEnd, taken: false });
      }
      cursor = slotEnd;
    }
  }

  const freeMinutes = slots.length * SLOT_MINUTES;
  const bonus = input.capacityBonusByDay?.[toDateKey(dayStart)] ?? preferences.focusBonusPerDayMinutes;
  const capacityMinutes = Math.max(
    0,
    Math.min(freeMinutes, preferences.maxDailyStudyMinutes + bonus),
  );

  return {
    date: dayStart,
    dateKey: toDateKey(dayStart),
    slots,
    capacityMinutes,
    plannedMinutes: 0,
    fixedMinutes,
    freeMinutes,
    breakUntil: null,
  };
}

function detectConflicts(
  commitments: CommitmentOccurrence[],
  tasks: Task[],
  now: Date,
  weekStart: Date,
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const weekEnd = addDays(weekStart, 7);
  const withinWeek = commitments.filter((commitment) => {
    const start = parseISO(commitment.start);
    const end = parseISO(commitment.end);
    return end > weekStart && start < weekEnd;
  });

  for (let i = 0; i < withinWeek.length; i += 1) {
    for (let j = i + 1; j < withinWeek.length; j += 1) {
      const a = withinWeek[i];
      const b = withinWeek[j];
      const aStart = parseISO(a.start);
      const aEnd = parseISO(a.end);
      const bStart = parseISO(b.start);
      const bEnd = parseISO(b.end);
      const overlapStart = aStart > bStart ? aStart : bStart;
      const overlapEnd = aEnd < bEnd ? aEnd : bEnd;
      const overlap = differenceInMinutes(overlapEnd, overlapStart);
      if (overlap > 0) {
        // Occurrences of the same series share an id, so the per-day occurrence
        // key must be used or two overlapping classes would produce duplicate
        // conflict ids across the week.
        conflicts.push({
          id: `overlap_${a.occurrenceId}_${b.occurrenceId}`,
          type: 'commitment-overlap',
          severity: 'warning',
          titles: [a.title, b.title],
          date: toDateKey(overlapStart),
          minutes: overlap,
        });
      }
    }
  }

  for (const task of tasks) {
    if (task.completed || taskRemainingMinutes(task) <= 0) continue;
    const deadline = parseISO(task.deadline);
    if (deadline.getTime() < now.getTime()) {
      conflicts.push({
        id: `overdue_${task.id}`,
        type: 'overdue-task',
        severity: 'critical',
        titles: [task.title],
        date: toDateKey(deadline),
      });
    }
  }

  return conflicts.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
}

/** Study minutes still owed for a task, after any completed time. */
export function taskRemainingMinutes(task: Task): number {
  return Math.max(0, task.estimatedMinutes - Math.max(0, task.completedMinutes ?? 0));
}

/**
 * Deterministic weekly scheduler.
 *
 * 1. Builds the free capacity inside the preferred study window, minus sleep and
 *    fixed commitments, aligned to 30-minute slots.
 * 2. Orders unfinished coursework due inside the week (plus a one-week
 *    look-ahead window) by deadline, then priority.
 * 3. Fills slots chronologically, never after a deadline, never past the daily
 *    maximum, and forces a break after 90 continuous minutes.
 * 4. Reports anything that could not fit instead of silently dropping it.
 */
export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const preferences = normalizePreferences(input.preferences);
  const now = input.now ?? new Date();
  const weekStart = startOfWeekMonday(input.weekStart);
  const weekEnd = addDays(weekStart, 7);
  const minStart = ceilToSlot(now);

  // Weekly series are expanded onto concrete dates for exactly this week, so a
  // recurring class blocks study time every week it occurs.
  const commitmentOccurrences = expandCommitments(input.commitments, weekStart, weekEnd);
  const schedulingInput: ScheduleInput = { ...input, commitments: commitmentOccurrences };

  const dayPlans: DayPlan[] = Array.from({ length: 7 }, (_, index) =>
    buildDayPlan(addDays(weekStart, index), schedulingInput, preferences, minStart),
  );

  const horizonEnd = addDays(weekEnd, SCHEDULING_LOOKAHEAD_DAYS).getTime();
  const eligible = input.tasks
    .filter((task) => {
      if (task.completed || taskRemainingMinutes(task) <= 0) return false;
      const deadline = parseISO(task.deadline);
      return deadline.getTime() <= horizonEnd;
    })
    .sort((a, b) => {
      const deadlineDiff = parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
      if (deadlineDiff !== 0) return deadlineDiff;
      const priorityDiff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.estimatedMinutes - a.estimatedMinutes;
    });

  const blocks: RawBlock[] = [];
  const unscheduled: UnscheduledItem[] = [];

  const remainingById = new Map(eligible.map(task => [task.id, taskRemainingMinutes(task)]));
  // Walk time once, so breaks span assignment boundaries as well as long tasks.
  for (const plan of dayPlans) {
    let block: RawBlock | null = null;
    const flush = () => {
      if (!block) return;
      blocks.push(block);
      plan.breakUntil = addMinutes(block.end, preferences.minBreakMinutes);
      block = null;
    };
    for (const slot of plan.slots) {
      if (plan.plannedMinutes + SLOT_MINUTES > plan.capacityMinutes) break;
      const task = eligible.find(item =>
        (remainingById.get(item.id) ?? 0) >= SLOT_MINUTES &&
        parseISO(item.deadline) > now && slot.end <= parseISO(item.deadline),
      );
      if (!task) { flush(); continue; }
      const continuation = block !== null && block.taskId === task.id &&
        +block.end === +slot.start && block.minutes + SLOT_MINUTES <= MAX_BLOCK_MINUTES;
      if (!continuation) {
        flush();
        if (plan.breakUntil && slot.start < plan.breakUntil) continue;
        block = {
          taskId: task.id, taskTitle: task.title, course: task.course, priority: task.priority,
          start: slot.start, end: slot.end, minutes: SLOT_MINUTES,
        };
      } else if (block) {
        block.end = slot.end;
        block.minutes += SLOT_MINUTES;
      }
      slot.taken = true;
      plan.plannedMinutes += SLOT_MINUTES;
      remainingById.set(task.id, (remainingById.get(task.id) ?? 0) - SLOT_MINUTES);
      if (block && block.minutes >= MAX_BLOCK_MINUTES) flush();
    }
    flush();
  }
  for (const task of eligible) {
    const remaining = remainingById.get(task.id) ?? 0;
    if (remaining > 0) unscheduled.push({
      taskId: task.id, title: task.title, course: task.course, priority: task.priority,
      deadline: task.deadline, minutesRemaining: remaining,
      reason: parseISO(task.deadline) <= now ? 'overdue' : 'insufficient-time',
    });
  }

  const studyBlocks: StudyBlock[] = blocks
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((block, index) => ({
      id: `block_${block.taskId}_${index}`,
      taskId: block.taskId,
      taskTitle: block.taskTitle,
      course: block.course,
      priority: block.priority,
      start: block.start.toISOString(),
      end: block.end.toISOString(),
      minutes: block.minutes,
    }));

  const days: DayLoad[] = dayPlans.map((plan) => ({
    date: plan.dateKey,
    fixedMinutes: plan.fixedMinutes,
    studyMinutes: plan.plannedMinutes,
    freeMinutes: plan.freeMinutes,
    capacityMinutes: plan.capacityMinutes,
  }));

  const totals: ScheduleTotals = {
    plannedMinutes: studyBlocks.reduce((total, block) => total + block.minutes, 0),
    fixedMinutes: days.reduce((total, day) => total + day.fixedMinutes, 0),
    freeMinutes: days.reduce((total, day) => total + day.freeMinutes, 0),
    capacityMinutes: days.reduce((total, day) => total + day.capacityMinutes, 0),
    remainingCapacityMinutes: 0,
    demandMinutes: eligible.reduce((total, task) => total + taskRemainingMinutes(task), 0),
    unscheduledMinutes: unscheduled.reduce((total, item) => total + item.minutesRemaining, 0),
    scheduledTaskCount: new Set(studyBlocks.map((block) => block.taskId)).size,
  };
  totals.remainingCapacityMinutes = Math.max(0, totals.capacityMinutes - totals.plannedMinutes);

  const conflicts = detectConflicts(commitmentOccurrences, input.tasks, now, weekStart);

  return {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    blocks: studyBlocks,
    days,
    unscheduled,
    conflicts,
    totals,
    infeasible: unscheduled.length > 0,
    generatedAt: now.toISOString(),
  };
}

/** Minutes of study still required before the deadline, minus what is planned. */
export function remainingMinutesForTask(task: Task, schedule: ScheduleResult): number {
  const planned = schedule.blocks
    .filter((block) => block.taskId === task.id)
    .reduce((total, block) => total + block.minutes, 0);
  return Math.max(0, taskRemainingMinutes(task) - planned);
}
