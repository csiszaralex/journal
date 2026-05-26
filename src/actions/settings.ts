'use server';

import { logAudit } from '@/db/queries/audit';
import { setRegistrationEnabled } from '@/db/queries/settings';
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

