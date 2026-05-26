'use client';

import {
  appendProfileQaAction,
  deleteProfileQaAction,
  setProfileBioAction,
  updateProfileQaAnswerAction,
} from '@/actions/profile';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { ProfileQaItem } from '@/db/queries/profile';
import { CircleMinus, Sparkles } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

type Props = {
  initialBio: string;
  initialQaItems: ProfileQaItem[];
};

export function ProfileForm({ initialBio, initialQaItems }: Props) {
  const [bio, setBio] = useState(initialBio);
  const [qaItems, setQaItems] = useState(initialQaItems);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleBioBlur() {
    startTransition(async () => {
      await setProfileBioAction({ bio });
      toast.success('Mentve', { duration: 2000 });
    });
  }

  function handleAnswerChange(id: number, value: string) {
    setQaItems((prev) => prev.map((q) => (q.id === id ? { ...q, answer: value } : q)));
  }

  function handleAnswerBlur(id: number, answer: string) {
    startTransition(async () => {
      await updateProfileQaAnswerAction({ id, answer });
    });
  }

  async function handleGenerateQuestions() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/ai/profile-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingQuestions: qaItems.map((q) => q.question),
        }),
      });
      const data = (await res.json()) as { questions?: string[]; error?: string };
      if (!res.ok) {
        setAiError(data.error ?? 'Hiba történt');
        return;
      }
      const newQuestions = data.questions ?? [];
      if (newQuestions.length === 0) return;
      startTransition(async () => {
        const result = await appendProfileQaAction({ questions: newQuestions });
        if (result?.data) {
          setQaItems(result.data);
        }
      });
    } catch {
      setAiError('Hiba történt a kapcsolat során');
    } finally {
      setAiLoading(false);
    }
  }

  function handleDeleteRequest(id: number) {
    const item = qaItems.find((q) => q.id === id);
    if (item?.answer && item.answer.trim().length > 0) {
      setDeleteTarget(id);
    } else {
      executeDelete(id);
    }
  }

  function executeDelete(id: number) {
    setQaItems((prev) => prev.filter((q) => q.id !== id));
    startTransition(async () => {
      await deleteProfileQaAction({ id });
    });
  }

  function handleDeleteConfirm() {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    executeDelete(id);
  }

  return (
    <div className='space-y-8'>
      {/* Bio */}
      <div className='space-y-2'>
        <h2 className='text-sm font-medium'>Szabad leírás</h2>
        <Textarea
          rows={6}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          onBlur={handleBioBlur}
          placeholder='Pl. étterem tulajdonos vagyok, két gyermekem van, rendszeresen futok...'
          className='resize-y'
          maxLength={10000}
        />
      </div>

      {/* Q&A */}
      <div className='space-y-3'>
        <h2 className='text-sm font-medium'>Kérdések és válaszok</h2>

        {qaItems.map((item) => (
          <div key={item.id} className='flex flex-col gap-1.5'>
            <div className='flex items-start justify-between gap-2'>
              <p className='text-sm text-muted-foreground'>{item.question}</p>
              <Button
                type='button'
                variant='ghost'
                size='icon-xs'
                onClick={() => handleDeleteRequest(item.id)}
                className='shrink-0 text-muted-foreground/60 hover:text-destructive'
                aria-label='Kérdés törlése'
              >
                <CircleMinus className='size-3' />
              </Button>
            </div>
            <Textarea
              rows={2}
              value={item.answer ?? ''}
              onChange={(e) => handleAnswerChange(item.id, e.target.value)}
              onBlur={(e) => handleAnswerBlur(item.id, e.target.value)}
              placeholder='Válaszolj röviden…'
              maxLength={2000}
              className='resize-y'
            />
          </div>
        ))}

        {aiError && <p className='text-xs text-destructive'>{aiError}</p>}

        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={handleGenerateQuestions}
          disabled={aiLoading || isPending}
          className='text-muted-foreground'
        >
          <Sparkles className='size-3.5' />
          {aiLoading ? 'Generálás…' : 'Kérdések generálása'}
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Törlöd ezt a kérdést?</DialogTitle>
            <DialogDescription>A beírt válaszod elvész.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant='outline' size='sm' />}>Mégsem</DialogClose>
            <Button size='sm' variant='destructive' onClick={handleDeleteConfirm}>
              Törlés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

