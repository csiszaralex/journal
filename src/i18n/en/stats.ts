import type { EmphasisedSentence } from '../emphasis';

/**
 * The stats page: the five overview cards, the consistency line under them, and
 * the two 90-day charts (whose series names are shared between each chart's
 * heading and its tooltip).
 *
 * The numbers themselves are left exactly as the page computes them — rounded
 * integers and percentages, printed as-is. Nothing here formats a number.
 */
export const stats = {
  /** The page heading. Separate from `nav.stats` for the same reason
   *  `search.title` is separate from `nav.search`: chrome and page are free to
   *  read differently. */
  title: 'Stats',

  /** The row of overview cards. The averaging window is inside the label rather
   *  than appended to it — a language may abbreviate "30 days" differently, or
   *  put it somewhere else entirely. */
  cards: {
    totalEntries: 'Total entries',
    currentStreak: 'Current streak',
    bestStreak: 'Best streak',
    avgMood30d: 'Avg mood (30d)',
    avgEnergy30d: 'Avg energy (30d)',

    /**
     * The value under the two streak cards: a count set large with its unit
     * set small beside it. English pluralises the unit after a numeral and
     * Hungarian never does, and the space before it belongs to the sentence
     * rather than to the layout — a language that wants the unit first can put
     * it in `before` instead.
     */
    streakDays: (n: number): EmphasisedSentence => ({
      before: '',
      emphasis: `${n}`,
      after: n === 1 ? ' day' : ' days',
    }),
  },

  /** The line under the cards: how many of the days since the first entry have
   *  one. */
  consistency: {
    heading: 'Consistency',
    /** All three numbers in one sentence, because their order is not fixed:
     *  English names the part before the whole ("208 of 312 days"), Hungarian
     *  the whole before the part ("312 napból 208"). */
    summary: (daysWithEntries: number, totalDays: number, pct: number) =>
      `${daysWithEntries} of ${totalDays} days · ${pct}% since your first entry`,
    none: 'No entries yet',
    /** `date` arrives already formatted by `dates.dayShortWithYear`. */
    firstEntry: (date: string) => `First entry: ${date}`,
  },

  charts: {
    /** "Mood & energy (last 90 days)", the window set in a muted span. The
     *  window is emphasised — de-emphasised, really — inside the heading, so
     *  where it falls is the translation's call. */
    heading: (days: number): EmphasisedSentence => ({
      before: 'Mood & energy ',
      emphasis: `(last ${days} days)`,
      after: '',
    }),
    empty: 'No data yet — start adding entries with mood and energy scores.',
  },

  /** The two series. One key each: the same word is the heading above a chart
   *  and the label inside that chart's tooltip. */
  series: {
    mood: 'Mood',
    energy: 'Energy',
  },
};

export type Stats = typeof stats;
