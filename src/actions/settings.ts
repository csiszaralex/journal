'use server';

import { logAudit } from '@/db/queries/audit';
import {
  setAiHistoryDays,
  setRegistrationEnabled,
  setSummaryGapDays,
} from '@/db/queries/settings';
import { AI_HISTORY_DAYS_MAX, AI_HISTORY_DAYS_MIN } from '@/lib/ai/history-config';
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

export const setAiHistoryDaysAction = authActionClient
  .inputSchema(
    z.object({
      days: z.number().int().min(AI_HISTORY_DAYS_MIN).max(AI_HISTORY_DAYS_MAX),
    }),
  )
  .action(async ({ parsedInput }) => {
    setAiHistoryDays(parsedInput.days);
    revalidatePath('/settings');
    logAudit('settings.ai_history_days.set', { days: parsedInput.days });
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

