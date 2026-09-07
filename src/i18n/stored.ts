import { getStoredLocale } from '@/db/queries/settings';
import { dictionaryFor, type Dictionary } from './dictionary';
import { DEFAULT_LOCALE, type Locale } from './locales';

/**
 * The language for work that happens without anyone asking for a page — the
 * cron worker composing a push notification, above all.
 *
 * There is no browser to negotiate with here, so an install that has never
 * chosen a language gets `DEFAULT_LOCALE` even if every browser that ever
 * opened it asked for something else.
 */
export function storedLocale(): Locale {
  return getStoredLocale() ?? DEFAULT_LOCALE;
}

export function storedDict(): Dictionary {
  return dictionaryFor(storedLocale());
}
