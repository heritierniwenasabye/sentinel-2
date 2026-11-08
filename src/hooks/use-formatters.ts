import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import type { Language } from '@/types';
import { DATE_FNS_LOCALES } from '@/lib/i18n';
import { durationParts } from '@/lib/date';
import { round } from '@/lib/utils';

export interface Formatters {
  language: Language;
  /** e.g. "Mon, 9 Nov" */
  date: (value: string | Date, pattern?: string) => string;
  /** e.g. "14:30" */
  time: (value: string | Date, pattern?: string) => string;
  dateTime: (value: string | Date) => string;
  weekday: (dateKey: string) => string;
  weekdayShort: (dateKey: string) => string;
  monthDay: (dateKey: string) => string;
  number: (value: number) => string;
  percent: (value: number) => string;
  /** Localised duration, e.g. "2 h 30 min" */
  duration: (minutes: number) => string;
  hours: (minutes: number) => number;
  round: (value: number, digits?: number) => number;
}

/**
 * Intl locale used for dates. English keeps the day-first order the design uses;
 * every other language relies on its own native ordering (e.g. 11月7日).
 */
const INTL_LOCALES: Record<Language, string> = {
  en: 'en-GB',
  fr: 'fr',
  es: 'es',
  pt: 'pt-BR',
  'zh-CN': 'zh-CN',
};

/**
 * date-fns patterns used across the UI, expressed as Intl options so that the
 * field order and separators follow each locale rather than English syntax.
 */
const INTL_PATTERNS: Record<string, Intl.DateTimeFormatOptions> = {
  d: { day: 'numeric' },
  'd MMM': { day: 'numeric', month: 'short' },
  'd MMM yyyy': { day: 'numeric', month: 'short', year: 'numeric' },
  'MMMM yyyy': { month: 'long', year: 'numeric' },
  'EEE d MMM': { weekday: 'short', day: 'numeric', month: 'short' },
  'EEEE d MMM': { weekday: 'long', day: 'numeric', month: 'short' },
  'EEEE d MMMM yyyy': { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  'd MMM, HH:mm': { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false },
  'EEE d MMM, HH:mm': {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
};

function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value;
}

export function useFormatters(): Formatters {
  const { t, i18n } = useTranslation();
  const language = (i18n.language as Language) in DATE_FNS_LOCALES ? (i18n.language as Language) : 'en';
  const locale = DATE_FNS_LOCALES[language];

  return useMemo<Formatters>(() => {
    const numberFormat = new Intl.NumberFormat(language);
    const percentFormat = new Intl.NumberFormat(language, {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    const intlCache = new Map<string, Intl.DateTimeFormat>();

    const safeFormat = (value: string | Date, pattern: string): string => {
      const date = toDate(value);
      if (Number.isNaN(date.getTime())) return '—';
      const intlPattern = INTL_PATTERNS[pattern];
      if (intlPattern) {
        let formatter = intlCache.get(pattern);
        if (!formatter) {
          formatter = new Intl.DateTimeFormat(INTL_LOCALES[language], intlPattern);
          intlCache.set(pattern, formatter);
        }
        return formatter.format(date);
      }
      return format(date, pattern, { locale });
    };

    const duration = (minutes: number): string => {
      const parts = durationParts(minutes);
      if (parts.hours === 0 && parts.minutes === 0) return t('common.durationM', { minutes: 0 });
      if (parts.hours === 0) return t('common.durationM', { minutes: parts.minutes });
      if (parts.minutes === 0) return t('common.durationH', { hours: parts.hours });
      return t('common.durationHM', { hours: parts.hours, minutes: parts.minutes });
    };

    return {
      language,
      date: (value, pattern = 'EEE d MMM') => safeFormat(value, pattern),
      time: (value, pattern = 'HH:mm') => safeFormat(value, pattern),
      dateTime: (value) => safeFormat(value, 'EEE d MMM, HH:mm'),
      weekday: (dateKey) => safeFormat(`${dateKey}T12:00:00`, 'EEEE'),
      weekdayShort: (dateKey) => safeFormat(`${dateKey}T12:00:00`, 'EEE'),
      monthDay: (dateKey) => safeFormat(`${dateKey}T12:00:00`, 'd MMM'),
      number: (value) => numberFormat.format(value),
      percent: (value) => percentFormat.format(value / 100),
      duration,
      hours: (minutes) => round(minutes / 60, 1),
      round,
    };
  }, [language, locale, t]);
}
