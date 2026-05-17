'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  deleteEmotion,
  EmotionNameConflictError,
  suggestEmotions,
  updateEmotion,
} from '@/db/queries/emotions';
import { authActionClient } from '@/lib/safe-action';
import { HEX_COLOR_REGEX } from '@/lib/color';

type UpdateEmotionResult = { ok: true } | { ok: false; error: string };

export const suggestEmotionsAction = authActionClient
  .inputSchema(z.object({ prefix: z.string() }))
  .action(async ({ parsedInput }) => suggestEmotions(parsedInput.prefix, 10));

export const updateEmotionAction = authActionClient
  .inputSchema(
    z.object({
      id: z.string().min(1),
      display_name: z.string().min(1).max(60),
      name: z.string().min(1).max(60),
      color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
      emoji: z.string().max(16).nullable(),
    }),
  )
  .action(async ({ parsedInput }): Promise<UpdateEmotionResult> => {
    try {
      updateEmotion(parsedInput);
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
      throw err;
    }
  });

export const deleteEmotionAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    deleteEmotion(parsedInput.id);
    revalidatePath('/settings/tags');
    revalidatePath('/');
    return { ok: true };
  });

