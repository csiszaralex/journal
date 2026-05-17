'use server';

import { logAudit } from '@/db/queries/audit';
import {
  createEntry,
  restoreEntry,
  rollbackToVersion,
  softDeleteEntry,
  updateEntry,
} from '@/db/queries/entries';
import { resolveEmotionIds, resolveTagIds } from '@/lib/entry-utils';
import { entryInputSchema } from '@/lib/validation';
import { parseWithZod } from '@conform-to/zod/v4';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createEntryAction(_: unknown, formData: FormData) {
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
  const validId = idSchema.parse(id);
  softDeleteEntry(validId);
  logAudit('entry.delete', { entry_id: validId });
  revalidatePath('/');
}

export async function restoreEntryAction(id: string) {
  const validId = idSchema.parse(id);
  restoreEntry(validId);
  logAudit('entry.restore', { entry_id: validId });
  revalidatePath('/');
}

export async function rollbackVersionAction(entryId: string, versionNumber: number) {
  const validId = idSchema.parse(entryId);
  const validVersion = z.number().int().min(1).parse(versionNumber);
  rollbackToVersion(validId, validVersion);
  logAudit('entry.rollback', { entry_id: validId, version: validVersion });
  revalidatePath(`/entry/${validId}`);
  revalidatePath(`/entry/${validId}/history`);
}

