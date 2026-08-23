export const dynamic = 'force-dynamic';

import { EntryCard } from '@/components/journal/EntryCard';
import { MonthSwipe } from '@/components/journal/MonthSwipe';
import { Button } from '@/components/ui/button';
import {
  getCalendarData,
  getEntry,
  getSummaryRanges,
  listEntries,
  type EntryWithVersion,
} from '@/db/queries/entries';
import { cn } from '@/lib/utils';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';

type SearchParams = Promise<{ month?: string; day?: string }>;

const MOOD_BG: Record<number, string> = {
  1: 'bg-rose-200 dark:bg-rose-300',
  2: 'bg-orange-200 dark:bg-orange-300',
  3: 'bg-amber-200 dark:bg-amber-300',
  4: 'bg-lime-200 dark:bg-lime-300',
  5: 'bg-emerald-200 dark:bg-emerald-300',
};

const MOOD_TEXT: Record<number, string> = {
  1: 'text-rose-950',
  2: 'text-orange-950',
  3: 'text-amber-950',
  4: 'text-lime-950',
  5: 'text-emerald-950',
};

export default async function CalendarPage({ searchParams }: { searchParams: SearchParams }) {
  const { month, day } = await searchParams;
  const today = format(new Date(), 'yyyy-MM-dd');

  const monthDate = month ? new Date(month + '-01T00:00:00') : new Date();
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthKey = format(monthStart, 'yyyy-MM');
  const prevMonthKey = format(subMonths(monthStart, 1), 'yyyy-MM');
  const nextMonthKey = format(addMonths(monthStart, 1), 'yyyy-MM');

  // One entry per day → per-day mood + first 3 emotion emojis.
  const calData = getCalendarData(format(monthStart, 'yyyy-MM-dd'), format(monthEnd, 'yyyy-MM-dd'));

  const dateMap = new Map<
    string,
    { mood: number | null; emojis: string[]; emotionColors: string[] }
  >();
  for (const d of calData) {
    dateMap.set(d.entry_date, {
      mood: d.mood_score,
      emojis: d.emojis,
      emotionColors: d.emotionColors,
    });
  }

  // Every summary overlapping this month — drives both the faint band under the
  // days a summary covers and the selected-day panel below.
  const summaryRanges = getSummaryRanges(
    format(monthStart, 'yyyy-MM-dd'),
    format(monthEnd, 'yyyy-MM-dd'),
  );

  // Ranges can start before or end after the visible month, so clamp to the
  // month before expanding.
  const summaryDates = new Set<string>();
  for (const r of summaryRanges) {
    const start = new Date(r.period_start + 'T00:00:00');
    const end = new Date(r.entry_date + 'T00:00:00');
    for (const d of eachDayOfInterval({
      start: start < monthStart ? monthStart : start,
      end: end > monthEnd ? monthEnd : end,
    })) {
      summaryDates.add(format(d, 'yyyy-MM-dd'));
    }
  }

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Mon-first: Mon=0 … Sun=6
  const firstDow = (getDay(monthStart) + 6) % 7;

  const selectedDay = day ?? null;
  const dayEntries = selectedDay
    ? listEntries({ from_date: selectedDay, to_date: selectedDay, page_size: 50 })
    : [];

  // listEntries matches a summary only on its entry_date (the range's last day),
  // so every other banded day would open an empty panel under the band with no
  // route to the recap. Add the summaries whose period covers the selected day —
  // the band's own source of truth — skipping the one already listed when the day
  // is the range's end. Daily entries keep their position and order.
  const coveringSummaries: EntryWithVersion[] = selectedDay
    ? summaryRanges
        .filter(
          (r) =>
            r.period_start <= selectedDay &&
            selectedDay <= r.entry_date &&
            !dayEntries.some((e) => e.id === r.id),
        )
        .map((r) => getEntry(r.id))
        .filter((e): e is EntryWithVersion => e !== null)
    : [];
  const panelEntries = [...dayEntries, ...coveringSummaries];

  return (
    <>
      {/* Month navigation */}
      <div className='flex items-center justify-between'>
        <Link
          href={`/calendar?month=${prevMonthKey}`}
          className='flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <ChevronLeftIcon className='size-4' />
        </Link>
        <h1 className='text-lg font-semibold tracking-tight'>{format(monthStart, 'MMMM yyyy')}</h1>
        <Link
          href={`/calendar?month=${nextMonthKey}`}
          className='flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
        >
          <ChevronRightIcon className='size-4' />
        </Link>
      </div>

      {/* Calendar — comfortable, centered. Swipe left/right to change month on touch. */}
      <MonthSwipe
        prevHref={`/calendar?month=${prevMonthKey}`}
        nextHref={`/calendar?month=${nextMonthKey}`}
        className='mx-auto max-w-md'
      >
        {/* Weekday headers */}
        <div className='grid grid-cols-7 mb-1'>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div
              key={i}
              className='py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground'
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className='grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border'>
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`pad-${i}`} className='bg-background h-20' />
          ))}

          {days.map((d) => {
            const dateStr = format(d, 'yyyy-MM-dd');
            const data = dateMap.get(dateStr);
            const isSelected = selectedDay === dateStr;
            const isToday = dateStr === today;
            const hasEntry = data != null;
            const moodBg = data?.mood != null ? MOOD_BG[data.mood] : null;
            const moodText = data?.mood != null ? MOOD_TEXT[data.mood] : null;
            const emojis = data?.emojis ?? [];
            const emotionColors = data?.emotionColors ?? [];

            return (
              <Link
                key={dateStr}
                href={
                  isSelected
                    ? `/calendar?month=${monthKey}`
                    : `/calendar?month=${monthKey}&day=${dateStr}`
                }
                className={cn(
                  'group relative flex h-20 flex-col px-1.5 py-1 transition-colors',
                  moodBg ?? 'bg-background',
                  moodBg ? 'hover:opacity-90' : 'hover:bg-muted/60',
                  isSelected && !moodBg && 'bg-muted',
                  isSelected && 'ring-2 ring-inset ring-primary/60',
                  !isSelected && isToday && 'ring-1 ring-inset ring-primary/50',
                  summaryDates.has(dateStr) && 'border-b-2 border-amber-400/50',
                )}
              >
                {/* Day number */}
                <span
                  className={cn(
                    'text-xs font-medium leading-none tabular-nums',
                    moodText
                      ? moodText
                      : isToday
                        ? 'text-primary font-semibold'
                        : hasEntry
                          ? 'text-foreground'
                          : 'text-muted-foreground/50',
                  )}
                >
                  {format(d, 'd')}
                </span>

                {/* Primary emoji + emotion color dots */}
                {(emojis[0] || emotionColors.length > 0) && (
                  <div className='mt-auto flex flex-col items-center gap-0.5'>
                    {emojis[0] && (
                      <span className='emoji text-xl leading-none' aria-hidden>
                        {emojis[0]}
                      </span>
                    )}
                    {emotionColors.length > 0 && (
                      <div className='flex gap-0.5'>
                        {emotionColors.map((color, i) => (
                          <span
                            key={`${color}-${i}`}
                            aria-hidden='true'
                            className='block size-1.5 rounded-full'
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Legend */}
        <div className='mt-3 flex items-center justify-center gap-3 flex-wrap'>
          {[
            { color: 'bg-red-500', label: '1' },
            { color: 'bg-orange-500', label: '2' },
            { color: 'bg-yellow-500', label: '3' },
            { color: 'bg-green-500', label: '4' },
            { color: 'bg-emerald-400', label: '5' },
            { color: 'bg-muted-foreground/50', label: '—' },
          ].map(({ color, label }) => (
            <div key={label} className='flex items-center gap-1'>
              <div className={cn('size-1.5 rounded-full', color)} />
              <span className='text-[10px] text-muted-foreground'>{label}</span>
            </div>
          ))}
        </div>
      </MonthSwipe>

      {/* Selected day */}
      {selectedDay && (
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <h2 className='text-sm font-medium'>
              {format(new Date(selectedDay + 'T00:00:00'), 'EEEE, MMMM d')}
            </h2>
            <Link href={`/?date=${selectedDay}`}>
              <Button size='sm' variant='outline' className='h-7 gap-1.5 text-xs'>
                <PlusIcon className='size-3' />
                Open entry
              </Button>
            </Link>
          </div>

          {panelEntries.length === 0 ? (
            <p className='py-2 text-sm text-muted-foreground/60'>No entries for this day.</p>
          ) : (
            panelEntries.map((entry) => <EntryCard key={entry.id} entry={entry} today={today} />)
          )}
        </div>
      )}
    </>
  );
}

