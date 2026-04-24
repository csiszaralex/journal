export const dynamic = 'force-dynamic';

import { StatsCharts } from '@/components/journal/StatsCharts';
import { getDailyStats, getFirstEntryDate, getOverallStats } from '@/db/queries/entries';

export default function StatsPage() {
  const today = new Date().toISOString().slice(0, 10);

  const chartFrom = new Date();
  chartFrom.setDate(chartFrom.getDate() - 89);
  const chartFromStr = chartFrom.toISOString().slice(0, 10);

  const stats = getOverallStats();
  const daily = getDailyStats(chartFromStr, today);
  const firstDate = getFirstEntryDate();

  let consistencyLabel: string;

  if (!firstDate) {
    consistencyLabel = 'No entries yet';
  } else {
    const firstMs = new Date(firstDate + 'T00:00:00').getTime();
    const todayMs = new Date(today + 'T00:00:00').getTime();
    const totalDaysSinceStart = Math.round((todayMs - firstMs) / 86400000) + 1;

    // Count ALL entries since first date (not just chart window)
    const allDaily = getDailyStats(firstDate, today);
    const totalDaysWithEntries = allDaily.length;
    const pct = Math.round((totalDaysWithEntries / totalDaysSinceStart) * 100);

    consistencyLabel = `${totalDaysWithEntries} of ${totalDaysSinceStart} days · ${pct}% since your first entry`;
  }

  return (
    <>
      <h1 className='text-xl font-semibold tracking-tight'>Stats</h1>

      {/* Overview cards */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>Total entries</p>
          <p className='text-2xl font-semibold tabular-nums'>{stats.total_entries}</p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>Current streak</p>
          <p className='text-2xl font-semibold tabular-nums'>
            {stats.streak}
            <span className='text-sm font-normal text-muted-foreground ml-1'>
              {stats.streak === 1 ? 'day' : 'days'}
            </span>
          </p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>Best streak</p>
          <p className='text-2xl font-semibold tabular-nums'>
            {stats.longest_streak}
            <span className='text-sm font-normal text-muted-foreground ml-1'>
              {stats.longest_streak === 1 ? 'day' : 'days'}
            </span>
          </p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>Avg mood (30d)</p>
          <p className='text-2xl font-semibold tabular-nums'>{stats.avg_mood_30d ?? '—'}</p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>Avg energy (30d)</p>
          <p className='text-2xl font-semibold tabular-nums'>{stats.avg_energy_30d ?? '—'}</p>
        </div>
      </div>

      {/* Consistency */}
      <section className='space-y-1'>
        <h2 className='text-sm font-medium'>Consistency</h2>
        <p className='text-sm text-muted-foreground'>{consistencyLabel}</p>
        {firstDate && <p className='text-xs text-muted-foreground'>First entry: {firstDate}</p>}
      </section>

      {/* Charts — last 90 days */}
      {daily.length > 0 ? (
        <section className='space-y-3'>
          <h2 className='text-sm font-medium'>
            Mood &amp; energy{' '}
            <span className='font-normal text-muted-foreground'>(last 90 days)</span>
          </h2>
          <StatsCharts data={daily} />
        </section>
      ) : (
        <p className='text-sm text-muted-foreground'>
          No data yet — start adding entries with mood and energy scores.
        </p>
      )}
    </>
  );
}

