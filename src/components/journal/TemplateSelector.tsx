'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { EntryTemplate } from '@/db/queries/templates';
import { LayoutTemplateIcon } from 'lucide-react';

interface Props {
  templates: EntryTemplate[];
  onSelect: (t: EntryTemplate) => void;
}

export function TemplateSelector({ templates, onSelect }: Props) {
  if (templates.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        type='button'
        className='inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
      >
        <LayoutTemplateIcon className='size-3' />
        Template
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {templates.map((t) => (
          <DropdownMenuItem key={t.id} onClick={() => onSelect(t)}>
            {t.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
