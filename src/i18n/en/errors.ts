/**
 * Everything the user is told by code that is not a React component: the Zod
 * schemas, the server actions' failures, and the JSON bodies the route handlers
 * answer with.
 *
 * These strings have no component to read a hook from, so they are looked up
 * differently from the rest of the dictionary — `await getDict()` inside a route
 * handler or an action, and a schema *factory* that is handed the dictionary by
 * whoever builds it (see `src/lib/validation.ts`). That is the only difference;
 * the strings themselves are ordinary translations.
 *
 * Not everything a route can answer with is here. Zod's own built-in messages
 * still cover the fields whose failure no user can reach — a 100 000-character
 * entry, a malformed push endpoint — because a message nobody will ever read is
 * a message not worth translating twice. Every field a person can actually get
 * wrong has an explicit message below.
 */
export const errors = {
  /**
   * Messages Zod attaches to a failing field. They surface in the entry form,
   * which lists `issues.map(i => i.message)` under the form, and in the
   * template editor, which shows the first issue.
   */
  validation: {
    /** Both dated fields of an entry: the entry's own date and a summary's
     *  period start. The pattern is the ISO one in every language; only the way
     *  it is spelled out for the reader is translated. */
    dateFormat: 'Must be YYYY-MM-DD',

    /** The three period rules. A summary spans period_start..entry_date; a
     *  daily entry has no period at all. */
    summaryNeedsStart: 'A summary needs a start date',
    startAfterEnd: 'The start date cannot be later than the end date',
    dailyHasNoPeriod: 'A daily entry has no period',

    /** Mood and energy, on an entry and on a template's defaults. */
    scoreRange: 'Pick a value between 1 and 5',

    templateNameRequired: 'The template needs a name',
    templateNameTooLong: 'The template name can be at most 60 characters',
    /** The edit form's hidden id field came through empty — the form is broken
     *  rather than the input, but the user is the one who sees it. */
    missingTemplateId: 'Missing template id',

    /** Shown when a payload failed to parse but carried no issue worth
     *  repeating — the fallback behind `issues[0]`, never the usual answer. */
    invalidInput: 'Invalid input',
  },

  /**
   * The `error` field of a JSON response. Every one of these is rendered
   * verbatim by whatever made the request: the entry form under the form, the
   * devices page in an alert, the AI blocks in their own error line.
   */
  api: {
    /** Sent by `withSession` and, in its own body shape, by POST /api/sync. */
    unauthorized: 'You are not signed in',
    /** The 429 every throttled route falls back to. */
    tooManyRequests: 'Too many requests',
    /** The 429 the three AI routes send instead, because that one is read by a
     *  person who just pressed a button twice. */
    tooFast: 'Too fast — wait a moment',

    invalidRequestBody: 'Invalid request body',
    invalidJson: 'Invalid JSON',
    internalError: 'Internal error',

    /** The model answered, but not with the tool call the route asked for, or
     *  with arguments that did not fit the schema. One sentence for both: from
     *  the user's side they are the same failure, and it is said in all three
     *  AI routes. */
    aiBadResponse: 'The AI gave an invalid answer',

    /** The three push routes' rejected payloads. */
    invalidSubscription: 'Invalid subscription',
    missingEndpoint: 'Missing endpoint',
    invalidDate: 'Invalid date',

    /** POST /api/sync, replaying a write made offline. */
    entryNotFound: 'Entry not found',
    duplicateEntryDate: 'An active entry already exists for this date',
    unknownAction: 'Unknown action',
  },

  /** Server actions, which report through next-safe-action rather than a body. */
  action: {
    /** The catch-all for an action that threw. Deliberately not
     *  `common.unexpectedError`: that one is said by a component about its own
     *  fetch, this one is said by the server about a write it refused to
     *  finish, and the two are free to read differently. */
    failed: 'Something went wrong during the operation',

    /**
     * Renaming a tag or an emotion onto a normalized name that is already
     * taken; `existing` is the other one's display name.
     *
     * Two sentences rather than one shared by both, for the reason the whole of
     * `tags.ts` is written twice: English can leave the noun out, but a
     * language that wants to name what collided ("that tag", "that emotion")
     * must be free to, and it will decline the two differently. Nothing here
     * would let it, if there were one key.
     */
    nameConflict: {
      tag: (existing: string) => `That name already exists as "${existing}"`,
      emotion: (existing: string) => `That name already exists as "${existing}"`,
    },
  },
};

export type Errors = typeof errors;
