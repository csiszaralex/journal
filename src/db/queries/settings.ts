import {
  AI_HISTORY_DAYS_DEFAULT,
  AI_HISTORY_DAYS_MAX,
  AI_HISTORY_DAYS_MIN,
} from '@/lib/ai/history-config';
import {
  SUMMARY_GAP_DAYS_DEFAULT,
  SUMMARY_GAP_DAYS_MAX,
  SUMMARY_GAP_DAYS_MIN,
} from '@/lib/summary-config';
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { appSettings, authAuthenticators } from '../schema';

function clampHistoryDays(n: number): number {
  return Math.min(AI_HISTORY_DAYS_MAX, Math.max(AI_HISTORY_DAYS_MIN, n));
}

function clampGapDays(n: number): number {
  return Math.min(SUMMARY_GAP_DAYS_MAX, Math.max(SUMMARY_GAP_DAYS_MIN, n));
}

function getSetting(key: string, fallback: string): string {
  const row = db.select().from(appSettings).where(eq(appSettings.key, key)).get();
  return row?.value ?? fallback;
}

function setSetting(key: string, value: string): void {
  db.insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

/**
 * The toggle in Settings. Defaults to OFF: the sign-in page is reachable by
 * anyone who knows the URL, and the one address allowed to register is public
 * knowledge (it is the author of every commit in this repository), so an open
 * registration form is all that stands between a stranger and the journal.
 * Bootstrapping a first passkey does not depend on it — see isRegistrationAllowed.
 */
export function getRegistrationEnabled(): boolean {
  return getSetting('registration_enabled', 'false') === 'true';
}

/**
 * Whether the sign-in page may enrol a new passkey right now.
 *
 * With no passkey registered there is nobody who could turn the toggle on, so
 * an empty authenticator table opens registration by itself — that is the only
 * way a fresh install (or a restored backup) can ever be signed into. Once a
 * passkey exists the toggle governs, and it is off unless deliberately enabled.
 *
 * Note the corollary: losing every passkey re-opens registration. That is the
 * recovery path — it needs no database surgery — but it is also open at exactly
 * the moment the owner is locked out, so re-register promptly.
 */
export function isRegistrationAllowed(): boolean {
  const anyPasskey = db.select({ id: authAuthenticators.credentialID }).from(authAuthenticators).get();
  return !anyPasskey || getRegistrationEnabled();
}

export function setRegistrationEnabled(enabled: boolean): void {
  setSetting('registration_enabled', enabled ? 'true' : 'false');
}

export function getAiHistoryDays(): number {
  const n = Number.parseInt(getSetting('ai_history_days', String(AI_HISTORY_DAYS_DEFAULT)), 10);
  if (Number.isNaN(n)) return AI_HISTORY_DAYS_DEFAULT;
  return clampHistoryDays(n);
}

export function setAiHistoryDays(days: number): void {
  setSetting('ai_history_days', String(clampHistoryDays(Math.round(days))));
}

export function getSummaryGapDays(): number {
  const n = Number.parseInt(getSetting('summary_gap_days', String(SUMMARY_GAP_DAYS_DEFAULT)), 10);
  if (Number.isNaN(n)) return SUMMARY_GAP_DAYS_DEFAULT;
  return clampGapDays(n);
}

export function setSummaryGapDays(days: number): void {
  setSetting('summary_gap_days', String(clampGapDays(Math.round(days))));
}

