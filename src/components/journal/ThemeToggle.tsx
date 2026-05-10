'use client';

import { Button } from '@/components/ui/button';
import { useIsClient } from '@/hooks/use-is-client';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const isClient = useIsClient();
  const { resolvedTheme, setTheme } = useTheme();

  if (!isClient) {
    return (
      <Button variant='outline' size='sm' disabled>
        {/* Placeholder a Cumulative Layout Shift (CLS) ellen */}
        <div className='w-35 h-5' />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const Icon = isDark ? SunIcon : MoonIcon;
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Button variant='outline' size='sm' onClick={() => setTheme(isDark ? 'light' : 'dark')}>
      <Icon className='size-3.5 mr-1.5' />
      {label}
    </Button>
  );
}

