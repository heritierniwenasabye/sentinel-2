import type {
  AppData,
  Commitment,
  CommitmentCategory,
  CommitmentRecurrence,
  Course,
  CourseColor,
  DigitalUsageEntry,
  Priority,
  Task,
  UsageCategory,
  UsageGoal,
} from '@/types';
import { DEFAULT_PREFERENCES, normalizePreferences } from '@/lib/preferences';
import { STORAGE_KEY } from '@/lib/preferences';
import { isNonEmptyString } from '@/lib/utils';
import { toLocalIso, parseLocal, toDateKey } from '@/lib/date';
import { isDateKey, normalizeWeekdays } from '@/lib/recurrence';
import { MAX_IMPORT_BYTES, MAX_IMPORT_RECORDS } from '@/lib/io/limits';
import { COURSE_COLORS } from '@/lib/courses';

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];
const COMMITMENT_CATEGORIES: CommitmentCategory[] = [
  'class',
  'work',
  'appointment',
  'personal',
  'rest',
];
const USAGE_CATEGORIES: UsageCategory[] = [
  'social',
  'entertainment',
  'education',
  'productivity',
  'other',
];
const RECURRENCES: CommitmentRecurrence[] = ['none', 'weekly'];

const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,128}$/.test(id);

export function createEmptyData(): AppData {
  return {
    version: 3,
    courses: [],
    tasks: [],
    commitments: [],
    usage: [],
    usageGoals: [],
    preferences: { ...DEFAULT_PREFERENCES },
    demoLoaded: false,
  };
}

function validateCourse(raw: unknown, errors: string[], index: number): Course | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`courses[${index}]: not an object`);
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (!validId(value.id) || !isNonEmptyString(value.name)) {
    errors.push(`courses[${index}]: missing id or name`);
    return null;
  }
  const color = COURSE_COLORS.includes(value.color as CourseColor)
    ? (value.color as CourseColor)
    : 'blue';
  if ((value.semesterStart && !isDateKey(value.semesterStart)) || (value.semesterEnd && !isDateKey(value.semesterEnd)) || (isDateKey(value.semesterStart) && isDateKey(value.semesterEnd) && value.semesterEnd < value.semesterStart)) {
    errors.push(`courses[${index}]: invalid semester dates`); return null;
  }
  const cleanDate = (input: unknown): string =>
    isDateKey(input) ? input : '';

  return {
    id: value.id,
    name: value.name.slice(0, 120),
    code: typeof value.code === 'string' ? value.code.slice(0, 40) : '',
    color,
    instructor: typeof value.instructor === 'string' ? value.instructor.slice(0, 120) : '',
    semesterStart: cleanDate(value.semesterStart),
    semesterEnd: cleanDate(value.semesterEnd),
    archived: value.archived === true,
    createdAt:
      typeof value.createdAt === 'string' && parseLocal(value.createdAt)
        ? value.createdAt
        : toLocalIso(new Date()),
  };
}

function validateTask(raw: unknown, errors: string[], index: number): Task | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`tasks[${index}]: not an object`);
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (!validId(value.id) || !isNonEmptyString(value.title)) {
    errors.push(`tasks[${index}]: missing id or title`);
    return null;
  }
  const deadline = typeof value.deadline === 'string' ? parseLocal(value.deadline) : null;
  if (!deadline) {
    errors.push(`tasks[${index}]: invalid deadline`);
    return null;
  }
  const estimatedMinutes = Number(value.estimatedMinutes);
  if (!Number.isFinite(estimatedMinutes) || estimatedMinutes < 0 || estimatedMinutes > 2400) {
    errors.push(`tasks[${index}]: invalid estimatedMinutes`);
    return null;
  }
  const completedMinutes = Number(value.completedMinutes ?? 0);
  if (!Number.isFinite(completedMinutes) || completedMinutes < 0 || completedMinutes > estimatedMinutes) {
    errors.push(`tasks[${index}]: invalid completedMinutes`); return null;
  }
  const priority = PRIORITIES.includes(value.priority as Priority)
    ? (value.priority as Priority)
    : 'medium';

  return {
    id: value.id,
    title: value.title.slice(0, 200),
    course: typeof value.course === 'string' ? value.course.slice(0, 120) : '',
    courseId: typeof value.courseId === 'string' ? value.courseId : '',
    description: typeof value.description === 'string' ? value.description.slice(0, 1000) : '',
    deadline: toLocalIso(deadline),
    estimatedMinutes: Math.round(estimatedMinutes),
    completedMinutes:
      Number.isFinite(completedMinutes) && completedMinutes > 0
        ? Math.round(Math.min(completedMinutes, estimatedMinutes))
        : 0,
    priority,
    completed: value.completed === true,
    createdAt:
      typeof value.createdAt === 'string' && parseLocal(value.createdAt)
        ? value.createdAt
        : toLocalIso(new Date()),
  };
}

