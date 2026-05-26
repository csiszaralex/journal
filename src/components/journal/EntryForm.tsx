'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import type { EntryWithVersion } from '@/db/queries/entries';
import type { EntryTemplate } from '@/db/queries/templates';
import { cn } from '@/lib/utils';
import { entryInputSchema } from '@/lib/validation';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, HistoryIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useReducer, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createId } from '@paralleldrive/cuid2';
import { TagCombobox } from './TagCombobox';
import { EmotionCombobox } from './EmotionCombobox';
import { TemplateSelector } from './TemplateSelector';
import { EntryQuestions, type QaPair } from './EntryQuestions';
import { OFFLINE_QUEUE_KEY } from '@/lib/offline';


const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-500 text-white border-red-500',
  2: 'bg-orange-500 text-white border-orange-500',
  3: 'bg-yellow-500 text-white border-yellow-500',
  4: 'bg-green-500 text-white border-green-500',
  5: 'bg-emerald-500 text-white border-emerald-500',
};

// tagKey lives in the reducer so it bumps atomically with form state changes
// (RESET, APPLY_TEMPLATE, RESTORE_DRAFT) — avoids a separate setState call in effects.
type FormState = {
  entryDate: string;
  textValue: string;
  moodScore: number | undefined;
  energyScore: number | undefined;
  tags: string[];
  tagKey: number;
  emotions: string[];
  emotionKey: number;
  qaPairs: QaPair[];
  qaLoading: boolean;
  qaLoadingIndex: number | null;
  qaAppending: boolean;
  qaError: string | null;
};

