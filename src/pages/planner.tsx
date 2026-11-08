import { useClock } from '@/hooks/use-clock';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDays, parseISO, startOfDay } from 'date-fns';
import { BookOpen, CalendarPlus, Plus } from 'lucide-react';
import type { Commitment, CommitmentOccurrence, Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/page-header';
import { SectionCard } from '@/components/common/section-card';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { WeekNavigator } from '@/components/planner/week-navigator';
import { WeekCalendar } from '@/components/planner/week-calendar';
import { TaskList } from '@/components/planner/task-list';
import { CommitmentList } from '@/components/planner/commitment-list';
import { UnscheduledList } from '@/components/planner/unscheduled-list';
import { ConflictList } from '@/components/planner/conflict-list';
import { TaskDialog } from '@/components/planner/task-dialog';
import { CommitmentDialog } from '@/components/planner/commitment-dialog';
import { CourseManager } from '@/components/planner/course-manager';
import { useApp } from '@/hooks/use-app';
import { useWeekSchedule } from '@/hooks/use-schedule';
import { useToast } from '@/components/ui/toast';
import { SCHEDULING_LOOKAHEAD_DAYS } from '@/lib/scheduling/engine';
import { startOfWeekMonday, toDateKey } from '@/lib/date';
import { expandCommitments, isRecurring } from '@/lib/recurrence';

type PlannerTab = 'plan' | 'courses';

export function PlannerPage() {
  const { t } = useTranslation();
  const {
    tasks,
    commitments,
    deleteTask,
    deleteCommitment,
    updateCommitment,
    toggleTask,
  } = useApp();
  const { notify } = useToast();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(new Date()));
  const [tab, setTab] = useState<PlannerTab>('plan');
  const schedule = useWeekSchedule(weekStart);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [commitmentDialogOpen, setCommitmentDialogOpen] = useState(false);
  const [editingCommitment, setEditingCommitment] = useState<CommitmentOccurrence | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [commitmentToDelete, setCommitmentToDelete] = useState<CommitmentOccurrence | null>(null);

  const weekEnd = addDays(weekStart, 7);

  // New work defaults to the Sunday of the week being viewed, so it can be
  // scheduled immediately instead of landing in a week the student cannot see.
  const currentDayKey = toDateKey(useClock());
  const defaultDeadlineDate = useMemo(() => {
    const sunday = startOfDay(addDays(weekStart, 6));
    const today = startOfDay(parseISO(currentDayKey));
    return toDateKey(sunday.getTime() < today.getTime() ? today : sunday);
  }, [weekStart, currentDayKey]);

  const weekTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const deadline = parseISO(task.deadline);
        if (task.completed) return deadline >= weekStart && deadline < weekEnd;
        if (deadline < weekEnd) return true;
        // Look-ahead work is planned in this week even though it is due later.
        return deadline <= addDays(weekEnd, SCHEDULING_LOOKAHEAD_DAYS);
      }),
    [tasks, weekStart, weekEnd],
  );

  const weekCommitments = useMemo(
    () => expandCommitments(commitments, weekStart, weekEnd),
    [commitments, weekStart, weekEnd],
  );

  const laterTasks = tasks.filter(task => !task.completed &&
    parseISO(task.deadline) > addDays(weekEnd, SCHEDULING_LOOKAHEAD_DAYS));

  const isCurrentWeek = startOfWeekMonday(new Date()).getTime() === weekStart.getTime();
  // Work inside the planning horizon includes anything the engine could not fit,
  // so the header never claims "2 of 2" while seven assignments are unscheduled.
  const openCount = Math.max(
    weekTasks.filter((task) => !task.completed).length,
    new Set([...schedule.blocks.map(block => block.taskId), ...schedule.unscheduled.map(item => item.taskId)]).size,
  );

  const openNewTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };

  const openNewCommitment = () => {
    setEditingCommitment(null);
    setCommitmentDialogOpen(true);
  };

  const editingSeries: Commitment | null = useMemo(() => {
    if (!editingCommitment) return null;
    return commitments.find((item) => item.id === editingCommitment.id) ?? editingCommitment;
  }, [editingCommitment, commitments]);

  const deleteOccurrenceOnly = () => {
    if (!commitmentToDelete) return;
    const series = commitments.find((item) => item.id === commitmentToDelete.id);
    if (series) {
      updateCommitment(series.id, {
        exceptions: Array.from(
          new Set([...(series.exceptions ?? []), commitmentToDelete.dateKey]),
        ),
      });
    }
    notify({ title: t('recurrence.occurrenceDeleted') });
    setCommitmentToDelete(null);
  };

  return (
    <div className="page-enter flex flex-col gap-5">
      <PageHeader
        title={t('planner.title')}
        subtitle={t('planner.subtitle')}
        actions={
          tab === 'plan' ? (
            <>
              <Button variant="secondary" onClick={openNewCommitment}>
                <Plus aria-hidden="true" />
                {t('planner.newCommitment')}
              </Button>
              <Button onClick={openNewTask}>
                <Plus aria-hidden="true" />
                {t('planner.newTask')}
              </Button>
            </>
          ) : null
        }
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as PlannerTab)}>
        <TabsList className="sm:w-auto">
          <TabsTrigger value="plan">{t('planner.tabs.plan')}</TabsTrigger>
          <TabsTrigger value="courses">{t('planner.tabs.courses')}</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="flex flex-col gap-5">
          <WeekNavigator
            weekStart={weekStart}
            onPrevious={() => setWeekStart((current) => addDays(current, -7))}
            onNext={() => setWeekStart((current) => addDays(current, 7))}
            onToday={() => setWeekStart(startOfWeekMonday(new Date()))}
            isCurrentWeek={isCurrentWeek}
          />

          <p className="text-2xs leading-relaxed text-muted-foreground">
            {t('planner.scheduleScope')}{' '}
            <span className="tabular-nums text-foreground">
              {t('planner.tasksScheduled', {
                planned: schedule.totals.scheduledTaskCount,
                total: openCount,
              })}
            </span>
            {schedule.totals.unscheduledMinutes > 0 ? (
              <span className="text-critical">
                {' '}
                · {t('planner.unscheduledTotal', { minutes: schedule.totals.unscheduledMinutes })}
              </span>
            ) : null}
          </p>

          {weekCommitments.length === 0 && schedule.blocks.length === 0 ? (
            <div className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium text-foreground">{t('planner.calendarEmpty')}</p>
                <p className="mt-0.5 text-2xs text-muted-foreground">{t('planner.calendarEmptyHint')}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={openNewCommitment}>
                  <CalendarPlus aria-hidden="true" />
                  {t('planner.newCommitment')}
                </Button>
                <Button size="sm" onClick={openNewTask}>
                  <Plus aria-hidden="true" />
                  {t('planner.newTask')}
                </Button>
              </div>
            </div>
          ) : null}

          <SectionCard
            title={t('planner.calendarTitle')}
            subtitle={t('planner.calendarSubtitle')}
            contentClassName="px-0 pb-0 pt-3 sm:px-0 sm:pb-0"
          >
            <WeekCalendar
              weekStart={weekStart}
              schedule={schedule}
              commitments={weekCommitments}
              onOpenTask={(taskId) => {
                const task = tasks.find((item) => item.id === taskId);
                if (task) {
                  setEditingTask(task);
                  setTaskDialogOpen(true);
                }
              }}
            />
          </SectionCard>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
              <TaskList
                tasks={weekTasks}
                schedule={schedule}
                onAdd={openNewTask}
                onToggle={(id) => {
                  const task = tasks.find((item) => item.id === id);
                  toggleTask(id);
                  if (task) {
                    notify({
                      title: task.completed ? t('toast.taskReopened') : t('toast.taskCompleted'),
                    });
                  }
                }}
                onEdit={(task) => {
                  setEditingTask(task);
                  setTaskDialogOpen(true);
                }}
                onDelete={(task) => setTaskToDelete(task)}
              />
              {laterTasks.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">{t('planner.laterWork')}</p>
                  <TaskList tasks={laterTasks} schedule={schedule} onToggle={toggleTask}
                    onEdit={(task) => { setEditingTask(task); setTaskDialogOpen(true); }}
                    onDelete={setTaskToDelete} />
                </div>
              ) : null}
              <CommitmentList
                commitments={weekCommitments}
                onAdd={openNewCommitment}
                onEdit={(occurrence) => {
                  setEditingCommitment(occurrence);
                  setCommitmentDialogOpen(true);
                }}
                onDelete={(occurrence) => setCommitmentToDelete(occurrence)}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-4">
              <UnscheduledList items={schedule.unscheduled} />
              <ConflictList conflicts={schedule.conflicts} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="courses">
          <div className="flex flex-col gap-3">
            <p className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-2xs leading-relaxed text-muted-foreground">
              <BookOpen aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              {t('planner.coursesHint')}
            </p>
            <CourseManager />
          </div>
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={editingTask}
        defaultDate={defaultDeadlineDate}
      />
      <CommitmentDialog
        open={commitmentDialogOpen}
        onOpenChange={setCommitmentDialogOpen}
        commitment={editingSeries}
        occurrence={editingCommitment}
      />

      <ConfirmDialog
        open={Boolean(taskToDelete)}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
        title={t('planner.deleteTaskTitle')}
        description={t('planner.deleteTaskBody', { title: taskToDelete?.title ?? '' })}
        confirmLabel={t('common.delete')}
        destructive
        onConfirm={() => {
          if (!taskToDelete) return;
          deleteTask(taskToDelete.id);
          notify({ title: t('toast.taskDeleted') });
          setTaskToDelete(null);
        }}
      />

      {commitmentToDelete && commitmentToDelete.isRecurring && isRecurring(commitmentToDelete) ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setCommitmentToDelete(null);
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('recurrence.deleteTitle')}</DialogTitle>
              <DialogDescription>
                {t('recurrence.deleteBody', { title: commitmentToDelete.title })}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:flex-col sm:items-stretch">
              <Button variant="secondary" onClick={deleteOccurrenceOnly}>
                {t('recurrence.deleteOccurrence')}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteCommitment(commitmentToDelete.id);
                  notify({ title: t('toast.commitmentDeleted') });
                  setCommitmentToDelete(null);
                }}
              >
                {t('recurrence.deleteSeries')}
              </Button>
              <Button variant="ghost" onClick={() => setCommitmentToDelete(null)}>
                {t('common.cancel')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={Boolean(commitmentToDelete)}
          onOpenChange={(open) => {
            if (!open) setCommitmentToDelete(null);
          }}
          title={t('planner.deleteCommitmentTitle')}
          description={t('planner.deleteCommitmentBody', {
            title: commitmentToDelete?.title ?? '',
          })}
          confirmLabel={t('common.delete')}
          destructive
          onConfirm={() => {
            if (!commitmentToDelete) return;
            deleteCommitment(commitmentToDelete.id);
            notify({ title: t('toast.commitmentDeleted') });
            setCommitmentToDelete(null);
          }}
        />
      )}
    </div>
  );
}
