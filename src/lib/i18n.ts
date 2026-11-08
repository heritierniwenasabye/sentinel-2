import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { enUS, es, fr, ptBR, zhCN, type Locale } from 'date-fns/locale';
import type { Language } from '@/types';
import { STORAGE_KEY } from '@/lib/preferences';
import en from '@/locales/en';
import frLocale from '@/locales/fr';
import esLocale from '@/locales/es';
import ptLocale from '@/locales/pt';
import zhLocale from '@/locales/zh-CN';

export const SUPPORTED_LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'zh-CN', label: '简体中文' },
];

export const DATE_FNS_LOCALES: Record<Language, Locale> = {
  en: enUS,
  fr,
  es,
  pt: ptBR,
  'zh-CN': zhCN,
};

export const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((language) => language.code);

function initialLanguage(): Language {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return 'en';
    const parsed = JSON.parse(raw) as { data?: { preferences?: { language?: string } } };
    const stored = parsed?.data?.preferences?.language;
    if (stored && LANGUAGE_CODES.includes(stored as Language)) return stored as Language;
  } catch {
    /* corrupted storage — fall back to English */
  }
  return 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: frLocale },
    es: { translation: esLocale },
    pt: { translation: ptLocale },
    'zh-CN': { translation: zhLocale },
  },
  lng: initialLanguage(),
  fallbackLng: 'en',
  supportedLngs: LANGUAGE_CODES,
  interpolation: { escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
});

export default i18n;
