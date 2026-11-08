import type { TFunction } from 'i18next';
/** Localized explanations with a stable field/row locator, never raw English UI copy. */
export function importDiagnostic(message: string, t: TFunction): string {
  if (/MiB|10,000 records/.test(message)) return t('recovery.limits');
  const key = /Duplicate|already exists|duplicate/i.test(message) ? 'duplicate'
    : /unknown course/i.test(message) ? 'relationship'
    : /date|time|deadline|semester|recurrence/i.test(message) ? 'date'
    : /minutes|duration/i.test(message) ? 'duration'
    : /identifier|missing id|invalid.*id/i.test(message) ? 'id'
    : /newer|version/i.test(message) ? 'version'
    : /JSON|format|column|quoted|File|array/i.test(message) ? 'format' : 'record';
  const locator = message.match(/^(?:Row \d+|[a-zA-Z]+\[\d+\])/i)?.[0].replace(/^Row /i, '#');
  return `${locator ? locator + ': ' : ''}${t(`importErrors.${key}`)}`;
}
