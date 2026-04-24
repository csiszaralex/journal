import { getOrCreateTag } from '@/db/queries/tags';

export function resolveTagIds(tagsJson: string): string[] {
  try {
    const names: string[] = JSON.parse(tagsJson || '[]');
    return names.map((n) => getOrCreateTag(n).id);
  } catch {
    return [];
  }
}
