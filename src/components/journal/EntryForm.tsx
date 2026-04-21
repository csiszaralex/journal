'use client';

import { createEntryAction, updateEntryAction } from '@/actions/entries';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import type { EntryWithVersion } from '@/db/queries/entries';
import type { EntryTemplate } from '@/db/queries/templates';
import { cn } from '@/lib/utils';
import { entryInputSchema } from '@/lib/validation';
import { getFormProps, useForm } from '@conform-to/react';
import { parseWithZod } from '@conform-to/zod/v4';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useActionState, useEffect, useReducer } from 'react';
import { TagCombobox } from './TagCombobox';
import { TemplateSelector } from './TemplateSelector';

const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-500 text-white border-red-500',
  2: 'bg-orange-500 text-white border-orange-500',
  3: 'bg-yellow-500 text-white border-yellow-500',
  4: 'bg-green-500 text-white border-green-500',
  5: 'bg-emerald-500 text-white border-emerald-500',
};

type FormState = {
  entryDate: string;
  textValue: string;
  moodScore: number | undefined;
  energyScore: number | undefined;
  calendarOpen: boolean;
  tagKey: number;
};

type FormAction =
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TEXT'; text: string }
  | { type: 'SET_MOOD'; score: number | undefined }
  | { type: 'SET_ENERGY'; score: number | undefined }
  | { type: 'TOGGLE_CALENDAR'; open: boolean }
  | { type: 'RESET'; todayStr: string }
  | { type: 'APPLY_TEMPLATE'; template: EntryTemplate };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_DATE':
      return { ...state, entryDate: action.date, calendarOpen: false };
    case 'SET_TEXT':
      return { ...state, textValue: action.text };
    case 'SET_MOOD':
      return { ...state, moodScore: action.score };
    case 'SET_ENERGY':
      return { ...state, energyScore: action.score };
    case 'TOGGLE_CALENDAR':
      return { ...state, calendarOpen: action.open };
    case 'RESET':
      return {
        entryDate: action.todayStr,
        textValue: '',
        moodScore: undefined,
        energyScore: undefined,
        calendarOpen: false,
        tagKey: state.tagKey + 1,
      };
    case 'APPLY_TEMPLATE':
      return {
        ...state,
        textValue: state.textValue === '' && action.template.text
          ? action.template.text
          : state.textValue,
        moodScore: state.moodScore === undefined && action.template.default_mood != null
          ? action.template.default_mood
          : state.moodScore,
        energyScore: state.energyScore === undefined && action.template.default_energy != null
          ? action.template.default_energy
          : state.energyScore,
        tagKey: state.tagKey + 1,
      };
  }
}

interface EntryFormProps {
  entry?: EntryWithVersion;
  onSuccess?: () => void;
  templates?: EntryTemplate[];
  defaultDate?: string;
}

export function EntryForm({ entry, onSuccess, templates = [], defaultDate }: EntryFormProps) {
  const isEdit = !!entry;
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [state, dispatch] = useReducer(formReducer, {
    entryDate: entry?.version.entry_date ?? defaultDate ?? todayStr,
    textValue: entry?.version.text ?? '',
    moodScore: entry?.version.mood_score ?? undefined,
    energyScore: entry?.version.energy_score ?? undefined,
    calendarOpen: false,
    tagKey: 0,
  });

  const [lastResult, formAction, isPending] = useActionState(
    isEdit ? updateEntryAction : createEntryAction,
    null,
  );

  const [form, fields] = useForm({
    lastResult,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: entryInputSchema });
    },
    shouldValidate: 'onBlur',
    shouldRevalidate: 'onInput',
  });

  useEffect(() => {
    if (lastResult !== null && (lastResult as { initialValue?: unknown }).initialValue === null) {
      if (!isEdit) dispatch({ type: 'RESET', todayStr });
      onSuccess?.();
    }
  }, [lastResult, isEdit, todayStr, onSuccess]);

  const calendarDate = new Date(state.entryDate + 'T00:00:00');

  return (
    <form {...getFormProps(form)} action={formAction} className='flex flex-col gap-4'>
      {isEdit && <input type='hidden' name='entry_id' value={entry.id} />}
      <input type='hidden' name='entry_date' value={state.entryDate} />
      <input type='hidden' name='mood_score' value={state.moodScore ?? ''} />
      <input type='hidden' name='energy_score' value={state.energyScore ?? ''} />

      {/* Header: label + template picker + date picker */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1'>
          <span className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            {isEdit ? 'Edit entry' : 'New entry'}
          </span>
          {!isEdit && (
            <TemplateSelector
              templates={templates}
              onSelect={(t) => dispatch({ type: 'APPLY_TEMPLATE', template: t })}
            />
          )}
        </div>
        <Popover
          open={state.calendarOpen}
          onOpenChange={(open) => dispatch({ type: 'TOGGLE_CALENDAR', open })}
        >
          <PopoverTrigger
            type='button'
            className='inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
          >
            <CalendarIcon className='size-3' />
            {state.entryDate}
          </PopoverTrigger>
          <PopoverContent className='w-auto p-0' align='end'>
            <Calendar
              mode='single'
              selected={calendarDate}
              onSelect={(day) => {
                if (day) dispatch({ type: 'SET_DATE', date: format(day, 'yyyy-MM-dd') });
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Textarea — controlled so template text fills correctly */}
      <div>
        <Textarea
          id={fields.text.id}
          name={fields.text.name}
          key={fields.text.key}
          value={state.textValue}
          onChange={(e) => dispatch({ type: 'SET_TEXT', text: e.target.value })}
          placeholder='Write freely…'
          className='min-h-35 resize-none border-muted/60 bg-muted/20 text-base leading-relaxed placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:bg-muted/40'
        />
        {fields.text.errors && (
          <p className='mt-1 text-xs text-destructive'>{fields.text.errors[0]}</p>
        )}
      </div>

      {/* Mood */}
      <div className='flex items-center gap-3'>
        <Label className='w-14 shrink-0 text-xs text-muted-foreground'>Mood</Label>
        <div className='flex gap-1.5'>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type='button'
              onClick={() =>
                dispatch({ type: 'SET_MOOD', score: state.moodScore === s ? undefined : s })
              }
              className={cn(
                'size-7 rounded-full border text-xs font-medium transition-all',
                state.moodScore === s
                  ? SCORE_COLORS[s]
                  : 'border-border text-muted-foreground hover:border-foreground/40',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className='flex items-center gap-3'>
        <Label className='w-14 shrink-0 text-xs text-muted-foreground'>Energy</Label>
        <div className='flex gap-1.5'>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type='button'
              onClick={() =>
                dispatch({ type: 'SET_ENERGY', score: state.energyScore === s ? undefined : s })
              }
              className={cn(
                'size-7 rounded-full border text-xs font-medium transition-all',
                state.energyScore === s
                  ? SCORE_COLORS[s]
                  : 'border-border text-muted-foreground hover:border-foreground/40',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className='flex flex-col gap-1.5'>
        <Label className='text-xs text-muted-foreground'>Tags</Label>
        <TagCombobox
          key={state.tagKey}
          name='tags'
          defaultValue={entry?.version.tags.map((t) => t.display_name) ?? []}
        />
      </div>

      {/* Actions row */}
      <div className='flex items-center justify-between gap-2'>
        {form.errors && form.errors.length > 0 ? (
          <p className='text-xs text-destructive'>{form.errors[0]}</p>
        ) : (
          <span />
        )}
        <Button type='submit' disabled={isPending} size='sm'>
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}
        </Button>
      </div>
    </form>
  );
}
