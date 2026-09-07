import { enUS } from 'date-fns/locale';

/**
 * Date rendering is not one pattern plus a locale option: the pattern itself
 * differs by language. English writes "Wednesday, September 3", Hungarian
 * "2026. szeptember 3., szerda" — a different field order, different
 * punctuation, and the year in a different place. So the patterns live here,
 * next to the names they format, and `src/lib/date.ts` only applies them.
 *
 * Machine-readable formats (yyyy-MM-dd keys, filename stamps) are NOT here.
 * Those must never change with the language.
 */
export const dates = {
  /** Passed to date-fns so month and weekday names come out in this language. */
  locale: enUS,

  /** Calendar grid column headers, Monday first. */
  weekdayInitials: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],

  /** "Wednesday, September 3" — a day heading within the current year. */
  dayLong: 'EEEE, MMMM d',
  /** "Wednesday, September 3, 2026" — a day heading that must state the year. */
  dayLongWithYear: 'EEEE, MMMM d, yyyy',
  /** "Sep 3" — a compact date on a card. */
  dayShort: 'MMM d',
  /** "Sep 3, 2026" */
  dayShortWithYear: 'MMM d, yyyy',
  /** "September 2026" — the calendar page title. */
  monthYear: 'MMMM yyyy',
  /** "2026-09-03 21:40" — a timestamp in a table. Numeric on purpose: it is
   *  read by scanning a column, not by reading a sentence. */
  timestamp: 'yyyy-MM-dd HH:mm',
  /** "2026-09-03 21:40:07" — the audit log, where the second matters. */
  timestampWithSeconds: 'yyyy-MM-dd HH:mm:ss',
  /** "Sep 3, 2026 at 21:40" — when a version was edited. The English "at" is
   *  part of the pattern, which is exactly why the pattern has to be
   *  translatable rather than shared. */
  editedAt: "MMM d, yyyy 'at' HH:mm",
  /** "2026-09-03" shown to a person — the date picker trigger. */
  dayInput: 'MMM d, yyyy',
  /** A day on a chart axis. Its own register because it is bounded by pixels
   *  rather than by convention: up to ninety of these share one phone-width
   *  axis, so a translation has to stay a few characters wide even where the
   *  language would normally spell the month out. */
  chartAxis: 'MMM d',
};

export type Dates = typeof dates;
