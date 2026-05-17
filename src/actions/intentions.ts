'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  createIntention,
  updateIntention,
  completeIntention,
  dropIntention,
  reopenIntention,
  deleteIntention,
} from '@/db/queries/intentions';
import { getTodayEntryId } from '@/db/queries/entries';
import { authActionClient } from '@/lib/safe-action';
import { todayInAppTZ } from '@/lib/date';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateAll(entry_id?: string | null) {
  revalidatePath('/');
  revalidatePath('/intentions');
  if (entry_id) revalidatePath(`/entry/${entry_id}`);
}

export const createIntentionAction = authActionClient
  .inputSchema(
    z.object({
      text: z.string().min(1).max(500),
      due_date: z.string().regex(ISO_DATE).optional().nullable(),
      entry_id: z.string().min(1).optional().nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const created = createIntention({
      text: parsedInput.text,
      due_date: parsedInput.due_date ?? null,
      entry_id: parsedInput.entry_id ?? null,
    });
    revalidateAll(parsedInput.entry_id ?? null);
    return { ok: true as const, id: created.id };
  });

export const updateIntentionAction = authActionClient
  .inputSchema(
    z.object({
      id: z.string().min(1),
      text: z.string().min(1).max(500).optional(),
      due_date: z.string().regex(ISO_DATE).optional().nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    updateIntention(parsedInput);
    revalidateAll();
    return { ok: true as const };
  });

export const completeIntentionAction = authActionClient
  .inputSchema(
    z.object({
      id: z.string().min(1),
      link_to_today_entry: z.boolean().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    let completed_in_entry_id: string | null = null;
    if (parsedInput.link_to_today_entry) {
      const today = todayInAppTZ();
      completed_in_entry_id = getTodayEntryId(today);
    }
    completeIntention({ id: parsedInput.id, completed_in_entry_id });
    revalidateAll(completed_in_entry_id);
    return { ok: true as const, linked_entry_id: completed_in_entry_id };
  });

export const dropIntentionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    dropIntention(parsedInput.id);
    revalidateAll();
    return { ok: true as const };
  });

export const reopenIntentionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    reopenIntention(parsedInput.id);
    revalidateAll();
    return { ok: true as const };
  });

export const deleteIntentionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    deleteIntention(parsedInput.id);
    revalidateAll();
    return { ok: true as const };
  });
