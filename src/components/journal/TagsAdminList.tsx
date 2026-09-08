'use client';

import { useI18n } from '@/i18n/provider';
import { TagEditRow, type TagLike } from './TagEditRow';

interface TagsAdminListProps {
  kind: 'tag' | 'emotion';
  items: TagLike[];
}

export function TagsAdminList({ kind, items }: TagsAdminListProps) {
  const d = useI18n();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {kind === 'tag' ? d.tags.empty.tags : d.tags.empty.emotions}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <TagEditRow key={item.id} kind={kind} item={item} />
      ))}
    </div>
  );
}