function validateCommitment(raw: unknown, errors: string[], index: number): Commitment | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`commitments[${index}]: not an object`);
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (!validId(value.id) || !isNonEmptyString(value.title)) {
    errors.push(`commitments[${index}]: missing id or title`);
    return null;
  }
  const start = typeof value.start === 'string' ? parseLocal(value.start) : null;
  const end = typeof value.end === 'string' ? parseLocal(value.end) : null;
  if (!start || !end || end <= start) {
    errors.push(`commitments[${index}]: invalid time range`);
    return null;
  }
  const category = COMMITMENT_CATEGORIES.includes(value.category as CommitmentCategory)
    ? (value.category as CommitmentCategory)
    : 'personal';
  const recurrence = RECURRENCES.includes(value.recurrence as CommitmentRecurrence)
    ? (value.recurrence as CommitmentRecurrence)
    : 'none';
  const weekdays = normalizeWeekdays(value.weekdays);
  if (recurrence === 'weekly' && (weekdays.length === 0 || (value.recurrenceUntil && (!isDateKey(value.recurrenceUntil) || value.recurrenceUntil < toDateKey(start))))) {
    errors.push(`commitments[${index}]: invalid recurrence`); return null;
  }
  if (Array.isArray(value.exceptions) && value.exceptions.some(item => !isDateKey(item))) errors.push(`commitments[${index}]: invalid exception skipped`);
  const exceptions = Array.isArray(value.exceptions)
    ? Array.from(new Set(value.exceptions.filter((item): item is string => isDateKey(item))))
    : [];

  return {
    id: value.id,
    title: value.title.slice(0, 200),
    category,
    start: toLocalIso(start),
    end: toLocalIso(end),
    notes: typeof value.notes === 'string' ? value.notes.slice(0, 1000) : '',
    recurrence: recurrence === 'weekly' && weekdays.length > 0 ? 'weekly' : 'none',
    weekdays,
    recurrenceUntil: isDateKey(value.recurrenceUntil) ? value.recurrenceUntil : '',
    exceptions,
    seriesId: typeof value.seriesId === 'string' ? value.seriesId : undefined,
  };
}

function validateUsage(raw: unknown, errors: string[], index: number): DigitalUsageEntry | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`usage[${index}]: not an object`);
    return null;
  }
  const value = raw as Record<string, unknown>;
  if (!validId(value.id) || !isNonEmptyString(value.app)) {
    errors.push(`usage[${index}]: missing id or app`);
    return null;
  }
  const date = isDateKey(value.date) ? value.date : null;
  const parsedDate = date ? parseLocal(`${date}T00:00:00`) : null;
  if (!date || !parsedDate) {
    errors.push(`usage[${index}]: invalid date`);
    return null;
  }
  const minutes = Number(value.minutes);
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 1440) {
    errors.push(`usage[${index}]: invalid minutes`);
    return null;
  }
  const category = USAGE_CATEGORIES.includes(value.category as UsageCategory)
    ? (value.category as UsageCategory)
    : 'other';

  return {
    id: value.id,
    app: value.app.slice(0, 80),
    date,
    minutes: Math.round(minutes),
    category,
    createdAt:
      typeof value.createdAt === 'string' && parseLocal(value.createdAt)
        ? value.createdAt
        : toLocalIso(new Date()),
  };
}

export interface ValidationResult {
  data: AppData | null;
  errors: string[];
}

function dedupeById<T extends { id: string }>(items: T[], errors: string[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) { errors.push(`Duplicate id: ${item.id}`); return false; }
    seen.add(item.id);
    return true;
  });
}

/**
 * Schema-2 datasets stored course names directly on tasks. Deriving a course
 * record per distinct name keeps those assignments grouped and editable without
 * touching a single value the student typed.
 */
