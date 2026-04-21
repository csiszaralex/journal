'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useHotkey } from '@tanstack/react-hotkeys';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const shortcuts = [
  { keys: ['h'], description: 'Go to Today' },
  { keys: ['c'], description: 'Go to Calendar' },
  { keys: ['s'], description: 'Go to Search' },
  { keys: ['t'], description: 'Go to Stats' },
  { keys: ['d'], description: 'Go to Devices' },
  { keys: ['p'], description: 'Go to Settings' },
  { keys: ['?'], description: 'Show this help' },
];

function isInInput(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;
}

export function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
  useHotkey('D', (e) => { if (!isInInput(e)) router.push('/devices'); });
  useHotkey('P', (e) => { if (!isInInput(e)) router.push('/settings'); });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className='max-w-sm'>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
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
