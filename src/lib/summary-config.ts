// Shared config and pure date helpers for summary entries. Kept free of
// server/DB imports so the settings UI and other client components can import
// them without pulling in the DB client.

import { differenceInCalendarDays } from 'date-fns';
import { shiftDaysISO, todayInAppTZ } from './date';

export const SUMMARY_GAP_DAYS_DEFAULT = 7;
export const SUMMARY_GAP_DAYS_MIN = 3;
export const SUMMARY_GAP_DAYS_MAX = 60;

/** Prior entries fed to the AI when writing a summary. Not user-configurable. */
export const SUMMARY_HISTORY_ENTRIES = 12;

function parseISODate(iso: string): Date {
  return new Date(iso + 'T00:00:00');
}

/** The day after `iso`, as yyyy-MM-dd. */
export function nextDay(iso: string): string {
  return shiftDaysISO(iso, 1);
}

/** Whole days from `from` through `to`, both ends counted (1 when equal). */
export function inclusiveDayCount(from: string, to: string): number {
  return differenceInCalendarDays(parseISODate(to), parseISODate(from)) + 1;
}

export type SummaryPeriod = { from: string; to: string };

/**
 * The range a gap recap covers by default: the day after the last daily entry
 * through yesterday — the silence itself, leaving today free for a normal
 * entry. With no daily entry at all, falls back to the default gap window.
 *
 * The two ends are derived independently, so a recent last-daily-entry can push
 * the start past the end (last entry today -> tomorrow > yesterday). That range
 * fails validation on save with a message the user cannot act on, so it is
 * clamped to a single day.
 *
 * Single source of truth for the home-page gap banner and the /summary/new
 * defaults, which must offer the same period. `today` is a yyyy-MM-dd day in the
 * app's zone, not an instant, so the banner and the page it links to cannot land
 * on different days by being rendered in different zones.
 */
export function getDefaultSummaryPeriod(
  lastDailyDate: string | null,
  today: string = todayInAppTZ(),
): SummaryPeriod {
  const to = shiftDaysISO(today, -1);
  const derivedFrom = lastDailyDate
    ? nextDay(lastDailyDate)
    : shiftDaysISO(today, -SUMMARY_GAP_DAYS_DEFAULT);
  return { from: derivedFrom > to ? to : derivedFrom, to };
}

/**
 * The first day of [from, to] that no summary in `ranges` covers, or null when
 * the whole window is already covered.
 *
 * Deliberately not a general interval algebra: the ranges are walked
 * oldest-first and a cursor is advanced past every one that touches it, which
 * resolves the cases that occur in practice — a recap covering the whole gap,
 * or its head — and leaves an island in the middle of the window inside the
 * offered range. `ranges` may be in any order.
 */
export function firstUncoveredDay(
  from: string,
  to: string,
  ranges: { period_start: string; entry_date: string }[],
): string | null {
  const sorted = [...ranges].sort((a, b) => a.period_start.localeCompare(b.period_start));
  let cursor = from;
  for (const range of sorted) {
    // Sorted ascending, so once a range starts after the cursor no later one
    // can cover it either — the coverage breaks here.
    if (range.period_start > cursor) break;
    if (range.entry_date >= cursor) cursor = nextDay(range.entry_date);
    if (cursor > to) return null;
  }
  return cursor > to ? null : cursor;
}
