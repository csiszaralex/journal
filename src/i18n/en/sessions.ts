/**
 * The sessions page: the passkeys that can sign this account in, and the
 * devices already signed in with one.
 *
 * The two halves render near-identical cards, and the keys below are split
 * accordingly rather than merged: a passkey is *deleted* and a session is
 * *revoked*, its heading names a different noun, and its disabled-delete
 * tooltip gives a different reason. Only the words that are genuinely the same
 * sentence are shared — and those live in `common` (cancel, delete), not here.
 *
 * The timestamps arrive already formatted by the page, using `dates.timestamp`
 * and `dates.locale`; this file only writes the sentence around them.
 */
export const sessions = {
  /** The page heading. */
  title: 'Sessions & passkeys',

  passkeys: {
    heading: 'Passkeys',
    description:
      'Registered keys you can use to sign in. The last remaining passkey cannot be deleted.',
    /** Starts the WebAuthn registration ceremony in this browser. */
    add: 'Add a passkey on this device',
    empty: 'No passkeys registered.',
    /** The inline rename field, when the key has never been named. */
    namePlaceholder: 'Unnamed passkey',

    /**
     * What WebAuthn reports about where the key lives. Only the two values the
     * spec defines are translated; anything else the authenticator invents is
     * a machine string and is shown verbatim by the caller.
     */
    deviceType: (type: 'singleDevice' | 'multiDevice'): string =>
      type === 'singleDevice' ? 'Single-device passkey' : 'Synced passkey',

    /** When the key was registered. `date` is already formatted. */
    added: (date: string) => `Added: ${date}`,

    /** The bin button's tooltip, and — separately — the tooltip it carries when
     *  it is disabled, which has to say why rather than name the action. */
    deleteTitle: 'Delete passkey',
    deleteDisabledTitle: 'Cannot delete your last passkey',

    confirmTitle: 'Delete this passkey?',
    confirmDescription:
      'You will no longer be able to sign in with this key. This cannot be undone.',

    /** The server answered the options request with nothing usable, so the
     *  browser prompt was never reached. */
    optionsFailed: 'Failed to get registration options',
  },

  active: {
    heading: 'Active sessions',
    description:
      'Devices currently signed in to your account. You cannot revoke the session you are currently using.',
    empty: 'No active sessions.',
    namePlaceholder: 'Unnamed session',
    /** Marks the session the page is being read in. */
    currentBadge: 'Current',

    /** When the session began, and when it lapses. Both arrive formatted. */
    signedIn: (date: string) => `Signed in: ${date}`,
    expires: (date: string) => `Expires: ${date}`,

    /** The confirm dialog's button — a different verb from `common.delete`,
     *  because a session is ended rather than removed. */
    revoke: 'Revoke',
    /** The bin button's tooltip, and the reason it carries when disabled. */
    revokeTitle: 'Revoke session',
    revokeDisabledTitle: 'You cannot revoke your current session',

    confirmTitle: 'Revoke this session?',
    confirmDescription: 'That device will be signed out on its next request.',
  },
};

export type Sessions = typeof sessions;
