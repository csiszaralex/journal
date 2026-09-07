/**
 * A sentence with one emphasised span inside it.
 *
 * Emphasis mid-sentence is the one case a plain string cannot carry, and the
 * obvious workaround — three separate keys the component concatenates — is the
 * thing this dictionary exists to prevent, because the pieces then have a fixed
 * order that no language may disagree with. Languages do disagree: the idle
 * warning puts its countdown at the end of the English sentence and in the
 * middle of the Hungarian one, with two words trailing it.
 *
 * So the split is made by the translation. A locale that wants the emphasis
 * first leaves `before` empty; one that wants it last leaves `after` empty. The
 * component only decides how to style `emphasis`, which is a layout question,
 * and never where it goes, which is not.
 *
 * Whatever belongs to the emphasised word goes inside it — a unit that is a
 * suffix in one language ("30s") and a separate word in another ("30 mp").
 */
export type EmphasisedSentence = {
  before: string;
  emphasis: string;
  after: string;
};
