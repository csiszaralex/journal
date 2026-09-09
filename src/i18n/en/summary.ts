/**
 * Recapping a stretch of days in one entry: the banner the home page raises
 * after a silence, and the header of the page that banner links to.
 *
 * The summary *form* is not here. It is the ordinary entry form in summary
 * mode, and its words — the heading, the period pickers, the save button —
 * already live in `entry`. This area is only the two places that talk about a
 * summary from the outside.
 */
export const summary = {
  /** The amber banner on the home page, raised once enough days have gone by
   *  with nothing written. */
  gapBanner: {
    /**
     * How long the silence has run. A function because the two languages
     * disagree about it twice over: English pluralises the noun after a
     * numeral and Hungarian must not ("12 nap", never "12 napok"), and the
     * count opens the Hungarian sentence while English needs it at the end.
     *
     * A plain sentence rather than an `EmphasisedSentence`: the number carries
     * no emphasis of its own in the markup — the whole line is one weight — so
     * there is nothing to preserve.
     */
    silence: (days: number) => `You haven't written for ${days} ${days === 1 ? 'day' : 'days'}`,
    /** The offer under it. */
    offer: 'Shall we sum up what happened in the meantime?',
    /** The button, which opens the new-summary page over exactly that period. */
    action: 'Write a summary',
  },

  /**
   * The page header above the form on `/summary/new`.
   *
   * Deliberately not `entry.form.heading.newSummary`. That label is rendered by
   * the form itself a few pixels below this, so reusing it would print the same
   * words twice on one screen; this pair names the page, and the sentence under
   * it says what a summary is for.
   */
  newPage: {
    title: 'Summary',
    subtitle: 'A longer stretch, in one entry',
  },
};

export type Summary = typeof summary;
