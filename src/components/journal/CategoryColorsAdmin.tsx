'use client';

import { resetCategoryColorAction, setCategoryColorAction } from '@/actions/intentions';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/provider';
import { categoryColor } from '@/lib/color';
import { RotateCcwIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { CategoryChip } from './CategoryChip';

export type CategoryColorsAdminProps = {
  categories: string[];
  overrides: Record<string, string>;
};

export function CategoryColorsAdmin({ categories, overrides }: CategoryColorsAdminProps) {
  const d = useI18n();
  if (categories.length === 0) {
    // The quoted example is syntax to be typed, so it is emphasised — and
    // where it falls in the sentence is the language's call, not this
    // component's. See `@/i18n/emphasis`.
    const empty = d.intentions.categories.empty;
    return (
      <p className='text-sm text-muted-foreground'>
        {empty.before}
        <span className='font-medium text-foreground'>{empty.emphasis}</span>
        {empty.after}
      </p>
    );
  }
  return (
    <div className='space-y-2'>
      {categories.map((name) => (
        <CategoryColorRow key={name} name={name} override={overrides[name] ?? null} />
      ))}
    </div>
  );
}

function CategoryColorRow({ name, override }: { name: string; override: string | null }) {
  const d = useI18n();
  const auto = categoryColor(name);
  const [color, setColor] = useState(override ?? auto);
  const [pending, startTransition] = useTransition();

  const dirty = color !== (override ?? auto);

  function handleSave() {
    startTransition(async () => {
      await setCategoryColorAction({ name, color });
    });
  }

  function handleReset() {
    startTransition(async () => {
      await resetCategoryColorAction({ name });
      setColor(auto);
    });
  }

  return (
    <div className='flex flex-wrap items-center gap-2 rounded-md border border-border bg-card p-3'>
      <input
        type='color'
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className='h-8 w-10 cursor-pointer rounded border border-input bg-background'
        aria-label={d.intentions.categories.colorLabel(name)}
        disabled={pending}
      />
      <CategoryChip name={name} color={color} />
      <div className='ml-auto flex items-center gap-2'>
        {override && (
          <Button
            type='button'
            size='sm'
            variant='ghost'
            onClick={handleReset}
            disabled={pending}
            aria-label={d.intentions.categories.reset}
            title={d.intentions.categories.resetTitle}
          >
            <RotateCcwIcon className='size-3.5' />
          </Button>
        )}
        <Button
          type='button'
          size='sm'
          variant='outline'
          onClick={handleSave}
          disabled={!dirty || pending}
        >
          {pending ? d.common.saving : d.common.save}
        </Button>
      </div>
    </div>
  );
}

