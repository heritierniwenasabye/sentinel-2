import type { Course, CourseColor, Task } from '@/types';

export const COURSE_COLORS: CourseColor[] = ['blue', 'green', 'amber', 'rose', 'violet', 'slate'];

/** Token-based swatches, so light and dark mode both stay restrained. */
export const COURSE_COLOR_CLASS: Record<CourseColor, string> = {
  blue: 'bg-chart-2',
  green: 'bg-success',
  amber: 'bg-chart-4',
  rose: 'bg-critical',
  violet: 'bg-primary',
  slate: 'bg-muted-foreground',
};

export function activeCourses(courses: Course[]): Course[] {
  return courses.filter((course) => !course.archived);
}

export function archivedCourses(courses: Course[]): Course[] {
  return courses.filter((course) => course.archived);
}

export function findCourse(courses: Course[], id: string | undefined): Course | undefined {
  if (!id) return undefined;
  return courses.find((course) => course.id === id);
}

/** Course name for display: the linked course wins over the stored snapshot. */
export function courseNameFor(task: Pick<Task, 'course' | 'courseId'>, courses: Course[]): string {
  return findCourse(courses, task.courseId)?.name ?? task.course;
}

export function courseColorFor(
  task: Pick<Task, 'course' | 'courseId'>,
  courses: Course[],
): CourseColor | null {
  return findCourse(courses, task.courseId)?.color ?? null;
}

export function assignmentsForCourse(courseId: string, tasks: Task[]): Task[] {
  return tasks.filter((task) => task.courseId === courseId);
}

export function courseLabel(course: Pick<Course, 'name' | 'code'>): string {
  return course.code ? `${course.code} · ${course.name}` : course.name;
}

/** Matches an imported course name/code against existing records. */
export function matchCourseByName(courses: Course[], name: string): Course | undefined {
  const needle = name.trim().toLowerCase();
  if (!needle) return undefined;
  return courses.find(
    (course) =>
      course.name.trim().toLowerCase() === needle || course.code.trim().toLowerCase() === needle,
  );
}
