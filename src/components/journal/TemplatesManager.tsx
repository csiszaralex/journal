'use client';

import {
  createTemplateAction,
  deleteTemplateAction,
  updateTemplateAction,
} from '@/actions/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { EntryTemplate } from '@/db/queries/templates';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';

const SCORE_COLORS: Record<number, string> = {
  1: 'bg-red-500 text-white border-red-500',
  2: 'bg-orange-500 text-white border-orange-500',
  3: 'bg-yellow-500 text-white border-yellow-500',
  4: 'bg-green-500 text-white border-green-500',
  5: 'bg-emerald-500 text-white border-emerald-500',
};

interface Props {
  templates: EntryTemplate[];
}

function ScoreRow({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className='flex items-center gap-2'>
      <Label className='text-xs text-muted-foreground w-12'>{label}</Label>
      <input type='hidden' name={name} value={value ?? ''} />
      <div className='flex gap-1'>
        {[1, 2, 3, 4, 5].map((s) => (
          <button
            key={s}
            type='button'
            onClick={() => onChange(value === s ? undefined : s)}
            className={`size-6 rounded-full border text-xs font-medium transition-all ${
              value === s
                ? SCORE_COLORS[s]
                : 'border-border text-muted-foreground hover:border-foreground/40'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TemplateFormProps {
  editing?: EntryTemplate;
  onDone: () => void;
}

function TemplateForm({ editing, onDone }: TemplateFormProps) {
  const isEdit = !!editing;
  const action = isEdit ? updateTemplateAction : createTemplateAction;
  const [mood, setMood] = useState<number | undefined>(editing?.default_mood ?? undefined);
  const [energy, setEnergy] = useState<number | undefined>(editing?.default_energy ?? undefined);
  const [result, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (result?.status === 'success') {
      onDone();
    }
  }, [result, onDone]);

  return (
    <form
      action={formAction}
      className='space-y-3 rounded-lg border border-border bg-muted/10 p-4'
    >
      {isEdit && <input type='hidden' name='id' value={editing.id} />}

      <div className='space-y-1'>
        <Label className='text-xs text-muted-foreground'>Name</Label>
        <Input
          name='name'
          placeholder='Morning reflection…'
          required
          defaultValue={editing?.name ?? ''}
          className='h-8 text-sm'
        />
      </div>

      <div className='space-y-1'>
        <Label className='text-xs text-muted-foreground'>Default text (optional)</Label>
        <Textarea
          name='text'
          placeholder='Write freely…'
          defaultValue={editing?.text ?? ''}
          className='min-h-20 resize-none text-sm'
        />
      </div>

      <div className='flex gap-6'>
        <ScoreRow label='Mood' name='default_mood' value={mood} onChange={setMood} />
        <ScoreRow label='Energy' name='default_energy' value={energy} onChange={setEnergy} />
      </div>

      {result?.status === 'error' && (
        <p className='text-xs text-destructive'>{result.message}</p>
      )}

      <div className='flex gap-2'>
        <Button type='submit' size='sm' disabled={isPending}>
          {isPending ? 'Saving…' : isEdit ? 'Update template' : 'Save template'}
        </Button>
        <Button type='button' variant='ghost' size='sm' onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function TemplatesManager({ templates }: Props) {
  const [mode, setMode] = useState<'list' | 'create' | string>('list'); // string = editing id

  const editingTemplate = typeof mode === 'string' && mode !== 'list' && mode !== 'create'
    ? templates.find((t) => t.id === mode)
    : undefined;

  if (mode === 'create') {
    return <TemplateForm onDone={() => setMode('list')} />;
  }

  if (editingTemplate) {
    return <TemplateForm editing={editingTemplate} onDone={() => setMode('list')} />;
  }

  return (
    <div className='space-y-4'>
      {templates.length > 0 ? (
        <ul className='space-y-2'>
          {templates.map((t) => (
            <li
              key={t.id}
              className='flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 p-3'
            >
              <div className='min-w-0 flex-1'>
                <p className='text-sm font-medium'>{t.name}</p>
                {t.text && (
                  <p className='mt-0.5 truncate text-xs text-muted-foreground'>{t.text}</p>
                )}
                {(t.default_mood || t.default_energy) && (
                  <p className='mt-1 text-xs text-muted-foreground'>
                    {t.default_mood ? `Mood: ${t.default_mood}` : ''}
                    {t.default_mood && t.default_energy ? ' · ' : ''}
                    {t.default_energy ? `Energy: ${t.default_energy}` : ''}
                  </p>
                )}
              </div>
              <div className='flex items-center gap-0.5 shrink-0'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  className='size-7 text-muted-foreground hover:text-foreground'
                  onClick={() => setMode(t.id)}
                >
                  <PencilIcon className='size-3.5' />
                </Button>
                <form action={async () => { await deleteTemplateAction(t.id); }}>
                  <Button
                    type='submit'
                    variant='ghost'
                    size='icon'
                    className='size-7 text-muted-foreground hover:text-destructive'
                  >
                    <Trash2Icon className='size-3.5' />
                  </Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className='text-sm text-muted-foreground'>No templates yet.</p>
      )}

      <Button variant='outline' size='sm' onClick={() => setMode('create')}>
        <PlusIcon className='size-3.5 mr-1.5' />
        New template
      </Button>
    </div>
  );
}
