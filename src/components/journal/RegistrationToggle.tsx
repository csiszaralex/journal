'use client';

import { setRegistrationEnabledAction } from '@/actions/settings';
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
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">Allow new registrations</p>
        <p className="text-xs text-muted-foreground">
          {enabled
            ? 'New passkey registrations are allowed on the sign-in page.'
            : 'Registration is disabled. Only existing passkeys can sign in.'}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={toggle}
        disabled={isPending}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
