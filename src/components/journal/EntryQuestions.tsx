'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n/provider';
import { CircleMinus, Pencil, Plus, RefreshCw, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';

export type QaPair = { question: string; answer: string };

const MAX_QUESTIONS = 6;

type EntryQuestionsProps = {
  pairs: QaPair[];
  loading: boolean;
  loadingIndex: number | null;
  appending: boolean;
  error: string | null;
  onFetch: () => void;
  onRegenerate: () => void;
  onRegenerateOne: (index: number) => void;
  onAppendOne: () => void;
  onAnswerChange: (index: number, value: string) => void;
  onQuestionChange: (index: number, value: string) => void;
  onDeleteOne: (index: number) => void;
};

export function EntryQuestions({
  pairs,
  loading,
  loadingIndex,
  appending,
  error,
  onFetch,
  onRegenerate,
  onRegenerateOne,
  onAppendOne,
  onAnswerChange,
  onQuestionChange,
  onDeleteOne,
}: EntryQuestionsProps) {
  const d = useI18n();
  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const busy = loading || appending || loadingIndex !== null;

  function startEditing(index: number, question: string) {
    setDraft(question);
    setEditingIndex(index);
  }

  function commitEditing() {
    if (editingIndex === null) return;
    const trimmed = draft.trim();
    // Keep the original question if the user cleared it — no empty questions.
    if (trimmed.length > 0) {
      onQuestionChange(editingIndex, trimmed);
    }
    setEditingIndex(null);
  }

  function cancelEditing() {
    setEditingIndex(null);
  }
  // Full-set loading skeletons (initial fetch or "different questions")
  if (loading) {
    return (
      <div className='mt-4 flex flex-col gap-3'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='flex flex-col gap-1.5'>
            <div className='h-3.5 w-2/3 animate-pulse rounded bg-muted' />
            <div className='h-16 w-full animate-pulse rounded-lg bg-muted' />
          </div>
        ))}
      </div>
    );
  }

  // Initial state — single button to fetch
  if (pairs.length === 0) {
    if (error) {
      return (
        <div className='mt-4 flex items-center gap-2'>
          <p className='text-xs text-destructive'>{error}</p>
          <Button type='button' variant='ghost' size='sm' onClick={onFetch}>
            {d.entry.questions.retry}
          </Button>
        </div>
      );
    }
    return (
      <div className='mt-4'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onFetch}
          className='text-muted-foreground'
        >
          <Sparkles className='size-3.5' />
          {d.entry.questions.ask}
        </Button>
      </div>
    );
  }

  // Questions + answers (with per-slot regen)
  return (
    <div className='mt-4 flex flex-col gap-3'>
      {pairs.map((pair, idx) => {
        const isSlotLoading = loadingIndex === idx;
        if (isSlotLoading) {
          return (
            <div key={idx} className='flex flex-col gap-1.5'>
              <div className='h-3.5 w-2/3 animate-pulse rounded bg-muted' />
              <div className='h-16 w-full animate-pulse rounded-lg bg-muted' />
            </div>
          );
        }
        return (
          <div key={idx} className='flex flex-col gap-1.5'>
            {editingIndex === idx ? (
              <Textarea
                autoFocus
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitEditing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    commitEditing();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelEditing();
                  }
                }}
                maxLength={500}
                placeholder={d.entry.questions.questionPlaceholder}
                className='resize-y text-sm'
              />
            ) : (
            <div className='flex items-start justify-between gap-2'>
              <p className='text-sm text-muted-foreground'>{pair.question}</p>
              <div className='flex shrink-0 gap-0.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-xs'
                  onClick={() => startEditing(idx, pair.question)}
                  disabled={busy}
                  title={d.entry.questions.editQuestion}
                  aria-label={d.entry.questions.editQuestion}
                  className='text-muted-foreground/60'
                >
                  <Pencil className='size-3' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-xs'
                  onClick={() => onRegenerateOne(idx)}
                  disabled={busy}
                  title={d.entry.questions.replaceQuestion}
                  aria-label={d.entry.questions.replaceQuestion}
                  className='text-muted-foreground/60'
                >
                  <RefreshCw className='size-3' />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon-xs'
                  onClick={() => {
                    if (pair.answer.trim().length > 0) {
                      setDeleteConfirmIndex(idx);
                    } else {
                      onDeleteOne(idx);
                    }
                  }}
                  disabled={busy}
                  title={d.common.deleteQuestion}
                  aria-label={d.common.deleteQuestion}
                  className='text-muted-foreground/60 hover:text-destructive'
                >
                  <CircleMinus className='size-3' />
                </Button>
              </div>
            </div>
            )}
            <Textarea
              rows={2}
              value={pair.answer}
              onChange={(e) => onAnswerChange(idx, e.target.value)}
              placeholder={d.entry.questions.answerPlaceholder}
              maxLength={2000}
              className='resize-y'
            />
          </div>
        );
      })}
      {appending && (
        <div className='flex flex-col gap-1.5'>
          <div className='h-3.5 w-2/3 animate-pulse rounded bg-muted' />
          <div className='h-16 w-full animate-pulse rounded-lg bg-muted' />
        </div>
      )}
      {error && <p className='text-xs text-destructive'>{error}</p>}
      <div className='flex flex-wrap items-center gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onRegenerate}
          disabled={busy}
          className='text-muted-foreground'
        >
          <RefreshCw className='size-3.5' />
          {d.entry.questions.regenerateAll}
        </Button>
        {pairs.length < MAX_QUESTIONS && (
          <Button
            type='button'
            variant='ghost'
            size='sm'
            onClick={onAppendOne}
            disabled={busy}
            className='text-muted-foreground'
          >
            <Plus className='size-3.5' />
            {d.entry.questions.addOne}
          </Button>
        )}
      </div>
      <Dialog
        open={deleteConfirmIndex !== null}
        onOpenChange={(open) => { if (!open) setDeleteConfirmIndex(null); }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{d.common.deleteQuestionTitle}</DialogTitle>
            <DialogDescription>{d.common.deleteQuestionDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant='outline' size='sm' />}>
              {d.common.cancel}
            </DialogClose>
            <Button
              size='sm'
              variant='destructive'
              onClick={() => {
                if (deleteConfirmIndex !== null) {
                  onDeleteOne(deleteConfirmIndex);
                  setDeleteConfirmIndex(null);
                }
              }}
            >
              {d.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
