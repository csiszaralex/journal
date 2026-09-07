import { en, type Dictionary } from './en';
import { hu } from './hu';
import type { Locale } from './locales';

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { en, hu };

/**
 * Both languages are compiled into whatever imports this — the client bundle
 * included. That is deliberate. The alternative, loading one dictionary on the
 * server and passing it down as a prop, cannot work here: most of the app's
 * components are client components, and the dictionary holds functions
 * (`page: (n) => …`) rather than only strings, so it does not survive
 * serialisation across the server/client boundary. Only the two-letter locale
 * crosses it; the strings are already on both sides.
 *
 * The cost is one unused language in the bundle, a few kilobytes compressed,
 * which the service worker fetches once.
 */
export function dictionaryFor(locale: Locale): Dictionary {
  return dictionaries[locale];
}