function deriveCourses(tasks: Task[]): Course[] {
  const names = Array.from(
    new Set(tasks.map((task) => task.course.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));
  const now = toLocalIso(new Date());
  return names.map((name, index) => ({
    id: `course_legacy_${index + 1}`,
    name,
    code: '',
    color: COURSE_COLORS[index % COURSE_COLORS.length],
    instructor: '',
    semesterStart: '',
    semesterEnd: '',
    archived: false,
    createdAt: now,
  }));
}

/** Links tasks to courses by id first, then by name when only a name survives. */
function reconcileCourseLinks(tasks: Task[], courses: Course[], errors: string[]): Task[] {
  const byId = new Map(courses.map((course) => [course.id, course]));
  const byName = new Map(courses.map((course) => [course.name.trim().toLowerCase(), course]));
  return tasks.map((task) => {
    if (task.courseId && byId.has(task.courseId)) return { ...task, course: byId.get(task.courseId)!.name };
    if (task.courseId) errors.push(`Assignment ${task.id}: unknown course id; relationship repaired.`);
    const match = task.course ? byName.get(task.course.trim().toLowerCase()) : undefined;
    return { ...task, courseId: match?.id ?? '' };
  });
}

/** Validates and normalises untrusted data (localStorage or an imported file). */
export function parseAppData(raw: unknown): ValidationResult {
  const errors: string[] = [];
  if (!raw || typeof raw !== 'object') {
    return { data: null, errors: ['File is not a valid SENTINEL data object.'] };
  }

  const envelope = raw as Record<string, unknown>;
  const candidate =
    envelope.data && typeof envelope.data === 'object'
      ? (envelope.data as Record<string, unknown>)
      : envelope;

  const looksLikeData =
    Array.isArray(candidate.tasks) ||
    Array.isArray(candidate.commitments) ||
    Array.isArray(candidate.usage) ||
    Array.isArray(candidate.courses) ||
    candidate.preferences !== undefined;

  if (!looksLikeData) {
    return { data: null, errors: ['File does not contain SENTINEL tasks, commitments or preferences.'] };
  }

  const collections = ['courses', 'tasks', 'commitments', 'usage', 'usageGoals'];
  if (collections.some(key => candidate[key] !== undefined && !Array.isArray(candidate[key]))) {
    return { data: null, errors: ['Record collections must be arrays.'] };
  }
  if (Number(candidate.version ?? 3) > 3) return { data: null, errors: ['This data version requires a newer SENTINEL release.'] };
  let courses = Array.isArray(candidate.courses)
    ? dedupeById(
        candidate.courses
          .map((item, index) => validateCourse(item, errors, index))
          .filter((item): item is Course => item !== null), errors,
      )
    : [];

  let tasks = Array.isArray(candidate.tasks)
    ? dedupeById(
        candidate.tasks
          .map((item, index) => validateTask(item, errors, index))
          .filter((item): item is Task => item !== null), errors,
      )
    : [];

  if (courses.length === 0 && tasks.some((task) => !task.courseId && task.course)) {
    courses = deriveCourses(tasks);
  }
  tasks = reconcileCourseLinks(tasks, courses, errors);

  const commitments = Array.isArray(candidate.commitments)
    ? dedupeById(
        candidate.commitments
          .map((item, index) => validateCommitment(item, errors, index))
          .filter((item): item is Commitment => item !== null), errors,
      )
    : [];

  const usage = Array.isArray(candidate.usage)
    ? dedupeById(
        candidate.usage
          .map((item, index) => validateUsage(item, errors, index))
          .filter((item): item is DigitalUsageEntry => item !== null), errors,
      )
    : [];

  const goalApps = new Set<string>();
  const usageGoals: UsageGoal[] = [];
  for (const rawGoal of (candidate.usageGoals as unknown[] | undefined) ?? []) {
    const g = rawGoal as Partial<UsageGoal> | null;
    const key = typeof g?.app === 'string' ? g.app.trim().toLowerCase() : '';
    if (!g || !validId(g.id) || !key || key.length > 80 || !Number.isInteger(g.dailyLimitMinutes) || g.dailyLimitMinutes! < 1 || g.dailyLimitMinutes! > 1440 || goalApps.has(key) || usageGoals.some(goal => goal.id === g.id)) {
      errors.push('Invalid or duplicate usage goal.'); continue;
    }
    goalApps.add(key);
    usageGoals.push({ id: g.id, app: g.app!.trim(), dailyLimitMinutes: g.dailyLimitMinutes! });
  }
  const rawPreferences =
    candidate.preferences && typeof candidate.preferences === 'object'
      ? (candidate.preferences as Partial<AppData['preferences']>)
      : undefined;
  const preferences = normalizePreferences(rawPreferences);
  const hasExistingContent =
    tasks.length > 0 || commitments.length > 0 || usage.length > 0 || courses.length > 0;
  // A student who already has data is never interrupted by first-run setup.
  preferences.onboardingCompleted =
    typeof rawPreferences?.onboardingCompleted === 'boolean'
      ? rawPreferences.onboardingCompleted
      : hasExistingContent;

  return {
    data: {
      version: 3,
      courses,
      tasks,
      commitments,
      usage,
      usageGoals,
      preferences,
      demoLoaded: candidate.demoLoaded === true,
    },
    errors,
  };
}

export interface StoredEnvelope {
  schema: number;
  savedAt: string;
  data: AppData;
}

/**
 * The last unreadable payload is kept verbatim under this key before the app
 * starts with an empty workspace, so a corrupted file is never silently lost.
 */
export const CORRUPT_BACKUP_KEY = 'sentinel.v2.data.corrupt';

function backupUnreadable(raw: string): boolean {
  if (!hasStorage()) return false;
  try {
    const existing = window.localStorage.getItem(CORRUPT_BACKUP_KEY);
    if (existing && existing !== raw) return false;
    window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    return window.localStorage.getItem(CORRUPT_BACKUP_KEY) === raw;
  } catch {
    return false;
  }
}

export function hasStorage(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
}

export function loadAppData(): AppData | null {
  if (!hasStorage()) return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const result = parseAppData(parsed);
    if (!result.data || result.errors.length > 0) {
      backupUnreadable(raw);
      return result.data;
    }
    return result.data;
  } catch {
    if (raw) backupUnreadable(raw);
    return null;
  }
}

