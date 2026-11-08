import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { addDays, parseISO } from 'date-fns';
import type {
  CommitmentCategory,
  CommitmentOccurrence,
  ScheduleConflict,
  ScheduleResult,
} from '@/types';
import { useFormatters } from '@/hooks/use-formatters';
import { toDateKey } from '@/lib/date';
import { cn } from '@/lib/utils';

interface WeekCalendarProps {
  weekStart: Date;
  schedule: ScheduleResult;
  commitments: CommitmentOccurrence[];
  /** Opens the assignment behind a generated study block. */
  onOpenTask?: (taskId: string) => void;
}

const START_MINUTES = 6 * 60;
const END_MINUTES = 24 * 60;
const PX_PER_MINUTE = 0.8;
const TOTAL_HEIGHT = (END_MINUTES - START_MINUTES) * PX_PER_MINUTE;
const HOURS = Array.from({ length: 18 }, (_, index) => index + 6);

interface TimelineEvent {
  id: string;
  title: string;
  timeLabel: string;
  startMin: number;
  endMin: number;
  kind: 'study' | 'commitment';
  category?: CommitmentCategory;
  taskId?: string;
  recurring?: boolean;
}

interface PlacedEvent extends TimelineEvent {
  lane: number;
  lanes: number;
}

/** Greedy lane assignment so overlapping events stay readable. */
function layoutEvents(events: TimelineEvent[]): PlacedEvent[] {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  const placed: PlacedEvent[] = [];
  let cluster: { event: TimelineEvent; lane: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const lanes = Math.max(...cluster.map((entry) => entry.lane)) + 1;
    for (const entry of cluster) {
      placed.push({ ...entry.event, lane: entry.lane, lanes });
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const event of sorted) {
    if (clusterEnd !== -1 && event.startMin >= clusterEnd) flush();
    const used = new Set(cluster.map((entry) => entry.lane));
    let lane = 0;
    while (used.has(lane)) lane += 1;
    cluster.push({ event, lane });
    clusterEnd = Math.max(clusterEnd, event.endMin);
  }
  flush();
  return placed;
}

function clampMinutes(value: number): number {
  return Math.min(Math.max(value, START_MINUTES), END_MINUTES);
}

export function WeekCalendar({
  weekStart,
  schedule,
  commitments,
  onOpenTask,
}: WeekCalendarProps) {
  const { t } = useTranslation();
  const format = useFormatters();

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return { date, key: toDateKey(date) };
  });
  const todayKey = toDateKey(new Date());

  const conflictDays = new Set(
    schedule.conflicts
      .filter((conflict: ScheduleConflict) => conflict.type === 'commitment-overlap')
      .map((conflict) => conflict.date)
      .filter((value): value is string => Boolean(value)),
  );

  return (
    <div className="flex min-w-0 flex-col">
      <div className="scroll-area min-w-0 overflow-x-auto">
        <div className="min-w-[820px]">
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-border">
            <div aria-hidden="true" />
            {days.map((day) => {
              const isToday = day.key === todayKey;
              return (
                <div
                  key={day.key}
                  className={cn(
                    'flex flex-col items-center gap-0.5 border-l border-border px-1 py-2',
                    isToday && 'bg-nav-active/60',
                  )}
                >
                  <span className="text-2xs uppercase tracking-wide text-muted-foreground">
                    {format.weekdayShort(day.key)}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-medium tabular-nums',
                      isToday ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    {format.date(day.date, 'd')}
                  </span>
                  {conflictDays.has(day.key) ? (
                    <AlertTriangle aria-hidden="true" className="size-3 text-warning" />
                  ) : null}
                </div>
              );
            })}
          </div>

          <div
            className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))]"
            style={{ height: `${TOTAL_HEIGHT}px` }}
            aria-label={t('a11y.weekCalendar')}
          >
            <div className="relative" aria-hidden="true">
              {HOURS.map((hour) => (
                <span
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-2xs tabular-nums text-muted-foreground"
                  style={{ top: `${(hour * 60 - START_MINUTES) * PX_PER_MINUTE}px` }}
                >
                  {String(hour).padStart(2, '0')}:00
                </span>
              ))}
            </div>

            {days.map((day) => {
              const dayStart = new Date(day.date);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(dayStart.getTime() + 86400000);

              const events: TimelineEvent[] = [];

              for (const commitment of commitments) {
                const start = parseISO(commitment.start);
                const end = parseISO(commitment.end);
                if (end <= dayStart || start >= dayEnd) continue;
                const startMin = clampMinutes(
                  Math.round((Math.max(start.getTime(), dayStart.getTime()) - dayStart.getTime()) / 60000),
                );
                const endMin = clampMinutes(
                  Math.round((Math.min(end.getTime(), dayEnd.getTime()) - dayStart.getTime()) / 60000),
                );
                if (endMin <= startMin) continue;
                events.push({
                  id: commitment.occurrenceId ?? commitment.id,
                  title: commitment.title,
                  timeLabel: `${format.time(commitment.start)}–${format.time(commitment.end)}`,
                  startMin,
                  endMin,
                  kind: 'commitment',
                  category: commitment.category,
                  recurring: commitment.isRecurring,
                });
              }

              for (const block of schedule.blocks) {
                if (toDateKey(parseISO(block.start)) !== day.key) continue;
                const start = parseISO(block.start);
                const end = parseISO(block.end);
                const startMin = clampMinutes(
                  Math.round((start.getTime() - dayStart.getTime()) / 60000),
                );
                const endMin = clampMinutes(Math.round((end.getTime() - dayStart.getTime()) / 60000));
                if (endMin <= startMin) continue;
                events.push({
                  id: block.id,
                  title: block.taskTitle,
                  timeLabel: `${format.time(block.start)}–${format.time(block.end)}`,
                  startMin,
                  endMin,
                  kind: 'study',
                  taskId: block.taskId,
                });
              }

              const nowMinutes = (() => {
                if (day.key !== todayKey) return null;
                const now = new Date();
                const minutes = now.getHours() * 60 + now.getMinutes();
                return minutes >= START_MINUTES && minutes <= END_MINUTES ? minutes : null;
              })();

              return (
                <div key={day.key} className="relative border-l border-border">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      aria-hidden="true"
                      className="absolute inset-x-0 border-t border-border/70"
                      style={{ top: `${(hour * 60 - START_MINUTES) * PX_PER_MINUTE}px` }}
                    />
                  ))}

                  {nowMinutes !== null ? (
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-0 z-10 border-t border-primary"
                      style={{ top: `${(nowMinutes - START_MINUTES) * PX_PER_MINUTE}px` }}
                    />
                  ) : null}

                  {events.length === 0 ? (
                    <span className="absolute inset-x-0 top-2 text-center text-2xs text-muted-foreground/70">
                      {t('planner.free')}
                    </span>
                  ) : null}

                  {layoutEvents(events).map((event) => {
                    const top = (event.startMin - START_MINUTES) * PX_PER_MINUTE;
                    const height = Math.max(18, (event.endMin - event.startMin) * PX_PER_MINUTE);
                    const width = 100 / event.lanes;
                    const eventClassName = cn(
                      'absolute overflow-hidden rounded-sm border px-1.5 py-0.5 text-2xs leading-tight',
                      event.kind === 'study'
                        ? 'border-primary/25 border-l-2 border-l-primary bg-primary-soft text-left text-foreground'
                        : 'border-border border-l-2 bg-subtle text-foreground',
                      event.kind === 'commitment' && event.category === 'work' && 'border-l-chart-4',
                      event.kind === 'commitment' &&
                        (event.category === 'class' || event.category === 'appointment') &&
                        'border-l-muted-foreground',
                      event.kind === 'commitment' &&
                        event.category === 'rest' &&
                        'border-l-success/60',
                    );
                    const eventStyle = {
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `${event.lane * width}%`,
                      width: `calc(${width}% - 2px)`,
                    };
                    const label = (
                      <>
                        <p className="truncate font-medium">{event.title}</p>
                        {height >= 34 ? (
                          <p className="truncate tabular-nums opacity-70">{event.timeLabel}</p>
                        ) : null}
                      </>
                    );

                    if (event.kind === 'study' && onOpenTask && event.taskId) {
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onOpenTask(event.taskId as string)}
                          title={`${event.title} · ${event.timeLabel}`}
                          className={cn(
                            eventClassName,
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
                          )}
                          style={eventStyle}
                        >
                          {label}
                        </button>
                      );
                    }

                    return (
                      <div
                        key={event.id}
                        title={`${event.title} · ${event.timeLabel}${event.recurring ? ' ↻' : ''}`}
                        className={eventClassName}
                        style={eventStyle}
                      >
                        {label}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-4 py-2.5 sm:px-5">
        <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-sm bg-primary" />
          {t('planner.legendStudy')}
        </span>
        <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-sm bg-chart-1" />
          {t('planner.legendCommitment')}
        </span>
        <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
          <AlertTriangle aria-hidden="true" className="size-3 text-warning" />
          {t('planner.legendConflict')}
        </span>
        <span className="ml-auto hidden text-2xs text-muted-foreground sm:block">
          {t('planner.calendarScrollHint')}
        </span>
      </div>
    </div>
  );
}
