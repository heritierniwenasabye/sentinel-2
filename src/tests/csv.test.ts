import { describe, expect, it } from 'vitest';
import type { Course } from '@/types';
import {
  commitmentsFromCsv,
  coursesFromCsv,
  coursesTemplateCsv,
  coursesToCsv,
  parseCsv,
  tasksFromCsv,
  toCsv,
} from '@/lib/io/csv';

const COURSE: Course = {
  id: 'course_math',
  name: 'Applied Mathematics',
  code: 'MATH 117',
  color: 'green',
  instructor: '',
  semesterStart: '',
  semesterEnd: '',
  archived: false,
  createdAt: '2025-05-01T10:00:00',
};

describe('csv primitives', () => {
  it('round-trips quoted commas, quotes and newlines', () => {
    const csv = toCsv(['title', 'notes'], [['Essay, draft', 'He said "hello"\nnext line']]);
    const table = parseCsv(csv);

    expect(table.headers).toEqual(['title', 'notes']);
    expect(table.rows[0]).toEqual(['Essay, draft', 'He said "hello"\nnext line']);
  });

  it('exports courses and parses the same file back', () => {
    const table = parseCsv(coursesToCsv([COURSE]));
    expect(table.rows[0]).toContain('MATH 117');
    expect(table.rows[0]).toContain('green');
  });
});

describe('course CSV import', () => {
  it('imports valid rows and reports missing names and duplicates', () => {
    const csv = toCsv(
      ['name', 'code', 'color', 'instructor', 'semesterStart', 'semesterEnd', 'archived'],
      [
        ['Cybersecurity Fundamentals', 'CYBR 101', 'violet', 'Dr. Reed', '2025-08-20', '2025-12-10', 'false'],
        ['', 'NONE 000', 'blue', '', '', '', 'false'],
        ['Applied Mathematics', 'MATH 117', 'green', '', '', '', 'false'],
      ],
    );

    const result = coursesFromCsv(csv, [COURSE]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Cybersecurity Fundamentals');
    expect(result.items[0].color).toBe('violet');
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('Row 3');
    expect(result.errors[1]).toContain('already exists');
  });

  it('rejects an inverted semester range', () => {
    const csv = toCsv(
      ['name', 'semesterStart', 'semesterEnd'],
      [['History', '2025-12-01', '2025-09-01']],
    );
    const result = coursesFromCsv(csv);
    expect(result.items).toHaveLength(0);
    expect(result.errors[0]).toContain('before semesterStart');
  });

  it('ships a template whose headers are accepted', () => {
    const result = coursesFromCsv(coursesTemplateCsv());
    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(1);
  });
});

describe('assignment CSV import', () => {
  it('resolves a course by code and validates the row', () => {
    const csv = toCsv(
      ['title', 'course', 'deadline', 'estimatedMinutes', 'priority', 'description', 'completed', 'completedMinutes'],
      [
        ['Problem set 2', 'MATH 117', '2025-05-09 23:59', '90', 'high', '', 'false', '0'],
        ['Unknown course task', 'BIO 999', '2025-05-10', '60', 'low', '', 'false', '0'],
        ['Bad duration', 'MATH 117', '2025-05-10', '5', 'low', '', 'false', '0'],
      ],
    );

    const result = tasksFromCsv(csv, [COURSE]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].courseId).toBe('course_math');
    expect(result.items[0].course).toBe('Applied Mathematics');
    expect(result.items[0].deadline).toBe('2025-05-09T23:59:00');
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toContain('unknown course');
    expect(result.errors[1]).toContain('between 30 and 2400');
  });

  it('accepts a date-only deadline as end of day', () => {
    const csv = toCsv(
      ['title', 'deadline', 'estimatedMinutes'],
      [['Reading response', '2025-06-01', '45']],
    );
    const result = tasksFromCsv(csv, []);
    expect(result.items[0].deadline).toBe('2025-06-01T23:59:00');
    expect(result.items[0].courseId).toBe('');
  });
});

describe('commitment CSV import', () => {
  it('parses weekly recurrence from weekday names', () => {
    const csv = toCsv(
      ['title', 'category', 'start', 'end', 'recurrence', 'weekdays', 'recurrenceUntil'],
      [
        ['Applied Mathematics — Lecture', 'class', '2025-05-05 09:00', '2025-05-05 11:00', 'weekly', 'Mon Wed', '2025-06-30'],
      ],
    );

    const result = commitmentsFromCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.items[0].recurrence).toBe('weekly');
    expect(result.items[0].weekdays).toEqual([1, 3]);
    expect(result.items[0].recurrenceUntil).toBe('2025-06-30');
  });

  it('reports an end before the start and a bad recurrence date', () => {
    const inverted = commitmentsFromCsv(
      toCsv(
        ['title', 'start', 'end'],
        [['Shift', '2025-05-05 17:00', '2025-05-05 12:00']],
      ),
    );
    expect(inverted.items).toHaveLength(0);
    expect(inverted.errors[0]).toContain('end must be after start');

    const badUntil = commitmentsFromCsv(
      toCsv(
        ['title', 'start', 'end', 'recurrence', 'weekdays', 'recurrenceUntil'],
        [['Lecture', '2025-05-05 09:00', '2025-05-05 10:00', 'weekly', 'Mon', '30-06-2025']],
      ),
    );
    expect(badUntil.items).toHaveLength(0);
    expect(badUntil.errors[0]).toContain('recurrenceUntil');
  });
});
