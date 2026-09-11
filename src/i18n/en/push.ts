/**
 * What a push notification says.
 *
 * Nothing here is rendered by the app — it is composed on the server, or by the
 * cron worker, and handed to the operating system — but a person reads it, so
 * it belongs with the interface copy rather than with the model-facing text in
 * `src/lib/ai/prompt-language.ts`.
 *
 * The 45 daily prompts themselves are NOT here. They are data, in
 * `data/prompts.json`, keyed by the same locales and index-aligned so a given
 * day asks the same question in either language. Keeping them in the dictionary
 * would ship both lists to every browser to be read by nobody.
 *
 * One limit worth knowing: the worker has no request to negotiate a language
 * from, so it uses the stored setting and falls back to `DEFAULT_LOCALE`. An
 * install that has never chosen a language gets English notifications even
 * where its browser asks for something else.
 */
export const push = {
  /** The body when there are no prompts to pick from — a broken install rather
   *  than anything a reader should meet. */
  noPrompts: 'Time to write in your journal.',

  /**
   * The evening notification.
   *
   * One function rather than a prompt with a clause appended: the count of
   * today's open intentions trails the sentence in English and leads it in
   * Hungarian, so where it attaches is the language's decision. It is zero when
   * nothing is outstanding, and then the prompt stands on its own.
   */
  daily: (prompt: string, openIntentions: number): string =>
    openIntentions > 0
      ? `${prompt} (${openIntentions} open intention${openIntentions === 1 ? '' : 's'} for today)`
      : prompt,

  /** Sent by the Test button in Settings → Devices. */
  test: 'Test notification — everything is working!',
};

export type Push = typeof push;
