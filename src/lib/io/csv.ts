import { MAX_IMPORT_BYTES, MAX_IMPORT_RECORDS } from '@/lib/io/limits';
import { createId } from '@/lib/utils';
import type {
  Commitment,
  CommitmentCategory,
  Course,
  CourseColor,
  Priority,
  Task,
} from '@/types';
import { COURSE_COLORS, matchCourseByName } from '@/lib/courses';
import { isDateKey, normalizeWeekdays, weekdayOf } from '@/lib/recurrence';
import { parseLocal, toDateKey, toLocalIso } from '@/lib/date';

/* ------------------------------------------------------------------ */
/* Generic CSV                                                         */
/* ------------------------------------------------------------------ */

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

function escapeCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsv(headers: string[], rows: (string | number | boolean)[][]): string {
  const lines = [
    headers.map((header) => escapeCell(header)).join(','),
    ...rows.map((row) => row.map((cell) => escapeCell(String(cell ?? ''))).join(',')),
  ];
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * RFC-4180-style parser: quoted fields, doubled quotes, embedded commas and
 * newlines, and both LF and CRLF records. Throws on an unterminated quote so a
 * malformed file is reported instead of silently misread.
 */
export function parseCsv(text: string): CsvTable {
  if (new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('File exceeds 5 MiB.');
  const source = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field === '') {
      quoted = true;
      continue;
    }
    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      if (rows.length > MAX_IMPORT_RECORDS + 1) throw new Error('File exceeds 10,000 records.');
      row = [];
      field = '';
      continue;
    }
    field += char;
  }

  if (quoted) throw new Error('Unterminated quoted field.');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
    if (rows.length > MAX_IMPORT_RECORDS + 1) throw new Error('File exceeds 10,000 records.');
  }

  const nonEmpty = rows.filter((cells) => cells.some((cell) => cell.trim() !== ''));
  if (nonEmpty.length === 0) return { headers: [], rows: [] };
  const [headerRow, ...dataRows] = nonEmpty;
  const headers = headerRow.map((header) => header.trim().toLowerCase());
  if (new Set(headers).size !== headers.length || headers.some(h => !h || ['__proto__', 'constructor', 'prototype'].includes(h))) throw new Error('Invalid or duplicate columns.');
  if (dataRows.some(row => row.length !== headers.length)) throw new Error('Row column count does not match header.');
  return {
    headers,
    rows: dataRows,
  };
}

/** Maps a row to a header-keyed record, missing cells becoming empty strings. */
export function rowRecord(table: CsvTable, row: string[]): Record<string, string> {
  const record: Record<string, string> = Object.create(null);
  table.headers.forEach((header, index) => {
    record[header] = (row[index] ?? '').trim();
  });
  return record;
}

const DATETIME_PATTERN = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?$/;

/** Accepts `yyyy-MM-dd`, `yyyy-MM-dd HH:mm`, `yyyy-MM-ddTHH:mm` and ISO strings. */
export function parseDateTimeCell(value: string, endOfDay = '23:59'): string | null {
  if (!value) return null;
  const match = DATETIME_PATTERN.exec(value);
  if (match) {
    const dateKey = match[1];
    const time = match[2] ?? endOfDay;
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return null;
    if (!isDateKey(dateKey)) return null;
    return `${dateKey}T${time}:00`;
  }
  const parsed = parseLocal(value);
  return parsed ? toLocalIso(parsed) : null;
}

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

export const COURSE_HEADERS = [
  'name',
  'code',
  'color',
  'instructor',
  'semesterstart',
  'semesterend',
  'archived',
];

export function coursesToCsv(courses: Course[]): string {
  return toCsv(
    ['name', 'code', 'color', 'instructor', 'semesterStart', 'semesterEnd', 'archived'],
    courses.map((course) => [
      course.name,
      course.code,
      course.color,
      course.instructor,
      course.semesterStart,
      course.semesterEnd,
      course.archived ? 'true' : 'false',
    ]),
  );
}

