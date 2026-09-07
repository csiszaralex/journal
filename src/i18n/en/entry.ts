import type { EmphasisedSentence } from '../emphasis';

/**
 * Writing and reading one journal entry: the entry form and everything it
 * embeds (AI questions, the tag/emotion pickers, the template menu, the
 * summary period), the card an entry is listed as, and the Today page it opens
 * on.
 *
 * Words this area shares with the rest of the app — cancel, save, delete,
 * clear, edit, generating, the network and unexpected errors — are NOT here.
 * They live in `common` and are used from there.
 */
export const entry = {
  /** The version marker beside an entry: on the card, and in the form's link to
   *  the version history. */
  versionLabel: (n: number) => `v${n}`,

  form: {
    /** What the form is for, shown above it. Four separate sentences rather
     *  than a noun with a modifier stuck on: "summary" declines differently
     *  from "entry" in some languages. */
    heading: {
      newEntry: 'New entry',
      editEntry: 'Edit entry',
      newSummary: 'New summary',
      editSummary: 'Edit summary',
    },

    /** The ±1-day arrows either side of the date picker. */
    previousDay: 'Previous day',
    nextDay: 'Next day',

    textPlaceholder: 'Write freely…',

    /**
     * The mood and energy rows. A summary scores a whole period rather than a
     * single day, so the label has to say so — as one whole sentence per case,
     * because a language is free to put that qualifier somewhere English does
     * not, or to inflect the noun for it.
     *
     * The `: string` return annotations matter: without them TypeScript infers
     * the union of the two English literals and no translation can satisfy it.
     */
    moodLabel: (forPeriod: boolean): string => (forPeriod ? 'Mood (for the whole period)' : 'Mood'),
    energyLabel: (forPeriod: boolean): string =>
      forPeriod ? 'Energy (for the whole period)' : 'Energy',

    tagsLabel: 'Tags',
    emotionsLabel: 'Emotions',
    /** Asks the AI for emotions that fit what has been written so far. */
    aiSuggest: 'AI suggestion',

    /** The banner offering a draft found on mount (edit mode only). */
    draftBanner: 'You have unsaved changes to this entry.',
    /**
     * The same banner when the entry itself has moved on since the draft was
     * written — saved from another tab or device, or synced in from the offline
     * queue. Restoring is still allowed but overwrites work the draft never
     * saw, so both versions are named. One sentence, not the banner above plus
     * an appended clause: where the warning belongs in the sentence is the
     * translator's call.
     */
    draftBannerOutdated: (draftVersion: number, currentVersion: number) =>
      `You have unsaved changes to this entry. The entry has changed since (v${draftVersion} → v${currentVersion}).`,
    restoreDraft: 'Restore',
    dismissDraft: 'Discard',

    /** Regenerating a question throws the answer under it away, so both ask
     *  first. Shown by `window.confirm`, hence plain text. */
    confirmRegenerateAll: 'Your existing answers will be lost. Are you sure?',
    confirmRegenerateOne: 'Your answer to this question will be lost. Are you sure?',

    clearTitle: 'Clear this entry?',
    clearDescription: 'This will reset all fields and remove the saved draft.',

    addEntry: 'Add entry',
    saveChanges: 'Save changes',

    /** Queued by the service worker rather than saved, because the device is
     *  offline. */
    savedOffline: 'Saved offline — will sync when connected',
    /** The same thing for a new summary, which stays on screen instead of
     *  resetting: this toast is the only sign the save landed. */
    summaryQueued: 'The summary is queued — it will sync as soon as you are back online',
    /** …and the line that then stays under the queued, still-visible form. */
    summaryQueuedNotice: 'The summary is queued and will sync as soon as you are back online.',
    summarySaved: 'Summary saved',
  },

  /** The AI questions block inside the form. */
  questions: {
    /** Asks for a first set of questions. */
    ask: 'Ask me something',
    /** Shown next to the error when that request failed. */
    retry: 'Try again',
    regenerateAll: 'Different questions',
    addOne: '+1 question',
    editQuestion: 'Edit question',
    replaceQuestion: 'Ask a different question here',
    deleteQuestion: 'Delete question',
    questionPlaceholder: 'Question text…',
    answerPlaceholder: 'Answer briefly, or leave it empty…',
    deleteTitle: 'Delete this question?',
    deleteDescription: 'The answer you typed will be lost.',
  },

  card: {
    /** "Sep 1 – Sep 7, 2026". Both halves arrive already formatted by
     *  `dates.dayShort`/`dayShortWithYear`; only the way they are joined is
     *  translated here. */
    summaryRange: (from: string, to: string) => `${from} – ${to}`,
    summaryBadge: 'Summary',
    /** Dated before the day it was written on. */
    backdatedBadge: 'Backdated',
    /** Dated after today. */
    scheduledBadge: 'Scheduled',
    versionHistory: 'Version history',
    /** Ends the truncated preview; the leading ellipsis continues the text. */
    readMore: '…read more',
    reflections: (n: number) => `Reflections (${n})`,
    mood: (score: number) => `Mood ${score}`,
    energy: (score: number) => `Energy ${score}`,
  },

  today: {
    /** The streak badge: consecutive days with an entry. A function because
     *  English needs the plural and Hungarian must not have one. */
    streak: (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`,
  },

  /** The delete confirmation on an entry card. */
  delete: {
    title: 'Delete this entry?',
    /** `dateLabel` is the card's own heading — a day, or a summary's range. It
     *  is emphasised because it is the one thing worth re-reading before
     *  confirming a delete; see EmphasisedSentence for why it is split here. */
    description: (dateLabel: string): EmphasisedSentence => ({
      before: 'The entry for ',
      emphasis: dateLabel,
      after:
        ' will disappear from the calendar, from search and from the stats. It cannot be restored from the app.',
    }),
  },

  /** The two date buttons that bound a summary. */
  period: {
    start: 'Start of period',
    end: 'End of period',
  },

  templates: {
    /** Opens the list of entry templates above the form. */
    trigger: 'Template',
  },

  /** The tag and emotion pickers, and the chips they produce. */
  pickers: {
    addTag: 'Add tag',
    noTags: 'No tags yet.',
    addEmotion: 'Add emotion',
    noEmotions: 'No emotions yet.',
    searchPlaceholder: 'Search or create…',
    /** Fallback for a picker that names neither tags nor emotions. */
    empty: 'No items yet.',
    /** Offered when what was typed matches nothing that exists yet. */
    create: (name: string) => `Create "${name}"`,
    remove: (name: string) => `Remove ${name}`,
    /** Emotion chips are draggable, so a click cannot also mean "remove". */
    doubleClickToRemove: 'Double-click to remove',
  },
};

export type Entry = typeof entry;
