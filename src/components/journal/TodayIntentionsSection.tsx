import { getCategoryColorMap, listOpenIntentionsForToday } from '@/db/queries/intentions';
import { todayInAppTZ } from '@/lib/date';
import Link from 'next/link';
import { IntentionForm } from './IntentionForm';
import { IntentionRow } from './IntentionRow';

export function TodayIntentionsSection() {
  const todayISO = todayInAppTZ();
  const items = listOpenIntentionsForToday(todayISO);
  const categoryColors = getCategoryColorMap();
  return (
    <section className='rounded-lg border bg-muted/30 p-4 space-y-3'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-medium'>
          Nyitott szándékok mára{items.length > 0 ? ` (${items.length})` : ''}
        </h2>
        <Link href='/intentions' className='text-xs text-muted-foreground hover:underline'>
          összes →
        </Link>
      </div>
      {items.length > 0 && (
        <div className='divide-y'>
          {items.map((it) => (
            <IntentionRow
              key={it.id}
              intention={it}
              todayISO={todayISO}
              categoryColors={categoryColors}
            />
          ))}
        </div>
      )}
      <IntentionForm
        defaultDueDate={todayISO}
        placeholder='Új szándék mára…'
        categoryColors={categoryColors}
      />
    </section>
  );
}

