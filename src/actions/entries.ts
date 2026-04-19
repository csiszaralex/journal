'use server';

import {
  createEntry,
  restoreEntry,
  rollbackToVersion,
  softDeleteEntry,
  updateEntry,
} from '@/db/queries/entries';
import { getOrCreateTag } from '@/db/queries/tags';
import { entryInputSchema } from '@/lib/validation';
import { parseWithZod } from '@conform-to/zod/v4';
import { revalidatePath } from 'next/cache';

function resolveTagIds(tagsJson: string): string[] {
  try {
    const names: string[] = JSON.parse(tagsJson || '[]');
    return names.map((n) => getOrCreateTag(n).id);
  } catch {
    return [];
  }
}

export async function createEntryAction(_: unknown, formData: FormData) {
  const submission = parseWithZod(formData, { schema: entryInputSchema });
  if (submission.status !== 'success') return submission.reply();

  const { text, mood_score, energy_score, entry_date, tags } = submission.value;
  createEntry({
    entry_date,
    text,
    mood_score,
    energy_score,
    tag_ids: resolveTagIds(tags),
  });

  revalidatePath('/');
  return submission.reply({ resetForm: true });
}

export async function updateEntryAction(_: unknown, formData: FormData) {
  const entryId = formData.get('entry_id');
  const submission = parseWithZod(formData, { schema: entryInputSchema });
  if (submission.status !== 'success') return submission.reply();
  if (!entryId || typeof entryId !== 'string') {
    return submission.reply({ formErrors: ['Entry not found'] });
  }

  const { text, mood_score, energy_score, entry_date, tags } = submission.value;
  updateEntry(entryId, {
    entry_date,
    text,
    mood_score,
    energy_score,
    tag_ids: resolveTagIds(tags),
  });

  revalidatePath('/');
  revalidatePath(`/entry/${entryId}`);
  return submission.reply();
}

export async function softDeleteEntryAction(id: string) {
  softDeleteEntry(id);
  revalidatePath('/');
}

export async function restoreEntryAction(id: string) {
  restoreEntry(id);
  revalidatePath('/');
}

export async function rollbackVersionAction(entryId: string, versionNumber: number) {
  rollbackToVersion(entryId, versionNumber);
  revalidatePath(`/entry/${entryId}`);
  revalidatePath(`/entry/${entryId}/history`);
}

