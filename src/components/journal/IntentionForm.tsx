'use client';

import { createIntentionAction } from '@/actions/intentions';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/i18n/provider';
import { getContrastTextColor, resolveCategoryColor } from '@/lib/color';
import { formatISODay } from '@/lib/date';
import { MAX_CATEGORY_LENGTH, normalizeCategory } from '@/lib/intentions';
import { format } from 'date-fns';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

export type IntentionFormProps = {
  enableDueDate?: boolean;
  /** Overrides the default invitation — the Today page says "for today". A
   *  prop rather than a default parameter, because a default cannot read a
   *  hook; the fallback is resolved in the body instead. */
  placeholder?: string;
  defaultDueDate?: string;
  categoryColors?: Record<string, string>;
};

export function IntentionForm({
  enableDueDate = true,
  placeholder,
  defaultDueDate = '',
  categoryColors,
}: IntentionFormProps) {
  const d = useI18n();
  const placeholderText = placeholder ?? d.intentions.form.placeholder;
  const [category, setCategory] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [editingCat, setEditingCat] = useState(false);
  const [catDraft, setCatDraft] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const textRef = useRef<HTMLInputElement>(null);
  const refocusRef = useRef(false);

  useEffect(() => {
    if (!pending && refocusRef.current) {
      refocusRef.current = false;
      textRef.current?.focus();
    }
  }, [pending]);

  function focusText(at: 'start' | 'end') {
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (!el) return;
      el.focus();
      const pos = at === 'start' ? 0 : el.value.length;
      el.setSelectionRange(pos, pos);
    });
  }

  function tryCommitCategory(value: string): boolean {
    const colon = value.indexOf(':');
    if (colon <= 0) return false;
    const prefix = value.slice(0, colon).trim();
    if (!prefix || prefix.length > MAX_CATEGORY_LENGTH || /[\r\n]/.test(prefix)) {
      return false;
    }
    setCategory(normalizeCategory(prefix));
    setText(value.slice(colon + 1).replace(/^\s+/, ''));
    return true;
  }

  function onTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Only auto-detect a category while none is committed yet, so the colon in
    // the remaining text doesn't keep re-triggering.
    if (category === null && tryCommitCategory(value)) return;
    setText(value);
  }

  function onTextKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (editingCat || !category) return;
    const el = e.currentTarget;
    const atStart = el.selectionStart === 0 && el.selectionEnd === 0;
    if (atStart && (e.key === 'ArrowLeft' || e.key === 'Backspace')) {
      e.preventDefault();
      startEditCategory();
    }
  }

  function startEditCategory() {
    setCatDraft(category ?? '');
    setEditingCat(true);
  }

  function commitCatEdit(focus: 'start' | 'end' | null) {
    setCategory(catDraft.trim() ? normalizeCategory(catDraft.trim()) : null);
    setEditingCat(false);
    if (focus) focusText(focus);
  }

  function onSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const full = (category ? `${category}: ${text}` : text).trim();
    const d = dueDate.trim() || null;
    refocusRef.current = true;
    startTransition(async () => {
      const res = await createIntentionAction({ text: full, due_date: d });
      if (res?.data?.ok) {
        setCategory(null);
        setText('');
        setEditingCat(false);
        setDueDate(defaultDueDate);
      }
    });
  }

  const calendarDate = dueDate ? new Date(dueDate + 'T00:00:00') : undefined;
  const chipColor = category ? resolveCategoryColor(category, categoryColors) : undefined;

  return (
    <form onSubmit={onSubmit} className='flex flex-col gap-2 sm:flex-row sm:items-center'>
      {/* Input-shaped container: the category shows as a colored, editable chip
          on the left, in place of the raw "Name:" text. */}
      <div className='flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 md:text-sm dark:bg-input/30'>
        {editingCat ? (
          // Auto-width: an invisible sizer in the same grid cell drives the
          // column width to exactly fit the text, and the input fills it.
          <span className='inline-grid shrink-0 items-center rounded-full bg-muted'>
            <span
              aria-hidden
              className='col-start-1 row-start-1 whitespace-pre px-2 py-0.5 text-xs font-medium opacity-0'
            >
              {catDraft}
            </span>
            <input
              value={catDraft}
              onChange={(e) => setCatDraft(e.target.value)}
              onBlur={() => commitCatEdit(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitCatEdit('end');
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setEditingCat(false);
                  focusText('start');
                } else if (
                  e.key === 'ArrowRight' &&
                  e.currentTarget.selectionStart === e.currentTarget.value.length
                ) {
                  e.preventDefault();
                  commitCatEdit('start');
                }
              }}
              autoFocus
              maxLength={MAX_CATEGORY_LENGTH}
              size={1}
              aria-label={d.intentions.form.editCategory}
              className='col-start-1 row-start-1 w-full min-w-0 rounded-full bg-transparent px-2 py-0.5 text-xs font-medium outline-none'
            />
          </span>
        ) : (
          category &&
          chipColor && (
            <button
              type='button'
              onClick={startEditCategory}
              disabled={pending}
              title={d.intentions.form.editCategory}
              className='inline-flex max-w-32 shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium'
              style={{
                backgroundColor: chipColor,
                color: getContrastTextColor(chipColor),
              }}
            >
              <span className='truncate'>{category}</span>
            </button>
          )
        )}
        <input
          ref={textRef}
          value={text}
          onChange={onTextChange}
          onKeyDown={onTextKeyDown}
          placeholder={category ? d.intentions.form.textPlaceholder : placeholderText}
          disabled={pending}
          className='min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed'
        />
      </div>

      <div className='flex items-center justify-end gap-2'>
        {enableDueDate && (
          <div className='inline-flex items-center'>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                type='button'
                disabled={pending}
                className='inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50'
              >
                <CalendarIcon className='size-3' />
                {dueDate
                  ? formatISODay(dueDate, d.dates.dayInput, d.dates.locale)
                  : d.intentions.form.datePlaceholder}
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='start'>
                <Calendar
                  mode='single'
                  selected={calendarDate}
                  locale={d.dates.locale}
                  onSelect={(day) => {
                    // A stored due date, not a shown one: this format is a
                    // machine value and never changes with the language.
                    setDueDate(day ? format(day, 'yyyy-MM-dd') : '');
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            {dueDate && (
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                onClick={() => setDueDate('')}
                disabled={pending}
                aria-label={d.intentions.form.clearDate}
                className='ml-0.5'
              >
                <XIcon className='size-3' />
              </Button>
            )}
          </div>
        )}
        <Button type='submit' disabled={pending || !text.trim()} size='sm'>
          {d.intentions.form.submit}
        </Button>
      </div>
    </form>
  );
}

