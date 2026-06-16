import {
  AI_HISTORY_DAYS_DEFAULT,
  AI_HISTORY_DAYS_MAX,
  AI_HISTORY_DAYS_MIN,
} from '@/lib/ai/history-config';
import { eq } from 'drizzle-orm';
import { db } from '../client';
import { appSettings } from '../schema';

function clampHistoryDays(n: number): number {
  return Math.min(AI_HISTORY_DAYS_MAX, Math.max(AI_HISTORY_DAYS_MIN, n));
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

