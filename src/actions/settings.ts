'use server';

import { logAudit } from '@/db/queries/audit';
import { setAiHistoryDays, setRegistrationEnabled } from '@/db/queries/settings';
import { AI_HISTORY_DAYS_MAX, AI_HISTORY_DAYS_MIN } from '@/lib/ai/history-config';
import { authActionClient } from '@/lib/safe-action';
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

