import { z } from 'zod';
import { getOrCreateTag } from '@/db/queries/tags';
import { getOrCreateEmotion } from '@/db/queries/emotions';

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

export function resolveEmotionIds(emotionsJson: string): string[] {
  try {
    const parsed = tagNamesSchema.safeParse(JSON.parse(emotionsJson || '[]'));
    if (!parsed.success) return [];
    return parsed.data.map((n) => getOrCreateEmotion(n).id);
  } catch {
    return [];
  }
}
