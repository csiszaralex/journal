// How long a session may sit idle, and how long a warning precedes the sign-out.
//
// Here rather than inside InactivityTimer because two screens depend on it: the
// timer that enforces it, and the sign-in page explaining why a session ended.
// That sentence used to spell out "30 minutes" in its own words and would have
// started lying the first time this number moved. The sign-in page must not
// import the timer component for a constant — it would pull a client component,
// its action and its Button into the smallest page in the app.

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

/** How long before the sign-out the warning card appears. */
export const INACTIVITY_WARNING_BEFORE_MS = 60 * 1000;

/** The timeout as the sign-in page states it. */
export const INACTIVITY_TIMEOUT_MINUTES = INACTIVITY_TIMEOUT_MS / 60_000;
