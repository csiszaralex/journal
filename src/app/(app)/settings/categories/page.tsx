export const dynamic = 'force-dynamic';

import { CategoryColorsAdmin } from '@/components/journal/CategoryColorsAdmin';
import { getCategoryColorMap, listAllDistinctCategories } from '@/db/queries/intentions';
import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';

export default function CategoriesSettingsPage() {
  const categories = listAllDistinctCategories();
  const overrides = getCategoryColorMap();

  return (
    <div className='mx-auto max-w-2xl space-y-8 px-4 py-8'>
      <div className='flex items-center gap-2'>
        <Link
          href='/settings'
          className='inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground'
        >
          <ArrowLeftIcon className='size-3' />
          Settings
        </Link>
        <h1 className='text-xl font-semibold tracking-tight'>Kategóriák</h1>
      </div>

      <p className='text-sm text-muted-foreground'>
        Minden szándék-kategória automatikusan kap egy stabil színt a nevéből. Itt felülírhatod
        bármelyiket, vagy visszaállíthatod az automatikus színre.
      </p>

      <CategoryColorsAdmin categories={categories} overrides={overrides} />
    </div>
  );
}

