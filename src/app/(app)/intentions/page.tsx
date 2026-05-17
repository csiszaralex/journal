import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IntentionForm } from '@/components/journal/IntentionForm';
import {
  IntentionList,
  groupOpenIntentions,
} from '@/components/journal/IntentionList';
import { IntentionRow } from '@/components/journal/IntentionRow';
import {
  listAllOpenIntentions,
  listRecentlyClosed,
} from '@/db/queries/intentions';
import { getTodayEntryId } from '@/db/queries/entries';
import { todayInAppTZ } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function IntentionsPage() {
  const todayISO = todayInAppTZ();
  const open = listAllOpenIntentions(todayISO);
  const closed = listRecentlyClosed(30);
  const hasTodayEntry = getTodayEntryId(todayISO) !== null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <h1 className="text-2xl font-semibold">Szándékok</h1>
      <IntentionForm entry_id={null} />
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Nyitott ({open.length})</TabsTrigger>
          <TabsTrigger value="done">Kész</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          <IntentionList
            groups={groupOpenIntentions(open, todayISO)}
            todayISO={todayISO}
            hasTodayEntry={hasTodayEntry}
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
                  hasTodayEntry={hasTodayEntry}
                  showSourceLink
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
}
