/**
 * One entry's past: the version-history page, and the entry page that links to
 * it. They share an area because they are the two halves of the same screen —
 * the detail page's header is the way into the history and says so.
 *
 * The version marker itself ("v3") is not here: it is `common.versionLabel`,
 * already used on the entry card and in the form, and a second copy would be
 * free to drift from it.
 */
export const history = {
  /** Back-link at the top of the history page. It returns to the entry, not to
   *  settings, so it cannot use `common.backToSettings`. */
  backToEntry: 'Back to entry',

  title: 'Version history',

  /**
   * How many versions the entry has, under the title. A function because
   * English inflects the noun after the numeral and Hungarian must not — each
   * language writes the whole phrase.
   */
  versionCount: (n: number) => `${n} ${n === 1 ? 'version' : 'versions'}`,

  /** One version's row in the list. */
  version: {
    /** Marks the version the entry currently points at. */
    currentBadge: 'Current',
    /** Makes an older version current again. */
    restore: 'Restore',
    /**
     * The scores a version was saved with. Written as one sentence per case
     * rather than a mood string with an energy fragment appended: the
     * separator, the order and the words all belong to the language. Energy is
     * optional; mood is always present, because the line is only rendered when
     * a mood was scored.
     */
    scores: (mood: number, energy: number | null) =>
      energy == null ? `Mood ${mood}` : `Mood ${mood} · Energy ${energy}`,
  },

  /** The entry page — the form's own page, which this history belongs to. */
  detail: {
    /** Eyebrow above the entry's date, saying what the page does. */
    editing: 'Editing',
    /** The link into the history. `versionLabel` arrives already formatted by
     *  `common.versionLabel`; only the word and the way it is joined are here. */
    historyLink: (versionLabel: string) => `${versionLabel} · History`,
  },
};

export type History = typeof history;
