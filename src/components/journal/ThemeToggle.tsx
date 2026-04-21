'use client';

import { Button } from '@/components/ui/button';
import { MoonIcon, SunIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant='outline'
      size='sm'
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? (
        <>
          <SunIcon className='size-3.5 mr-1.5' />
          Switch to light mode
        </>
      ) : (
        <>
          <MoonIcon className='size-3.5 mr-1.5' />
          Switch to dark mode
        </>
      )}
    </Button>
  );
}
