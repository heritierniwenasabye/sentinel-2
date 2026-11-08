import { describe, expect, it } from 'vitest';
import en from '@/locales/en';
import fr from '@/locales/fr';
import es from '@/locales/es';
import pt from '@/locales/pt';
import zhCN from '@/locales/zh-CN';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      flattenKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

function collectEntries(value: unknown, prefix = ''): [string, string][] {
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectEntries(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, String(value)]];
}

const locales = [
  { code: 'fr', dictionary: fr },
  { code: 'es', dictionary: es },
  { code: 'pt', dictionary: pt },
  { code: 'zh-CN', dictionary: zhCN },
];

const englishKeys = new Set(flattenKeys(en));

describe('translation dictionaries', () => {
  it('has a substantial number of keys', () => {
    expect(englishKeys.size).toBeGreaterThan(200);
  });

  it.each(locales)('$code contains every English key', ({ dictionary }) => {
    const keys = flattenKeys(dictionary);
    const missing = [...englishKeys].filter((key) => !keys.includes(key));
    expect(missing).toEqual([]);
    expect(keys.length).toBe(englishKeys.size);
  });

  it.each(locales)('$code has no empty or untranslated placeholders', ({ dictionary }) => {
    const entries = collectEntries(dictionary);
    const empty = entries.filter(([, value]) => value.trim().length === 0);
    expect(empty).toEqual([]);
  });

  it.each(locales)('$code preserves interpolation placeholders', ({ dictionary }) => {
    const englishEntries = new Map(collectEntries(en));
    const issues: string[] = [];
    for (const [key, value] of collectEntries(dictionary)) {
      const source = englishEntries.get(key);
      if (!source) continue;
      const sourceVars = [...source.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();
      const targetVars = [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();
      if (JSON.stringify(sourceVars) !== JSON.stringify(targetVars)) {
        issues.push(`${key}: ${sourceVars.join(',')} vs ${targetVars.join(',')}`);
      }
    }
    expect(issues).toEqual([]);
  });
});
