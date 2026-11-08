import { differenceInMinutes } from 'date-fns';
import type { Explanation, ScenarioOp, ScheduleResult, SimulationComparison } from '@/types';
import { buildSchedule } from '@/lib/scheduling/engine';
import { applyScenario } from '@/lib/simulation/scenario';
import type { AppData } from '@/types';

function deltaExplanation(
  id: string,
  keyUp: string,
  keyDown: string,
  delta: number,
  unit: 'minutes' | 'count',
): Explanation | null {
  if (delta === 0) return null;
  return {
    id,
    key: delta > 0 ? keyUp : keyDown,
    params: unit === 'minutes' ? { minutes: Math.abs(delta) } : { count: Math.abs(delta) },
    tone: delta > 0 ? 'warning' : 'positive',
  };
}

export interface CompareOptions {
  weekStart: Date;
  now?: Date;
  ops: ScenarioOp[];
}

/**
 * Runs the deterministic engine twice — once on the real data, once on an
 * immutable copy with the pending scenario applied — and explains the
 * differences with computed numbers only.
 */
export function compareScenario(data: AppData, options: CompareOptions): SimulationComparison {
  const now = options.now ?? new Date();
  const baseline = buildSchedule({
    tasks: data.tasks,
    commitments: data.commitments,
    preferences: data.preferences,
    weekStart: options.weekStart,
    now,
  });

  const applied = applyScenario(data, options.ops, options.weekStart, now);

  const simulated = buildSchedule({
    tasks: applied.data.tasks,
    commitments: applied.data.commitments,
    preferences: applied.data.preferences,
    weekStart: options.weekStart,
    now,
    capacityBonusByDay: applied.capacityBonusByDay,
  });

  const deltas = {
    plannedMinutes: simulated.totals.plannedMinutes - baseline.totals.plannedMinutes,
    unscheduledMinutes: simulated.totals.unscheduledMinutes - baseline.totals.unscheduledMinutes,
    conflictCount: simulated.conflicts.length - baseline.conflicts.length,
    remainingCapacityMinutes:
      simulated.totals.remainingCapacityMinutes - baseline.totals.remainingCapacityMinutes,
    demandMinutes: simulated.totals.demandMinutes - baseline.totals.demandMinutes,
    recoveredMinutes: applied.recoveredMinutes,
  };

  const explanations: Explanation[] = [];
  if (options.ops.length === 0) {
    explanations.push({
      id: 'no-scenario',
      key: 'simulation.explanations.noScenario',
      tone: 'info',
    });
  } else {
    const planned = deltaExplanation(
      'planned',
      'simulation.explanations.plannedUp',
      'simulation.explanations.plannedDown',
      deltas.plannedMinutes,
      'minutes',
    );
    const unscheduled = deltaExplanation(
      'unscheduled',
      'simulation.explanations.unscheduledUp',
      'simulation.explanations.unscheduledDown',
      deltas.unscheduledMinutes,
      'minutes',
    );
    const conflicts = deltaExplanation(
      'conflicts',
      'simulation.explanations.conflictsUp',
      'simulation.explanations.conflictsDown',
      deltas.conflictCount,
      'count',
    );
    const capacity = deltaExplanation(
      'capacity',
      'simulation.explanations.capacityUp',
      'simulation.explanations.capacityDown',
      deltas.remainingCapacityMinutes,
      'minutes',
    );
    if (planned) planned.tone = 'info';
    if (capacity) capacity.tone = deltas.remainingCapacityMinutes > 0 ? 'positive' : 'warning';
    const fixedDelta = simulated.totals.fixedMinutes - baseline.totals.fixedMinutes;
    if (fixedDelta !== 0) explanations.push({
      id: 'fixed-time', key: fixedDelta > 0 ? 'simulation.explanations.fixedUp' : 'simulation.explanations.fixedDown',
      params: { minutes: Math.abs(fixedDelta) }, tone: 'info',
    });
    for (const explanation of [unscheduled, planned, capacity, conflicts]) {
      if (explanation) explanations.push(explanation);
    }
    if (deltas.demandMinutes !== 0) {
      explanations.push({
        id: 'demand',
        key:
          deltas.demandMinutes > 0
            ? 'simulation.explanations.demandUp'
            : 'simulation.explanations.demandDown',
        params: { minutes: Math.abs(deltas.demandMinutes) },
        tone: 'info',
      });
    }
    if (applied.screenTimeApplied) {
      explanations.push({
        id: 'recovered',
        key: 'simulation.explanations.recovered',
        params: { minutes: applied.recoveredMinutes },
        tone: applied.recoveredMinutes > 0 ? 'info' : 'warning',
      });
    }
    if (simulated.infeasible && !baseline.infeasible) {
      explanations.push({
        id: 'now-infeasible',
        key: 'simulation.explanations.infeasible',
        tone: 'critical',
      });
    }
    if (!planned && !unscheduled && !capacity && !conflicts && deltas.demandMinutes === 0) {
      explanations.push({
        id: 'no-change',
        key: 'simulation.explanations.noChange',
        tone: 'info',
      });
    }
  }

  return {
    baseline,
    simulated,
    deltas,
    explanations,
    requiredReviews: options.ops.map((op) => op.type),
  };
}

/** Difference in minutes between two schedule results, for chart tooltips. */
export function plannedMinutesDelta(baseline: ScheduleResult, simulated: ScheduleResult): number {
  return simulated.totals.plannedMinutes - baseline.totals.plannedMinutes;
}

export function totalBlockMinutes(result: ScheduleResult): number {
  return result.blocks.reduce((total, block) => total + differenceInMinutes(new Date(block.end), new Date(block.start)), 0);
}
