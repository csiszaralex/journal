'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/i18n/provider';
import { useHotkey } from '@tanstack/react-hotkeys';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function isInInput(e: KeyboardEvent) {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export function KeyboardShortcuts() {
  const d = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Built here rather than at module scope: the descriptions come from the
  // dictionary, which is a hook away.
  const shortcuts = [
    { keys: ['h'], description: d.nav.shortcuts.goToToday },
    { keys: ['c'], description: d.nav.shortcuts.goToCalendar },
    { keys: ['s'], description: d.nav.shortcuts.goToSearch },
    { keys: ['t'], description: d.nav.shortcuts.goToStats },
    { keys: ['d'], description: d.nav.shortcuts.goToDevices },
    { keys: ['p'], description: d.nav.shortcuts.goToSettings },
    { keys: ['?'], description: d.nav.shortcuts.showHelp },
  ];

  // ? — manual listener (TanStack doesn't accept '?' as a hotkey string)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '?') return;
      if (isInInput(e)) return;
      e.preventDefault();
      setOpen((o) => !o);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useHotkey('H', (e) => { if (!isInInput(e)) router.push('/'); });
  useHotkey('C', (e) => { if (!isInInput(e)) router.push('/calendar'); });
  useHotkey('S', (e) => { if (!isInInput(e)) router.push('/search'); });
  useHotkey('T', (e) => { if (!isInInput(e)) router.push('/stats'); });
  useHotkey('D', (e) => { if (!isInInput(e)) router.push('/settings/devices'); });
  useHotkey('P', (e) => { if (!isInInput(e)) router.push('/settings'); });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>{d.nav.shortcuts.title}</DialogTitle>
        </DialogHeader>
        <div className='space-y-1'>
          {shortcuts.map((s) => (
            <div key={s.keys.join('+')} className='flex items-center justify-between py-1.5'>
              <span className='text-sm text-muted-foreground'>{s.description}</span>
              <div className='flex items-center gap-1'>
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className='inline-flex h-6 items-center rounded border border-border bg-muted px-1.5 font-mono text-xs'
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
