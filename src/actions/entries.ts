'use server';

import { logAudit } from '@/db/queries/audit';
import {
  createEntry,
  getEntryDates,
  rollbackToVersion,
  softDeleteEntry,
  updateEntry,
} from '@/db/queries/entries';
import { requireUserId } from '@/lib/auth';
import { resolveEmotionIds, resolveTagIds } from '@/lib/entry-utils';
import { authActionClient } from '@/lib/safe-action';
import { entryInputSchema } from '@/lib/validation';
import { parseWithZod } from '@conform-to/zod/v4';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createEntryAction(_: unknown, formData: FormData) {
  await requireUserId();
  const submission = parseWithZod(formData, { schema: entryInputSchema });
  if (submission.status !== 'success') return submission.reply();

  const { text, mood_score, energy_score, entry_date, tags, emotions } = submission.value;

  const safeParseJsonArray = (s: string) => {
    try {
      const v = JSON.parse(s || '[]');
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  };
  const parsedTags = safeParseJsonArray(tags);
  const parsedEmotions = safeParseJsonArray(emotions);
  const isEmpty =
    !text &&
    mood_score == null &&
    energy_score == null &&
    parsedTags.length === 0 &&
    parsedEmotions.length === 0;
  if (isEmpty) return submission.reply({ resetForm: true });

  const created = createEntry({
    entry_date,
    text,
    mood_score,
    energy_score,
    tag_ids: resolveTagIds(tags),
    emotion_ids: resolveEmotionIds(emotions),
  });
  logAudit('entry.create', { entry_id: created.id, entry_date });

  revalidatePath('/');
  return submission.reply({ resetForm: true });
}

export async function updateEntryAction(_: unknown, formData: FormData) {
  await requireUserId();
  const updateSchema = entryInputSchema.extend({ entry_id: z.string().min(1, 'Entry not found') });
  const submission = parseWithZod(formData, { schema: updateSchema });
  if (submission.status !== 'success') return submission.reply();

  const { entry_id, text, mood_score, energy_score, entry_date, tags, emotions } = submission.value;
  const updated = updateEntry(entry_id, {
    entry_date,
    text,
    mood_score,
    energy_score,
    tag_ids: resolveTagIds(tags),
    emotion_ids: resolveEmotionIds(emotions),
  });
  logAudit('entry.update', { entry_id: entry_id, version: updated?.version.version_number });

  revalidatePath('/');
  revalidatePath(`/entry/${entry_id}`);
  return submission.reply();
}

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

