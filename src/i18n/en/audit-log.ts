/**
 * The audit log page: the filter bar above the list, the count, and the
 * disclosure on each row.
 *
 * The rows themselves are deliberately almost untranslated. An event name
 * (`auth.signin.success`) is a stored value, the timestamp is a machine format
 * from `dates.timestampWithSeconds`, and the metadata is raw JSON — this is the
 * one screen where what is on it is the record, not a rendering of it.
 *
 * The pagination buttons and the empty state are NOT here either: they are
 * `common.previous`, `common.next` and `common.noResults`, shared with every
 * other paged list.
 */
export const auditLog = {
  /** The page heading; `settings.cards.auditLog` is the card that opens it. */
  title: 'Audit log',

  /** The filter bar: a free-text box, the category select, and the submit. */
  searchPlaceholder: 'Search…',
  filterButton: 'Filter',
  /** The category select's first option, which clears the filter. Its value is
   *  the empty string, and stays that way. */
  allCategories: 'All categories',

  /**
   * Display names for the event categories, keyed by the stored slug.
   *
   * The slugs are data: they are the prefix an event name is filtered by and
   * the value the select submits, so they must never change. Before this map
   * the page rendered the slug itself as the option's text, which meant the
   * filter was in English on a Hungarian page and could not be fixed without
   * touching stored values. The keys here are the slugs; only the labels are
   * translated.
   *
   * `CATEGORIES` indexes this map directly, so a slug added there and forgotten
   * here is a type error rather than an empty option.
   */
  categories: {
    auth: 'Sign-in',
    entry: 'Entries',
    tag: 'Tags',
    emotion: 'Emotions',
    profile: 'Profile',
    intention: 'Intentions',
    template: 'Templates',
    export: 'Export',
    push: 'Push notifications',
    settings: 'Settings',
    ai: 'AI',
  },

  /** How many rows the current filter matched, above the list. A function
   *  because English inflects the noun after a numeral and Hungarian must
   *  not. */
  resultCount: (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`,

  /** The disclosure that unfolds a row's raw JSON payload. It names the stored
   *  field, so it stays close to it in every language. */
  metadata: 'metadata',

  /** Between the previous and next links. `common.page` takes one number and
   *  this line states two, which is why it is here rather than shared. */
  pageIndicator: (page: number, totalPages: number) => `Page ${page} of ${totalPages}`,
};

export type AuditLog = typeof auditLog;
