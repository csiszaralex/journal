'use client';

import { signOutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';
import { BarChart2Icon, CalendarIcon, HomeIcon, LogOutIcon, MoreHorizontalIcon, SearchIcon, SettingsIcon, TargetIcon } from 'lucide-react';
import type { Route } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

/** The label is looked up at render time — these arrays are module-level, and a
 *  module cannot call a hook — so an item carries its dictionary key instead. */
type NavLabelKey = 'today' | 'calendar' | 'intentions' | 'search' | 'stats' | 'settings';

type NavItem = { href: Route; icon: typeof HomeIcon; labelKey: NavLabelKey };

const primaryNavItems: NavItem[] = [
  { href: '/', icon: HomeIcon, labelKey: 'today' },
  { href: '/calendar', icon: CalendarIcon, labelKey: 'calendar' },
  { href: '/intentions', icon: TargetIcon, labelKey: 'intentions' },
];

const secondaryNavItems: NavItem[] = [
  { href: '/search', icon: SearchIcon, labelKey: 'search' },
  { href: '/stats', icon: BarChart2Icon, labelKey: 'stats' },
  { href: '/settings', icon: SettingsIcon, labelKey: 'settings' },
];

const allNavItems = [...primaryNavItems, ...secondaryNavItems];

export function AppNav() {
  const d = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top header */}
      <header className='sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm'>
        <div className='mx-auto flex h-12 max-w-2xl items-center justify-between px-4'>
          <Link href='/' className='flex items-center gap-2 text-sm font-semibold tracking-tight text-foreground'>
            {/* Decorative: the wordmark beside it already names the app, and an
                alt of "Journal" would have a screen reader say it twice. */}
            <Image src='/icon.png' alt='' width={20} height={20} className='rounded-sm' />
            Journal
          </Link>

          {/* Desktop nav */}
          <nav className='hidden sm:flex items-center gap-0.5'>
            {allNavItems.map(({ href, icon: Icon, labelKey }) => (
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
                <span>{d.nav[labelKey]}</span>
              </Link>
            ))}
          </nav>

          <form action={signOutAction} className='hidden sm:block'>
            <Button type='submit' variant='ghost' size='icon' className='size-8' title={d.nav.signOut}>
              <LogOutIcon className='size-3.5' />
            </Button>
          </form>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className='fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-background/95 backdrop-blur-sm sm:hidden'>
        {primaryNavItems.map(({ href, icon: Icon, labelKey }) => (
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
            {d.nav[labelKey]}
          </Link>
        ))}

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant='ghost'
                className='flex h-auto flex-1 shrink flex-col items-center gap-1 py-3 text-[10px] font-medium text-muted-foreground'
              />
            }
          >
            <MoreHorizontalIcon className='size-5' />
            {d.nav.more}
          </SheetTrigger>
          <SheetContent side='bottom' className='rounded-t-2xl px-4 pb-8 pt-6'>
            <div className='grid grid-cols-4 gap-2'>
              {secondaryNavItems.map(({ href, icon: Icon, labelKey }) => (
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
                  {d.nav[labelKey]}
                </Link>
              ))}
            </div>

            <div className='mt-4 border-t border-border pt-4'>
              <form action={signOutAction}>
                <Button
                  type='submit'
                  variant='ghost'
                  className='w-full justify-start gap-3 rounded-xl px-3 py-3 text-sm font-medium'
                >
                  <LogOutIcon className='size-5' />
                  {d.nav.signOut}
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </>
  );
}
