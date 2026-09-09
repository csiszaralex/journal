import type { EmphasisedSentence } from '../emphasis';

/**
 * Intentions: the intentions page and everything on it (the one-line add form,
 * the category filter, the grouped open list and the row a single intention is
 * listed as), the "open for today" block on the Today page, and the settings
 * screen that recolours the categories.
 *
 * The categories screen lives here rather than with the other settings pages
 * because a category is not a setting: it is parsed out of the intention text a
 * person types ("Work: call the bank"), so the words that describe one are this
 * feature's words.
 *
 * Words shared with the rest of the app — save, saving, delete, deleting,
 * cancel, and the back-link to settings — are NOT here. They live in `common`
 * and are used from there.
 */
export const intentions = {
  /** The page heading. Separate from `nav.intentions`, the destination in the
   *  bottom bar that leads here, for the same reason `stats.title` is separate
   *  from `nav.stats`: a menu entry and a page title may read differently. */
  title: 'Intentions',

  /** The two tabs the page is split into. */
  tabs: {
    /** The count is inside the sentence rather than appended to it: a language
     *  is free to put it elsewhere, or to inflect the noun for it. */
    open: (n: number) => `Open (${n})`,
    done: 'Done',
  },

  /**
   * The headings the open list is grouped under.
   *
   * `groupOpenIntentions` is a pure function with no dictionary: it sorts
   * intentions into these four buckets and names each by its key, and the list
   * component looks the heading up here. The keys are what the grouping rule
   * decides; only the words are translated.
   */
  groups: {
    overdue: 'Overdue',
    today: 'Today',
    soon: 'Soon',
    undated: 'No date',
  },

  empty: {
    /** The open tab with nothing in it — and the filter's fallback, which is
     *  the same sentence and therefore the same key. */
    open: 'No open intentions.',
    /** The list's own fallback, for a caller that names nothing more specific
     *  than "there is nothing here". */
    list: 'Nothing to show.',
    /** The done tab. The window is a number of days the page chooses, so it is
     *  a parameter rather than a "30" spelled into every language. */
    recentlyClosed: (days: number) =>
      `You haven't closed an intention in the last ${days} days.`,
  },

  /** The category chips above the open list. Every other chip on that row is a
   *  category name out of the person's own text; only this one is written. */
  filter: {
    all: 'All',
  },

  /** The block on the Today page listing what is open for today. */
  today: {
    /** The count disappears when there is none, so both cases are written out
     *  whole rather than a heading with a suffix stuck on it. */
    heading: (n: number): string =>
      n > 0 ? `Open intentions for today (${n})` : 'Open intentions for today',
    /** Leads to the full intentions page. */
    seeAll: 'all →',
  },

  /** The one-line form that adds an intention. */
  form: {
    /** The empty input on the intentions page… */
    placeholder: 'New intention…',
    /** …and on the Today page, where whatever is added is due today. */
    placeholderToday: 'New intention for today…',
    /** Once a category has been split off, the chip on the left already shows
     *  it and only the rest of the line is left to type. */
    textPlaceholder: 'text…',
    /** The category chip is a button that turns into an input. Both its title
     *  and its label, so a screen reader and a tooltip agree. */
    editCategory: 'Edit category',
    /** The due-date button before a date has been picked. */
    datePlaceholder: 'Date',
    clearDate: 'Clear date',
    submit: 'Add',
  },

  /** One intention, in any of the lists. */
  row: {
    /** The checkbox, which carries no visible label: ticking it completes the
     *  intention. */
    complete: 'Done',
    /** The ⋯ menu beside it. */
    actions: 'Actions',
    /** Letting an open intention go without doing it — its own outcome beside
     *  done, not a delete. */
    drop: 'Drop',
    /** Putting a completed or dropped one back on the open list. */
    reopen: 'Reopen',

    /**
     * The line under the text: when it is due, and how long ago that passed.
     * One whole line per case rather than a date with a suffix appended, so a
     * language may join the two differently or lead with the overdue note.
     *
     * `date` arrives already formatted by `dates.dayInput`. English pluralises
     * after the numeral; Hungarian must not.
     */
    dueLabel: (date: string, overdueDays: number): string =>
      overdueDays > 0
        ? `${date} · ${overdueDays} ${overdueDays === 1 ? 'day' : 'days'} overdue`
        : date,

    delete: {
      title: 'Delete this intention?',
      /** The intention's own text, quoted back: it is the one thing worth
       *  re-reading before confirming, and the row is about to vanish. */
      description: (text: string) =>
        `The intention "${text}" will disappear from the lists. It cannot be restored from the app.`,
    },
  },

  /** The settings screen listing every category ever used, with the colour it
   *  is drawn in. */
  categories: {
    /** The page heading, separate from `settings.cards.categories` — the label
     *  on the card that opens it. */
    title: 'Categories',
    intro:
      'Every intention category is given a stable color derived from its name. Here you can override any of them, or put one back to its automatic color.',

    /**
     * Nothing has been categorised yet.
     *
     * The quoted fragment is syntax the person has to type, not prose: the
     * colon is what the parser looks for and survives translation untouched,
     * while the two placeholder words around it are an example each language
     * writes for itself. It is an EmphasisedSentence because the example ends
     * the English sentence and sits one word from the end of the Hungarian
     * one — see `@/i18n/emphasis` for why that split belongs to the language.
     */
    empty: {
      before: 'No categories yet. Create an intention in the form ',
      emphasis: '"Category: text"',
      after: '.',
    } satisfies EmphasisedSentence,

    /** The colour swatch beside a category, which has no visible label. */
    colorLabel: (name: string) => `Color of ${name}`,
    /** Throws the override away and goes back to the colour derived from the
     *  name. The button is an icon alone, so it needs both a label and a
     *  tooltip — and they say different things on purpose: one names the
     *  action, the other its result. */
    reset: 'Reset',
    resetTitle: 'Back to the automatic color',
  },
};

export type Intentions = typeof intentions;
