'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XIcon } from 'lucide-react';

interface SortableChipProps {
  id: string;
  bg: string;
  fg: string;
  emoji?: string;
  onRemove: (e: React.MouseEvent) => void;
}

export function SortableChip({ id, bg, fg, emoji, onRemove }: SortableChipProps) {
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
        className='inline-flex cursor-grab items-center gap-1 py-0.5 pl-2 pr-1 active:cursor-grabbing'
      >
        {emoji && (
          <span className='emoji' aria-hidden>
            {emoji}
          </span>
        )}
        {id}
      </span>
      <button
        type='button'
        onClick={onRemove}
        aria-label={`Remove ${id}`}
        className='inline-flex cursor-pointer items-center py-0.5 pr-1.5 opacity-70 transition-opacity hover:opacity-100'
      >
        <XIcon className='size-3' aria-hidden />
      </button>
    </div>
  );
}

