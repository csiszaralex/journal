'use client';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useI18n } from '@/i18n/provider';
import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';

const kbdClass = 'rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs';

export function KeyboardShortcutsCollapsible() {
  const d = useI18n();
  const [open, setOpen] = useState(false);

  // One row per shortcut, rather than one paragraph with the key caps set into
  // it: a sentence built from a dozen text nodes fixes the word order in every
  // language, and a row does not. The seven descriptions are the ones the `?`
  // dialog already lists, read from the same keys so the two cannot drift; the
  // key caps themselves are keyboard glyphs, not words, so they stay here.
  const shortcuts = [
    { key: 'h', description: d.nav.shortcuts.goToToday },
    { key: 'c', description: d.nav.shortcuts.goToCalendar },
    { key: 's', description: d.nav.shortcuts.goToSearch },
    { key: 't', description: d.nav.shortcuts.goToStats },
    { key: 'd', description: d.nav.shortcuts.goToDevices },
    { key: 'p', description: d.nav.shortcuts.goToSettings },
    { key: '?', description: d.nav.shortcuts.showHelp },
    { key: 'Ctrl/⌘ + Enter', description: d.settings.shortcuts.saveEntry },
  ];

  const intro = d.settings.shortcuts.intro('?');

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className='flex w-full items-center justify-between text-sm font-medium'>
        {d.nav.shortcuts.title}
        <ChevronDownIcon
          aria-hidden='true'
          className={`size-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className='pt-3'>
        <p className='text-sm text-muted-foreground'>
          {intro.before}
          <kbd className={kbdClass}>{intro.emphasis}</kbd>
          {intro.after}
        </p>
        <div className='mt-2 space-y-1'>
          {shortcuts.map((s) => (
            <div key={s.key} className='flex items-center justify-between gap-3 py-0.5'>
              <span className='text-sm text-muted-foreground'>{s.description}</span>
              <kbd className={kbdClass}>{s.key}</kbd>
            </div>
          ))}
        </div>
        <p className='mt-2 text-sm text-muted-foreground'>
          {d.settings.shortcuts.disabledWhileTyping}
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
