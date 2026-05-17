'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  deleteEmotion,
  EmotionNameConflictError,
  getPopularEmotions,
  suggestEmotions,
  updateEmotion,
} from '@/db/queries/emotions';
import { HEX_COLOR_REGEX } from '@/lib/color';

export async function suggestEmotionsAction(prefix: string) {
  const validPrefix = z.string().parse(prefix);
  return suggestEmotions(validPrefix, 10);
}

export async function getPopularEmotionsAction() {
  return getPopularEmotions(10);
}

const updateEmotionSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1).max(60),
  name: z.string().min(1).max(60),
  color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
});

export type UpdateEmotionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function updateEmotionAction(input: unknown): Promise<UpdateEmotionResult> {
  const parsed = updateEmotionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Érvénytelen adatok' };
  }
  try {
    updateEmotion(parsed.data);
    revalidatePath('/settings/tags');
    revalidatePath('/');
    return { ok: true };
  } catch (err) {
    if (err instanceof EmotionNameConflictError) {
      return {
        ok: false,
        error: `Ez a név már létezik mint "${err.existingDisplayName}"`,
      };
    }
    return { ok: false, error: 'Mentés sikertelen' };
  }
}

const idSchema = z.string().min(1);

export async function deleteEmotionAction(id: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return { ok: false, error: 'Érvénytelen azonosító' };
  try {
    deleteEmotion(parsed.data);
    revalidatePath('/settings/tags');
    revalidatePath('/');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Törlés sikertelen' };
  }
}
