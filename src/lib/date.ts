// The one place a calendar day is derived. Every "today", every day-boundary
// and every date-string window in the app comes from here.
//
// Entry dates are stored as bare yyyy-MM-dd strings, so what day it is has to be
// decided somewhere. Deriving it from `new Date()` decides it in whatever zone
// the code happens to run in — the server's (UTC in the container) on a page,
// the phone's in a client component — and the home page, the streak, the stats
// and the intentions list then disagree around midnight. They are all views of
// one journal kept in one place, so they all use that place's clock.

import { addDays, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * The journal's home zone. Deliberately a constant, not a setting: the stored
 * entry dates are already anchored to it, so changing it later would silently
 * re-interpret history.
 */
export const APP_TZ = 'Europe/Budapest';

const ISO_DATE = 'yyyy-MM-dd';

/** The calendar day a stored instant (Date or epoch ms) falls on, in APP_TZ. */
export function dayInAppTZ(instant: Date | number): string {
  return formatInTimeZone(instant, APP_TZ, ISO_DATE);
}

/** The hour (0–23) an instant falls on in APP_TZ — for rules that split a day
 *  somewhere other than midnight. */
export function hourInAppTZ(instant: Date | number): number {
  return Number(formatInTimeZone(instant, APP_TZ, 'H'));
}

/** Today in APP_TZ, as yyyy-MM-dd. */
export function todayInAppTZ(): string {
  return dayInAppTZ(new Date());
}

/**
 * `days` calendar days after (negative: before) an ISO day.
 *
 * Pure string→string arithmetic: the input already names a day, so there is no
 * zone left to get wrong, and date-fns counts calendar days rather than 24-hour
 * blocks — a DST change inside the window does not shift the result.
 */
export function shiftDaysISO(iso: string, days: number): string {
  return format(addDays(new Date(iso + 'T00:00:00'), days), ISO_DATE);
}

/** The day `days` days before today in APP_TZ — the start of a rolling window. */
export function daysAgoInAppTZ(days: number): string {
  return shiftDaysISO(todayInAppTZ(), -days);
}
