/**
 * The sign-in screen: the one page a signed-out visitor can reach.
 *
 * "Journal" is not in here. It is the product's name, the same word in every
 * language, and stays a literal in the component — only the tagline under it is
 * marketing copy that a language may want to write its own way.
 */
export const auth = {
  /** The line under the brand name on the sign-in card. */
  tagline: 'Your private space',

  /** The primary action: hand the ceremony to the browser's passkey prompt. */
  signInWithPasskey: 'Sign in with passkey',

  /** The lower half of the card, shown only while registration is allowed. */
  register: {
    invitation: 'First time? Register a passkey',
    emailLabel: 'Email',
    /** An example address, not a machine format: a language whose readers would
     *  not recognise "your@email.com" is free to write its own. */
    emailPlaceholder: 'your@email.com',
    submit: 'Register passkey',
    submitting: 'Registering…',
  },

  /**
   * Why the previous session ended, when the idle timer signed it out and sent
   * the browser here with `?reason=inactivity`.
   *
   * `minutes` is a parameter rather than a number written into the sentence
   * because the sentence is not the place that knows it. It arrives as
   * `INACTIVITY_TIMEOUT_MINUTES`, derived from the timer's own `TIMEOUT_MS`;
   * the English copy used to say "30 minutes" outright and would have started
   * lying the first time that timeout moved.
   */
  signedOutForInactivity: (minutes: number) =>
    `You were signed out after ${minutes} minutes of inactivity.`,

  errors: {
    /**
     * The sign-in failures NextAuth reports, keyed by the `?error=` code it
     * redirects with. The codes are machine values and are therefore the keys
     * here, never the text — a translation rewrites the sentences and leaves
     * every key exactly as it stands.
     *
     * Only the three codes worth their own sentence are listed. Everything
     * else falls back to `signInFailed`, so a locale is never asked to guess at
     * a code it has not seen.
     */
    byCode: {
      AccessDenied: 'Access denied. This account is not allowed.',
      Configuration: 'Server configuration error. Please try again later.',
      Verification: 'The sign-in link has expired.',
    },

    /** The fallback for that map, and also what a failed WebAuthn ceremony
     *  shows. One key because it was one sentence, written out twice. */
    signInFailed: 'Sign in failed. Your passkey may not be registered on this device.',

    /** The register form was submitted with an empty address. */
    emailRequired: 'Enter your email to register a passkey.',
    /** The registration ceremony threw. Its own sentence rather than
     *  `common.unexpectedError`, because it can name what failed. */
    registrationFailed: 'Registration failed. Please try again.',
  },
};

export type Auth = typeof auth;
