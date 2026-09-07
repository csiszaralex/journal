export const dynamic = 'force-dynamic';

import { StatsCharts } from '@/components/journal/StatsCharts';
import { getDailyStats, getFirstEntryDate, getOverallStats } from '@/db/queries/entries';
import { getDict } from '@/i18n/request';
import { daysAgoInAppTZ, formatISODay, todayInAppTZ } from '@/lib/date';

/** How many days the two charts cover, inclusive of today. */
const CHART_DAYS = 90;

export default async function StatsPage() {
  const d = await getDict();
  const today = todayInAppTZ();
  // Inclusive of today, hence the −1. Named rather than written twice: the
  // chart heading states the same window in words and must not drift from it.
  const chartFromStr = daysAgoInAppTZ(CHART_DAYS - 1);

  const stats = getOverallStats();
  const daily = getDailyStats(chartFromStr, today);
  const firstDate = getFirstEntryDate();

  let consistencyLabel: string;

  if (!firstDate) {
    consistencyLabel = d.stats.consistency.none;
  } else {
    const firstMs = new Date(firstDate + 'T00:00:00').getTime();
    const todayMs = new Date(today + 'T00:00:00').getTime();
    const totalDaysSinceStart = Math.round((todayMs - firstMs) / 86400000) + 1;

    // Count ALL entries since first date (not just chart window)
    const allDaily = getDailyStats(firstDate, today);
    const totalDaysWithEntries = allDaily.length;
    const pct = Math.round((totalDaysWithEntries / totalDaysSinceStart) * 100);

    consistencyLabel = d.stats.consistency.summary(
      totalDaysWithEntries,
      totalDaysSinceStart,
      pct,
    );
  }

  // "5 days" under each streak card: the number is set large and its unit
  // small, so the sentence arrives split — see EmphasisedSentence.
  const currentStreak = d.stats.cards.streakDays(stats.streak);
  const bestStreak = d.stats.cards.streakDays(stats.longest_streak);
  const chartsHeading = d.stats.charts.heading(CHART_DAYS);

  return (
    <>
      <h1 className='text-xl font-semibold tracking-tight'>{d.stats.title}</h1>

      {/* Overview cards */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-5'>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>{d.stats.cards.totalEntries}</p>
          <p className='text-2xl font-semibold tabular-nums'>{stats.total_entries}</p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>{d.stats.cards.currentStreak}</p>
          <p className='text-2xl font-semibold tabular-nums'>
            <span className='text-sm font-normal text-muted-foreground'>{currentStreak.before}</span>
            {currentStreak.emphasis}
            <span className='text-sm font-normal text-muted-foreground'>{currentStreak.after}</span>
          </p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>{d.stats.cards.bestStreak}</p>
          <p className='text-2xl font-semibold tabular-nums'>
            <span className='text-sm font-normal text-muted-foreground'>{bestStreak.before}</span>
            {bestStreak.emphasis}
            <span className='text-sm font-normal text-muted-foreground'>{bestStreak.after}</span>
          </p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>{d.stats.cards.avgMood30d}</p>
          <p className='text-2xl font-semibold tabular-nums'>{stats.avg_mood_30d ?? '—'}</p>
        </div>
        <div className='rounded-lg border border-border bg-muted/20 p-4 space-y-1'>
          <p className='text-xs text-muted-foreground'>{d.stats.cards.avgEnergy30d}</p>
          <p className='text-2xl font-semibold tabular-nums'>{stats.avg_energy_30d ?? '—'}</p>
        </div>
      </div>

      {/* Consistency */}
      <section className='space-y-1'>
        <h2 className='text-sm font-medium'>{d.stats.consistency.heading}</h2>
        <p className='text-sm text-muted-foreground'>{consistencyLabel}</p>
        {firstDate && (
          <p className='text-xs text-muted-foreground'>
            {d.stats.consistency.firstEntry(
              formatISODay(firstDate, d.dates.dayShortWithYear, d.dates.locale),
            )}
          </p>
        )}
      </section>

      {/* Charts — last 90 days */}
      {daily.length > 0 ? (
        <section className='space-y-3'>
          <h2 className='text-sm font-medium'>
            {chartsHeading.before}
            <span className='font-normal text-muted-foreground'>{chartsHeading.emphasis}</span>
            {chartsHeading.after}
          </h2>
          <StatsCharts data={daily} />
        </section>
      ) : (
        <p className='text-sm text-muted-foreground'>{d.stats.charts.empty}</p>
      )}
    </>
  );
}

