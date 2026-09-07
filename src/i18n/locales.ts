/**
 * The languages the journal speaks.
 *
 * There is deliberately no migration seeding a `locale` row in `app_settings`:
 * until the language is chosen explicitly it is negotiated from the browser's
 * `Accept-Language` (see `src/i18n/request.ts`), so a fresh install speaks
 * whatever the person opening it speaks. `DEFAULT_LOCALE` is only the last
 * resort — an unrecognised header, or a caller with no request at all, such as
 * the cron worker sending a push notification.
 */
export const LOCALES = ['en', 'hu'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Each language named in itself — a switcher reading "Magyar" is more use to
 *  someone who cannot read the current language than one reading "Hungarian". */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  hu: 'Magyar',
};

/**
 * The best supported language for an `Accept-Language` header.
 *
 * Kept free of any framework import so it can be unit-tested on its own, and
 * deliberately small: the header is a q-ranked list of tags, we support two
 * languages, and region subtags do not matter — `hu-HU` and `hu` are the same
 * journal. Anything unparseable falls through to the default rather than
 * throwing, because a malformed header is not a reason to fail a page render.
 */
export function pickLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .find((p) => p.startsWith('q='))
        ?.slice(2);
      const quality = q === undefined ? 1 : Number.parseFloat(q);
      return { tag: tag.trim().toLowerCase(), quality: Number.isNaN(quality) ? 0 : quality };
    })
    .filter((entry) => entry.tag.length > 0 && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag === '*') return DEFAULT_LOCALE;
    const language = tag.split('-')[0];
    if (isLocale(language)) return language;
  }

  return DEFAULT_LOCALE;
}
