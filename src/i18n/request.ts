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
 *
 * The header is read *before* the setting, and unconditionally, even though the
 * setting usually wins. That ordering is load-bearing: touching `headers()`
 * marks the route dynamic, so a prerender bails out here rather than a few
 * lines further on, where it would reach for a database that does not exist at
 * build time. Checking the setting first cost the build the whole sign-in page
 * (`no such table: app_settings`), because that route is the one caller with no
 * `force-dynamic` of its own. See issue #44 for the same hazard in migrations.
 */
export async function getLocale(): Promise<Locale> {
  const requested = (await headers()).get('accept-language');
  return getStoredLocale() ?? pickLocale(requested);
}

export async function getDict(): Promise<Dictionary> {
  return dictionaryFor(await getLocale());
}
