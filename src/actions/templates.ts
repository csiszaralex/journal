'use server';

import { createTemplate, deleteTemplate, updateTemplate } from '@/db/queries/templates';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const templateSchema = z.object({
  name: z.string().min(1).max(60),
  text: z.string().max(10000),
  default_mood: z.coerce.number().int().min(1).max(5).optional().nullable(),
  default_energy: z.coerce.number().int().min(1).max(5).optional().nullable(),
});

export async function createTemplateAction(_: unknown, formData: FormData) {
  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    text: formData.get('text'),
    default_mood: formData.get('default_mood') || null,
    default_energy: formData.get('default_energy') || null,
  });

  if (!parsed.success) {
    return { status: 'error' as const, message: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  createTemplate(parsed.data);
  revalidatePath('/settings');
  return { status: 'success' as const };
}

export async function updateTemplateAction(_: unknown, formData: FormData) {
  const id = formData.get('id');
  if (!id || typeof id !== 'string') {
    return { status: 'error' as const, message: 'Missing template id' };
  }

  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    text: formData.get('text'),
    default_mood: formData.get('default_mood') || null,
    default_energy: formData.get('default_energy') || null,
  });

  if (!parsed.success) {
    return { status: 'error' as const, message: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  updateTemplate(id, parsed.data);
  revalidatePath('/settings');
  return { status: 'success' as const };
}

export async function deleteTemplateAction(id: string) {
  deleteTemplate(id);
  revalidatePath('/settings');
}
