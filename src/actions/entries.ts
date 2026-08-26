'use server';

import { logAudit } from '@/db/queries/audit';
import { getEntryDates, rollbackToVersion, softDeleteEntry } from '@/db/queries/entries';
import { requireUserId } from '@/lib/auth';
import { authActionClient } from '@/lib/safe-action';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// Entry writes go through POST /api/sync (see EntryForm), which the service
// worker can also replay offline. The actions below cover what the form does
// not: deletion, rollback, and the date-picker lookup.

const idSchema = z.string().min(1);

export async function softDeleteEntryAction(id: string) {
  await requireUserId();
  const validId = idSchema.parse(id);
  softDeleteEntry(validId);
  logAudit('entry.delete', { entry_id: validId });
  revalidatePath('/');
}

export async function rollbackVersionAction(entryId: string, versionNumber: number) {
  await requireUserId();
  const validId = idSchema.parse(entryId);
  const validVersion = z.number().int().min(1).parse(versionNumber);
  rollbackToVersion(validId, validVersion);
  logAudit('entry.rollback', { entry_id: validId, version: validVersion });
  revalidatePath(`/entry/${validId}`);
  revalidatePath(`/entry/${validId}/history`);
}

/**
 * Returns the dates (yyyy-MM-dd) that have a saved entry within the given month
 * ("YYYY-MM"). Used by the entry form's date picker to mark filled days.
 */
export const getEntryDatesAction = authActionClient
  .inputSchema(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
  .action(async ({ parsedInput }) => {
    const monthDate = new Date(parsedInput.month + '-01T00:00:00');
    const from = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    const to = format(endOfMonth(monthDate), 'yyyy-MM-dd');
    return getEntryDates(from, to);
  });

