'use server';

import { logAudit } from '@/db/queries/audit';
import {
  completeIntention,
  createIntention,
  deleteCategoryColor,
  deleteIntention,
  dropIntention,
  reopenIntention,
  setCategoryColor,
  updateIntention,
} from '@/db/queries/intentions';
import { HEX_COLOR_REGEX } from '@/lib/color';
import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function revalidateAll() {
  revalidatePath('/');
  revalidatePath('/intentions');
}

function revalidateColors() {
  revalidatePath('/');
  revalidatePath('/intentions');
  revalidatePath('/settings/categories');
}

export const createIntentionAction = authActionClient
  .inputSchema(
    z.object({
      text: z.string().min(1).max(500),
      due_date: z.string().regex(ISO_DATE).optional().nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const created = createIntention({
      text: parsedInput.text,
      due_date: parsedInput.due_date ?? null,
    });
    revalidateAll();
    logAudit('intention.create', { id: created.id });
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
    logAudit('intention.update', { id: parsedInput.id });
    return { ok: true as const };
  });

export const completeIntentionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    completeIntention(parsedInput.id);
    revalidateAll();
    logAudit('intention.complete', { id: parsedInput.id });
    return { ok: true as const };
  });

export const dropIntentionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    dropIntention(parsedInput.id);
    revalidateAll();
    logAudit('intention.drop', { id: parsedInput.id });
    return { ok: true as const };
  });

export const reopenIntentionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    reopenIntention(parsedInput.id);
    revalidateAll();
    logAudit('intention.reopen', { id: parsedInput.id });
    return { ok: true as const };
  });

export const deleteIntentionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    deleteIntention(parsedInput.id);
    revalidateAll();
    logAudit('intention.delete', { id: parsedInput.id });
    return { ok: true as const };
  });

export const setCategoryColorAction = authActionClient
  .inputSchema(
    z.object({
      name: z.string().min(1).max(30),
      color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
    }),
  )
  .action(async ({ parsedInput }) => {
    setCategoryColor(parsedInput.name, parsedInput.color);
    revalidateColors();
    logAudit('intention.category_color.set', { name: parsedInput.name });
    return { ok: true as const };
  });

export const resetCategoryColorAction = authActionClient
  .inputSchema(z.object({ name: z.string().min(1).max(30) }))
  .action(async ({ parsedInput }) => {
    deleteCategoryColor(parsedInput.name);
    revalidateColors();
    logAudit('intention.category_color.reset', { name: parsedInput.name });
    return { ok: true as const };
  });

