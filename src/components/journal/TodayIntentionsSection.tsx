import { getCategoryColorMap, listOpenIntentionsForToday } from '@/db/queries/intentions';
import { getDict } from '@/i18n/request';
import { todayInAppTZ } from '@/lib/date';
import Link from 'next/link';
import { IntentionForm } from './IntentionForm';
import { IntentionRow } from './IntentionRow';

export async function TodayIntentionsSection() {
  const d = await getDict();
  const todayISO = todayInAppTZ();
  const items = listOpenIntentionsForToday(todayISO);
  const categoryColors = getCategoryColorMap();
  return (
    <section className='rounded-lg border bg-muted/30 p-4 space-y-3'>
      <div className='flex items-center justify-between'>
        <h2 className='text-sm font-medium'>{d.intentions.today.heading(items.length)}</h2>
        <Link href='/intentions' className='text-xs text-muted-foreground hover:underline'>
          {d.intentions.today.seeAll}
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
        placeholder={d.intentions.form.placeholderToday}
        categoryColors={categoryColors}
      />
    </section>
  );
}

