// Shared config for summary entries. Kept free of server/DB imports so the
// settings UI can import these constants without pulling in the DB client.

export const SUMMARY_GAP_DAYS_DEFAULT = 7;
export const SUMMARY_GAP_DAYS_MIN = 3;
export const SUMMARY_GAP_DAYS_MAX = 60;

/** Prior entries fed to the AI when writing a summary. Not user-configurable. */
export const SUMMARY_HISTORY_ENTRIES = 12;
