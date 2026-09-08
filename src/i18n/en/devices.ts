/**
 * The devices page: registering this browser for push notifications, and the
 * card every registered device gets — its label, the time of day it is notified
 * at, and the two buttons that send it something right now.
 *
 * Machine values on this page are deliberately absent: the IANA timezone
 * identifiers in the picker (`Europe/Budapest`), the push endpoint shown under
 * each card, and the clock numerals the hour/minute pickers build with
 * `padStart` ("07:00", ":15"). Those are the same in every language, and a
 * translated copy of them would only be free to be wrong.
 *
 * Shared words — cancel, delete, saving — are not here either; they are in
 * `common`.
 */

/**
 * Which of the two send buttons a message is about.
 *
 * The component used to hand `reportResult` the English word ("Test", "Sample
 * prompt") and glue a suffix onto it, which left half of every one of these
 * sentences outside the dictionary and fixed the word order — subject first,
 * verb after — for languages that would not choose it. It passes this
 * discriminator instead, and each language writes both sentences out in full.
 */
export type SendKind = 'test' | 'preview';

export const devices = {
  /** The page heading. */
  title: 'Devices & Notifications',

  /** The two buttons above the list, which act on the browser being read in. */
  enableOnThisDevice: 'Enable notifications on this device',
  disableThisDevice: 'Disable this device',

  /** No device has been registered yet. */
  empty: 'No devices registered yet.',

  /**
   * Everything that can go wrong while subscribing this browser. Shown by
   * `alert`, hence plain text with no markup.
   */
  subscribe: {
    notSupported: 'Push notifications are not supported in this browser.',
    permissionDenied: 'Notification permission denied.',
    /** The service worker never reached `ready` within the timeout. */
    serviceWorkerTimeout: 'Service worker not ready — try reloading the page.',
    /** The subscribe request threw, or the server refused without saying why. */
    failed: 'Failed to enable notifications.',
    /** The server refused and gave a status but no message of its own — a
     *  throttled request answers 429 rather than throwing. */
    failedWithStatus: (statusCode: number) =>
      `Failed to enable notifications (HTTP ${statusCode}).`,
  },

  /**
   * The toasts after pressing "send test" or "send today's prompt".
   *
   * Six outcomes, each written whole for both kinds rather than assembled from
   * a label, a verb and a colon. The `: string` return annotations matter:
   * without them TypeScript infers the union of the two English literals and no
   * translation can satisfy it.
   *
   * `detail` is the server's own error text. It arrives untranslated and is
   * dropped into the sentence as a quoted-back detail, not as a fragment this
   * file is expected to have written.
   */
  send: {
    sent: (kind: SendKind): string =>
      kind === 'test' ? 'Test sent ✓' : 'Sample prompt sent ✓',
    failed: (kind: SendKind, detail: string): string =>
      kind === 'test' ? `Test failed: ${detail}` : `Sample prompt failed: ${detail}`,
    failedWithStatus: (kind: SendKind, statusCode: number, detail: string): string =>
      kind === 'test'
        ? `Test failed (HTTP ${statusCode}): ${detail}`
        : `Sample prompt failed (HTTP ${statusCode}): ${detail}`,
    /** The push service refused without a message. */
    failedUnknown: (kind: SendKind): string =>
      kind === 'test' ? 'Test failed: Unknown error' : 'Sample prompt failed: Unknown error',
    failedUnknownWithStatus: (kind: SendKind, statusCode: number): string =>
      kind === 'test'
        ? `Test failed (HTTP ${statusCode}): Unknown error`
        : `Sample prompt failed (HTTP ${statusCode}): Unknown error`,
    /** The action returned nothing at all. */
    noResponse: (kind: SendKind): string =>
      kind === 'test' ? 'Test failed: no response' : 'Sample prompt failed: no response',
    /** The push service has retired this subscription; it has to be made again
     *  from the device itself. */
    expired: 'Subscription expired — re-enable notifications on this device.',
    /** The row was deleted between rendering the page and pressing the button. */
    notFound: 'Subscription not found.',
  },

  /** One registered device's card. */
  card: {
    sendTest: 'Send test notification',
    sendPreview: "Send today's scheduled prompt now (preview)",
    /** The bell button toggles notifications for this device; its tooltip names
     *  what pressing it would do, so both words are needed. */
    toggle: (enabled: boolean): string => (enabled ? 'Disable' : 'Enable'),
    remove: 'Remove device',

    timezoneLabel: 'Timezone',
    notifyHourLabel: 'Notify hour',
    notifyMinuteLabel: 'Notify minute',
  },
};

export type Devices = typeof devices;
