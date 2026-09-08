import type { EmphasisedSentence } from '../emphasis';

/**
 * The settings index and everything rendered directly on it: the card grid, the
 * entry templates, the two AI dropdowns, the registration switch, the two
 * collapsibles at the bottom and the export buttons.
 *
 * The subpages the grid links to are NOT here — each has its own area
 * (`sessions`, `devices`, `profile`, `tags`, `auditLog`). Only the labels on the
 * cards that open them are, because those words are read on this page and a
 * card is free to be shorter than the heading it leads to.
 *
 * Words shared with the rest of the app — cancel, save, saving, the "Write
 * freely…" placeholder the template editor shares with the entry form — are not
 * here either. They live in `common` and are used from there.
 */
export const settings = {
  /** The page heading. Separate from `nav.settings` for the same reason
   *  `stats.title` is separate from `nav.stats`: chrome and page are free to
   *  read differently. */
  title: 'Settings',

  /** The language card in the settings grid. Its value is always shown in the
   *  language it names, so this label is the only part that translates. */
  language: 'Language',

  /**
   * The theme card. It is labelled with the theme a press switches TO, not the
   * one in force — `light` is what the card reads while the app is dark — so
   * the two must stay separate keys rather than one "theme" noun.
   */
  theme: {
    light: 'Light mode',
    dark: 'Dark mode',
  },

  /** The rest of the card grid, in the order it is laid out. Each opens a
   *  subpage. */
  cards: {
    sessions: 'Sessions & passkeys',
    devices: 'Devices & notifications',
    profile: 'Profile',
    tags: 'Tags & emotions',
    categories: 'Categories',
    auditLog: 'Audit log',
  },

  /** The headings that divide the page below the grid. */
  sections: {
    templates: 'Entry templates',
    /** Left as the initialism in every language — it is how the feature is
     *  named on screen, not a word being translated. */
    ai: 'AI',
    registration: 'Registration',
    export: 'Export data',
  },

  /** The template manager: the list, and the form that creates or edits one. */
  templates: {
    empty: 'No templates yet.',
    add: 'New template',
    nameLabel: 'Name',
    namePlaceholder: 'Morning reflection…',
    /** The template body's label. Its placeholder is
     *  `common.entryTextPlaceholder` — the same invitation the entry form
     *  gives, so deliberately the same words rather than a second copy. */
    textLabel: 'Default text (optional)',
    /** The two score rows in the form. Their own keys rather than a borrow from
     *  `entry.form`: those label what is being scored now, these label a
     *  default a future entry will start from, which some languages case
     *  differently. */
    moodLabel: 'Mood',
    energyLabel: 'Energy',
    /** The submit button, which says which of the two things it will do. */
    create: 'Save template',
    update: 'Update template',
    /**
     * The scores line under a template in the list. One function for both
     * scores rather than a "Mood:" label with a number stuck after it and a
     * separator between the halves: the words, their order and what joins them
     * all belong to the language. Mirrors `history.version.scores`. Either
     * score may be unset; the line is not rendered when both are.
     */
    defaults: (mood: number | null, energy: number | null): string =>
      mood != null && energy != null
        ? `Mood: ${mood} · Energy: ${energy}`
        : mood != null
          ? `Mood: ${mood}`
          : energy != null
            ? `Energy: ${energy}`
            : '',
  },

  /** The two dropdowns under the AI heading. Both show a bare count, which is
   *  why each has a function: English inflects the noun after a numeral and
   *  Hungarian must not. */
  ai: {
    historyEntries: {
      label: 'Journal history for AI questions',
      description: 'How many earlier entries the AI is given when it suggests new questions.',
      /** The select has no visible label of its own — the card's title is not
       *  associated with it — so it carries this one for screen readers. */
      selectLabel: 'Number of history entries',
      /** Both the closed trigger and every option in the list. */
      value: (n: number): string => `${n} ${n === 1 ? 'entry' : 'entries'}`,
    },
    summaryGap: {
      label: 'Offer a summary',
      description:
        'After how many skipped days the app offers to write a summary of the period.',
      selectLabel: 'Number of skipped days',
      value: (n: number): string => `${n} ${n === 1 ? 'day' : 'days'}`,
    },
  },

  /** The switch that opens or closes passkey enrolment on the sign-in page. */
  registration: {
    label: 'Allow new registrations',
    /** The line under the label, which describes the state the switch is in
     *  rather than what pressing it would do. Two whole sentences, because the
     *  two states share no wording worth factoring out. */
    enabled:
      'New passkey registrations are allowed on the sign-in page. Turn this off once your device is enrolled — the sign-in page is public.',
    disabled:
      'Registration is disabled. Only existing passkeys can sign in — except when none is registered at all, which always allows enrolling the first one.',
    toggleLabel: 'Toggle registration',
  },

  /**
   * The keyboard-shortcut collapsible. The seven shortcut descriptions and the
   * heading are NOT here: they are `nav.shortcuts.*`, already written for the
   * `?` dialog, and this panel lists exactly the same seven. Only what the
   * dialog has no room for is here.
   */
  shortcuts: {
    /** Above the list. The key cap is passed in rather than written into the
     *  translation — the glyph is a key on a keyboard, not a word. */
    intro: (key: string): EmphasisedSentence => ({
      before: 'Press ',
      emphasis: key,
      after: ' anywhere to open the shortcuts reference.',
    }),
    /** The one shortcut the `?` dialog does not list, because it only works
     *  inside the entry form. */
    saveEntry: 'Save the entry form',
    /** The caveat under the list. */
    disabledWhileTyping: 'Shortcuts are disabled while you are typing in a field.',
  },

  /** The install collapsible: how to add the app to a home screen, per
   *  platform. */
  install: {
    title: 'Install app',
    /** Product names only, so both languages say the same thing — kept as a key
     *  anyway so a language may reorder or punctuate it. */
    iosHeading: 'iOS (Safari)',
    /**
     * The emphasised span is the path through Safari's own menus, so each
     * language spells it the way that language's iOS does. It stays one span
     * rather than a chip plus an italic: two emphasised runs cannot be placed
     * independently by a translation, and one path is what the reader follows.
     */
    iosStep: (): EmphasisedSentence => ({
      before: 'Tap ',
      emphasis: 'Share → Add to Home Screen',
      after: '.',
    }),
    iosPush:
      'Push notifications require iOS 16.4 or later, and the app must be added to the Home Screen first.',
    androidHeading: 'Android / Desktop (Chrome)',
    /** The emphasised span is Chrome's own menu item, named as that language's
     *  Chrome names it. */
    androidStep: (): EmphasisedSentence => ({
      before:
        'Tap the install icon in the address bar, or open the browser menu and choose ',
      emphasis: 'Install app',
      after: '.',
    }),
  },

  /** The two download buttons. The format names are not translated; the verb
   *  is, and where it falls around the format name is the language's call. */
  export: {
    json: 'Export JSON',
    markdown: 'Export Markdown',
  },
};

export type Settings = typeof settings;
