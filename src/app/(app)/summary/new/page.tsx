export const dynamic = 'force-dynamic';

import { EntryForm } from '@/components/journal/EntryForm';
import { getGapInfo } from '@/db/queries/entries';
import { listTemplates } from '@/db/queries/templates';
import { getDefaultSummaryPeriod } from '@/lib/summary-config';

type SearchParams = Promise<{ from?: string; to?: string }>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function NewSummaryPage({ searchParams }: { searchParams: SearchParams }) {
  const { from, to } = await searchParams;
  const { lastDailyDate } = getGapInfo();

  // Same rule (and the same clamp) the gap banner offers, so arriving here from
  // the banner or by hand lands on the same period.
  const derived = getDefaultSummaryPeriod(lastDailyDate);

  // The two params are hand-editable: a non-date would render a raw string in the
  // period trigger and an Invalid Date in its picker. Both ends must parse before
  // either is used — half a valid pair would silently mix a hand-picked end with a
  // derived start. A parseable but inverted pair gets the same clamp the derived
  // path applies to itself, rather than an error the user cannot act on.
  const { from: periodFrom, to: periodTo } =
    from && to && ISO_DATE.test(from) && ISO_DATE.test(to)
      ? { from: from > to ? to : from, to }
      : derived;

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
          defaultDate={periodTo}
          defaultPeriodStart={periodFrom}
          initialEntryDates={[]}
        />
      </div>
    </>
  );
}
