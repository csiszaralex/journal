'use client';

import { signOutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CalendarIcon, HomeIcon, LogOutIcon, SearchIcon, SettingsIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: HomeIcon, label: 'Today' },
  { href: '/calendar', icon: CalendarIcon, label: 'Calendar' },
  { href: '/search', icon: SearchIcon, label: 'Search' },
  { href: '/settings', icon: SettingsIcon, label: 'Settings' },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <header className='sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm'>
      <div className='mx-auto flex h-12 max-w-2xl items-center justify-between px-4'>
        <Link href='/' className='text-sm font-semibold tracking-tight text-foreground'>
          Journal
        </Link>

        <nav className='flex items-center gap-0.5'>
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                pathname === href
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <Icon className='size-3.5' />
              <span className='hidden sm:inline'>{label}</span>
            </Link>
          ))}
        </nav>

        <form action={signOutAction}>
          <Button type='submit' variant='ghost' size='icon' className='size-8' title='Sign out'>
            <LogOutIcon className='size-3.5' />
          </Button>
        </form>
      </div>
    </header>
  );
}

