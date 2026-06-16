// Shared config for how many prior journal entries the AI sees when generating
// follow-up questions. Kept free of server/DB imports so the settings UI can
// import these constants without pulling the DB client into the client bundle.

export const AI_HISTORY_DAYS_DEFAULT = 3;
export const AI_HISTORY_DAYS_MIN = 1;
export const AI_HISTORY_DAYS_MAX = 14;

