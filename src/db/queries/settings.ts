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
import { appSettings } from '../schema';

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

export function getRegistrationEnabled(): boolean {
  return getSetting('registration_enabled', 'true') === 'true';
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

