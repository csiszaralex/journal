'use server';

import { logAudit } from '@/db/queries/audit';
import { createTemplate, deleteTemplate, updateTemplate } from '@/db/queries/templates';
import { getDict } from '@/i18n/request';
import { requireUserId } from '@/lib/auth';
import { makeTemplateSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export async function createTemplateAction(_: unknown, formData: FormData) {
  await requireUserId();
  const d = await getDict();
  const parsed = makeTemplateSchema(d).safeParse({
    name: formData.get('name'),
    text: formData.get('text'),
    default_mood: formData.get('default_mood') || null,
    default_energy: formData.get('default_energy') || null,
  });

  if (!parsed.success) {
    return {
      status: 'error' as const,
      message: parsed.error.issues[0]?.message ?? d.errors.validation.invalidInput,
    };
  }

  const created = createTemplate(parsed.data);
  revalidatePath('/settings');
  logAudit('template.create', { id: created.id, name: created.name });
  return { status: 'success' as const };
}

export async function updateTemplateAction(_: unknown, formData: FormData) {
  await requireUserId();
  const d = await getDict();
  const updateTemplateSchema = makeTemplateSchema(d).extend({
    id: z.string().min(1, d.errors.validation.missingTemplateId),
  });
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
      message: parsed.error.issues[0]?.message ?? d.errors.validation.invalidInput,
    };
  }

  const { id, ...data } = parsed.data;
  updateTemplate(id, data);
  revalidatePath('/settings');
  logAudit('template.update', { id });
  return { status: 'success' as const };
}

export async function deleteTemplateAction(id: string) {
  await requireUserId();
  deleteTemplate(z.string().min(1).parse(id));
  revalidatePath('/settings');
  logAudit('template.delete', { id });
}

