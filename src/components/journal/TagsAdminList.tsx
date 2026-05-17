'use client';

import { TagEditRow, type TagLike } from './TagEditRow';

interface TagsAdminListProps {
  kind: 'tag' | 'emotion';
  items: TagLike[];
}

export function TagsAdminList({ kind, items }: TagsAdminListProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {kind === 'tag' ? 'Még nincs tag.' : 'Még nincs érzelem.'}
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
