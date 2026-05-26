'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

export function KeyboardShortcutsCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className='flex w-full items-center justify-between text-sm font-medium'>
        Keyboard shortcuts
        <ChevronDownIcon
          aria-hidden='true'
          className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className='pt-3'>
        <p className='text-sm text-muted-foreground'>
          Press{' '}
          <kbd className='rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs'>
            ?
          </kbd>{' '}
          anywhere to open the shortcuts reference. Single-letter shortcuts:{' '}
          <kbd className='rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs'>
            h
          </kbd>{' '}
          Today ·{' '}
          <kbd className='rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs'>
            c
          </kbd>{' '}
          Calendar ·{' '}
          <kbd className='rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs'>
            s
          </kbd>{' '}
          Search ·{' '}
          <kbd className='rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs'>
            t
          </kbd>{' '}
          Stats. Shortcuts are disabled when typing in a field.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}

