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
import { todayInAppTZ } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function IntentionsPage() {
  const todayISO = todayInAppTZ();
  const open = listAllOpenIntentions(todayISO);
  const closed = listRecentlyClosed(30);
  const categories = listDistinctCategories();
  const categoryColors = getCategoryColorMap();

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Szándékok</h1>
      <IntentionForm categoryColors={categoryColors} />
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Nyitott ({open.length})</TabsTrigger>
          <TabsTrigger value="done">Kész</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          <IntentionsFilter
            items={open}
            todayISO={todayISO}
            categories={categories}
            categoryColors={categoryColors}
            emptyText="Nincs nyitott szándék."
          />
        </TabsContent>
        <TabsContent value="done" className="mt-4">
          {closed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Az elmúlt 30 napban nem zártál le szándékot.
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
