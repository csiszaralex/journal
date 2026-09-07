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
import type { EntryKind, EntryWithVersion } from '@/db/queries/entries';
import type { EntryTemplate } from '@/db/queries/templates';
import { useI18n } from '@/i18n/provider';
import { formatISODay, todayInAppTZ } from '@/lib/date';
import { cn } from '@/lib/utils';
import { entryInputSchema } from '@/lib/validation';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, HistoryIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useReducer, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createId } from '@paralleldrive/cuid2';
import { TagCombobox } from './TagCombobox';
import { EmotionCombobox } from './EmotionCombobox';
import { TemplateSelector } from './TemplateSelector';
import { EntryQuestions, type QaPair } from './EntryQuestions';
import { SummaryPeriodField } from './SummaryPeriodField';
import { OFFLINE_QUEUE_KEY } from '@/lib/offline';
import { suggestEmotionsAction } from '@/actions/emotions';
import { getEntryDatesAction } from '@/actions/entries';


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
  // Summary entries span periodStart..entryDate; unused (but still tracked) for daily.
  periodStart: string;
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
  // An edit draft found on mount and offered in the banner, waiting for the user to
  // accept or dismiss it. Lives in the reducer so applying it clears the offer in
  // the same atomic update that rewrites the form (see RESTORE_DRAFT). Always null
  // for new entries, which adopt their draft silently instead of asking.
  pendingDraft: DraftPayload | null;
};

