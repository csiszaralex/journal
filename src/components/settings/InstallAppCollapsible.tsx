'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useI18n } from '@/i18n/provider';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

export function InstallAppCollapsible() {
  const d = useI18n();
  const [open, setOpen] = useState(false);

  // Each step is one sentence with one emphasised run — the path through the
  // platform's own menus — so the language decides where in the sentence that
  // run falls. See `@/i18n/emphasis`.
  const ios = d.settings.install.iosStep();
  const android = d.settings.install.androidStep();

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className='flex w-full items-center justify-between text-sm font-medium'>
        {d.settings.install.title}
        <ChevronDownIcon
          aria-hidden='true'
          className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className='pt-3'>
        <div className='rounded-lg border border-border bg-muted/30 p-4 space-y-2 text-sm text-muted-foreground'>
          <p className='font-medium text-foreground'>{d.settings.install.iosHeading}</p>
          <p>
            {ios.before}
            <span className='font-mono text-xs bg-muted px-1 py-0.5 rounded'>{ios.emphasis}</span>
            {ios.after}
          </p>
          <p>{d.settings.install.iosPush}</p>
          <p className='font-medium text-foreground pt-1'>{d.settings.install.androidHeading}</p>
          <p>
            {android.before}
            <em>{android.emphasis}</em>
            {android.after}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
