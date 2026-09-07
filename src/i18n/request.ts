import { getStoredLocale } from '@/db/queries/settings';
import { headers } from 'next/headers';
import { dictionaryFor, type Dictionary } from './dictionary';
import { pickLocale, type Locale } from './locales';

/**
 * The language for the request being served: the setting if the language has
 * ever been chosen, otherwise whatever the browser asked for.
 *
 * Reading `Accept-Language` opts the caller out of static rendering, which is
 * why this module is separate from `./stored` — the cron worker has no request
 * and must not pull `next/headers` into its bundle.
 */
export async function getLocale(): Promise<Locale> {
  const stored = getStoredLocale();
  if (stored) return stored;
  return pickLocale((await headers()).get('accept-language'));
}

export async function getDict(): Promise<Dictionary> {
  return dictionaryFor(await getLocale());
}
