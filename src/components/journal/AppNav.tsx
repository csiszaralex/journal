'use client';

import { signOutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { BarChart2Icon, BellIcon, CalendarIcon, HomeIcon, LogOutIcon, MoreHorizontalIcon, SearchIcon, SettingsIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const primaryNavItems = [
  { href: '/', icon: HomeIcon, label: 'Today' },
  { href: '/calendar', icon: CalendarIcon, label: 'Calendar' },
];

const secondaryNavItems = [
  { href: '/search', icon: SearchIcon, label: 'Search' },
  { href: '/stats', icon: BarChart2Icon, label: 'Stats' },
  { href: '/devices', icon: BellIcon, label: 'Devices' },
  { href: '/settings', icon: SettingsIcon, label: 'Settings' },
];

const allNavItems = [...primaryNavItems, ...secondaryNavItems];

export function AppNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top header */}
      <header className='sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm'>
        <div className='mx-auto flex h-12 max-w-2xl items-center justify-between px-4'>
          <Link href='/' className='flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground'>
            <Image src='/icon.png' alt='Journal' width={20} height={20} className='rounded-sm' />
            Journal
          </Link>

          {/* Desktop nav */}
          <nav className='hidden sm:flex items-center gap-0.5'>
            {allNavItems.map(({ href, icon: Icon, label }) => (
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
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          <form action={signOutAction} className='hidden sm:block'>
            <Button type='submit' variant='ghost' size='icon' className='size-8' title='Sign out'>
              <LogOutIcon className='size-3.5' />
            </Button>
          </form>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className='fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background/95 backdrop-blur-sm sm:hidden'>
        {primaryNavItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
              pathname === href
                ? 'text-foreground'
                : 'text-muted-foreground',
            )}
          >
            <Icon className='size-5' />
            {label}
          </Link>
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <button className='flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium text-muted-foreground' />
            }
          >
            <MoreHorizontalIcon className='size-5' />
            More
          </SheetTrigger>
          <SheetContent side='bottom' className='rounded-t-2xl px-4 pb-8 pt-6'>
            <div className='grid grid-cols-4 gap-2'>
              {secondaryNavItems.map(({ href, icon: Icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl p-3 text-xs font-medium transition-colors',
                    pathname === href
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                  )}
                >
                  <Icon className='size-6' />
                  {label}
                </Link>
              ))}
            </div>

            <div className='mt-4 border-t border-border pt-4'>
              <form action={signOutAction}>
                <button
                  type='submit'
                  className='flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'
                >
                  <LogOutIcon className='size-5' />
                  Sign out
                </button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
