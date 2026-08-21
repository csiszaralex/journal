export const dynamic = 'force-dynamic';

import { EntryForm } from '@/components/journal/EntryForm';
import { getGapInfo } from '@/db/queries/entries';
import { listTemplates } from '@/db/queries/templates';
import { getDefaultSummaryPeriod } from '@/lib/summary-config';

type SearchParams = Promise<{ from?: string; to?: string }>;

export default async function NewSummaryPage({ searchParams }: { searchParams: SearchParams }) {
  const { from, to } = await searchParams;
  const { lastDailyDate } = getGapInfo();

  // Same rule (and the same clamp) the gap banner offers, so arriving here from
  // the banner or by hand lands on the same period. Only the derived default is
  // clamped — an explicit ?from= is the caller's business.
  const { from: defaultFrom, to: defaultTo } = getDefaultSummaryPeriod(lastDailyDate);

  return (
    <>
      <div>
        <h1 className='text-xl font-semibold tracking-tight'>Összefoglaló</h1>
        <p className='text-sm text-muted-foreground'>Egy hosszabb időszak egyben</p>
      </div>
      <div className='rounded-xl border bg-card p-4'>
        <EntryForm
          kind='summary'
          templates={listTemplates()}
          defaultDate={to ?? defaultTo}
          defaultPeriodStart={from ?? defaultFrom}
          initialEntryDates={[]}
        />
      </div>
    </>
  );
}
