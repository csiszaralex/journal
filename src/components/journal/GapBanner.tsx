import { Button } from '@/components/ui/button';
import { getDict } from '@/i18n/request';
import { SparklesIcon } from 'lucide-react';
import Link from 'next/link';

interface Props {
  /** First day of the period still worth recapping (yyyy-MM-dd). */
  from: string;
  /** Last day of that period, normally yesterday (yyyy-MM-dd). */
  to: string;
  /**
   * Days of silence the offer covers: `from` through today, both counted. Equal
   * to the honest gap when nothing is covered yet; shorter once a summary has
   * taken the head of the gap, so the number matches the range in the link.
   */
  gapDays: number;
}

/**
 * The range is computed by the caller (see getDefaultSummaryPeriod and
 * firstUncoveredDay in @/lib/summary-config): the home page has to know whether
 * anything is left uncovered before it can decide to render this at all, so
 * re-deriving the dates here would split one rule across two files.
 */
export async function GapBanner({ from, to, gapDays }: Props) {
  const d = await getDict();

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-50/50 p-4 dark:bg-amber-950/20'>
      <div className='space-y-0.5'>
        <p className='text-sm font-medium'>{d.summary.gapBanner.silence(gapDays)}</p>
        <p className='text-xs text-muted-foreground'>{d.summary.gapBanner.offer}</p>
      </div>
      {/* Link wraps Button — this project's Button has no asChild/render prop.
          Same pattern as the calendar page's "Open entry" action. */}
      <Link href={`/summary/new?from=${from}&to=${to}`}>
        <Button size='sm' variant='outline' className='gap-1.5'>
          <SparklesIcon className='size-3.5' />
          {d.summary.gapBanner.action}
        </Button>
      </Link>
    </div>
  );
}
