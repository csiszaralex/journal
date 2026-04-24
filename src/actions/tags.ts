'use server';

import { getPopularTags, suggestTags } from '@/db/queries/tags';
import { z } from 'zod';

export async function suggestTagsAction(prefix: string) {
  const validPrefix = z.string().parse(prefix);
  return suggestTags(validPrefix, 10);
}

export async function getPopularTagsAction() {
  return getPopularTags(10);
}

