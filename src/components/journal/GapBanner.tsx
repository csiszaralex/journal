import { Button } from '@/components/ui/button';
import { addDays, format, subDays } from 'date-fns';
import { SparklesIcon } from 'lucide-react';
import Link from 'next/link';

interface Props {
  lastDailyDate: string;
  gapDays: number;
}

export function GapBanner({ lastDailyDate, gapDays }: Props) {
  const from = format(addDays(new Date(lastDailyDate + 'T00:00:00'), 1), 'yyyy-MM-dd');
  const to = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  return (
    <div className='flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-50/50 p-4 dark:bg-amber-950/20'>
      <div className='space-y-0.5'>
        <p className='text-sm font-medium'>{gapDays} napja nem írtál</p>
        <p className='text-xs text-muted-foreground'>
          Összefoglalod egyben, ami közben történt?
        </p>
      </div>
      {/* Link wraps Button — this project's Button has no asChild/render prop.
          Same pattern as the calendar page's "Open entry" action. */}
      <Link href={`/summary/new?from=${from}&to=${to}`}>
        <Button size='sm' variant='outline' className='gap-1.5'>
          <SparklesIcon className='size-3.5' />
          Összefoglaló írása
        </Button>
      </Link>
    </div>
  );
}
