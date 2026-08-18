'use client';

import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';

interface Props {
  from: string;
  to: string;
  onChange: (next: { from: string; to: string }) => void;
  disabled?: boolean;
}

export function SummaryPeriodField({ from, to, onChange, disabled }: Props) {
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);

  function pick(which: 'from' | 'to', day: Date | undefined) {
    if (!day) return;
    const value = format(day, 'yyyy-MM-dd');
    // Keep the range ordered: dragging one end past the other moves both.
    if (which === 'from') {
      onChange({ from: value, to: value > to ? value : to });
      setOpenFrom(false);
    } else {
      onChange({ from: value < from ? value : from, to: value });
      setOpenTo(false);
    }
  }

  return (
    <div className='flex items-center gap-1 text-xs text-muted-foreground'>
      <Popover open={openFrom} onOpenChange={setOpenFrom}>
        <PopoverTrigger
          type='button'
          disabled={disabled}
          aria-label='Időszak kezdete'
          className='inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-muted hover:text-foreground'
        >
          <CalendarIcon className='size-3' />
          {from}
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='end'>
          <Calendar
            mode='single'
            selected={new Date(from + 'T00:00:00')}
            defaultMonth={new Date(from + 'T00:00:00')}
            onSelect={(day) => pick('from', day)}
          />
        </PopoverContent>
      </Popover>
      <span aria-hidden>→</span>
      <Popover open={openTo} onOpenChange={setOpenTo}>
        <PopoverTrigger
          type='button'
          disabled={disabled}
          aria-label='Időszak vége'
          className='inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 transition-colors hover:bg-muted hover:text-foreground'
        >
          <CalendarIcon className='size-3' />
          {to}
        </PopoverTrigger>
        <PopoverContent className='w-auto p-0' align='end'>
          <Calendar
            mode='single'
            selected={new Date(to + 'T00:00:00')}
            defaultMonth={new Date(to + 'T00:00:00')}
            onSelect={(day) => pick('to', day)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
