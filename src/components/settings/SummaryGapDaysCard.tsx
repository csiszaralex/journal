'use client';

import { setSummaryGapDaysAction } from '@/actions/settings';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n/provider';
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
  const d = useI18n();
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
        <p className='text-sm font-medium'>{d.settings.ai.summaryGap.label}</p>
        <p className='text-xs text-muted-foreground'>{d.settings.ai.summaryGap.description}</p>
      </div>
      <Select value={value} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger aria-label={d.settings.ai.summaryGap.selectLabel}>
          <SelectValue>
            {(v: number | null) => d.settings.ai.summaryGap.value(v ?? value)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {OPTIONS.map((n) => (
            <SelectItem key={n} value={n}>
              {d.settings.ai.summaryGap.value(n)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
