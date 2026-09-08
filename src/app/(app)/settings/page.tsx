export const dynamic = 'force-dynamic';

import { ExportButtons } from '@/components/journal/ExportButtons';
import { RegistrationToggle } from '@/components/journal/RegistrationToggle';
import { TemplatesManager } from '@/components/journal/TemplatesManager';
import { AiHistoryEntriesCard } from '@/components/settings/AiHistoryEntriesCard';
import { InstallAppCollapsible } from '@/components/settings/InstallAppCollapsible';
import { KeyboardShortcutsCollapsible } from '@/components/settings/KeyboardShortcutsCollapsible';
import { LocaleCard } from '@/components/settings/LocaleCard';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { SummaryGapDaysCard } from '@/components/settings/SummaryGapDaysCard';
import { ThemeCard } from '@/components/settings/ThemeCard';
import {
  getAiHistoryEntries,
  getRegistrationEnabled,
  getSummaryGapDays,
} from '@/db/queries/settings';
import { listTemplates } from '@/db/queries/templates';
import { getDict, getLocale } from '@/i18n/request';

export default async function SettingsPage() {
  const d = await getDict();
  const locale = await getLocale();
  const templates = listTemplates();
  const registrationEnabled = getRegistrationEnabled();
  const aiHistoryEntries = getAiHistoryEntries();
  const summaryGapDays = getSummaryGapDays();

  return (
    <div className='mx-auto max-w-2xl space-y-10 px-4 py-8'>
      <h1 className='text-xl font-semibold tracking-tight'>{d.settings.title}</h1>

      <div className='grid grid-cols-3 sm:grid-cols-6 gap-2'>
        <ThemeCard />
        <LocaleCard locale={locale} />
        <SettingsCard emoji='🔑' label={d.settings.cards.sessions} href='/settings/sessions' />
        <SettingsCard emoji='🔔' label={d.settings.cards.devices} href='/settings/devices' />
        <SettingsCard emoji='👤' label={d.settings.cards.profile} href='/settings/profile' />
        <SettingsCard emoji='🏷️' label={d.settings.cards.tags} href='/settings/tags' />
        <SettingsCard emoji='🎨' label={d.settings.cards.categories} href='/settings/categories' />
        <SettingsCard emoji='📋' label={d.settings.cards.auditLog} href='/settings/audit-log' />
      </div>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium'>{d.settings.sections.templates}</h2>
        <TemplatesManager templates={templates} />
      </section>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium'>{d.settings.sections.ai}</h2>
        <AiHistoryEntriesCard value={aiHistoryEntries} />
        <SummaryGapDaysCard value={summaryGapDays} />
      </section>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium'>{d.settings.sections.registration}</h2>
        <RegistrationToggle enabled={registrationEnabled} />
      </section>

      <section>
        <KeyboardShortcutsCollapsible />
      </section>

      <section>
        <InstallAppCollapsible />
      </section>

      <section className='space-y-3'>
        <h2 className='text-sm font-medium'>{d.settings.sections.export}</h2>
        <ExportButtons />
      </section>
    </div>
  );
}

