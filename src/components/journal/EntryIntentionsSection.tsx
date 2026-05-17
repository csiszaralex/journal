import { IntentionRow } from './IntentionRow';
import { IntentionForm } from './IntentionForm';
import { listIntentionsForEntry } from '@/db/queries/intentions';
import { todayInAppTZ } from '@/lib/date';

export type EntryIntentionsSectionProps = {
  entry_id: string;
  isTodayEntry: boolean;
};

export function EntryIntentionsSection({
  entry_id,
  isTodayEntry,
}: EntryIntentionsSectionProps) {
  const todayISO = todayInAppTZ();
  const items = listIntentionsForEntry(entry_id);
  return (
    <section className="border-t pt-4 mt-4 space-y-3">
      <h3 className="text-sm font-medium">Szándékok</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Még nincs ehhez a bejegyzéshez kapcsolt szándék.
        </p>
      ) : (
        <div className="divide-y">
          {items.map((it) => (
            <IntentionRow
              key={it.id}
              intention={it}
              todayISO={todayISO}
              hasTodayEntry={isTodayEntry}
              showSourceLink={false}
            />
          ))}
        </div>
      )}
      <IntentionForm entry_id={entry_id} placeholder="Új szándék ehhez a bejegyzéshez…" />
    </section>
  );
}
