import { z } from 'zod';
import { getOrCreateTag } from '@/db/queries/tags';

const tagNamesSchema = z.string().array();

export function resolveTagIds(tagsJson: string): string[] {
  try {
    const parsed = tagNamesSchema.safeParse(JSON.parse(tagsJson || '[]'));
    if (!parsed.success) return [];
    return parsed.data.map((n) => getOrCreateTag(n).id);
  } catch {
    return [];
  }
}
