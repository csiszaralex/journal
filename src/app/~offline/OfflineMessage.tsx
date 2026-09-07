'use client';

import { dictionaryFor } from '@/i18n/dictionary';
import { DEFAULT_LOCALE, isLocale, pickLocale, type Locale } from '@/i18n/locales';
import { LOCALE_STORAGE_KEY } from '@/i18n/provider';
import { useSyncExternalStore } from 'react';

/** Nothing ever changes the language while this page is on screen — it is shown
 *  when there is no network — so there is nothing to subscribe to. */
const neverChanges = () => () => {};

/**
 * The only screen that picks its own language.
 *
 * It is prerendered at build time and served by the service worker when there
 * is no network, so it can neither read the setting nor negotiate a header. It
 * uses what the app last rendered with — the provider mirrors the language into
 * localStorage for exactly this — and falls back to the browser's own
 * preference. Both are only available after hydration, so the prerendered HTML
 * is in the default language and swaps once mounted; two sentences flickering
 * on an error page is a fair price for the page working with no server at all.
 */
export function OfflineMessage() {
  const locale = useSyncExternalStore(neverChanges, browserLocale, () => DEFAULT_LOCALE);
  const d = dictionaryFor(locale);

  return (
    <div className='flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center'>
      <div className='text-4xl'>📡</div>
      <h1 className='text-xl font-semibold'>{d.offline.title}</h1>
      <p className='text-sm text-muted-foreground'>{d.offline.body}</p>
    </div>
  );
}

function browserLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored !== null && isLocale(stored)) return stored;
  } catch {
    // Storage disabled — fall through to the browser's own preference.
  }
  // Same shape as an Accept-Language header, minus the q-values: a preference
  // list, best first, which is all pickLocale needs.
  return pickLocale(navigator.languages?.join(',') ?? navigator.language);
}
