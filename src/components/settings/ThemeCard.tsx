'use client';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { useIsClient } from '@/hooks/use-is-client';
import { useI18n } from '@/i18n/provider';
import { useTheme } from 'next-themes';

export function ThemeCard() {
  const d = useI18n();
  const isClient = useIsClient();
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = isClient ? resolvedTheme === 'dark' : true;

  return (
    <SettingsCard
      emoji={isDark ? '☀️' : '🌙'}
      label={isDark ? d.settings.theme.light : d.settings.theme.dark}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    />
  );
}

