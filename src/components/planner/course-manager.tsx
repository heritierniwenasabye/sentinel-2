import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Course } from '@/types';
import { SectionCard } from '@/components/common/section-card';
import { EmptyState } from '@/components/common/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CourseDialog } from '@/components/planner/course-dialog';
import { useApp } from '@/hooks/use-app';
import { useToast } from '@/components/ui/toast';
import { useFormatters } from '@/hooks/use-formatters';
import { assignmentsForCourse, courseLabel, COURSE_COLOR_CLASS } from '@/lib/courses';
import { cn } from '@/lib/utils';

export function CourseManager() {
  const { t } = useTranslation();
  const format = useFormatters();
  const { courses, tasks, deleteCourse, setCourseArchived } = useApp();
  const { notify } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const active = useMemo(
    () => courses.filter((course) => !course.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [courses],
  );
  const archived = useMemo(
    () => courses.filter((course) => course.archived).sort((a, b) => a.name.localeCompare(b.name)),
    [courses],
  );

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const confirmDelete = (mode: 'unlink' | 'delete-tasks') => {
    if (!deleteTarget) return;
    deleteCourse(deleteTarget.id, mode);
    notify({
      title:
        mode === 'delete-tasks' ? t('courses.deletedWithAssignments') : t('courses.deleted'),
    });
    setDeleteTarget(null);
  };

  const deleteCount = deleteTarget ? assignmentsForCourse(deleteTarget.id, tasks).length : 0;

  const renderCourse = (course: Course) => {
    const assignments = assignmentsForCourse(course.id, tasks);
    const open = assignments.filter((task) => !task.completed).length;
    const expanded = expandedId === course.id;

    return (
      <li key={course.id} className="rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-start gap-3 p-3">
          <span
            aria-hidden="true"
            className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', COURSE_COLOR_CLASS[course.color])}
          />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
              <span className="truncate">{courseLabel(course)}</span>
              {course.archived ? <Badge tone="neutral">{t('courses.archived')}</Badge> : null}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-2xs text-muted-foreground">
              {course.instructor ? <span className="truncate">{course.instructor}</span> : null}
              {course.instructor ? <span aria-hidden="true">·</span> : null}
              <span className="tabular-nums">
                {t('common.tasksCount', { count: assignments.length })}
              </span>
              {open > 0 ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{t('courses.openCount', { count: open })}</span>
                </>
              ) : null}
            </p>
            {course.semesterStart || course.semesterEnd ? (
              <p className="mt-0.5 text-2xs tabular-nums text-muted-foreground">
                {course.semesterStart
                  ? format.date(`${course.semesterStart}T12:00:00`, 'd MMM yyyy')
                  : '…'}{' '}
                –{' '}
                {course.semesterEnd
                  ? format.date(`${course.semesterEnd}T12:00:00`, 'd MMM yyyy')
                  : '…'}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setExpandedId(expanded ? null : course.id)}
              aria-expanded={expanded}
              aria-label={t('courses.viewAssignments')}
            >
              {expanded ? (
                <ChevronDown aria-hidden="true" className="size-3.5" />
              ) : (
                <ChevronRight aria-hidden="true" className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setEditing(course);
                setDialogOpen(true);
              }}
              aria-label={`${t('common.edit')}: ${course.name}`}
            >
              <Pencil aria-hidden="true" className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setCourseArchived(course.id, !course.archived);
                notify({
                  title: course.archived ? t('courses.restored') : t('courses.archivedToast'),
                });
              }}
              aria-label={
                course.archived
                  ? `${t('courses.restore')}: ${course.name}`
                  : `${t('courses.archive')}: ${course.name}`
              }
            >
              {course.archived ? (
                <ArchiveRestore aria-hidden="true" className="size-3.5" />
              ) : (
                <Archive aria-hidden="true" className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setDeleteTarget(course)}
              aria-label={`${t('common.delete')}: ${course.name}`}
              className="hover:text-critical"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>

        {expanded ? (
          <div className="border-t border-border px-3 py-2.5">
            <p className="label-caps pb-1.5">{t('courses.assignmentsTitle')}</p>
            {assignments.length === 0 ? (
              <p className="text-2xs text-muted-foreground">{t('courses.assignmentsEmpty')}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {[...assignments]
                  .sort((a, b) => a.deadline.localeCompare(b.deadline))
                  .map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                        {task.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-2 text-2xs tabular-nums text-muted-foreground">
                        {format.date(task.deadline, 'd MMM, HH:mm')}
                        <Badge tone={task.completed ? 'success' : 'neutral'}>
                          {task.completed ? t('common.completed') : t('common.active')}
                        </Badge>
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <SectionCard
      title={t('courses.title')}
      subtitle={t('courses.subtitle')}
      action={
        <Button size="sm" onClick={openNew}>
          <Plus aria-hidden="true" />
          {t('courses.add')}
        </Button>
      }
    >
      {active.length === 0 && archived.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('courses.empty')}
          hint={t('courses.emptyHint')}
          action={
            <Button size="sm" onClick={openNew}>
              <Plus aria-hidden="true" />
              {t('courses.add')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {active.length > 0 ? (
            <ul className="flex flex-col gap-2">{active.map(renderCourse)}</ul>
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              {t('courses.noActive')}
            </p>
          )}

          {archived.length > 0 ? (
            <div>
              <p className="label-caps pb-1.5">{t('courses.archivedSection')}</p>
              <ul className="flex flex-col gap-2">{archived.map(renderCourse)}</ul>
            </div>
          ) : null}
        </div>
      )}

      <CourseDialog open={dialogOpen} onOpenChange={setDialogOpen} course={editing} />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('courses.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('courses.deleteBody', {
                name: deleteTarget?.name ?? '',
                count: deleteCount,
              })}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="sm:flex-col sm:items-stretch">
            {deleteCount > 0 ? (
              <Button variant="secondary" onClick={() => confirmDelete('unlink')}>
                {t('courses.keepAssignments', { count: deleteCount })}
              </Button>
            ) : null}
            <Button variant="destructive" onClick={() => confirmDelete('delete-tasks')}>
              <Trash2 aria-hidden="true" />
              {deleteCount > 0
                ? t('courses.deleteAssignments', { count: deleteCount })
                : t('common.delete')}
            </Button>
            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