export function saveAppData(data: AppData): boolean {
  if (!hasStorage()) return false;
  try {
    // Never overwrite damaged input unless its exact raw backup is safely stored.
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) {
      let damaged = false;
      try { const parsed = parseAppData(JSON.parse(current)); damaged = !parsed.data || parsed.errors.length > 0; }
      catch { damaged = true; }
      if (damaged && !backupUnreadable(current)) return false;
    }
    const envelope: StoredEnvelope = {
      schema: 3,
      savedAt: new Date().toISOString(),
      data,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    return false;
  }
}

export function clearAppData(): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* nothing else to do — storage is unavailable */
  }
}

export function exportAppData(data: AppData): string {
  return JSON.stringify(
    {
      product: 'SENTINEL 2.0',
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2,
  );
}

export interface ImportResult {
  data: AppData | null;
  errors: string[];
}

export function parseImport(text: string): ImportResult {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) return { data: null, errors: ['File exceeds 5 MiB.'] };
  if (!text.trim()) return { data: null, errors: ['File is empty.'] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { data: null, errors: ['File is not valid JSON.'] };
  }
  if (parsed && typeof parsed === 'object') {
    const envelope = parsed as Record<string, unknown>;
    const candidate = (envelope.data && typeof envelope.data === 'object' ? envelope.data : envelope) as Record<string, unknown>;
    const count = ['courses','tasks','commitments','usage','usageGoals'].reduce((sum, key) => sum + (Array.isArray(candidate[key]) ? (candidate[key] as unknown[]).length : 0), 0);
    if (count > MAX_IMPORT_RECORDS) return { data: null, errors: ['File exceeds 10,000 records.'] };
  }
  return parseAppData(parsed);
}

export interface DataCounts {
  courses: number;
  tasks: number;
  commitments: number;
  usage: number;
  usageGoals: number;
}

export function countAppData(data: AppData): DataCounts {
  return {
    courses: data.courses.length,
    tasks: data.tasks.length,
    commitments: data.commitments.length,
    usage: data.usage.length,
    usageGoals: data.usageGoals?.length ?? 0,
  };
}

export interface MergeSummary extends DataCounts {
  skipped: number;
}

