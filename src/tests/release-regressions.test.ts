import { describe, expect, it } from 'vitest';
import { addDays, format, parseISO } from 'date-fns';
import { buildSchedule } from '@/lib/scheduling/engine';
import { DEFAULT_PREFERENCES } from '@/lib/preferences';
import { combineDayAndTime } from '@/lib/date';
import { expandCommitments } from '@/lib/recurrence';
import type { Task } from '@/types';

const task = (id: string, minutes = 60): Task => ({
  id, title: id, course: '', description: '', deadline: '2026-11-02T23:59:00',
  estimatedMinutes: minutes, priority: 'high', completed: false, createdAt: '2026-11-02T08:00:00',
});
const input = {
  tasks: [task('a'), task('b'), task('c')], commitments: [],
  preferences: { ...DEFAULT_PREFERENCES, maxDailyStudyMinutes: 480 },
  weekStart: new Date(2026, 10, 2), now: new Date(2026, 10, 2, 8),
};

describe('independent release regressions', () => {
  it('respects breaks when switching assignments, including short blocks', () => {
    const result = buildSchedule(input);
    for (let i = 1; i < result.blocks.length; i++) {
      const gap = (+parseISO(result.blocks[i].start) - +parseISO(result.blocks[i - 1].end)) / 60000;
      expect(gap).toBeGreaterThanOrEqual(input.preferences.minBreakMinutes);
    }
  });
  it('never allocates more study than the remaining demand', () => {
    const result = buildSchedule({ ...input, tasks: [{ ...task('partial', 90), completedMinutes: 15 }] });
    expect(result.totals.plannedMinutes).toBeLessThanOrEqual(75);
    expect(result.totals.plannedMinutes + result.totals.unscheduledMinutes).toBe(75);
  });
  it('reports only future usable capacity when the week is nearly over', () => {
    const result = buildSchedule({ ...input, tasks: [], now: new Date(2026, 10, 8, 20, 45) });
    expect(result.totals.capacityMinutes).toBe(0);
  });
  it('produces identical output for identical explicit inputs', () => {
    expect(buildSchedule(input).generatedAt).toBe(input.now.toISOString());
    expect(buildSchedule(input)).toEqual(buildSchedule(input));
  });
  it('includes an overnight recurring occurrence starting before the week', () => {
    const occurrences = expandCommitments([{
      id: 'shift', title: 'Night shift', category: 'work', notes: '',
      start: '2026-10-25T22:00:00', end: '2026-10-26T10:00:00',
      recurrence: 'weekly', weekdays: [0],
    }], new Date(2026, 10, 2), new Date(2026, 10, 9));
    expect(occurrences.some(o => o.dateKey === '2026-11-01')).toBe(true);
  });
  it('uses a persisted focus bonus without stacking a simulation override', () => {
    const base = { ...input, preferences: { ...input.preferences, maxDailyStudyMinutes: 60, focusBonusPerDayMinutes: 30 } };
    expect(buildSchedule(base).days[0].capacityMinutes).toBe(90);
    expect(buildSchedule({ ...base, capacityBonusByDay: { '2026-11-02': 60 } }).days[0].capacityMinutes).toBe(120);
  });
  it('schedules a short final block and excludes work beyond the horizon', () => {
    const result = buildSchedule({ ...input, tasks: [task('small', 15), { ...task('later'), deadline: '2026-12-01T23:59:00' }] });
    expect(result.totals.demandMinutes).toBe(15);
    expect(result.totals.plannedMinutes).toBe(15);
    expect(result.blocks[0].minutes).toBe(15);
    expect(result.unscheduled).toEqual([]);
  });
  it('requires a configured break after every block and protects sleep and commitments', () => {
    const result = buildSchedule({ ...input, tasks: [task('long', 600)],
      preferences: { ...input.preferences, studyStart: '06:00', studyEnd: '23:00', minBreakMinutes: 45 },
      commitments: [{ id: 'busy', title: 'Busy', category: 'work', notes: '', start: '2026-11-02T09:00:00', end: '2026-11-02T12:00:00' }] });
    for (const block of result.blocks) {
      expect(block.minutes).toBeLessThanOrEqual(90);
      expect(parseISO(block.start).getHours()).toBeGreaterThanOrEqual(7);
      expect(+parseISO(block.end) <= +parseISO('2026-11-02T09:00:00') || +parseISO(block.start) >= +parseISO('2026-11-02T12:00:00')).toBe(true);
    }
    for (let i = 1; i < result.blocks.length; i++) {
      expect((+parseISO(result.blocks[i].start) - +parseISO(result.blocks[i - 1].end)) / 60000).toBeGreaterThanOrEqual(45);
    }
    expect(result.totals.plannedMinutes + result.totals.unscheduledMinutes).toBe(600);
  });
  // Run this file in America/Chicago as well as UTC to exercise both DST changes.
  for (const [month, day] of [[2, 8], [10, 1]]) {
    it(`keeps study and recurring events at 09:00 across DST on ${month + 1}/${day}`, () => {
      const date = new Date(2026, month, day);
      expect(combineDayAndTime(date, '09:00').getHours()).toBe(9);
      const deadline = new Date(2026, month, day, 23, 59);
      const result = buildSchedule({ ...input, tasks: [{ ...task('dst'), deadline: `${deadline.getFullYear()}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T23:59:00` }], weekStart: date, now: new Date(2026, month, day, 8) });
      expect(parseISO(result.blocks[0].start).getHours()).toBe(9);
      const occurrences = expandCommitments([{
        id: 'class', title: 'Class', category: 'class', notes: '',
        start: `${format(addDays(date, -7), 'yyyy-MM-dd')}T09:00:00`,
        end: `${format(addDays(date, -7), 'yyyy-MM-dd')}T10:00:00`,
        recurrence: 'weekly', weekdays: [0],
      }], date, new Date(2026, month, day + 1));
      expect(occurrences).toHaveLength(1);
      expect(parseISO(occurrences[0].start).getHours()).toBe(9);
    });
  }
});
