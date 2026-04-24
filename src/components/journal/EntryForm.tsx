'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import type { EntryWithVersion } from '@/db/queries/entries';
import type { EntryTemplate } from '@/db/queries/templates';
import { cn } from '@/lib/utils';
import { entryInputSchema } from '@/lib/validation';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useReducer, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createId } from '@paralleldrive/cuid2';
import { TagCombobox } from './TagCombobox';
import { TemplateSelector } from './TemplateSelector';
import { OFFLINE_QUEUE_KEY } from './OfflineIndicator';


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
  tags: string[];
};

type FormAction =
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TEXT'; text: string }
  | { type: 'SET_MOOD'; score: number | undefined }
  | { type: 'SET_ENERGY'; score: number | undefined }
  | { type: 'TOGGLE_CALENDAR'; open: boolean }
  | { type: 'SET_TAGS'; tags: string[] }
  | { type: 'RESET'; todayStr: string }
  | { type: 'APPLY_TEMPLATE'; template: EntryTemplate }
  | {
      type: 'RESTORE_DRAFT';
      text: string;
      moodScore: number | undefined;
      energyScore: number | undefined;
    };

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
    case 'SET_TAGS':
      return { ...state, tags: action.tags };
    case 'RESET':
      return {
        entryDate: action.todayStr,
        textValue: '',
        moodScore: undefined,
        energyScore: undefined,
        calendarOpen: false,
        tagKey: state.tagKey + 1,
        tags: [],
      };
    case 'APPLY_TEMPLATE':
      return {
        ...state,
        textValue:
          state.textValue === '' && action.template.text ? action.template.text : state.textValue,
        moodScore:
          state.moodScore === undefined && action.template.default_mood != null
            ? action.template.default_mood
            : state.moodScore,
        energyScore:
          state.energyScore === undefined && action.template.default_energy != null
            ? action.template.default_energy
            : state.energyScore,
        tagKey: state.tagKey + 1,
      };
    case 'RESTORE_DRAFT':
      return {
        ...state,
        textValue: action.text,
        moodScore: action.moodScore,
        energyScore: action.energyScore,
      };
  }
}

interface EntryFormProps {
  entry?: EntryWithVersion;
  onSuccess?: () => void;
  templates?: EntryTemplate[];
  defaultDate?: string;
}

const DRAFT_KEY = 'journal_entry_draft';

export function EntryForm({ entry, onSuccess, templates = [], defaultDate }: EntryFormProps) {
  const isEdit = !!entry;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const draftSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const [state, dispatch] = useReducer(formReducer, {
    entryDate: entry?.version.entry_date ?? defaultDate ?? todayStr,
    textValue: entry?.version.text ?? '',
    moodScore: entry?.version.mood_score ?? undefined,
    energyScore: entry?.version.energy_score ?? undefined,
    calendarOpen: false,
    tagKey: 0,
    tags: entry?.version.tags.map((t) => t.display_name) ?? [],
  });

  // Restore draft on mount (new entries only)
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as {
        text?: string;
        mood?: number | null;
        energy?: number | null;
        savedAt?: number;
      };
      if (!d.text && d.mood == null && d.energy == null) return;
      if (d.savedAt && Date.now() - d.savedAt > 24 * 60 * 60 * 1000) return;
      dispatch({
        type: 'RESTORE_DRAFT',
        text: d.text ?? '',
        moodScore: d.mood ?? undefined,
        energyScore: d.energy ?? undefined,
      });
    } catch {
      /* ignore malformed draft */
    }
  }, [isEdit]);

  // Auto-save draft to localStorage (new entries only, debounced 2s)
  useEffect(() => {
    if (isEdit) return;
    if (!state.textValue && state.moodScore === undefined && state.energyScore === undefined)
      return;
    if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    draftSaveRef.current = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          text: state.textValue,
          mood: state.moodScore ?? null,
          energy: state.energyScore ?? null,
          savedAt: Date.now(),
        }),
      );
    }, 2000);
    return () => {
      if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    };
  }, [state.textValue, state.moodScore, state.energyScore, isEdit]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);

    const payload = {
      entry_date: state.entryDate,
      text: state.textValue,
      mood_score: state.moodScore,
      energy_score: state.energyScore,
      tags: JSON.stringify(state.tags),
    };

    // Client-side validation
    const validation = entryInputSchema.safeParse(payload);
    if (!validation.success) {
      setErrors(validation.error.issues.map((i) => i.message));
      return;
    }

    const isEmpty =
      !payload.text &&
      payload.mood_score == null &&
      payload.energy_score == null &&
      state.tags.length === 0;
    if (isEmpty && !isEdit) {
      dispatch({ type: 'RESET', todayStr });
      return;
    }

    const clientId = isEdit ? undefined : createId();
    const body = isEdit
      ? JSON.stringify({
          action: 'updateEntry',
          payload: { ...payload, entry_id: entry!.id },
          clientId,
        })
      : JSON.stringify({ action: 'createEntry', payload, clientId });

    setIsPending(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      const data = (await res.json().catch(() => ({ ok: false }))) as {
        ok: boolean;
        offline?: boolean;
        error?: string;
      };

      if (data.ok && data.offline) {
        toast('Saved offline — will sync when connected', { duration: 4000 });
        if (!isEdit) {
          dispatch({ type: 'RESET', todayStr });
          localStorage.removeItem(DRAFT_KEY);
        }
        onSuccess?.();
      } else if (data.ok) {
        router.refresh();
        if (!isEdit) {
          dispatch({ type: 'RESET', todayStr });
          localStorage.removeItem(DRAFT_KEY);
        }
        onSuccess?.();
      } else {
        setErrors([data.error ?? 'Something went wrong. Please try again.']);
      }
    } catch {
      if (!navigator.onLine) {
        // SW may not be controlling this page yet (first load / hard refresh),
        // so save to a client-side queue as a guaranteed safety net.
        try {
          const pending = JSON.parse(
            localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]',
          ) as string[];
          pending.push(body);
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pending));
        } catch {
          /* ignore storage errors */
        }
        toast('Saved offline — will sync when connected', { duration: 4000 });
        if (!isEdit) {
          dispatch({ type: 'RESET', todayStr });
          localStorage.removeItem(DRAFT_KEY);
        }
        onSuccess?.();
      } else {
        setErrors(['Network error. Please try again.']);
      }
    } finally {
      setIsPending(false);
    }
  }

  const calendarDate = new Date(state.entryDate + 'T00:00:00');

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
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

      {/* Textarea */}
      <div>
        <Textarea
          name='text'
          value={state.textValue}
          onChange={(e) => dispatch({ type: 'SET_TEXT', text: e.target.value })}
          placeholder='Write freely…'
          className='min-h-35 resize-none border-muted/60 bg-muted/20 text-base leading-relaxed placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:bg-muted/40'
        />
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
          defaultValue={state.tags}
          onValueChange={(tags) => dispatch({ type: 'SET_TAGS', tags })}
        />
      </div>

      {/* Actions row */}
      <div className='flex items-center justify-between gap-2'>
        {errors.length > 0 ? (
          <p className='text-xs text-destructive'>{errors[0]}</p>
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
