import type { EmphasisedSentence } from '../emphasis';

/**
 * The tags & emotions settings page: the two lists on it, and the row that
 * edits one tag or one emotion.
 *
 * Tags and emotions share the screen and the row component, so they share an
 * area — but never a sentence. Every line that names one of the two is written
 * out twice, once per kind, because they are two different nouns and a language
 * is free to decline, article or position them differently. `row.delete` is
 * where that stopped being theoretical.
 *
 * Words shared with the rest of the app — save, saving, delete, deleting,
 * cancel, saved, and the back-link to settings — are NOT here. They live in
 * `common` and are used from there.
 */
export const tags = {
  /** The page heading. Separate from `settings.cards.tags`, the label on the
   *  card that leads here, for the same reason `stats.title` is separate from
   *  `nav.stats`: a card and the page it opens may read differently. */
  title: 'Tags & emotions',

  /**
   * The paragraph under the heading, explaining what the normalized name is
   * for. The two example spellings are part of the sentence rather than
   * parameters: each language picks a word worth spelling twice in it, and
   * casing an example is exactly the kind of thing a script may not do.
   */
  intro:
    'You can edit the display name, the normalized name (the one merging goes by) and the color. The normalized name is what decides whether two spellings mean the same tag — set it to "happy" and a later "HAPPY" attaches to this one.',

  /** The two lists the page is divided into. */
  sections: {
    tags: 'Tags',
    emotions: 'Emotions',
  },

  /** Either list with nothing in it yet. Its own pair rather than a borrow from
   *  `entry.pickers`: those are said inside a picker that is about to create
   *  one, this is said on the page that administers them. */
  empty: {
    tags: 'No tags yet.',
    emotions: 'No emotions yet.',
  },

  /** One editable row: a tag or an emotion, its fields, and its delete
   *  confirmation. */
  row: {
    /** The color swatch and the emoji box carry no visible label, so these are
     *  what a screen reader announces. */
    colorLabel: 'Color',
    emojiLabel: 'Emoji',

    /** The two text fields. The display name is what is shown on a chip; the
     *  normalized name is the lower-cased key two spellings merge on. */
    displayNameLabel: 'Display name',
    normalizedNameLabel: 'Normalized name',

    /** How many entries use this one, in the corner of the row. A function
     *  because "12×" is a convention rather than a universal: a language may
     *  want the sign first, or the count spelled as a phrase. */
    usageCount: (n: number) => `${n}×`,

    /** Fallbacks for a save or a delete that failed without saying why. A
     *  reason the server did send is shown exactly as it arrives — those
     *  strings come from the server and are not translated here. */
    saveFailed: 'Could not save',
    deleteFailed: 'Could not delete',

    /**
     * The delete confirmation. Three sentences, each written once per kind —
     * six in every language.
     *
     * That is not duplication for its own sake. The component used to build
     * one sentence around `kind === 'tag' ? 'tag-et' : 'érzelmet'`, a
     * Hungarian noun in the accusative, and drop it into all three sentences.
     * A declined noun cannot be a parameter: the same two nouns need the
     * nominative two lines further down (and a different article with it),
     * while English declines neither. So each language writes whole sentences
     * and nothing is ever assembled from fragments.
     */
    delete: {
      title: {
        tag: (name: string) => `Delete the tag "${name}"?`,
        emotion: (name: string) => `Delete the emotion "${name}"?`,
      },

      /**
       * Shown when entries still use it. The negation is emphasised because it
       * is the one word that must not be misread; see EmphasisedSentence for
       * why the split around it belongs to the translation.
       */
      inUse: {
        tag: (n: number): EmphasisedSentence => ({
          before: `The tag will be removed from ${n} ${n === 1 ? 'entry' : 'entries'}. The entries themselves are `,
          emphasis: 'not',
          after: ' deleted.',
        }),
        emotion: (n: number): EmphasisedSentence => ({
          before: `The emotion will be removed from ${n} ${n === 1 ? 'entry' : 'entries'}. The entries themselves are `,
          emphasis: 'not',
          after: ' deleted.',
        }),
      },

      /** Shown when nothing uses it, so deleting costs nothing. */
      unused: {
        tag: 'This tag is not used anywhere, so it is safe to delete.',
        emotion: 'This emotion is not used anywhere, so it is safe to delete.',
      },
    },
  },
};

export type Tags = typeof tags;
