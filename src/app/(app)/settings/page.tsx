export const dynamic = 'force-dynamic';

import { ExportButtons } from '@/components/journal/ExportButtons';
import { RegistrationToggle } from '@/components/journal/RegistrationToggle';
import { TemplatesManager } from '@/components/journal/TemplatesManager';
import { InstallAppCollapsible } from '@/components/settings/InstallAppCollapsible';
import { KeyboardShortcutsCollapsible } from '@/components/settings/KeyboardShortcutsCollapsible';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { ThemeCard } from '@/components/settings/ThemeCard';
import { getRegistrationEnabled } from '@/db/queries/settings';
import { listTemplates } from '@/db/queries/templates';

export default function SettingsPage() {
  const templates = listTemplates();
  const registrationEnabled = getRegistrationEnabled();

  return (
    <div className='mx-auto max-w-2xl space-y-10 px-4 py-8'>
      <h1 className='text-xl font-semibold tracking-tight'>Settings</h1>

      <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
        <ThemeCard />
        <SettingsCard emoji='🔑' label='Sessions & passkeys' href='/settings/sessions' />
        <SettingsCard emoji='🔔' label='Devices & notifications' href='/settings/devices' />
        <SettingsCard emoji='👤' label='Profil' href='/settings/profile' />
        <SettingsCard emoji='🏷️' label='Tags & emotions' href='/settings/tags' />
      </div>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium'>Entry templates</h2>
        <TemplatesManager templates={templates} />
      </section>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium'>Registration</h2>
        <RegistrationToggle enabled={registrationEnabled} />
      </section>

      <section>
        <KeyboardShortcutsCollapsible />
      </section>

      <section>
        <InstallAppCollapsible />
      </section>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium'>Export data</h2>
        <ExportButtons />
      </section>
    </div>
  );
}

