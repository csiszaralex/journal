'use client';

import { setRegistrationEnabledAction } from '@/actions/settings';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/i18n/provider';
import { useTransition } from 'react';

interface Props {
  enabled: boolean;
}

export function RegistrationToggle({ enabled }: Props) {
  const d = useI18n();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setRegistrationEnabledAction({ enabled: !enabled });
    });
  }

  return (
    <div className='flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4'>
      <div className='space-y-0.5'>
        <p className='text-sm font-medium'>{d.settings.registration.label}</p>
        <p className='text-xs text-muted-foreground'>
          {enabled ? d.settings.registration.enabled : d.settings.registration.disabled}
        </p>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={toggle}
        disabled={isPending}
        aria-label={d.settings.registration.toggleLabel}
      />
    </div>
  );
}

