'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

export function InstallAppCollapsible() {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className='flex w-full items-center justify-between text-sm font-medium'>
        Install app
        <ChevronDownIcon
          aria-hidden='true'
          className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className='pt-3'>
        <div className='rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground'>
          <p className='font-medium text-foreground'>iOS (Safari)</p>
          <p>
            Tap the <span className='font-mono text-xs bg-muted px-1 py-0.5 rounded'>Share</span>{' '}
            button → <em>Add to Home Screen</em>. Push notifications require iOS 16.4 or later and
            installation to Home Screen first.
          </p>
          <p className='font-medium text-foreground pt-1'>Android / Desktop (Chrome)</p>
          <p>
            Tap the install icon in the address bar, or open the browser menu and choose{' '}
            <em>Install app</em>.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

