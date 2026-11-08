import type { AppData, ScenarioOp } from '@/types';
import type { Formatters } from '@/hooks/use-formatters';

export interface OpDescription {
  key: string;
  params: Record<string, string | number>;
}

/**
 * Turns a scenario operation into translatable summary lines. Shared by the
 * pending-changes list and the apply confirmation so both describe a change
 * with the same wording and numbers.
 */
export function describeOp(op: ScenarioOp, data: AppData, format: Formatters): OpDescription[] {
  switch (op.type) {
    case 'add-commitment': {
      const isRest = op.commitment.category === 'rest';
      return [
        {
          key: isRest ? 'simulation.pending.addRest' : 'simulation.pending.addShift',
          params: {
            title: op.commitment.title,
            date: format.date(op.commitment.start, 'd MMM'),
            start: format.time(op.commitment.start),
            end: format.time(op.commitment.end),
          },
        },
      ];
    }
    case 'remove-commitment': {
      const commitment = data.commitments.find((item) => item.id === op.commitmentId);
      return [
        {
          key: 'simulation.pending.removeCommitment',
          params: { title: commitment?.title ?? '—' },
        },
      ];
    }
    case 'update-task': {
      const task = data.tasks.find((item) => item.id === op.taskId);
      const lines: OpDescription[] = [];
      if (op.patch.deadline) {
        lines.push({
          key: 'simulation.pending.changeTaskDeadline',
          params: {
            title: task?.title ?? '—',
            date: format.dateTime(op.patch.deadline),
          },
        });
      }
      if (typeof op.patch.estimatedMinutes === 'number') {
        lines.push({
          key: 'simulation.pending.changeTaskDuration',
          params: { title: task?.title ?? '—', minutes: op.patch.estimatedMinutes },
        });
      }
      return lines;
    }
    case 'study-window':
      return [
        {
          key: 'simulation.pending.studyWindow',
          params: { start: op.start, end: op.end },
        },
      ];
    case 'screen-time':
      return [
        {
          key: op.allocateToSchedule
            ? 'simulation.pending.screenTimeAllocate'
            : 'simulation.pending.screenTime',
          params: { minutes: op.weeklyReductionMinutes },
        },
      ];
    default:
      return [];
  }
}
