'use client';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { useIsClient } from '@/hooks/use-is-client';
import { useTheme } from 'next-themes';

export function ThemeCard() {
  const isClient = useIsClient();
  const { resolvedTheme, setTheme } = useTheme();

  const isDark = isClient ? resolvedTheme === 'dark' : true;

  return (
    <SettingsCard
      emoji={isDark ? '☀️' : '🌙'}
      label={isDark ? 'Light mode' : 'Dark mode'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    />
  );
}

