/**
 * Finding an entry again: the search page's heading, the query box and the four
 * filters above the results, how many results there are, and the two ways a
 * search comes up empty.
 *
 * The pagination underneath is NOT here: the buttons and the page indicator are
 * `common.previous`, `common.next` and `common.page`, shared with every other
 * paged list in the app, as is the failure message (`common.unexpectedError`).
 */
export const search = {
  /**
   * The page's own heading. The same English word as `nav.search`, deliberately
   * a separate key: one is a destination in the bottom bar, the other names the
   * page you are reading, and a language is free to word those differently.
   */
  title: 'Search',

  /** The query box. It matches entry text and tag names, hence both nouns. */
  placeholder: 'Search entries and tags…',

  /** The filter row. `from`/`to` bound the entry date, the mood pair the score;
   *  all four are column-narrow, so keep the translations short. */
  filters: {
    from: 'From',
    to: 'To',
    moodMin: 'Min mood',
    moodMax: 'Max mood',
    /** "No bound set", in both mood selects. Only the label is translated — the
     *  value behind it stays the machine string `any`. */
    any: 'Any',
  },

  /**
   * What the list below is showing. Three separate sentences rather than one
   * with a slot: "filtered" is an adjective that agrees with its noun in most
   * languages, and "all entries" is a different construction again.
   */
  heading: {
    /** The quote marks are inside the string on purpose — they are „…” in
     *  Hungarian and "…" in English. */
    results: (query: string) => `Results for "${query}"`,
    filtered: 'Filtered entries',
    all: 'All entries',
  },

  results: {
    /**
     * How many entries are on screen. A whole phrase per language: English
     * pluralises the noun after a numeral, Hungarian never does, so this
     * cannot be a suffix the component appends.
     *
     * Zero is handled here rather than by `common.noResults`, which ends in a
     * full stop because it is an empty-state sentence. This sits beside "12
     * results" in the same chip, so it has to read as a count.
     */
    count: (n: number) => (n === 0 ? 'No results' : `${n} result${n === 1 ? '' : 's'}`),
    /** A full page of results: there are at least this many and probably more.
     *  It is a lower bound, not a count — say so in the translation. */
    atLeast: (n: number) => `${n}+ results`,
  },

  /** Nothing to list. Two sentences, because "your search found nothing" and
   *  "there is nothing here" are different things to be told. */
  empty: {
    query: 'No entries matched your search.',
    all: 'No entries found.',
  },
};

export type Search = typeof search;
