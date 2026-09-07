/**
 * The month calendar: the grid itself and the panel that opens under it when a
 * day is picked.
 *
 * Almost nothing here is a word. The month title, the selected-day heading and
 * the weekday column headers are all dates, so they come from `dates` — the
 * pattern is the translation. The mood legend is the numerals 1–5 and an em
 * dash for "no score", which read the same in every language and are therefore
 * left in the component.
 */
export const calendar = {
  /** The month arrows either side of the title. They are icon-only links, so
   *  this is their only accessible name — the same reason the entry form's
   *  day arrows carry one. */
  previousMonth: 'Previous month',
  nextMonth: 'Next month',

  /** Opens the picked day in the entry form on the Today page. */
  openEntry: 'Open entry',
  /** The selected-day panel with neither an entry of its own nor a summary
   *  covering it. */
  noEntries: 'No entries for this day.',
};

export type Calendar = typeof calendar;
