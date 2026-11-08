import { addDays, parseISO } from 'date-fns';
import type { AppData, Commitment, ScenarioOp, Task } from '@/types';
import { addLocalDays, toDateKey } from '@/lib/date';
import { summarizeUsage } from '@/lib/analytics/habits';
import { normalizePreferences } from '@/lib/preferences';

export interface AppliedScenario {
  data: AppData;
  capacityBonusByDay: Record<string, number>;
  recoveredMinutes: number;
  screenTimeApplied: boolean;
}

function safeDate(value: string): Date | null {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Applies simulation operations immutably. The caller's data object is never
 * mutated: every touched collection is copied before it is returned.
 */
export function applyScenario(
  data: AppData,
  ops: ScenarioOp[],
  weekStart: Date,
  now: Date = new Date(),
): AppliedScenario {
  let tasks: Task[] = data.tasks;
  let commitments: Commitment[] = data.commitments;
  let preferences = data.preferences;
  let capacityBonusByDay: Record<string, number> = {};
  let recoveredMinutes = 0;
  let screenTimeApplied = false;

  for (const op of ops) {
    switch (op.type) {
      case 'add-commitment': {
        const start = safeDate(op.commitment.start);
        const end = safeDate(op.commitment.end);
        if (!start || !end || end <= start) break;
        if (commitments.some((commitment) => commitment.id === op.commitment.id)) break;
        commitments = [...commitments, { ...op.commitment }];
        break;
      }
      case 'remove-commitment': {
        commitments = commitments.filter((commitment) => commitment.id !== op.commitmentId);
        break;
      }
      case 'update-task': {
        const patch: Partial<Pick<Task, 'deadline' | 'estimatedMinutes'>> = {};
        if (op.patch.deadline) {
          const deadline = safeDate(op.patch.deadline);
          if (deadline) patch.deadline = op.patch.deadline;
        }
        if (typeof op.patch.estimatedMinutes === 'number' && Number.isFinite(op.patch.estimatedMinutes)) {
          patch.estimatedMinutes = Math.max(0, Math.round(op.patch.estimatedMinutes));
        }
        tasks = tasks.map((task) => (task.id === op.taskId ? { ...task, ...patch } : task));
        break;
      }
      case 'study-window': {
        preferences = normalizePreferences({ ...preferences, studyStart: op.start, studyEnd: op.end });
        break;
      }
      case 'screen-time': {
        const summary = summarizeUsage(data.usage, now);
        const recovered = Math.min(
          Math.max(0, Math.round(op.weeklyReductionMinutes)),
          summary.recentDiscretionaryMinutes,
        );
        recoveredMinutes += recovered;
        screenTimeApplied = true;
        if (op.allocateToSchedule) {
          const perDay = Math.floor(recovered / 7 / 30) * 30;
          // The simulated capacity replaces any previously allocated bonus, so
          // recovered minutes can never be counted twice.
          capacityBonusByDay = {};
          if (perDay > 0) {
            for (let index = 0; index < 7; index += 1) {
              capacityBonusByDay[toDateKey(addLocalDays(weekStart, index))] = perDay;
            }
          }
          preferences = { ...preferences, focusBonusPerDayMinutes: 0 };
        }
        break;
      }
      default:
        break;
    }
  }

  return {
    data: {
      ...data,
      tasks,
      commitments,
      preferences: normalizePreferences(preferences),
    },
    capacityBonusByDay,
    recoveredMinutes,
    screenTimeApplied,
  };
}

/** Persists a simulated scenario after explicit confirmation. */
export function commitScenario(
  data: AppData,
  ops: ScenarioOp[],
  weekStart: Date,
  now: Date = new Date(),
): AppData {
  const applied = applyScenario(data, ops, weekStart, now);
  const perDay = Math.max(0, ...Object.values(applied.capacityBonusByDay));
  const screenTimeAllocated = ops.some(
    (op) => op.type === 'screen-time' && op.allocateToSchedule,
  );

  return {
    ...applied.data,
    preferences: {
      ...applied.data.preferences,
      focusBonusPerDayMinutes: screenTimeAllocated
        ? perDay
        : applied.data.preferences.focusBonusPerDayMinutes,
    },
  };
}

/** Tuesday of the week, used to build demo shifts without touching the UI. */
export function addDaysIso(date: Date, days: number): string {
  return addDays(date, days).toISOString();
}
