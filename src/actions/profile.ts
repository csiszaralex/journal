'use server';

import {
  deleteProfileQaItem,
  insertProfileQaItems,
  listProfileQa,
  setProfileBio,
  updateProfileQaAnswer,
} from '@/db/queries/profile';
import { authActionClient } from '@/lib/safe-action';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const setProfileBioAction = authActionClient
  .inputSchema(z.object({ bio: z.string().max(10000) }))
  .action(async ({ parsedInput }) => {
    setProfileBio(parsedInput.bio);
    revalidatePath('/settings/profile');
  });

export const appendProfileQaAction = authActionClient
  .inputSchema(
    z.object({
      questions: z.array(z.string().min(1).max(500)).min(1).max(10),
    }),
  )
  .action(async ({ parsedInput }) => {
    insertProfileQaItems(parsedInput.questions);
    revalidatePath('/settings/profile');
    return listProfileQa();
  });

export const updateProfileQaAnswerAction = authActionClient
  .inputSchema(
    z.object({
      id: z.number().int().positive(),
      answer: z.string().max(2000),
    }),
  )
  .action(async ({ parsedInput }) => {
    updateProfileQaAnswer(parsedInput.id, parsedInput.answer);
    revalidatePath('/settings/profile');
  });

export const deleteProfileQaAction = authActionClient
  .inputSchema(z.object({ id: z.number().int().positive() }))
  .action(async ({ parsedInput }) => {
    deleteProfileQaItem(parsedInput.id);
    revalidatePath('/settings/profile');
  });