/**
 * Merges an imported dataset into the current one without destroying anything.
 * Records whose id (or, for courses, name) already exists are skipped; course
 * references are remapped so an imported assignment never points at a course
 * that is not in the merged dataset.
 */
export function mergeAppData(
  current: AppData,
  incoming: AppData,
): { data: AppData; summary: MergeSummary } {
  const summary: MergeSummary = { courses: 0, tasks: 0, commitments: 0, usage: 0, usageGoals: 0, skipped: 0 };

  const courseIds = new Set(current.courses.map((course) => course.id));
  const courseNames = new Set(current.courses.map((course) => course.name.trim().toLowerCase()));
  const courseIdMap = new Map<string, string>();
  const addedCourses: Course[] = [];

  for (const course of incoming.courses) {
    const duplicateName = courseNames.has(course.name.trim().toLowerCase());
    if (courseIds.has(course.id) || duplicateName) {
      const existing = current.courses.find(
        (item) =>
          item.id === course.id ||
          item.name.trim().toLowerCase() === course.name.trim().toLowerCase(),
      );
      if (existing) courseIdMap.set(course.id, existing.id);
      summary.skipped += 1;
      continue;
    }
    courseIds.add(course.id);
    courseNames.add(course.name.trim().toLowerCase());
    courseIdMap.set(course.id, course.id);
    addedCourses.push(course);
    summary.courses += 1;
  }

  const mergedCourses = [...current.courses, ...addedCourses];

  const taskIds = new Set(current.tasks.map((task) => task.id));
  const addedTasks: Task[] = [];
  for (const task of incoming.tasks) {
    if (taskIds.has(task.id)) {
      summary.skipped += 1;
      continue;
    }
    taskIds.add(task.id);
    const linkedId = task.courseId ? courseIdMap.get(task.courseId) : undefined;
    const fallback = mergedCourses.find(
      (course) => course.name.trim().toLowerCase() === task.course.trim().toLowerCase(),
    );
    addedTasks.push({
      ...task,
      courseId: linkedId ?? fallback?.id ?? '',
      course: linkedId || fallback ? task.course : '',
    });
    summary.tasks += 1;
  }

  const commitmentIds = new Set(current.commitments.map((commitment) => commitment.id));
  const addedCommitments = incoming.commitments.filter((commitment) => {
    if (commitmentIds.has(commitment.id)) {
      summary.skipped += 1;
      return false;
    }
    commitmentIds.add(commitment.id);
    summary.commitments += 1;
    return true;
  });

  const usageIds = new Set(current.usage.map((entry) => entry.id));
  const addedUsage = incoming.usage.filter((entry) => {
    if (usageIds.has(entry.id)) {
      summary.skipped += 1;
      return false;
    }
    usageIds.add(entry.id);
    summary.usage += 1;
    return true;
  });

  const mergedGoals = [...(current.usageGoals ?? [])];
  for (const goal of incoming.usageGoals ?? []) {
    if (mergedGoals.some(existing => existing.id === goal.id || existing.app.trim().toLowerCase() === goal.app.trim().toLowerCase())) {
      summary.skipped += 1;
    } else { mergedGoals.push(goal); summary.usageGoals += 1; }
  }
  return {
    data: {
      ...current,
      version: 3,
      courses: mergedCourses,
      tasks: [...current.tasks, ...addedTasks],
      commitments: [...current.commitments, ...addedCommitments],
      usage: [...current.usage, ...addedUsage],
      usageGoals: mergedGoals,
      demoLoaded: current.demoLoaded || incoming.demoLoaded,
    },
    summary,
  };
}

/** Date key helper re-exported for the data layer consumers. */
export { toDateKey };

/** Raw recovery evidence remains untouched until an explicit download/restore decision. */
export function readRecoveryBackup(): string | null {
  try {
    const primary = window.localStorage.getItem(STORAGE_KEY);
    if (primary) {
      try { const parsed = parseAppData(JSON.parse(primary)); if (!parsed.data || parsed.errors.length) return primary; }
      catch { return primary; }
    }
    return window.localStorage.getItem(CORRUPT_BACKUP_KEY);
  } catch { return null; }
}

export function readRecoveryArchive(): string | null {
  try { return window.localStorage.getItem(CORRUPT_BACKUP_KEY); } catch { return null; }
}
