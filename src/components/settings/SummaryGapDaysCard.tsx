'use client';

import { setSummaryGapDaysAction } from '@/actions/settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUMMARY_GAP_DAYS_MAX, SUMMARY_GAP_DAYS_MIN } from '@/lib/summary-config';
import { useTransition } from 'react';

interface Props {
  value: number;
}

const OPTIONS = Array.from(
  { length: SUMMARY_GAP_DAYS_MAX - SUMMARY_GAP_DAYS_MIN + 1 },
  (_, i) => SUMMARY_GAP_DAYS_MIN + i,
);

export function SummaryGapDaysCard({ value }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: number | null) {
    if (next === null || next === value) return;
    startTransition(async () => {
      await setSummaryGapDaysAction({ days: next });
    });
  }

  return (
    <div className='flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/20 p-4'>
      <div className='space-y-0.5'>
        <p className='text-sm font-medium'>Összefoglaló felajánlása</p>
        <p className='text-xs text-muted-foreground'>
          Hány kihagyott nap után ajánlja fel az app, hogy összefoglalót írj az időszakról.
        </p>
      </div>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger aria-label='Kihagyott napok száma'>
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
