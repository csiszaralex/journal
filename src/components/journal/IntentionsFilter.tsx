'use client';

import type { Intention } from '@/db/queries/intentions';
import { getContrastTextColor, resolveCategoryColor } from '@/lib/color';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { IntentionList, groupOpenIntentions } from './IntentionList';

export type IntentionsFilterProps = {
  items: Intention[];
  todayISO: string;
  categories: string[];
  categoryColors?: Record<string, string>;
  emptyText?: string;
};

export function IntentionsFilter({
  items,
  todayISO,
  categories,
  categoryColors,
  emptyText = 'Nincs nyitott szándék.',
}: IntentionsFilterProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = selected ? items.filter((it) => it.category === selected) : items;

  return (
    <div className='space-y-4'>
      {categories.length > 0 && (
        <div className='flex flex-wrap gap-1.5'>
          <button
            type='button'
            onClick={() => setSelected(null)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              selected === null
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            Mind
          </button>
          {categories.map((c) => {
            const color = resolveCategoryColor(c, categoryColors);
            const active = selected === c;
            return (
              <button
                key={c}
                type='button'
                onClick={() => setSelected(active ? null : c)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'border-transparent'
                    : 'border-border bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
                style={
                  active
                    ? { backgroundColor: color, color: getContrastTextColor(color) }
                    : undefined
                }
              >
                {!active && (
                  <span
                    className='size-2 rounded-full'
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                )}
                {c}
              </button>
            );
          })}
        </div>
      )}
      <IntentionList
        groups={groupOpenIntentions(filtered, todayISO)}
        todayISO={todayISO}
        categoryColors={categoryColors}
        emptyText={emptyText}
      />
    </div>
  );
}

