'use client';

import { setAiHistoryDaysAction } from '@/actions/settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AI_HISTORY_DAYS_MAX, AI_HISTORY_DAYS_MIN } from '@/lib/ai/history-config';
import { useTransition } from 'react';

interface Props {
  value: number;
}

const OPTIONS = Array.from(
  { length: AI_HISTORY_DAYS_MAX - AI_HISTORY_DAYS_MIN + 1 },
  (_, i) => AI_HISTORY_DAYS_MIN + i,
);

export function AiHistoryDaysCard({ value }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: number | null) {
    if (next === null || next === value) return;
    startTransition(async () => {
      await setAiHistoryDaysAction({ days: next });
    });
  }

  return (
    <div className='flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4'>
      <div className='space-y-0.5'>
        <p className='text-sm font-medium'>Napló-előzmény az AI kérdésekhez</p>
        <p className='text-xs text-muted-foreground'>
          Hány korábbi naplóbejegyzést kapjon az AI, amikor új kérdéseket javasol.
        </p>
      </div>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger aria-label='Előzmény napok száma'>
          <SelectValue>{(v: number | null) => `${v ?? value} nap`}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((n) => (
            <SelectItem key={n} value={n}>
              {n} nap
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

