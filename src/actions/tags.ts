'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  deleteTag,
  suggestTags,
  TagNameConflictError,
  updateTag,
} from '@/db/queries/tags';
import { authActionClient } from '@/lib/safe-action';
import { HEX_COLOR_REGEX } from '@/lib/color';

type UpdateTagResult = { ok: true } | { ok: false; error: string };

export const suggestTagsAction = authActionClient
  .inputSchema(z.object({ prefix: z.string() }))
  .action(async ({ parsedInput }) => suggestTags(parsedInput.prefix, 10));

export const updateTagAction = authActionClient
  .inputSchema(
    z.object({
      id: z.string().min(1),
      display_name: z.string().min(1).max(60),
      name: z.string().min(1).max(60),
      color: z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color'),
    }),
  )
  .action(async ({ parsedInput }): Promise<UpdateTagResult> => {
    try {
      updateTag(parsedInput);
      revalidatePath('/settings/tags');
      revalidatePath('/');
      return { ok: true };
    } catch (err) {
      if (err instanceof TagNameConflictError) {
        return {
          ok: false,
          error: `Ez a név már létezik mint "${err.existingDisplayName}"`,
        };
      }
      throw err;
    }
  });

export const deleteTagAction = authActionClient
  .inputSchema(z.object({ id: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    deleteTag(parsedInput.id);
    revalidatePath('/settings/tags');
    revalidatePath('/');
    return { ok: true };
  });
