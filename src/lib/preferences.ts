import type { Language, Theme, UserPreferences } from '@/types';
import { clamp } from '@/lib/utils';
import { isValidTime } from '@/lib/date';

/**
 * The storage key intentionally keeps the v2 name: renaming it would orphan the
 * data of every student who already used the app. The schema inside migrates.
 */
export const STORAGE_KEY = 'sentinel.v2.data';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  displayName: '',
  studyStart: '09:00',
  studyEnd: '21:00',
  maxDailyStudyMinutes: 240,
  minBreakMinutes: 15,
  sleepStart: '23:00',
  sleepEnd: '07:00',
  focusBonusPerDayMinutes: 0,
  onboardingCompleted: false,
};

const THEMES: Theme[] = ['light', 'dark', 'system'];
const LANGUAGES: Language[] = ['en', 'fr', 'es', 'pt', 'zh-CN'];

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as string[]).includes(value);
}

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as string[]).includes(value);
}

function numberOr(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.round(clamp(parsed, min, max));
}

/**
 * Normalises preferences coming from storage, an import file or a form.
 * Never throws: unknown or out-of-range values fall back to safe defaults.
 */
export function normalizePreferences(input: Partial<UserPreferences> | undefined | null): UserPreferences {
  const source = input ?? {};
  let studyStart = isValidTime(source.studyStart) ? source.studyStart : DEFAULT_PREFERENCES.studyStart;
  let studyEnd = isValidTime(source.studyEnd) ? source.studyEnd : DEFAULT_PREFERENCES.studyEnd;
  // A study window must be at least 30 minutes long and must not wrap midnight.
  if (studyEnd <= studyStart) { studyStart = DEFAULT_PREFERENCES.studyStart; studyEnd = DEFAULT_PREFERENCES.studyEnd; }

  const sleepStart = isValidTime(source.sleepStart) ? source.sleepStart : DEFAULT_PREFERENCES.sleepStart;
  const sleepEnd = isValidTime(source.sleepEnd) ? source.sleepEnd : DEFAULT_PREFERENCES.sleepEnd;

  return {
    theme: isTheme(source.theme) ? source.theme : DEFAULT_PREFERENCES.theme,
    language: isLanguage(source.language) ? source.language : DEFAULT_PREFERENCES.language,
    displayName: typeof source.displayName === 'string' ? source.displayName.slice(0, 80) : '',
    studyStart,
    studyEnd,
    maxDailyStudyMinutes: numberOr(source.maxDailyStudyMinutes, DEFAULT_PREFERENCES.maxDailyStudyMinutes, 30, 960),
    minBreakMinutes: numberOr(source.minBreakMinutes, DEFAULT_PREFERENCES.minBreakMinutes, 5, 120),
    sleepStart,
    sleepEnd,
    focusBonusPerDayMinutes: numberOr(source.focusBonusPerDayMinutes, 0, 0, 240),
    onboardingCompleted: source.onboardingCompleted === true,
  };
}