type FormAction =
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_TEXT'; text: string }
  | { type: 'SET_MOOD'; score: number | undefined }
  | { type: 'SET_ENERGY'; score: number | undefined }
  | { type: 'SET_TAGS'; tags: string[] }
  | { type: 'SET_EMOTIONS'; emotions: string[] }
  | { type: 'EMOTIONS_AI_ADD'; newEmotions: string[] }
  | { type: 'RESET'; todayStr: string }
  | { type: 'APPLY_TEMPLATE'; template: EntryTemplate }
  | {
      type: 'RESTORE_DRAFT';
      text: string;
      moodScore: number | undefined;
      energyScore: number | undefined;
      date: string | undefined;
      tags: string[] | undefined;
      emotions: string[] | undefined;
      qaPairs: QaPair[] | undefined;
    }
  | { type: 'QA_REQUEST_START' }
  | { type: 'QA_REQUEST_SUCCESS'; questions: string[] }
  | { type: 'QA_REQUEST_ERROR'; error: string }
  | { type: 'QA_ANSWER_CHANGE'; index: number; value: string }
  | { type: 'QA_REPLACE_ONE_START'; index: number }
  | { type: 'QA_REPLACE_ONE_SUCCESS'; index: number; question: string }
  | { type: 'QA_REPLACE_ONE_ERROR'; error: string }
  | { type: 'QA_APPEND_ONE_START' }
  | { type: 'QA_APPEND_ONE_SUCCESS'; question: string }
  | { type: 'QA_APPEND_ONE_ERROR'; error: string }
  | { type: 'QA_DELETE_ONE'; index: number }
  | { type: 'REFRESH_PICKERS' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_DATE':
      return { ...state, entryDate: action.date };
    case 'SET_TEXT':
      return { ...state, textValue: action.text };
    case 'SET_MOOD':
      return { ...state, moodScore: action.score };
    case 'SET_ENERGY':
      return { ...state, energyScore: action.score };
    case 'SET_TAGS':
      return { ...state, tags: action.tags };
    case 'SET_EMOTIONS':
      return { ...state, emotions: action.emotions };
    case 'EMOTIONS_AI_ADD': {
      const existing = new Set(state.emotions.map((e) => e.toLowerCase()));
      const toAdd = action.newEmotions.filter((e) => !existing.has(e.toLowerCase()));
      if (toAdd.length === 0) return state;
      return {
        ...state,
        emotions: [...state.emotions, ...toAdd],
        emotionKey: state.emotionKey + 1,
      };
    }
    case 'RESET':
      return {
        entryDate: action.todayStr,
        textValue: '',
        moodScore: undefined,
        energyScore: undefined,
        tags: [],
        tagKey: state.tagKey + 1,
        emotions: [],
        emotionKey: state.emotionKey + 1,
        qaPairs: [],
        qaLoading: false,
        qaLoadingIndex: null,
        qaAppending: false,
        qaError: null,
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
        emotionKey: state.emotionKey + 1,
      };
    case 'RESTORE_DRAFT':
      return {
        ...state,
        textValue: action.text,
        moodScore: action.moodScore,
        energyScore: action.energyScore,
        entryDate: action.date ?? state.entryDate,
        tags: action.tags ?? state.tags,
        tagKey: action.tags?.length ? state.tagKey + 1 : state.tagKey,
        emotions: action.emotions ?? state.emotions,
        emotionKey: action.emotions?.length ? state.emotionKey + 1 : state.emotionKey,
        qaPairs: action.qaPairs ?? state.qaPairs,
      };
    case 'QA_REQUEST_START':
      return { ...state, qaLoading: true, qaLoadingIndex: null, qaError: null };
    case 'QA_REQUEST_SUCCESS':
      return {
        ...state,
        qaLoading: false,
        qaLoadingIndex: null,
        qaError: null,
        qaPairs: action.questions.map((q) => ({ question: q, answer: '' })),
      };
    case 'QA_REQUEST_ERROR':
      return { ...state, qaLoading: false, qaLoadingIndex: null, qaError: action.error };
    case 'QA_ANSWER_CHANGE':
      return {
        ...state,
        qaPairs: state.qaPairs.map((p, i) =>
          i === action.index ? { ...p, answer: action.value } : p,
        ),
      };
    case 'QA_REPLACE_ONE_START':
      return { ...state, qaLoadingIndex: action.index, qaError: null };
    case 'QA_REPLACE_ONE_SUCCESS':
      return {
        ...state,
        qaLoadingIndex: null,
        qaError: null,
        qaPairs: state.qaPairs.map((p, i) =>
          i === action.index ? { question: action.question, answer: '' } : p,
        ),
      };
    case 'QA_REPLACE_ONE_ERROR':
      return { ...state, qaLoadingIndex: null, qaError: action.error };
    case 'QA_APPEND_ONE_START':
      return { ...state, qaAppending: true, qaError: null };
    case 'QA_APPEND_ONE_SUCCESS':
      return {
        ...state,
        qaAppending: false,
        qaError: null,
        qaPairs: [...state.qaPairs, { question: action.question, answer: '' }],
      };
    case 'QA_APPEND_ONE_ERROR':
      return { ...state, qaAppending: false, qaError: action.error };
    case 'QA_DELETE_ONE':
      return {
        ...state,
        qaPairs: state.qaPairs.filter((_, i) => i !== action.index),
      };
    case 'REFRESH_PICKERS':
      return {
        ...state,
        tagKey: state.tagKey + 1,
        emotionKey: state.emotionKey + 1,
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
  const [isGeneratingEmotions, setIsGeneratingEmotions] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const initialTagColors = Object.fromEntries(
    (entry?.version.tags ?? []).map((t) => [t.display_name, t.color]),
  );
  const initialEmotionColors = Object.fromEntries(
    (entry?.version.emotions ?? []).map((e) => [e.display_name, e.color]),
  );
  const initialEmotionEmojis = Object.fromEntries(
    (entry?.version.emotions ?? [])
      .filter((e): e is typeof e & { emoji: string } => Boolean(e.emoji))
      .map((e) => [e.display_name, e.emoji]),
  );

  const [state, dispatch] = useReducer(formReducer, {
    entryDate: entry?.version.entry_date ?? defaultDate ?? todayStr,
    textValue: entry?.version.text ?? '',
    moodScore: entry?.version.mood_score ?? undefined,
    energyScore: entry?.version.energy_score ?? undefined,
    tags: entry?.version.tags.map((t) => t.display_name) ?? [],
    tagKey: 0,
    emotions: entry?.version.emotions.map((e) => e.display_name) ?? [],
    emotionKey: 0,
    qaPairs:
      entry?.version.qa_pairs.map((qa) => ({
        question: qa.question,
        answer: qa.answer,
      })) ?? [],
    qaLoading: false,
    qaLoadingIndex: null,
    qaAppending: false,
    qaError: null,
  });

  function resetForm() {
    dispatch({ type: 'RESET', todayStr });
  }

  function handleClear() {
    dispatch({ type: 'RESET', todayStr });
    localStorage.removeItem(DRAFT_KEY);
    setConfirmClearOpen(false);
  }

  // Restore draft on mount (new entries only).
  // Single dispatch keeps the state update atomic — no separate setState needed.
  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draftSchema = z.object({
        text: z.string().optional(),
        mood: z.number().nullable().optional(),
        energy: z.number().nullable().optional(),
        date: z.string().optional(),
        tags: z.string().array().optional(),
        emotions: z.string().array().optional(),
        qaPairs: z
          .object({ question: z.string(), answer: z.string() })
          .array()
          .optional(),
        savedAt: z.number().optional(),
      });
      const parsed = draftSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return;
      const d = parsed.data;
      if (
        !d.text &&
        d.mood == null &&
        d.energy == null &&
        !d.date &&
        !d.tags?.length &&
        !d.emotions?.length &&
        !d.qaPairs?.length
      )
        return;
      if (d.savedAt && Date.now() - d.savedAt > 24 * 60 * 60 * 1000) return;
      dispatch({
        type: 'RESTORE_DRAFT',
        text: d.text ?? '',
        moodScore: d.mood ?? undefined,
        energyScore: d.energy ?? undefined,
        date: d.date,
        tags: d.tags?.length ? d.tags : undefined,
        emotions: d.emotions?.length ? d.emotions : undefined,
        qaPairs: d.qaPairs?.length ? d.qaPairs : undefined,
      });
    } catch {
      /* ignore malformed draft */
    }
  }, [isEdit]);

  // Auto-save draft to localStorage (new entries only, debounced 2s)
  useEffect(() => {
    if (isEdit) return;
    const hasContent =
      state.textValue ||
      state.moodScore !== undefined ||
      state.energyScore !== undefined ||
      state.entryDate !== todayStr ||
      state.tags.length > 0 ||
      state.emotions.length > 0 ||
      state.qaPairs.length > 0;
    if (!hasContent) return;
    if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    draftSaveRef.current = setTimeout(() => {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          text: state.textValue,
          mood: state.moodScore ?? null,
          energy: state.energyScore ?? null,
          date: state.entryDate,
          tags: state.tags,
          emotions: state.emotions,
          qaPairs: state.qaPairs,
          savedAt: Date.now(),
        }),
      );
    }, 2000);
    return () => {
      if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    };
  }, [state.textValue, state.moodScore, state.energyScore, state.entryDate, state.tags, state.emotions, state.qaPairs, isEdit, todayStr]);

  async function handleGenerateEmotions() {
    setIsGeneratingEmotions(true);
    try {
      const res = await fetch('/api/ai/emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentEmotions: state.emotions,
          entryContent: state.textValue.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { emotions?: string[]; error?: string }
        | null;
      if (!res.ok || !data) {
        toast.error(data?.error ?? 'Hálózati hiba történt');
        return;
      }
      if (!data.emotions || !Array.isArray(data.emotions)) {
        toast.error(data?.error ?? 'Hálózati hiba történt');
        return;
      }
      const capitalized = data.emotions.map((e) => e.charAt(0).toUpperCase() + e.slice(1));
      dispatch({ type: 'EMOTIONS_AI_ADD', newEmotions: capitalized });
    } catch {
      toast.error('Hálózati hiba történt');
    } finally {
      setIsGeneratingEmotions(false);
    }
  }

  async function handleFetchQuestions(opts?: { existingQuestions?: string[] }) {
    dispatch({ type: 'QA_REQUEST_START' });
    try {
      const trimmed = state.textValue.trim();
      const res = await fetch('/api/ai/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todayText: trimmed || undefined,
          existingQuestions: opts?.existingQuestions,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { questions?: string[]; error?: string }
        | null;
      if (!res.ok || !data) {
        dispatch({
          type: 'QA_REQUEST_ERROR',
          error: data?.error ?? 'Hálózati hiba történt',
        });
        return;
      }
      if (!data.questions || !Array.isArray(data.questions)) {
        dispatch({ type: 'QA_REQUEST_ERROR', error: data.error ?? 'Hálózati hiba történt' });
        return;
      }
      dispatch({ type: 'QA_REQUEST_SUCCESS', questions: data.questions });
    } catch {
      dispatch({ type: 'QA_REQUEST_ERROR', error: 'Hálózati hiba történt' });
    }
  }

  function handleRegenerateQuestions() {
    const hasAnswers = state.qaPairs.some((p) => p.answer.trim().length > 0);
    if (hasAnswers) {
      const ok = window.confirm('A meglévő válaszaid elvesznek. Biztos?');
      if (!ok) return;
    }
    // Send current questions so the AI gives a substantively different set.
    const existingQuestions = state.qaPairs.map((p) => p.question);
    handleFetchQuestions({ existingQuestions });
  }

  async function handleRegenerateOne(index: number) {
    const target = state.qaPairs[index];
    if (!target) return;
    if (target.answer.trim().length > 0) {
      const ok = window.confirm('A válaszod ehhez a kérdéshez elveszik. Biztos?');
      if (!ok) return;
    }
    dispatch({ type: 'QA_REPLACE_ONE_START', index });
    try {
      const trimmed = state.textValue.trim();
      // Tell the AI not to duplicate the questions in the OTHER slots
      // (and also not the one being replaced).
      const existingQuestions = state.qaPairs.map((p) => p.question);
      const res = await fetch('/api/ai/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todayText: trimmed || undefined,
          count: 1,
          existingQuestions,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { questions?: string[]; error?: string }
        | null;
      if (!res.ok || !data) {
        dispatch({
          type: 'QA_REPLACE_ONE_ERROR',
          error: data?.error ?? 'Hálózati hiba történt',
        });
        return;
      }
      const newQ = data.questions?.[0];
      if (!newQ) {
        dispatch({ type: 'QA_REPLACE_ONE_ERROR', error: data.error ?? 'Hálózati hiba történt' });
        return;
      }
      dispatch({ type: 'QA_REPLACE_ONE_SUCCESS', index, question: newQ });
    } catch {
      dispatch({ type: 'QA_REPLACE_ONE_ERROR', error: 'Hálózati hiba történt' });
    }
  }

  async function handleAppendOne() {
    dispatch({ type: 'QA_APPEND_ONE_START' });
    try {
      const trimmed = state.textValue.trim();
      const existingQuestions = state.qaPairs.map((p) => p.question);
      const res = await fetch('/api/ai/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          todayText: trimmed || undefined,
          count: 1,
          existingQuestions,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { questions?: string[]; error?: string }
        | null;
      if (!res.ok || !data) {
        dispatch({
          type: 'QA_APPEND_ONE_ERROR',
          error: data?.error ?? 'Hálózati hiba történt',
        });
        return;
      }
      const newQ = data.questions?.[0];
      if (!newQ) {
        dispatch({ type: 'QA_APPEND_ONE_ERROR', error: data.error ?? 'Hálózati hiba történt' });
        return;
      }
      dispatch({ type: 'QA_APPEND_ONE_SUCCESS', question: newQ });
    } catch {
      dispatch({ type: 'QA_APPEND_ONE_ERROR', error: 'Hálózati hiba történt' });
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors([]);

    const payload = {
      entry_date: state.entryDate,
      text: state.textValue,
      mood_score: state.moodScore,
      energy_score: state.energyScore,
      tags: JSON.stringify(state.tags),
      emotions: JSON.stringify(state.emotions),
    };

    const filledQaPairs = state.qaPairs
      .map((p, i) => ({ position: i, question: p.question, answer: p.answer.trim() }))
      .filter((p) => p.answer.length > 0);

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
      state.tags.length === 0 &&
      state.emotions.length === 0;
    if (isEmpty && !isEdit) {
      resetForm();
      return;
    }

    const clientId = isEdit ? undefined : createId();
    const payloadWithQa =
      filledQaPairs.length > 0 ? { ...payload, qa_pairs: filledQaPairs } : payload;
    const body = isEdit
      ? JSON.stringify({
          action: 'updateEntry',
          payload: { ...payloadWithQa, entry_id: entry!.id },
          clientId,
        })
      : JSON.stringify({ action: 'createEntry', payload: payloadWithQa, clientId });

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
          resetForm();
          localStorage.removeItem(DRAFT_KEY);
        } else {
          dispatch({ type: 'REFRESH_PICKERS' });
        }
        onSuccess?.();
      } else if (data.ok) {
        router.refresh();
        if (!isEdit) {
          resetForm();
          localStorage.removeItem(DRAFT_KEY);
        } else {
          dispatch({ type: 'REFRESH_PICKERS' });
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
          const pendingSchema = z.string().array();
          const parsedQueue = pendingSchema.safeParse(JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? '[]'));
          const pending = parsedQueue.success ? parsedQueue.data : [];
          pending.push(body);
          localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(pending));
        } catch {
          /* ignore storage errors */
        }
        toast('Saved offline — will sync when connected', { duration: 4000 });
        if (!isEdit) {
          resetForm();
          localStorage.removeItem(DRAFT_KEY);
        } else {
          dispatch({ type: 'REFRESH_PICKERS' });
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
      {/* Header: label + version + template picker + date picker */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <span className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            {isEdit ? 'Edit entry' : 'New entry'}
          </span>
          {isEdit && entry && (
            <Link
              href={`/entry/${entry.id}/history`}
              className='inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            >
              <HistoryIcon className='size-3' />
              v{entry.version.version_number}
            </Link>
          )}
          {!isEdit && (
            <TemplateSelector
              templates={templates}
              onSelect={(t) => dispatch({ type: 'APPLY_TEMPLATE', template: t })}
            />
          )}
        </div>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
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
                if (day) {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  setCalendarOpen(false);
                  // Navigate to the chosen day so the server can load any existing
                  // entry for that date into the form (or render an empty new-entry form).
                  router.push(`/?date=${dateStr}`);
                }
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

      {/* AI questions */}
      <EntryQuestions
        pairs={state.qaPairs}
        loading={state.qaLoading}
        loadingIndex={state.qaLoadingIndex}
        appending={state.qaAppending}
        error={state.qaError}
        onFetch={() => handleFetchQuestions()}
        onRegenerate={handleRegenerateQuestions}
        onRegenerateOne={handleRegenerateOne}
        onAppendOne={handleAppendOne}
        onAnswerChange={(index, value) =>
          dispatch({ type: 'QA_ANSWER_CHANGE', index, value })
        }
        onDeleteOne={(index) => dispatch({ type: 'QA_DELETE_ONE', index })}
      />

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
          initialColors={initialTagColors}
          onValueChange={(tags) => dispatch({ type: 'SET_TAGS', tags })}
        />
      </div>

      {/* Emotions */}
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between'>
          <Label className='text-xs text-muted-foreground'>Emotions</Label>
          <Button
            type='button'
            variant='ghost'
            size='xs'
            onClick={handleGenerateEmotions}
            disabled={isGeneratingEmotions}
            className='text-muted-foreground'
          >
            <Sparkles className='size-3' />
            {isGeneratingEmotions ? 'Generálás…' : 'AI javaslat'}
          </Button>
        </div>
        <EmotionCombobox
          key={state.emotionKey}
          name='emotions'
          defaultValue={state.emotions}
          initialColors={initialEmotionColors}
          initialEmojis={initialEmotionEmojis}
          onValueChange={(emotions) => dispatch({ type: 'SET_EMOTIONS', emotions })}
        />
      </div>

      {/* Actions row */}
      <div className='flex items-center justify-between gap-2'>
        {errors.length > 0 ? (
          <p className='text-xs text-destructive'>{errors[0]}</p>
        ) : (
          <span />
        )}
        <div className='flex items-center gap-2'>
          {!isEdit && (
            <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
              <DialogTrigger render={<Button type='button' variant='ghost' size='sm' />}>
                Clear
              </DialogTrigger>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>Clear this entry?</DialogTitle>
                  <DialogDescription>
                    This will reset all fields and remove the saved draft.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant='outline' size='sm' />}>
                    Cancel
                  </DialogClose>
                  <Button size='sm' variant='destructive' onClick={handleClear}>
                    Clear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button type='submit' disabled={isPending} size='sm'>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}
          </Button>
        </div>
      </div>
    </form>
  );
}
