import { IntentionRow } from './IntentionRow';
import type { Intention } from '@/db/queries/intentions';

export type IntentionGroup = {
  label: string;
  items: Intention[];
};

export type IntentionListProps = {
  groups: IntentionGroup[];
  todayISO: string;
  hasTodayEntry: boolean;
  showSourceLink?: boolean;
  emptyText?: string;
};

export function IntentionList({
  groups,
  todayISO,
  hasTodayEntry,
  showSourceLink = true,
  emptyText = 'Nincs megjelenítendő szándék.',
}: IntentionListProps) {
  const allEmpty = groups.every((g) => g.items.length === 0);
  if (allEmpty) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="space-y-6">
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.label}>
              <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                {g.label}
              </h3>
              <div className="divide-y">
                {g.items.map((it) => (
                  <IntentionRow
                    key={it.id}
                    intention={it}
                    todayISO={todayISO}
                    hasTodayEntry={hasTodayEntry}
                    showSourceLink={showSourceLink}
                  />
                ))}
              </div>
            </section>
          )
      )}
    </div>
  );
}

export function groupOpenIntentions(
  items: Intention[],
  todayISO: string
): IntentionGroup[] {
  const overdue: Intention[] = [];
  const today: Intention[] = [];
  const upcoming: Intention[] = [];
  const undated: Intention[] = [];
  for (const it of items) {
    if (!it.due_date) undated.push(it);
    else if (it.due_date < todayISO) overdue.push(it);
    else if (it.due_date === todayISO) today.push(it);
    else upcoming.push(it);
  }
  return [
    { label: 'Lejárt', items: overdue },
    { label: 'Ma', items: today },
    { label: 'Hamarosan', items: upcoming },
    { label: 'Dátum nélkül', items: undated },
  ];
}
