export const dynamic = 'force-dynamic';

import { SearchView } from '@/components/journal/SearchView';

type SearchParams = Promise<{
  q?: string;
  from?: string;
  to?: string;
  mood_min?: string;
  mood_max?: string;
}>;

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  return (
    <>
      <h1 className='text-xl font-semibold tracking-tight'>Search</h1>
      <SearchView
        initialQ={params.q ?? ''}
        initialFrom={params.from ?? ''}
        initialTo={params.to ?? ''}
        initialMoodMin={params.mood_min ?? ''}
        initialMoodMax={params.mood_max ?? ''}
      />
    </>
  );
}

