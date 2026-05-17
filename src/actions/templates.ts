'use server';

import { createTemplate, deleteTemplate, updateTemplate } from '@/db/queries/templates';
import { requireUserId } from '@/lib/auth';
import { templateSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateTemplateSchema = templateSchema.extend({
  id: z.string().min(1, 'Missing template id'),
});

export async function createTemplateAction(_: unknown, formData: FormData) {
  await requireUserId();
  const parsed = templateSchema.safeParse({
    name: formData.get('name'),
    text: formData.get('text'),
    default_mood: formData.get('default_mood') || null,
    default_energy: formData.get('default_energy') || null,
  });

  if (!parsed.success) {
    return {
      status: 'error' as const,
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  createTemplate(parsed.data);
  revalidatePath('/settings');
  return { status: 'success' as const };
}

export async function updateTemplateAction(_: unknown, formData: FormData) {
  await requireUserId();
  const parsed = updateTemplateSchema.safeParse({
    id: formData.get('id'),
    name: formData.get('name'),
    text: formData.get('text'),
    default_mood: formData.get('default_mood') || null,
    default_energy: formData.get('default_energy') || null,
  });

  if (!parsed.success) {
    return {
      status: 'error' as const,
      message: parsed.error.issues[0]?.message ?? 'Invalid input',
    };
  }

  const { id, ...data } = parsed.data;
  updateTemplate(id, data);
  revalidatePath('/settings');
  return { status: 'success' as const };
}

export async function deleteTemplateAction(id: string) {
  await requireUserId();
  deleteTemplate(z.string().min(1).parse(id));
  revalidatePath('/settings');
}

