import Link from 'next/link';
import { IntentionRow } from './IntentionRow';
import { IntentionForm } from './IntentionForm';
import { listOpenIntentionsForToday } from '@/db/queries/intentions';
import { todayInAppTZ } from '@/lib/date';

export type TodayIntentionsSectionProps = {
  hasTodayEntry: boolean;
};

export function TodayIntentionsSection({
  hasTodayEntry,
}: TodayIntentionsSectionProps) {
  const todayISO = todayInAppTZ();
  const items = listOpenIntentionsForToday(todayISO);
  return (
    <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          Nyitott szándékok mára{items.length > 0 ? ` (${items.length})` : ''}
        </h2>
        <Link
          href="/intentions"
          className="text-xs text-muted-foreground hover:underline"
        >
          összes →
        </Link>
      </div>
      {items.length > 0 && (
        <div className="divide-y">
          {items.map((it) => (
            <IntentionRow
              key={it.id}
              intention={it}
              todayISO={todayISO}
              hasTodayEntry={hasTodayEntry}
              showSourceLink={false}
            />
          ))}
        </div>
      )}
      <IntentionForm
        entry_id={null}
        defaultDueDate={todayISO}
        placeholder="Új szándék mára…"
      />
    </section>
  );
}
