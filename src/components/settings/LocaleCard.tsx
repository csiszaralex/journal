'use client';

import { setLocaleAction } from '@/actions/settings';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { LOCALES, LOCALE_LABELS, type Locale } from '@/i18n/locales';
import { useI18n } from '@/i18n/provider';
import { useTransition } from 'react';

/**
 * Shows the language in force and cycles to the next one.
 *
 * The value is deliberately the *current* language rather than the one a click
 * would switch to: until it is pressed once the language may have come from the
 * browser rather than from a setting, so saying which one is actually in use is
 * the more useful half.
 */
export function LocaleCard({ locale }: { locale: Locale }) {
  const d = useI18n();
  const [isPending, startTransition] = useTransition();

  const nextLocale: Locale = LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length];

  return (
    <SettingsCard
      emoji='🌐'
      label={isPending ? d.common.saving : `${d.settings.language}: ${LOCALE_LABELS[locale]}`}
      onClick={() => startTransition(async () => void (await setLocaleAction({ locale: nextLocale })))}
    />
  );
}
