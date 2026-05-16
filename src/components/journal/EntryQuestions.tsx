'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Sparkles } from 'lucide-react';

export type QaPair = { question: string; answer: string };

type EntryQuestionsProps = {
  pairs: QaPair[];
  loading: boolean;
  loadingIndex: number | null;
  error: string | null;
  onFetch: () => void;
  onRegenerate: () => void;
  onRegenerateOne: (index: number) => void;
  onAnswerChange: (index: number, value: string) => void;
};

export function EntryQuestions({
  pairs,
  loading,
  loadingIndex,
  error,
  onFetch,
  onRegenerate,
  onRegenerateOne,
  onAnswerChange,
}: EntryQuestionsProps) {
  // Full-set loading skeletons (initial fetch or "Más kérdéseket")
  if (loading) {
    return (
      <div className='mt-4 flex flex-col gap-3'>
        {[0, 1, 2].map((i) => (
          <div key={i} className='flex flex-col gap-1.5'>
            <div className='h-3.5 w-2/3 animate-pulse rounded bg-muted' />
            <div className='h-8 w-full animate-pulse rounded-lg bg-muted' />
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
            Újra
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
          Kérdezz tőlem
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
              <div className='h-8 w-full animate-pulse rounded-lg bg-muted' />
            </div>
          );
        }
        return (
          <div key={idx} className='flex flex-col gap-1.5'>
            <div className='flex items-start justify-between gap-2'>
              <p className='text-sm text-muted-foreground'>{pair.question}</p>
              <button
                type='button'
                onClick={() => onRegenerateOne(idx)}
                disabled={loadingIndex !== null}
                title='Másik kérdést kérek erre a helyre'
                aria-label='Másik kérdést kérek erre a helyre'
                className='shrink-0 rounded p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40'
              >
                <RefreshCw className='size-3' />
              </button>
            </div>
            <Input
              type='text'
              value={pair.answer}
              onChange={(e) => onAnswerChange(idx, e.target.value)}
              placeholder='Válaszolj röviden, vagy hagyd üresen…'
              maxLength={2000}
            />
          </div>
        );
      })}
      {error && <p className='text-xs text-destructive'>{error}</p>}
      <div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onRegenerate}
          disabled={loadingIndex !== null}
          className='text-muted-foreground'
        >
          <RefreshCw className='size-3.5' />
          Más kérdéseket
        </Button>
      </div>
    </div>
  );
}
