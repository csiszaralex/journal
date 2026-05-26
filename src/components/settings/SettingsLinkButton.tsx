'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { Route } from 'next';
import Link from 'next/link';

interface Props {
  href: Route;
  label: string;
  tooltip: string;
}

export function SettingsLinkButton({ href, label, tooltip }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            className='inline-flex h-8 items-center rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted'
          >
            {label}
          </Link>
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

