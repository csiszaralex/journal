'use client';

import { createContext, useContext, useEffect } from 'react';
import { dictionaryFor, type Dictionary } from './dictionary';
import type { Locale } from './locales';

const I18nContext = createContext<Dictionary | null>(null);

/** Where the offline fallback looks for the language, since it has no server
 *  to ask. Written here so it is always whatever was last actually rendered. */
export const LOCALE_STORAGE_KEY = 'journal.locale';

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  useEffect(() => {
    // `<html>` is rendered by the root layout, which stays statically
    // renderable so the precached offline page keeps working — it cannot read
    // a setting, so the language is stamped on after hydration instead.
    document.documentElement.lang = locale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      // Private mode, or storage disabled. The offline page falls back to the
      // browser's own language; nothing else depends on this.
    }
  }, [locale]);

  return <I18nContext.Provider value={dictionaryFor(locale)}>{children}</I18nContext.Provider>;
}

export function useI18n(): Dictionary {
  const dict = useContext(I18nContext);
  if (!dict) throw new Error('useI18n must be used inside <I18nProvider>');
  return dict;
}