type FormAction =
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_PERIOD'; from: string; to: string }
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
      periodStart: string | undefined;
      tags: string[] | undefined;
      emotions: string[] | undefined;
      qaPairs: QaPair[] | undefined;
    }
  | { type: 'QA_REQUEST_START' }
  | { type: 'QA_REQUEST_SUCCESS'; questions: string[] }
  | { type: 'QA_REQUEST_ERROR'; error: string }
  | { type: 'QA_ANSWER_CHANGE'; index: number; value: string }
  | { type: 'QA_QUESTION_CHANGE'; index: number; value: string }
  | { type: 'QA_REPLACE_ONE_START'; index: number }
  | { type: 'QA_REPLACE_ONE_SUCCESS'; index: number; question: string }
  | { type: 'QA_REPLACE_ONE_ERROR'; error: string }
  | { type: 'QA_APPEND_ONE_START' }
  | { type: 'QA_APPEND_ONE_SUCCESS'; question: string }
  | { type: 'QA_APPEND_ONE_ERROR'; error: string }
  | { type: 'QA_DELETE_ONE'; index: number }
  | { type: 'DRAFT_OFFERED'; draft: DraftPayload }
  | { type: 'DRAFT_DISMISSED' }
  | { type: 'REFRESH_PICKERS' };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_DATE':
      return { ...state, entryDate: action.date };
    case 'SET_PERIOD':
      return { ...state, periodStart: action.from, entryDate: action.to };
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
        // Collapse the period onto the reset date so periodStart <= entryDate holds.
        periodStart: action.todayStr,
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
        // Unreachable in edit mode (RESET only runs for new entries), but a reset
        // form has nothing left that a draft offer could belong to.
        pendingDraft: null,
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
        periodStart: action.periodStart ?? state.periodStart,
        tags: action.tags ?? state.tags,
        // Remount the picker for ANY list the draft supplies, including an empty
        // one — which only an edit draft can carry (the user removed every tag).
        // The pickers keep their selection internally, so without a new key they
        // would go on showing chips the restored state no longer has. New-entry
        // restores pass undefined for an empty list, so nothing changes for them.
        tagKey: action.tags ? state.tagKey + 1 : state.tagKey,
        emotions: action.emotions ?? state.emotions,
        emotionKey: action.emotions ? state.emotionKey + 1 : state.emotionKey,
        qaPairs: action.qaPairs ?? state.qaPairs,
        // Applying the draft answers the banner's question, so the offer goes away
        // in the same update that rewrites the form — no second render in between
        // where the banner still points at a draft that is already on screen.
        pendingDraft: null,
      };
    case 'DRAFT_OFFERED':
      return { ...state, pendingDraft: action.draft };
    case 'DRAFT_DISMISSED':
      return { ...state, pendingDraft: null };
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
    case 'QA_QUESTION_CHANGE':
      return {
        ...state,
        qaPairs: state.qaPairs.map((p, i) =>
          i === action.index ? { ...p, question: action.value } : p,
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
  initialEntryDates?: string[];
  kind?: EntryKind;
  defaultPeriodStart?: string;
}

const DRAFT_KEY_PREFIX = 'journal_entry_draft:';
// Summary drafts get their own namespace: a summary can end on a day that also
// has a daily entry, and the two must not overwrite each other's autosave.
//
// That namespace holds ONE fixed key rather than one per end date. A new
// summary's end date is form state that moves in place while the user trims the
// range, so a date-derived key would leave the draft written under the previous
// end date orphaned in storage — to be resurrected later into an unrelated form
// (and to drag its stale period start along with it). Only one unsaved new
// summary can exist at a time, since it lives on its own route, so a single key
// holds it and the period travels inside the payload instead of in the key.
//
// The daily branch keeps the original key format so pre-existing drafts still load.
const SUMMARY_DRAFT_KEY = `${DRAFT_KEY_PREFIX}summary:new`;
const draftKey = (kind: EntryKind, date: string) =>
  kind === 'summary' ? SUMMARY_DRAFT_KEY : `${DRAFT_KEY_PREFIX}${date}`;
// Edits get a third namespace, keyed by entry id. An entry's date is not enough:
// the daily draft for that same date belongs to a DIFFERENT (unsaved) entry, and a
// summary edit must not land in the single unsaved-summary slot either. The id also
// keeps the key stable while the form is open — nothing about it is form state.
const editDraftKey = (entryId: string) => `${DRAFT_KEY_PREFIX}entry:${entryId}`;

// The stored draft shape, shared by every mode — the autosave effect writes exactly
// this and the restore path validates against it. Every field stays optional so
// payloads written by earlier versions of this form still parse; baseVersion in
// particular is only ever written for edit drafts.
const draftSchema = z.object({
  text: z.string().optional(),
  mood: z.number().nullable().optional(),
  energy: z.number().nullable().optional(),
  tags: z.string().array().optional(),
  emotions: z.string().array().optional(),
  qaPairs: z
    .object({ question: z.string(), answer: z.string() })
    .array()
    .optional(),
  periodStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  entryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  baseVersion: z.number().optional(),
  savedAt: z.number().optional(),
});
type DraftPayload = z.infer<typeof draftSchema>;

// The period the draft's text was written for. Summary drafts live under a fixed
// key, so neither end can be re-derived from it — both travel in the payload and
// are restored together or not at all. Pairing a stale start with the end this form
// happened to open on would rebuild a range the user never chose, and could invert
// it into one the save path rejects. Daily entries have no period and keep their
// date from the route.
function draftPeriod(d: DraftPayload, isSummary: boolean) {
  return isSummary && d.periodStart && d.entryDate && d.periodStart <= d.entryDate
    ? { from: d.periodStart, to: d.entryDate }
    : null;
}

// The comparable content of an entry — everything the form can change that the
// server actually stores. Used to answer one question in three places: "does this
// differ from what is saved?", asked of the live form state, of a stored draft, and
// of what a save has just sent.
type EntrySnapshot = {
  text: string;
  mood: number | null;
  energy: number | null;
  tags: string[];
  emotions: string[];
  qaPairs: { question: string; answer: string }[];
  // Summaries only. A daily entry has no period, and its date cannot change from
  // the form — the date controls navigate to the other day instead of moving this
  // entry — so there is nothing to compare for one.
  period: { from: string; to: string } | null;
};

// Answers are trimmed on their way to the server and blank ones are dropped there
// (see handleSubmit), so only answered questions can differ from what is saved.
// Generating questions and leaving them unanswered is therefore not an unsaved
// change: it must not arm the unload prompt or strand a draft the next visit would
// ask about. Unanswered questions still travel in the draft payload, so restoring a
// draft written for some other reason brings them back with it.
const answeredPairs = (pairs: { question: string; answer: string }[]) =>
  pairs
    .map((p) => ({ question: p.question, answer: p.answer.trim() }))
    .filter((p) => p.answer.length > 0);

function versionSnapshot(version: EntryWithVersion['version']): EntrySnapshot {
  return {
    text: version.text,
    mood: version.mood_score,
    energy: version.energy_score,
    tags: version.tags.map((t) => t.display_name),
    emotions: version.emotions.map((e) => e.display_name),
    qaPairs: answeredPairs(version.qa_pairs),
    period:
      version.kind === 'summary' && version.period_start
        ? { from: version.period_start, to: version.entry_date }
        : null,
  };
}

function stateSnapshot(state: FormState, isSummary: boolean): EntrySnapshot {
  return {
    text: state.textValue,
    mood: state.moodScore ?? null,
    energy: state.energyScore ?? null,
    tags: state.tags,
    emotions: state.emotions,
    qaPairs: answeredPairs(state.qaPairs),
    period: isSummary ? { from: state.periodStart, to: state.entryDate } : null,
  };
}

function draftSnapshot(d: DraftPayload, isSummary: boolean): EntrySnapshot {
  return {
    text: d.text ?? '',
    mood: d.mood ?? null,
    energy: d.energy ?? null,
    tags: d.tags ?? [],
    emotions: d.emotions ?? [],
    qaPairs: answeredPairs(d.qaPairs ?? []),
    period: draftPeriod(d, isSummary),
  };
}

// Ordered comparison, deliberately: the form's initial state is built from these
// arrays in their stored order, so a reordered tag/emotion/question list is a real
// edit (the pickers support dragging) and deserves a draft.
function snapshotsEqual(a: EntrySnapshot, b: EntrySnapshot): boolean {
  return (
    a.text === b.text &&
    a.mood === b.mood &&
    a.energy === b.energy &&
    // Both null for a daily entry, so this collapses to true there.
    a.period?.from === b.period?.from &&
    a.period?.to === b.period?.to &&
    a.tags.length === b.tags.length &&
    a.tags.every((t, i) => t === b.tags[i]) &&
    a.emotions.length === b.emotions.length &&
    a.emotions.every((e, i) => e === b.emotions[i]) &&
    a.qaPairs.length === b.qaPairs.length &&
    a.qaPairs.every(
      (p, i) => p.question === b.qaPairs[i].question && p.answer === b.qaPairs[i].answer,
    )
  );
}

export function EntryForm({
  entry,
  onSuccess,
  templates = [],
  defaultDate,
  initialEntryDates = [],
  kind = 'daily',
  defaultPeriodStart,
}: EntryFormProps) {
  const d = useI18n();
  const isSummary = kind === 'summary';
  const isEdit = !!entry;
  // The journal's day, not the device's: a phone in another zone must still
  // default to (and reset to) the same day the server pages call today.
  const todayStr = todayInAppTZ();
  const draftSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // True once this mount's autosave effect has run once. Guards against the
  // autosave effect deleting a just-restored draft before the restore re-render
  // commits (both effects run on the same mount, restore's dispatch is async).
  const hydratedRef = useRef(false);
  // True once the draft restore has run for this mount. Restore is a mount-time
  // action, not a reaction to the end date: in summary mode entryDate is edited
  // in place, and re-running would overwrite what the user is typing now with
  // the draft saved under the date they just came back to.
  const restoredRef = useRef(false);
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isGeneratingEmotions, setIsGeneratingEmotions] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  // Set only after a NEW SUMMARY is queued offline: it stays on screen instead of
  // resetting, so this is what tells the user the save landed — and stops a second
  // submit from queueing a duplicate recap of the same period.
  const [offlineQueued, setOfflineQueued] = useState(false);

  // Dates (yyyy-MM-dd) known to have a saved entry, cached per month ("YYYY-MM").
  // Seeded with the selected month (preloaded server-side); other months are
  // fetched lazily as the date picker is paged.
  const initialMonthKey = (entry?.version.entry_date ?? defaultDate ?? todayStr).slice(0, 7);
  const [entryDatesByMonth, setEntryDatesByMonth] = useState<Record<string, Set<string>>>(
    () => ({ [initialMonthKey]: new Set(initialEntryDates) }),
  );
  const loadingMonthsRef = useRef<Set<string>>(new Set());

  async function ensureMonthLoaded(month: Date) {
    const key = format(month, 'yyyy-MM');
    if (entryDatesByMonth[key] || loadingMonthsRef.current.has(key)) return;
    loadingMonthsRef.current.add(key);
    try {
      const res = await getEntryDatesAction({ month: key });
      const dates = res?.data ?? [];
      setEntryDatesByMonth((prev) => ({ ...prev, [key]: new Set(dates) }));
    } finally {
      loadingMonthsRef.current.delete(key);
    }
  }

  // A day is "empty" only once its month is loaded and it has no entry — so days
  // in not-yet-loaded months don't flash dimmed before data arrives.
  const isEmptyDay = (date: Date) => {
    const set = entryDatesByMonth[format(date, 'yyyy-MM')];
    return set ? !set.has(format(date, 'yyyy-MM-dd')) : false;
  };

  const initialTagColors = Object.fromEntries(
    (entry?.version.tags ?? []).map((t) => [t.display_name, t.color]),
  );
  const [emotionColorMap, setEmotionColorMap] = useState<Record<string, string>>(
    () => Object.fromEntries((entry?.version.emotions ?? []).map((e) => [e.display_name, e.color])),
  );
  const [emotionEmojiMap, setEmotionEmojiMap] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        (entry?.version.emotions ?? [])
          .filter((e): e is typeof e & { emoji: string } => Boolean(e.emoji))
          .map((e) => [e.display_name, e.emoji]),
      ),
  );

  const [state, dispatch] = useReducer(formReducer, {
    entryDate: entry?.version.entry_date ?? defaultDate ?? todayStr,
    periodStart:
      entry?.version.period_start ??
      defaultPeriodStart ??
      entry?.version.entry_date ??
      defaultDate ??
      todayStr,
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
    pendingDraft: null,
  });

  // What the entry prop says the server holds, recomputed when a refresh delivers a
  // new version. Null for new entries — they have nothing to be dirty against.
  const loadedSnapshot = useMemo(() => (entry ? versionSnapshot(entry.version) : null), [entry]);

  // What a successful save has just sent, tagged with the version the form was
  // showing when it went out. router.refresh() only delivers the new version a
  // moment later, and until it lands the form would still be compared against the
  // OLD one — looking dirty, arming the unload warning and autosaving a draft for
  // changes that are already saved. The tag makes this self-expiring: as soon as the
  // prop moves past that version number the real snapshot takes over again, so a
  // newer version arriving from anywhere else is never masked.
  const [justSaved, setJustSaved] = useState<{
    afterVersion: number;
    snapshot: EntrySnapshot;
  } | null>(null);
  const savedSnapshot =
    entry && justSaved && justSaved.afterVersion === entry.version.version_number
      ? justSaved.snapshot
      : loadedSnapshot;

  // Note there is no "has content" test here: emptying a saved entry's text is a
  // legitimate edit worth keeping a draft for, and content that matches the entry
  // is worth nothing. Only difference matters.
  const isDirty = !!savedSnapshot && !snapshotsEqual(stateSnapshot(state, isSummary), savedSnapshot);

  // The single source of truth for which key this form owns. The save effect, the
  // restore path, discardDraft and handleClear all go through it, so the edit and
  // new-entry modes can never read, overwrite or clear each other's draft.
  const currentDraftKey = entry ? editDraftKey(entry.id) : draftKey(kind, state.entryDate);

  function resetForm() {
    dispatch({ type: 'RESET', todayStr });
  }

  // Drop the draft for the current key and cancel any autosave still pending —
  // a debounced write landing afterwards would resurrect what was just discarded.
  function discardDraft() {
    if (draftSaveRef.current) {
      clearTimeout(draftSaveRef.current);
      draftSaveRef.current = null;
    }
    localStorage.removeItem(currentDraftKey);
  }

  function handleClear() {
    discardDraft();
    dispatch({ type: 'RESET', todayStr });
    setOfflineQueued(false);
    setConfirmClearOpen(false);
  }

  // Both offline paths land here: the one the service worker reports back
  // (data.offline) and the catch fallback that queues the request itself.
  //
  // A queued summary has no server id, so the online redirect to /entry/{id} is
  // unavailable — but resetting would produce exactly what that redirect exists to
  // avoid: a blank today→today form with no sign the save worked. The composed
  // text and range stay on screen instead, marked as queued. Daily entries and
  // edits keep their previous behaviour verbatim.
  function handleOfflineSaved() {
    if (isEdit) {
      toast(d.entry.form.savedOffline, { duration: 4000 });
      // The draft stays deliberately: the update is only QUEUED, not persisted, and
      // the entry on the server is still the old version. Until the queue drains,
      // that draft is the only copy of these edits — and since the form still
      // differs from the saved entry, autosave keeps it current on its own.
      dispatch({ type: 'REFRESH_PICKERS' });
    } else if (isSummary) {
      toast(d.entry.form.summaryQueued, { duration: 4000 });
      // The recap is queued, so the draft has done its job; dropping it also keeps
      // the next visit to /summary/new from restoring text that is already saved.
      discardDraft();
      setOfflineQueued(true);
    } else {
      toast(d.entry.form.savedOffline, { duration: 4000 });
      discardDraft();
      resetForm();
    }
    onSuccess?.();
  }

  // Apply a stored draft to the form. Both modes go through the one RESTORE_DRAFT
  // action; only the trigger differs — automatic on mount for a new entry, the
  // banner's button for an edit.
  const applyDraft = useCallback(
    (d: DraftPayload) => {
      const range = draftPeriod(d, isSummary);
      dispatch({
        type: 'RESTORE_DRAFT',
        text: d.text ?? '',
        moodScore: d.mood ?? undefined,
        energyScore: d.energy ?? undefined,
        date: range?.to,
        periodStart: range?.from,
        // An edit draft says exactly which lists it holds, empty ones included: the
        // user may have deleted every tag, and `?? state.tags` would quietly put
        // them back. A new-entry draft has nothing to undo, so an empty list stays
        // undefined there and the reducer keeps the current (also empty) value.
        tags: isEdit ? (d.tags ?? []) : d.tags?.length ? d.tags : undefined,
        emotions: isEdit ? (d.emotions ?? []) : d.emotions?.length ? d.emotions : undefined,
        qaPairs: isEdit ? (d.qaPairs ?? []) : d.qaPairs?.length ? d.qaPairs : undefined,
      });
    },
    [isEdit, isSummary],
  );

  // Take the draft the banner is offering. Its content is read from state, not from
  // localStorage: autosave may have overwritten the key in the meantime with the
  // edits made while the banner was up, and what was offered is what must be applied.
  function handleRestoreDraft() {
    if (state.pendingDraft) applyDraft(state.pendingDraft);
  }

  function handleDismissDraft() {
    discardDraft();
    dispatch({ type: 'DRAFT_DISMISSED' });
  }

  // Handle the stored draft on mount.
  //
  // New entry: adopt it silently — scoped to the selected day for a daily entry, to
  // the single unsaved-summary slot for a summary. A single dispatch keeps the state
  // update atomic.
  //
  // Edit: never adopt it silently. The saved entry is what the user is looking at,
  // so replacing it with older text unasked would read as data loss. The draft is
  // only OFFERED, via the banner, and applied when the user says so.
  useEffect(() => {
    // Once per mount only. In daily mode the date changes by navigation, which
    // remounts anyway; in summary mode it changes in place, and a second run
    // would restore a stale draft over the text being written.
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(currentDraftKey);
      if (!raw) return;
      const parsed = draftSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return;
      const d = parsed.data;
      if (isEdit) {
        // A draft that matches the entry as saved has nothing to recover — it is
        // what a write that raced the save left behind. Drop it rather than asking
        // the user about a no-op change.
        if (savedSnapshot && snapshotsEqual(draftSnapshot(d, isSummary), savedSnapshot)) {
          localStorage.removeItem(currentDraftKey);
          return;
        }
        dispatch({ type: 'DRAFT_OFFERED', draft: d });
        return;
      }
      if (
        !d.text &&
        d.mood == null &&
        d.energy == null &&
        !d.tags?.length &&
        !d.emotions?.length &&
        !d.qaPairs?.length
      )
        return;
      applyDraft(d);
    } catch {
      /* ignore malformed draft */
    }
  }, [isEdit, isSummary, currentDraftKey, savedSnapshot, applyDraft]);

  // Auto-save draft to localStorage (debounced 2s). The key is the day for a new
  // daily entry, the fixed summary slot for a new summary — so editing the range can
  // no longer strand a draft under a key nothing clears — and the entry id for an
  // edit.
  //
  // What counts as worth saving differs per mode: a new entry needs content, an edit
  // needs to DIFFER from the entry as saved. Emptying a saved entry's text is a real
  // change to protect, and text that matches the entry protects nothing.
  useEffect(() => {
    // Skip the first run of this mount: the restore effect runs first but its
    // dispatch has not committed yet, so state still looks like the empty form (new)
    // or the pristine entry (edit). Acting now would delete the draft the restore
    // path is about to load or offer.
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    const key = currentDraftKey;
    if (isEdit) {
      if (!isDirty) {
        // The banner is still up, so the user has not answered it yet: an untouched
        // form matching the entry is the expected state while they decide, and
        // deleting the key here would pull the offer out from under them on the very
        // next render (a picker re-emitting its value is enough to re-run this).
        if (state.pendingDraft) return;
        // Edits undone — what is on screen is what is saved, nothing left to recover.
        localStorage.removeItem(key);
        return;
      }
    } else {
      const hasContent =
        state.textValue ||
        state.moodScore !== undefined ||
        state.energyScore !== undefined ||
        state.tags.length > 0 ||
        state.emotions.length > 0 ||
        state.qaPairs.length > 0;
      if (!hasContent) {
        // Day cleared of content — drop any stale draft so it reopens clean.
        localStorage.removeItem(key);
        return;
      }
    }
    if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    draftSaveRef.current = setTimeout(() => {
      localStorage.setItem(
        key,
        JSON.stringify({
          text: state.textValue,
          mood: state.moodScore ?? null,
          energy: state.energyScore ?? null,
          tags: state.tags,
          emotions: state.emotions,
          qaPairs: state.qaPairs,
          // Persisted only for summaries: their key is fixed, so both ends of the
          // period have to travel with the text — otherwise a reload would pair the
          // restored text with a period the user never picked. Both stay undefined
          // for daily drafts, so JSON.stringify omits them and the stored daily
          // payload is unchanged.
          periodStart: isSummary ? state.periodStart : undefined,
          entryDate: isSummary ? state.entryDate : undefined,
          // Edit drafts only: the version the edits were written on top of, so a
          // later restore can say the entry has moved on since (saved from another
          // tab or device). Undefined for new entries, so their payload is unchanged.
          baseVersion: entry?.version.version_number,
          savedAt: Date.now(),
        }),
      );
    }, 2000);
    return () => {
      if (draftSaveRef.current) clearTimeout(draftSaveRef.current);
    };
  }, [state.textValue, state.moodScore, state.energyScore, state.entryDate, state.periodStart, state.tags, state.emotions, state.qaPairs, state.pendingDraft, isEdit, isDirty, isSummary, currentDraftKey, entry]);

  // Warn on tab close / reload while an edit has unsaved changes. The draft itself
  // survives either way; the prompt is the only thing that can stop the user from
  // walking away without realising. New entries get no prompt: their draft is
  // restored automatically on the next visit, so there is nothing to warn about.
  useEffect(() => {
    if (!isEdit || !isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // preventDefault is what triggers the prompt in current browsers; returnValue
      // keeps older ones asking too.
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEdit, isDirty]);

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
        toast.error(data?.error ?? d.common.networkError);
        return;
      }
      if (!data.emotions || !Array.isArray(data.emotions)) {
        toast.error(data?.error ?? d.common.networkError);
        return;
      }
      const capitalized = data.emotions.map((e) => e.charAt(0).toUpperCase() + e.slice(1));

      // Fetch color/emoji metadata for AI-suggested emotions so chips render with color immediately
      const fetched = await Promise.all(capitalized.map((name) => suggestEmotionsAction({ prefix: name })));
      const newColors: Record<string, string> = {};
      const newEmojis: Record<string, string> = {};
      for (let i = 0; i < capitalized.length; i++) {
        const items = fetched[i]?.data ?? [];
        const match = items.find((e) => e.display_name.toLowerCase() === capitalized[i].toLowerCase());
        if (match) {
          newColors[capitalized[i]] = match.color;
          if (match.emoji) newEmojis[capitalized[i]] = match.emoji;
        }
      }
      if (Object.keys(newColors).length > 0) setEmotionColorMap((prev) => ({ ...prev, ...newColors }));
      if (Object.keys(newEmojis).length > 0) setEmotionEmojiMap((prev) => ({ ...prev, ...newEmojis }));

      dispatch({ type: 'EMOTIONS_AI_ADD', newEmotions: capitalized });
    } catch {
      toast.error(d.common.networkError);
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
          referenceDate: state.entryDate,
          mode: kind,
          periodStart: isSummary ? state.periodStart : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { questions?: string[]; error?: string }
        | null;
      if (!res.ok || !data) {
        dispatch({
          type: 'QA_REQUEST_ERROR',
          error: data?.error ?? d.common.networkError,
        });
        return;
      }
      if (!data.questions || !Array.isArray(data.questions)) {
        dispatch({ type: 'QA_REQUEST_ERROR', error: data.error ?? d.common.networkError });
        return;
      }
      dispatch({ type: 'QA_REQUEST_SUCCESS', questions: data.questions });
    } catch {
      dispatch({ type: 'QA_REQUEST_ERROR', error: d.common.networkError });
    }
  }

  function handleRegenerateQuestions() {
    const hasAnswers = state.qaPairs.some((p) => p.answer.trim().length > 0);
    if (hasAnswers) {
      const ok = window.confirm(d.entry.form.confirmRegenerateAll);
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
      const ok = window.confirm(d.entry.form.confirmRegenerateOne);
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
          referenceDate: state.entryDate,
          mode: kind,
          periodStart: isSummary ? state.periodStart : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { questions?: string[]; error?: string }
        | null;
      if (!res.ok || !data) {
        dispatch({
          type: 'QA_REPLACE_ONE_ERROR',
          error: data?.error ?? d.common.networkError,
        });
        return;
      }
      const newQ = data.questions?.[0];
      if (!newQ) {
        dispatch({ type: 'QA_REPLACE_ONE_ERROR', error: data.error ?? d.common.networkError });
        return;
      }
      dispatch({ type: 'QA_REPLACE_ONE_SUCCESS', index, question: newQ });
    } catch {
      dispatch({ type: 'QA_REPLACE_ONE_ERROR', error: d.common.networkError });
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
          referenceDate: state.entryDate,
          mode: kind,
          periodStart: isSummary ? state.periodStart : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { questions?: string[]; error?: string }
        | null;
      if (!res.ok || !data) {
        dispatch({
          type: 'QA_APPEND_ONE_ERROR',
          error: data?.error ?? d.common.networkError,
        });
        return;
      }
      const newQ = data.questions?.[0];
      if (!newQ) {
        dispatch({ type: 'QA_APPEND_ONE_ERROR', error: data.error ?? d.common.networkError });
        return;
      }
      dispatch({ type: 'QA_APPEND_ONE_SUCCESS', question: newQ });
    } catch {
      dispatch({ type: 'QA_APPEND_ONE_ERROR', error: d.common.networkError });
    }
  }

  // Ctrl/Cmd+Enter from any field in the form triggers a save. Lives on the
  // <form> so it catches keystrokes bubbling up from the textarea and answer fields.
  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.requestSubmit();
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
      // Always sent explicitly: an omitted `kind` resolves to 'daily' server-side,
      // which would reject a payload that carries a period_start.
      kind,
      period_start: isSummary ? state.periodStart : null,
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
      state.emotions.length === 0 &&
      filledQaPairs.length === 0;
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
        id?: string;
      };

      if (data.ok && data.offline) {
        handleOfflineSaved();
      } else if (data.ok) {
        router.refresh();
        if (!isEdit) {
          discardDraft();
          // A new summary is written on its own route, so resetting would leave
          // a blank today→today form with no sign the save worked. Land on the
          // saved entry instead. Daily entries stay put: the home page re-keys
          // the form on the saved entry's id.
          if (isSummary && data.id) {
            toast(d.entry.form.summarySaved);
            router.push(`/entry/${data.id}`);
          } else {
            resetForm();
          }
        } else {
          // The edits are persisted now, so the draft has nothing left to protect —
          // and a banner still offering it would be lying about what is unsaved.
          discardDraft();
          // Compare against what was just sent rather than the version still in the
          // prop, so the form stops counting as dirty immediately and nothing
          // rewrites the key that was just cleared. Same snapshot rules as the
          // dirty check, which already mirror what the server stores.
          setJustSaved({
            afterVersion: entry!.version.version_number,
            snapshot: stateSnapshot(state, isSummary),
          });
          dispatch({ type: 'DRAFT_DISMISSED' });
          dispatch({ type: 'REFRESH_PICKERS' });
        }
        onSuccess?.();
      } else {
        setErrors([data.error ?? d.common.unexpectedError]);
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
        handleOfflineSaved();
      } else {
        setErrors([d.common.networkError]);
      }
    } finally {
      setIsPending(false);
    }
  }

  const calendarDate = new Date(state.entryDate + 'T00:00:00');

  // The draft banner's text. The longer wording is used only when the entry moved
  // on since the draft was written — saved from another tab or device, or synced
  // from the offline queue. Restoring is still allowed, but it overwrites work the
  // draft never saw, so that version names both. Two whole sentences rather than
  // one with a clause appended: a language may want the warning somewhere else in
  // it entirely.
  const draftBannerText =
    entry &&
    state.pendingDraft?.baseVersion !== undefined &&
    state.pendingDraft.baseVersion !== entry.version.version_number
      ? d.entry.form.draftBannerOutdated(
          state.pendingDraft.baseVersion,
          entry.version.version_number,
        )
      : d.entry.form.draftBanner;

  // Shift the entry date by ±1 day. Navigates the same way picking a day in the
  // calendar does, so the server loads any existing entry for the new date.
  function shiftDate(days: number) {
    const next = format(addDays(calendarDate, days), 'yyyy-MM-dd');
    router.push(`/?date=${next}`);
  }

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className='flex flex-col gap-4'>
      {/* Header: label + version + template picker + date picker */}
      <div className='flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <span className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            {isSummary
              ? isEdit
                ? d.entry.form.heading.editSummary
                : d.entry.form.heading.newSummary
              : isEdit
                ? d.entry.form.heading.editEntry
                : d.entry.form.heading.newEntry}
          </span>
          {isEdit && entry && (
            <Link
              href={`/entry/${entry.id}/history`}
              className='inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            >
              <HistoryIcon className='size-3' />
              {d.common.versionLabel(entry.version.version_number)}
            </Link>
          )}
          {!isEdit && (
            <TemplateSelector
              templates={templates}
              onSelect={(t) => dispatch({ type: 'APPLY_TEMPLATE', template: t })}
            />
          )}
        </div>
        {isSummary ? (
          // A summary's range is form state, not a route — so no ±1-day navigation here.
          <SummaryPeriodField
            from={state.periodStart}
            to={state.entryDate}
            onChange={({ from, to }) => dispatch({ type: 'SET_PERIOD', from, to })}
            disabled={isPending}
          />
        ) : (
          <div className='flex items-center gap-0.5'>
            <button
              type='button'
              onClick={() => shiftDate(-1)}
              aria-label={d.entry.form.previousDay}
              className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            >
              <ChevronLeftIcon className='size-4' />
            </button>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger
                type='button'
                className='inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
              >
                <CalendarIcon className='size-3' />
                {formatISODay(state.entryDate, d.dates.dayInput, d.dates.locale)}
              </PopoverTrigger>
              <PopoverContent className='w-auto p-0' align='end'>
                <Calendar
                  mode='single'
                  locale={d.dates.locale}
                  selected={calendarDate}
                  defaultMonth={calendarDate}
                  onMonthChange={ensureMonthLoaded}
                  modifiers={{ empty: isEmptyDay }}
                  modifiersClassNames={{ empty: '[&_button]:text-muted-foreground/50' }}
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
            <button
              type='button'
              onClick={() => shiftDate(1)}
              aria-label={d.entry.form.nextDay}
              className='inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground'
            >
              <ChevronRightIcon className='size-4' />
            </button>
          </div>
        )}
      </div>

      {/* Unsaved-changes offer (edit only) — never applied without being asked for. */}
      {state.pendingDraft && (
        <div className='flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2'>
          <p className='text-xs text-muted-foreground'>{draftBannerText}</p>
          <div className='flex items-center gap-1.5'>
            <Button type='button' variant='outline' size='xs' onClick={handleRestoreDraft}>
              {d.entry.form.restoreDraft}
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='xs'
              onClick={handleDismissDraft}
              className='text-muted-foreground'
            >
              {d.entry.form.dismissDraft}
            </Button>
          </div>
        </div>
      )}

      {/* Textarea */}
      <div>
        <Textarea
          name='text'
          value={state.textValue}
          onChange={(e) => dispatch({ type: 'SET_TEXT', text: e.target.value })}
          placeholder={d.entry.form.textPlaceholder}
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
        onQuestionChange={(index, value) =>
          dispatch({ type: 'QA_QUESTION_CHANGE', index, value })
        }
        onDeleteOne={(index) => dispatch({ type: 'QA_DELETE_ONE', index })}
      />

      {/* Mood */}
      <div className='flex items-center gap-3'>
        <Label
          className={cn('shrink-0 text-xs text-muted-foreground', isSummary ? 'w-40' : 'w-14')}
        >
          {d.entry.form.moodLabel(isSummary)}
        </Label>
        <div className='flex gap-1.5'>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type='button'
              onClick={() =>
                dispatch({ type: 'SET_MOOD', score: state.moodScore === s ? undefined : s })
              }
              className={cn(
                'size-7 cursor-pointer rounded-full border text-xs font-medium transition-all',
                state.moodScore === s
                  ? SCORE_COLORS[s]
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Energy */}
      <div className='flex items-center gap-3'>
        <Label
          className={cn('shrink-0 text-xs text-muted-foreground', isSummary ? 'w-40' : 'w-14')}
        >
          {d.entry.form.energyLabel(isSummary)}
        </Label>
        <div className='flex gap-1.5'>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type='button'
              onClick={() =>
                dispatch({ type: 'SET_ENERGY', score: state.energyScore === s ? undefined : s })
              }
              className={cn(
                'size-7 cursor-pointer rounded-full border text-xs font-medium transition-all',
                state.energyScore === s
                  ? SCORE_COLORS[s]
                  : 'border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className='flex flex-col gap-1.5'>
        <Label className='text-xs text-muted-foreground'>{d.entry.form.tagsLabel}</Label>
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
          <Label className='text-xs text-muted-foreground'>{d.entry.form.emotionsLabel}</Label>
          <Button
            type='button'
            variant='ghost'
            size='xs'
            onClick={handleGenerateEmotions}
            disabled={isGeneratingEmotions}
            className='text-muted-foreground'
          >
            <Sparkles className='size-3' />
            {isGeneratingEmotions ? d.common.generating : d.entry.form.aiSuggest}
          </Button>
        </div>
        <EmotionCombobox
          key={state.emotionKey}
          name='emotions'
          defaultValue={state.emotions}
          initialColors={emotionColorMap}
          initialEmojis={emotionEmojiMap}
          onValueChange={(emotions) => dispatch({ type: 'SET_EMOTIONS', emotions })}
        />
      </div>

      {/* Actions row */}
      <div className='flex items-center justify-between gap-2'>
        {errors.length > 0 ? (
          <p className='text-xs text-destructive'>{errors[0]}</p>
        ) : offlineQueued ? (
          // Only reachable for a new summary saved offline — see handleOfflineSaved.
          <p className='text-xs text-muted-foreground'>{d.entry.form.summaryQueuedNotice}</p>
        ) : (
          <span />
        )}
        <div className='flex items-center gap-2'>
          {!isEdit && (
            <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
              <DialogTrigger render={<Button type='button' variant='ghost' size='sm' />}>
                {d.common.clear}
              </DialogTrigger>
              <DialogContent showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle>{d.entry.form.clearTitle}</DialogTitle>
                  <DialogDescription>{d.entry.form.clearDescription}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant='outline' size='sm' />}>
                    {d.common.cancel}
                  </DialogClose>
                  <Button size='sm' variant='destructive' onClick={handleClear}>
                    {d.common.clear}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          <Button type='submit' disabled={isPending || offlineQueued} size='sm'>
            {isPending
              ? d.common.saving
              : isEdit
                ? d.entry.form.saveChanges
                : d.entry.form.addEntry}
          </Button>
        </div>
      </div>
    </form>
  );
}
