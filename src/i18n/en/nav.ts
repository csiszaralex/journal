import type { EmphasisedSentence } from '../emphasis';

/**
 * The app frame: the header and bottom bar, the shortcut dialog behind `?`, and
 * the two banners that can appear over any page (the idle warning and the
 * offline notice). Everything here is chrome — it is on screen whatever page is
 * being read, which is why it lives together rather than with any one feature.
 */
export const nav = {
  today: 'Today',
  calendar: 'Calendar',
  intentions: 'Intentions',
  search: 'Search',
  stats: 'Stats',
  settings: 'Settings',
  /** Mobile-only: opens the sheet holding the destinations that do not fit in
   *  the bottom bar. */
  more: 'More',
  signOut: 'Sign out',

  /** The dialog `?` opens. One line per shortcut, in the order it lists them. */
  shortcuts: {
    title: 'Keyboard shortcuts',
    goToToday: 'Go to Today',
    goToCalendar: 'Go to Calendar',
    goToSearch: 'Go to Search',
    goToStats: 'Go to Stats',
    goToDevices: 'Go to Devices',
    goToSettings: 'Go to Settings',
    showHelp: 'Show this help',
  },

  /** The card that appears a minute before an idle session is signed out. */
  inactivity: {
    title: 'Still there?',
    /** The countdown is emphasised mid-sentence — see EmphasisedSentence for
     *  why the language, not the component, decides where it falls. */
    body: (seconds: number): EmphasisedSentence => ({
      before: "You'll be signed out in ",
      emphasis: `${seconds}s`,
      after: ' due to inactivity.',
    }),
    stayLoggedIn: 'Stay logged in',
  },

  /** Pinned above the bottom bar while the browser reports no network. Not the
   *  `offline` area — that one is the standalone fallback page the service
   *  worker serves when there is nothing to render at all. */
  offlineBanner: "You're offline — entries will sync when connected",
};

export type Nav = typeof nav;