export function coursesTemplateCsv(): string {
  return toCsv(
    ['name', 'code', 'color', 'instructor', 'semesterStart', 'semesterEnd', 'archived'],
    [
      [
        'College Writing',
        'COMP 120',
        'blue',
        'Dr. S. Okafor',
        toDateKey(new Date()),
        toDateKey(new Date(Date.now() + 120 * 86400000)),
        'false',
      ],
    ],
  );
}

export interface CsvImportResult<T> {
  items: T[];
  errors: string[];
}

export function coursesFromCsv(
  text: string,
  existing: Course[] = [],
  now: Date = new Date(),
): CsvImportResult<Course> {
  const errors: string[] = [];
  let table: CsvTable;
  try {
    table = parseCsv(text);
  } catch (error) {
    return { items: [], errors: [(error as Error).message] };
  }
  if (!table.headers.includes('name')) {
    return { items: [], errors: ['Missing required column: name'] };
  }

  const items: Course[] = [];
  const seen = new Set(existing.map((course) => course.name.trim().toLowerCase()));

  table.rows.forEach((row, index) => {
    const line = index + 2;
    const record = rowRecord(table, row);
    const name = record.name ?? '';
    if (!name) {
      errors.push(`Row ${line}: name is required`);
      return;
    }
    if (seen.has(name.toLowerCase())) {
      errors.push(`Row ${line}: course “${name}” already exists`);
      return;
    }
    const color = COURSE_COLORS.includes(record.color as CourseColor)
      ? (record.color as CourseColor)
      : 'blue';
    const semesterStart = record.semesterstart ?? '';
    const semesterEnd = record.semesterend ?? '';
    if (semesterStart && !isDateKey(semesterStart)) {
      errors.push(`Row ${line}: semesterStart must be yyyy-MM-dd`);
      return;
    }
    if (semesterEnd && !isDateKey(semesterEnd)) {
      errors.push(`Row ${line}: semesterEnd must be yyyy-MM-dd`);
      return;
    }
    if (semesterStart && semesterEnd && semesterEnd < semesterStart) {
      errors.push(`Row ${line}: semesterEnd is before semesterStart`);
      return;
    }

    seen.add(name.toLowerCase());
    items.push({
      id: createId('course_csv'),
      name: name.slice(0, 120),
      code: (record.code ?? '').slice(0, 40),
      color,
      instructor: (record.instructor ?? '').slice(0, 120),
      semesterStart,
      semesterEnd,
      archived: record.archived === 'true',
      createdAt: toLocalIso(now),
    });
  });

  return { items, errors };
}

/* ------------------------------------------------------------------ */
/* Assignments                                                         */
/* ------------------------------------------------------------------ */

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export const TASK_HEADERS = [
  'title',
  'course',
  'deadline',
  'estimatedminutes',
  'priority',
  'description',
  'completed',
  'completedminutes',
];

export function tasksToCsv(tasks: Task[], courses: Course[]): string {
  return toCsv(
    [
      'title',
      'course',
      'deadline',
      'estimatedMinutes',
      'priority',
      'description',
      'completed',
      'completedMinutes',
    ],
    tasks.map((task) => {
      const course = courses.find((item) => item.id === task.courseId);
      return [
        task.title,
        course?.code || course?.name || task.course,
        task.deadline,
        task.estimatedMinutes,
        task.priority,
        task.description,
        task.completed ? 'true' : 'false',
        task.completedMinutes ?? 0,
      ];
    }),
  );
}

export function tasksTemplateCsv(): string {
  return toCsv(
    [
      'title',
      'course',
      'deadline',
      'estimatedMinutes',
      'priority',
      'description',
      'completed',
      'completedMinutes',
    ],
    [
      [
        'Problem set 1',
        'COMP 101',
        `${toDateKey(new Date())} 23:59`,
        '90',
        'high',
        'Optional description',
        'false',
        '0',
      ],
    ],
  );
}

