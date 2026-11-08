import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearAppData,
  createEmptyData,
  exportAppData,
  loadAppData,
  CORRUPT_BACKUP_KEY,
  parseAppData,
  parseImport,
  saveAppData,
} from '@/lib/storage/storage';
import { normalizePreferences, DEFAULT_PREFERENCES, STORAGE_KEY } from '@/lib/preferences';
import { createDemoData } from '@/lib/storage/demo';

beforeEach(() => {
  window.localStorage.clear();
});

describe('storage layer', () => {
  it('round-trips data through localStorage', () => {
    const data = createEmptyData();
    data.tasks.push({
      id: 'task_1',
      title: 'Essay',
      course: 'Writing',
      description: '',
      deadline: '2025-05-06T23:59:00',
      estimatedMinutes: 120,
      priority: 'high',
      completed: false,
      createdAt: '2025-05-01T10:00:00',
    });

    expect(saveAppData(data)).toBe(true);
    const loaded = loadAppData();
    expect(loaded?.tasks).toHaveLength(1);
    expect(loaded?.tasks[0]?.title).toBe('Essay');
    expect(loaded?.version).toBe(3);
  });

  it('survives corrupted storage without throwing', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadAppData()).toBeNull();
  });

  it('drops invalid records and reports them', () => {
    const result = parseAppData({
      tasks: [
        {
          id: 'ok',
          title: 'Valid',
          course: 'Course',
          deadline: '2025-05-06T23:59:00',
          estimatedMinutes: 60,
          priority: 'medium',
          completed: false,
        },
        { id: 'bad', title: '', deadline: 'not-a-date' },
      ],
      commitments: [
        { id: 'c1', title: 'Shift', category: 'work', start: '2025-05-06T10:00:00', end: '2025-05-06T09:00:00' },
      ],
      preferences: { theme: 'neon', language: 'de', maxDailyStudyMinutes: 100000 },
    });

    expect(result.data).not.toBeNull();
    expect(result.data?.tasks).toHaveLength(1);
    expect(result.data?.tasks[0]?.priority).toBe('medium');
    expect(result.data?.commitments).toHaveLength(0);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
    expect(result.data?.preferences.theme).toBe(DEFAULT_PREFERENCES.theme);
    expect(result.data?.preferences.language).toBe('en');
    expect(result.data?.preferences.maxDailyStudyMinutes).toBe(960);
  });

  it('rejects files that are not SENTINEL data', () => {
    expect(parseImport('not json').data).toBeNull();
    expect(parseImport('{"hello":"world"}').data).toBeNull();
    const anonymous = parseAppData([1, 2, 3]);
    expect(anonymous.data).toBeNull();
  });

  it('exports a JSON document that can be imported again', () => {
    const demo = createDemoData(new Date(2025, 4, 7, 12, 0));
    const exported = exportAppData(demo);
    const result = parseImport(exported);
    expect(result.errors).toHaveLength(0);
    expect(result.data?.tasks).toHaveLength(demo.tasks.length);
    expect(result.data?.commitments).toHaveLength(demo.commitments.length);
  });

  it('keeps an unreadable payload instead of overwriting it', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadAppData()).toBeNull();
    expect(window.localStorage.getItem(CORRUPT_BACKUP_KEY)).toBe('{not json');
  });

  it('clears stored data', () => {
    saveAppData(createDemoData());
    expect(loadAppData()).not.toBeNull();
    clearAppData();
    expect(loadAppData()).toBeNull();
  });
});

describe('preference validation', () => {
  it('normalises invalid values', () => {
    const prefs = normalizePreferences({ studyStart: '25:00', studyEnd: '08:00', maxDailyStudyMinutes: -5 });
    expect(prefs.studyStart).toBe(DEFAULT_PREFERENCES.studyStart);
    expect(prefs.studyEnd).toBe(DEFAULT_PREFERENCES.studyEnd);
    expect(prefs.maxDailyStudyMinutes).toBe(30);
    expect(prefs.language).toBe('en');
  });

  it('keeps valid values', () => {
    const prefs = normalizePreferences({ ...DEFAULT_PREFERENCES, maxDailyStudyMinutes: 180, theme: 'dark' });
    expect(prefs.maxDailyStudyMinutes).toBe(180);
    expect(prefs.theme).toBe('dark');
  });
});
