import { hu as huLocale } from 'date-fns/locale';
import type { Dates } from '../en/dates';

export const dates: Dates = {
  locale: huLocale,

  weekdayInitials: ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'],

  // Hungarian writes a date large-unit-first and puts the weekday last, so
  // these are not the English patterns with translated names — the field order
  // itself is different.
  dayLong: 'MMMM d., EEEE',
  dayLongWithYear: 'y. MMMM d., EEEE',
  dayShort: 'MMM d.',
  dayShortWithYear: 'y. MMM d.',
  monthYear: 'y. MMMM',
  timestamp: 'yyyy-MM-dd HH:mm',
  timestampWithSeconds: 'yyyy-MM-dd HH:mm:ss',
  editedAt: 'y. MMM d. HH:mm',
  dayInput: 'y. MMM d.',
  // Numeric, because the Hungarian month abbreviations ("szept.") are far too
  // wide for ninety ticks. Big-endian like every other Hungarian date, so
  // "09. 03." reads as September 3.
  chartAxis: 'MM. dd.',
};
