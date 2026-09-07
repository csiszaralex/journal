'use client';

import { useI18n } from '@/i18n/provider';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableChipProps {
  id: string;
  bg: string;
  fg: string;
  emoji?: string;
  onRemove: (e: React.MouseEvent) => void;
}

export function SortableChip({ id, bg, fg, emoji, onRemove }: SortableChipProps) {
  const d = useI18n();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: bg,
        color: fg,
      }}
      className='inline-flex select-none items-center rounded-md text-xs'
      {...attributes}
    >
      <span
        {...listeners}
        onDoubleClick={onRemove}
        title={d.entry.pickers.doubleClickToRemove}
        className='inline-flex cursor-grab items-center gap-1 px-2 py-0.5 active:cursor-grabbing'
      >
        {emoji && (
          <span className='emoji' aria-hidden>
            {emoji}
          </span>
        )}
        {id}
      </span>
    </div>
  );
}

