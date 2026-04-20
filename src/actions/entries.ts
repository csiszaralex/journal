'use server';

import {
  createEntry,
  restoreEntry,
  rollbackToVersion,
  softDeleteEntry,
  updateEntry,
} from '@/db/queries/entries';
import { getOrCreateTag } from '@/db/queries/tags';
import { logAudit } from '@/db/queries/audit';
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
  const created = createEntry({
    entry_date,
    text,
    mood_score,
    energy_score,
    tag_ids: resolveTagIds(tags),
  });
  logAudit('entry.create', { entry_id: created.id, entry_date });

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
  const updated = updateEntry(entryId, {
    entry_date,
    text,
    mood_score,
    energy_score,
    tag_ids: resolveTagIds(tags),
  });
  logAudit('entry.update', { entry_id: entryId, version: updated?.version.version_number });

  revalidatePath('/');
  revalidatePath(`/entry/${entryId}`);
  return submission.reply();
}

export async function softDeleteEntryAction(id: string) {
  softDeleteEntry(id);
  logAudit('entry.delete', { entry_id: id });
  revalidatePath('/');
}

export async function restoreEntryAction(id: string) {
  restoreEntry(id);
  logAudit('entry.restore', { entry_id: id });
  revalidatePath('/');
}

export async function rollbackVersionAction(entryId: string, versionNumber: number) {
  rollbackToVersion(entryId, versionNumber);
  logAudit('entry.rollback', { entry_id: entryId, version: versionNumber });
  revalidatePath(`/entry/${entryId}`);
  revalidatePath(`/entry/${entryId}/history`);
}

