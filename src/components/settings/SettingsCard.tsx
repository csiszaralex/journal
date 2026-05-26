'use client';

import type { Route } from 'next';
import Link from 'next/link';

interface BaseProps {
  emoji: string;
  label: string;
}

interface LinkProps extends BaseProps {
  href: Route;
  onClick?: never;
}

interface ButtonProps extends BaseProps {
  onClick: () => void;
  href?: never;
}

type Props = LinkProps | ButtonProps;

const cardClass =
  'flex flex-col items-center justify-center gap-1.5 rounded-lg border border-border bg-background p-3 text-center transition-colors hover:bg-muted cursor-pointer';

export function SettingsCard({ emoji, label, ...rest }: Props) {
  const inner = (
    <>
      <span className='text-2xl leading-none' aria-hidden='true'>
        {emoji}
      </span>
      <span className='text-xs text-muted-foreground leading-tight'>{label}</span>
    </>
  );

  if ('href' in rest && rest.href !== undefined) {
    return (
      <Link href={rest.href} className={cardClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button type='button' onClick={rest.onClick} className={cardClass}>
      {inner}
    </button>
  );
}

