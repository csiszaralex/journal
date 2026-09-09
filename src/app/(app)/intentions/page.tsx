import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntentionForm } from '@/components/journal/IntentionForm';
import { IntentionsFilter } from '@/components/journal/IntentionsFilter';
import { IntentionRow } from '@/components/journal/IntentionRow';
import {
  getCategoryColorMap,
  listAllOpenIntentions,
  listDistinctCategories,
  listRecentlyClosed,
} from '@/db/queries/intentions';
import { getDict } from '@/i18n/request';
import { todayInAppTZ } from '@/lib/date';

export const dynamic = 'force-dynamic';

/** How far back the "done" tab looks. Named because the empty state says it. */
const RECENTLY_CLOSED_DAYS = 30;

export default async function IntentionsPage() {
  const d = await getDict();
  const todayISO = todayInAppTZ();
  const open = listAllOpenIntentions(todayISO);
  const closed = listRecentlyClosed(RECENTLY_CLOSED_DAYS);
  const categories = listDistinctCategories();
  const categoryColors = getCategoryColorMap();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">{d.intentions.title}</h1>
      <IntentionForm categoryColors={categoryColors} />
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">{d.intentions.tabs.open(open.length)}</TabsTrigger>
          <TabsTrigger value="done">{d.intentions.tabs.done}</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          <IntentionsFilter
            items={open}
            todayISO={todayISO}
            categories={categories}
            categoryColors={categoryColors}
          />
        </TabsContent>
        <TabsContent value="done" className="mt-4">
          {closed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {d.intentions.empty.recentlyClosed(RECENTLY_CLOSED_DAYS)}
            </p>
          ) : (
            <div className="divide-y">
              {closed.map((it) => (
                <IntentionRow
                  key={it.id}
                  intention={it}
                  todayISO={todayISO}
                  categoryColors={categoryColors}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
