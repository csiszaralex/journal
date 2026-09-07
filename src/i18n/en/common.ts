/**
 * Words that appear in more than one place. Everything here was a literal
 * repeated across at least two files before extraction — "Cancel" in five
 * dialogs, a delete button in seven — so a single key keeps them from drifting
 * apart the way `Mégse` and `Mégsem` already had.
 */
export const common = {
  cancel: 'Cancel',
  save: 'Save',
  saving: 'Saving…',
  delete: 'Delete',
  deleting: 'Deleting…',
  edit: 'Edit',
  close: 'Close',
  /** Emptying a form, not deleting a record — a different word in some languages. */
  clear: 'Clear',
  generate: 'Generate',
  generating: 'Generating…',
  loading: 'Loading…',
  saved: 'Saved',
  /** The version marker beside an entry — on its card, in the form's header,
   *  and on both history screens. Shared so the four cannot drift apart. */
  versionLabel: (n: number) => `v${n}`,
  previous: '← Previous',
  next: 'Next →',
  page: (n: number) => `Page ${n}`,
  noResults: 'No results.',
  /** Back-link to the settings index, shown at the top of every subpage. */
  backToSettings: 'Settings',
  networkError: 'Network error. Please try again.',
  unexpectedError: 'Something went wrong. Please try again.',
};

export type Common = typeof common;
