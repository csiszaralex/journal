'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, XIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { createIntentionAction } from '@/actions/intentions';

export type IntentionFormProps = {
  entry_id?: string | null;
  enableDueDate?: boolean;
  placeholder?: string;
  defaultDueDate?: string;
};

export function IntentionForm({
  entry_id = null,
  enableDueDate = true,
  placeholder = 'Új szándék…',
  defaultDueDate = '',
}: IntentionFormProps) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const t = text.trim();
    const d = dueDate.trim() || null;
    startTransition(async () => {
      const res = await createIntentionAction({
        text: t,
        due_date: d,
        entry_id,
      });
      if (res?.data?.ok) {
        setText('');
        setDueDate(defaultDueDate);
      }
    });
  }

  const calendarDate = dueDate ? new Date(dueDate + 'T00:00:00') : undefined;

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap gap-2 items-center">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={pending}
        className="flex-1 min-w-0"
      />
      {enableDueDate && (
        <div className="inline-flex items-center">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger
              type="button"
              disabled={pending}
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <CalendarIcon className="size-3" />
              {dueDate || 'Dátum'}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={calendarDate}
                onSelect={(day) => {
                  setDueDate(day ? format(day, 'yyyy-MM-dd') : '');
                  setCalendarOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
          {dueDate && (
            <button
              type="button"
              onClick={() => setDueDate('')}
              disabled={pending}
              aria-label="Dátum törlése"
              className="ml-0.5 inline-flex h-7 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>
      )}
      <Button type="submit" disabled={pending || !text.trim()} size="sm">
        Hozzáad
      </Button>
    </form>
  );
}
