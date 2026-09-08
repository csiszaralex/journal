'use client';

import { setAiHistoryEntriesAction } from '@/actions/settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n/provider';
import { AI_HISTORY_ENTRIES_MAX, AI_HISTORY_ENTRIES_MIN } from '@/lib/ai/history-config';
import { useTransition } from 'react';

interface Props {
  value: number;
}

const OPTIONS = Array.from(
  { length: AI_HISTORY_ENTRIES_MAX - AI_HISTORY_ENTRIES_MIN + 1 },
  (_, i) => AI_HISTORY_ENTRIES_MIN + i,
);

export function AiHistoryEntriesCard({ value }: Props) {
  const d = useI18n();
  const [isPending, startTransition] = useTransition();

  function handleChange(next: number | null) {
    if (next === null || next === value) return;
    startTransition(async () => {
      await setAiHistoryEntriesAction({ entries: next });
    });
  }

  return (
    <div className='flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4'>
      <div className='space-y-0.5'>
        <p className='text-sm font-medium'>{d.settings.ai.historyEntries.label}</p>
        <p className='text-xs text-muted-foreground'>
          {d.settings.ai.historyEntries.description}
        </p>
      </div>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger aria-label={d.settings.ai.historyEntries.selectLabel}>
          <SelectValue>
            {(v: number | null) => d.settings.ai.historyEntries.value(v ?? value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((n) => (
            <SelectItem key={n} value={n}>
              {d.settings.ai.historyEntries.value(n)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

