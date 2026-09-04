'use server';

import { logAudit } from '@/db/queries/audit';
import {
  setAiHistoryEntries,
  setRegistrationEnabled,
  setSummaryGapDays,
} from '@/db/queries/settings';
import { AI_HISTORY_ENTRIES_MAX, AI_HISTORY_ENTRIES_MIN } from '@/lib/ai/history-config';
import { authActionClient } from '@/lib/safe-action';
import { SUMMARY_GAP_DAYS_MAX, SUMMARY_GAP_DAYS_MIN } from '@/lib/summary-config';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const setRegistrationEnabledAction = authActionClient
  .inputSchema(z.object({ enabled: z.boolean() }))
  .action(async ({ parsedInput }) => {
    setRegistrationEnabled(parsedInput.enabled);
    revalidatePath('/settings');
    logAudit('settings.registration.toggle', { enabled: parsedInput.enabled });
  });

export const setAiHistoryEntriesAction = authActionClient
  .inputSchema(
    z.object({
      entries: z.number().int().min(AI_HISTORY_ENTRIES_MIN).max(AI_HISTORY_ENTRIES_MAX),
    }),
  )
  .action(async ({ parsedInput }) => {
    setAiHistoryEntries(parsedInput.entries);
    revalidatePath('/settings');
    logAudit('settings.ai_history_entries.set', { entries: parsedInput.entries });
  });

export const setSummaryGapDaysAction = authActionClient
  .inputSchema(
    z.object({
      days: z.number().int().min(SUMMARY_GAP_DAYS_MIN).max(SUMMARY_GAP_DAYS_MAX),
    }),
  )
  .action(async ({ parsedInput }) => {
    setSummaryGapDays(parsedInput.days);
    revalidatePath('/settings');
    revalidatePath('/');
    logAudit('settings.summary_gap_days.set', { days: parsedInput.days });
  });

