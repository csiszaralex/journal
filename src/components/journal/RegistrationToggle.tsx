'use client';

import { setRegistrationEnabledAction } from '@/actions/settings';
import { Switch } from '@/components/ui/switch';
import { useTransition } from 'react';

interface Props {
  enabled: boolean;
}

export function RegistrationToggle({ enabled }: Props) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setRegistrationEnabledAction({ enabled: !enabled });
    });
  }

  return (
    <div className='flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4'>
      <div className='space-y-0.5'>
        <p className='text-sm font-medium'>Allow new registrations</p>
        <p className='text-xs text-muted-foreground'>
          {enabled
            ? 'New passkey registrations are allowed on the sign-in page.'
            : 'Registration is disabled. Only existing passkeys can sign in.'}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={toggle}
        disabled={isPending}
        aria-label='Toggle registration'
      />
    </div>
  );
}

