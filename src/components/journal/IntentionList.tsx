'use client';

import type { Intention } from '@/db/queries/intentions';
import { useI18n } from '@/i18n/provider';
import { IntentionRow } from './IntentionRow';

/** Which bucket a group is, decided by the due date alone. The heading it is
 *  drawn under is looked up from the key, so the grouping stays language-free. */
export type IntentionGroupKey = 'overdue' | 'today' | 'soon' | 'undated';

export type IntentionGroup = {
  key: IntentionGroupKey;
  items: Intention[];
};

export type IntentionListProps = {
  groups: IntentionGroup[];
  todayISO: string;
  categoryColors?: Record<string, string>;
  emptyText?: string;
};

export function IntentionList({
  groups,
  todayISO,
  categoryColors,
  emptyText,
}: IntentionListProps) {
  const d = useI18n();
  const allEmpty = groups.every((g) => g.items.length === 0);
  if (allEmpty) {
    return <p className='text-sm text-muted-foreground'>{emptyText ?? d.intentions.empty.list}</p>;
  }
  return (
    <div className='space-y-6'>
      {groups.map(
        (g) =>
          g.items.length > 0 && (
            <section key={g.key}>
              <h3 className='text-xs uppercase tracking-wide text-muted-foreground mb-2'>
                {d.intentions.groups[g.key]}
              </h3>
              <div className='divide-y'>
                {g.items.map((it) => (
                  <IntentionRow
                    key={it.id}
                    intention={it}
                    todayISO={todayISO}
                    categoryColors={categoryColors}
                  />
                ))}
              </div>
            </section>
          ),
      )}
    </div>
  );
}

export function groupOpenIntentions(items: Intention[], todayISO: string): IntentionGroup[] {
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
    { key: 'overdue', items: overdue },
    { key: 'today', items: today },
    { key: 'soon', items: upcoming },
    { key: 'undated', items: undated },
  ];
}

