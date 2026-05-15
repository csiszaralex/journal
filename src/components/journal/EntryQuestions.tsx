'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, Sparkles } from 'lucide-react';

export type QaPair = { question: string; answer: string };

type EntryQuestionsProps = {
  pairs: QaPair[];
  loading: boolean;
  error: string | null;
  onFetch: () => void;
  onRegenerate: () => void;
  onAnswerChange: (index: number, value: string) => void;
};

export function EntryQuestions({
  pairs,
  loading,
  error,
  onFetch,
  onRegenerate,
  onAnswerChange,
}: EntryQuestionsProps) {
  // Loading skeletons
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

  // Error state
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

  // Initial state — single button to fetch
  if (pairs.length === 0) {
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

  // Questions + answers
  return (
    <div className='mt-4 flex flex-col gap-3'>
      {pairs.map((pair, idx) => (
        <div key={idx} className='flex flex-col gap-1.5'>
          <p className='text-sm text-muted-foreground'>{pair.question}</p>
          <Input
            type='text'
            value={pair.answer}
            onChange={(e) => onAnswerChange(idx, e.target.value)}
            placeholder='Válaszolj röviden, vagy hagyd üresen…'
            maxLength={2000}
          />
        </div>
      ))}
      <div>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={onRegenerate}
          className='text-muted-foreground'
        >
          <RefreshCw className='size-3.5' />
          Más kérdéseket
        </Button>
      </div>
    </div>
  );
}