export function tasksFromCsv(
  text: string,
  courses: Course[],
  now: Date = new Date(),
): CsvImportResult<Task> {
  const errors: string[] = [];
  let table: CsvTable;
  try {
    table = parseCsv(text);
  } catch (error) {
    return { items: [], errors: [(error as Error).message] };
  }
  for (const required of ['title', 'deadline', 'estimatedminutes']) {
    if (!table.headers.includes(required)) {
      return { items: [], errors: [`Missing required column: ${required}`] };
    }
  }

  const items: Task[] = [];
  table.rows.forEach((row, index) => {
    const line = index + 2;
    const record = rowRecord(table, row);
    const title = record.title ?? '';
    if (!title) {
      errors.push(`Row ${line}: title is required`);
      return;
    }
    const deadline = parseDateTimeCell(record.deadline ?? '');
    if (!deadline) {
      errors.push(`Row ${line}: deadline must be yyyy-MM-dd or yyyy-MM-dd HH:mm`);
      return;
    }
    const estimated = Number(record.estimatedminutes);
    if (!Number.isFinite(estimated) || estimated < 30 || estimated > 2400) {
      errors.push(`Row ${line}: estimatedMinutes must be between 30 and 2400`);
      return;
    }
    const courseName = record.course ?? '';
    const course = courseName ? matchCourseByName(courses, courseName) : undefined;
    if (courseName && !course) {
      errors.push(`Row ${line}: unknown course “${courseName}”`);
      return;
    }
    const completedMinutes = Number(record.completedminutes ?? 0);
    if (!Number.isFinite(completedMinutes) || completedMinutes < 0 || completedMinutes > estimated) {
      errors.push(`Row ${line}: invalid completedMinutes`); return;
    }
    if (record.priority && !PRIORITIES.includes(record.priority as Priority)) {
      errors.push(`Row ${line}: invalid priority`); return;
    }
    const priority = PRIORITIES.includes(record.priority as Priority)
      ? (record.priority as Priority)
      : 'medium';

    items.push({
      id: createId('task_csv'),
      title: title.slice(0, 200),
      course: course?.name ?? '',
      courseId: course?.id ?? '',
      description: (record.description ?? '').slice(0, 1000),
      deadline,
      estimatedMinutes: Math.round(estimated),
      completedMinutes:
        Number.isFinite(completedMinutes) && completedMinutes > 0
          ? Math.round(Math.min(completedMinutes, estimated))
          : 0,
      priority,
      completed: record.completed === 'true',
      createdAt: toLocalIso(now),
    });
  });

  return { items, errors };
}

/* ------------------------------------------------------------------ */
/* Commitments                                                         */
/* ------------------------------------------------------------------ */

const CATEGORIES: CommitmentCategory[] = ['class', 'work', 'appointment', 'personal', 'rest'];
const WEEKDAY_NAMES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

export const COMMITMENT_HEADERS = [
  'title',
  'category',
  'start',
  'end',
  'notes',
  'recurrence',
  'weekdays',
  'recurrenceuntil',
];

export function commitmentsToCsv(commitments: Commitment[]): string {
  return toCsv(
    ['title', 'category', 'start', 'end', 'notes', 'recurrence', 'weekdays', 'recurrenceUntil', 'exceptions', 'seriesId'],
    commitments.map((commitment) => [
      commitment.title,
      commitment.category,
      commitment.start,
      commitment.end,
      commitment.notes,
      commitment.recurrence ?? 'none',
      (commitment.weekdays ?? []).join(' '),
      commitment.recurrenceUntil ?? '',
      (commitment.exceptions ?? []).join(' '),
      commitment.seriesId ?? '',
    ]),
  );
}

