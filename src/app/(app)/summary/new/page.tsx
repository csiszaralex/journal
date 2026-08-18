export const dynamic = 'force-dynamic';

import { EntryForm } from '@/components/journal/EntryForm';
import { getGapInfo } from '@/db/queries/entries';
import { listTemplates } from '@/db/queries/templates';
import { addDays, format, subDays } from 'date-fns';

type SearchParams = Promise<{ from?: string; to?: string }>;

export default async function NewSummaryPage({ searchParams }: { searchParams: SearchParams }) {
  const { from, to } = await searchParams;
  const { lastDailyDate } = getGapInfo();
  const today = new Date();

  // Default range: the day after the last daily entry through yesterday —
  // the silence itself. Today stays free for a normal entry.
  const defaultTo = format(subDays(today, 1), 'yyyy-MM-dd');
  const derivedFrom = lastDailyDate
    ? format(addDays(new Date(lastDailyDate + 'T00:00:00'), 1), 'yyyy-MM-dd')
    : format(subDays(today, 7), 'yyyy-MM-dd');
  // The two ends are derived independently, so a recent last-daily-entry can push
  // the start past the end (last entry today -> tomorrow > yesterday). That range
  // fails validation on save with a message the user cannot act on, so clamp it to
  // a single day. Only the derived default is clamped — an explicit ?from= is the
  // caller's business.
  const defaultFrom = derivedFrom > defaultTo ? defaultTo : derivedFrom;

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
