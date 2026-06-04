'use client';

import { resetCategoryColorAction, setCategoryColorAction } from '@/actions/intentions';
import { Button } from '@/components/ui/button';
import { categoryColor } from '@/lib/color';
import { RotateCcwIcon } from 'lucide-react';
import { useState, useTransition } from 'react';
import { CategoryChip } from './CategoryChip';

export type CategoryColorsAdminProps = {
  categories: string[];
  overrides: Record<string, string>;
};

export function CategoryColorsAdmin({ categories, overrides }: CategoryColorsAdminProps) {
  if (categories.length === 0) {
    return (
      <p className='text-sm text-muted-foreground'>
        Még nincs egyetlen kategória sem. Hozz létre szándékot &quot;Kategória: szöveg&quot;
        formában.
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
        aria-label={`${name} színe`}
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
            aria-label='Alaphelyzet'
            title='Vissza az automatikus színre'
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
          {pending ? 'Mentés…' : 'Mentés'}
        </Button>
      </div>
    </div>
  );
}