export function commitmentsTemplateCsv(): string {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(9);
  const end = new Date(start.getTime() + 90 * 60_000);
  return toCsv(
    ['title', 'category', 'start', 'end', 'notes', 'recurrence', 'weekdays', 'recurrenceUntil', 'exceptions', 'seriesId'],
    [
      [
        'Applied Mathematics — Lecture',
        'class',
        toLocalIso(start),
        toLocalIso(end),
        'Weekly lecture',
        'weekly',
        'Mon Wed',
        '', '', '',
      ],
    ],
  );
}

function parseWeekdayCell(value: string): number[] {
  if (!value) return [];
  const parts = value.split(/[,;\s]+/).filter(Boolean);
  const days = parts.map((part) => {
    const numeric = Number(part);
    if (Number.isInteger(numeric)) return numeric;
    return WEEKDAY_NAMES[part.slice(0, 3).toLowerCase()] ?? -1;
  });
  return normalizeWeekdays(days);
}

export function commitmentsFromCsv(
  text: string,
  _now: Date = new Date(),
): CsvImportResult<Commitment> {
  const errors: string[] = [];
  let table: CsvTable;
  try {
    table = parseCsv(text);
  } catch (error) {
    return { items: [], errors: [(error as Error).message] };
  }
  for (const required of ['title', 'start', 'end']) {
    if (!table.headers.includes(required)) {
      return { items: [], errors: [`Missing required column: ${required}`] };
    }
  }

  const items: Commitment[] = [];
  table.rows.forEach((row, index) => {
    const line = index + 2;
    const record = rowRecord(table, row);
    const title = record.title ?? '';
    if (!title) {
      errors.push(`Row ${line}: title is required`);
      return;
    }
    const start = parseDateTimeCell(record.start ?? '');
    const end = parseDateTimeCell(record.end ?? '');
    if (!start || !end) {
      errors.push(`Row ${line}: start and end must be valid dates`);
      return;
    }
    if (new Date(end) <= new Date(start)) {
      errors.push(`Row ${line}: end must be after start`);
      return;
    }
    const category = CATEGORIES.includes(record.category as CommitmentCategory)
      ? (record.category as CommitmentCategory)
      : 'personal';
    const recurrence = record.recurrence === 'weekly' ? 'weekly' : 'none';
    const weekdays =
      recurrence === 'weekly'
        ? parseWeekdayCell(record.weekdays ?? '').length > 0
          ? parseWeekdayCell(record.weekdays ?? '')
          : [weekdayOf(start)]
        : [];
    if (recurrence === 'weekly' && record.weekdays && parseWeekdayCell(record.weekdays).length === 0) {
      errors.push(`Row ${line}: invalid recurrence weekdays`); return;
    }
    if ((record.exceptions ?? '').split(/[,;\s]+/).filter(Boolean).some(day => !isDateKey(day))) {
      errors.push(`Row ${line}: invalid exception date`); return;
    }
    const until = record.recurrenceuntil ?? '';
    if (until && (!isDateKey(until) || until < start.slice(0, 10))) {
      errors.push(`Row ${line}: recurrenceUntil must be yyyy-MM-dd`);
      return;
    }

    items.push({
      id: createId('commitment_csv'),
      title: title.slice(0, 200),
      category,
      start,
      end,
      notes: (record.notes ?? '').slice(0, 1000),
      recurrence: weekdays.length > 0 ? 'weekly' : 'none',
      weekdays: recurrence === 'weekly' ? weekdays : [],
      recurrenceUntil: recurrence === 'weekly' ? until : '',
      exceptions: (record.exceptions ?? '').split(/[,;\s]+/).filter(Boolean).filter(isDateKey),
      seriesId: record.seriesid || undefined,
    });
  });

  return { items, errors };
}

/* ------------------------------------------------------------------ */
/* Helpers for the UI                                                  */
/* ------------------------------------------------------------------ */

export type CsvEntity = 'courses' | 'tasks' | 'commitments';

export function dataFilename(kind: string, extension: string, now = new Date()): string {
  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  return `sentinel-${kind}-${stamp}.${extension}`;
}
