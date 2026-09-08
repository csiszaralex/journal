'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteTagAction, updateTagAction } from '@/actions/tags';
import { deleteEmotionAction, updateEmotionAction } from '@/actions/emotions';
import { useI18n } from '@/i18n/provider';
import { getContrastTextColor } from '@/lib/color';

export type TagLike = {
  id: string;
  name: string;
  display_name: string;
  color: string;
  emoji?: string | null;
  usage_count: number;
};

interface TagEditRowProps {
  kind: 'tag' | 'emotion';
  item: TagLike;
}

export function TagEditRow({ kind, item }: TagEditRowProps) {
  const d = useI18n();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(item.display_name);
  const [name, setName] = useState(item.name);
  const [color, setColor] = useState(item.color);
  const [emoji, setEmoji] = useState(item.emoji ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const dirty =
    displayName.trim() !== item.display_name ||
    name.trim().toLowerCase() !== item.name ||
    color !== item.color ||
    (kind === 'emotion' && emoji.trim() !== (item.emoji ?? ''));

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result =
        kind === 'tag'
          ? await updateTagAction({
              id: item.id,
              display_name: displayName.trim(),
              name: name.trim().toLowerCase(),
              color,
            })
          : await updateEmotionAction({
              id: item.id,
              display_name: displayName.trim(),
              name: name.trim().toLowerCase(),
              color,
              emoji: emoji.trim() || null,
            });
      if (result?.serverError) {
        setError(result.serverError);
        return;
      }
      if (result?.data?.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 1500);
      } else if (result?.data && !result.data.ok) {
        setError(result.data.error);
      } else {
        setError(d.tags.row.saveFailed);
      }
    });
  }

  function handleDeleteConfirmed() {
    setError(null);
    startDelete(async () => {
      const action = kind === 'tag' ? deleteTagAction : deleteEmotionAction;
      const result = await action({ id: item.id });
      if (result?.data?.ok) {
        setConfirmOpen(false);
        router.refresh();
      } else {
        setError(result?.serverError ?? d.tags.row.deleteFailed);
        setConfirmOpen(false);
      }
    });
  }

  // Each kind gets its own whole sentence. There used to be a `kindLabel` here
  // — a Hungarian noun in the accusative, spliced into three different
  // sentences — which no other language could have satisfied; see the note on
  // `tags.row.delete`.
  const del = d.tags.row.delete;
  const deleteTitle =
    kind === 'tag' ? del.title.tag(item.display_name) : del.title.emotion(item.display_name);
  const inUseDescription =
    item.usage_count > 0
      ? kind === 'tag'
        ? del.inUse.tag(item.usage_count)
        : del.inUse.emotion(item.usage_count)
      : null;
  const unusedDescription = kind === 'tag' ? del.unused.tag : del.unused.emotion;

  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-input bg-background"
          aria-label={d.tags.row.colorLabel}
        />
        {kind === 'emotion' && (
          <Input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder=""
            maxLength={10}
            aria-label={d.tags.row.emojiLabel}
            className="emoji h-8 w-14 text-center text-base"
          />
        )}
        <span
          className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs"
          style={{ backgroundColor: color, color: getContrastTextColor(color) }}
        >
          {kind === 'emotion' && emoji.trim() && (
            <span className="emoji" aria-hidden>{emoji.trim()}</span>
          )}
          {displayName || '—'}
        </span>
        <div className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {d.tags.row.usageCount(item.usage_count)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {d.tags.row.displayNameLabel}
          </label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="h-8 text-sm"
            maxLength={60}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {d.tags.row.normalizedNameLabel}
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            className="h-8 text-sm font-mono"
            maxLength={60}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="text-xs">
          {error && <span className="text-destructive">{error}</span>}
          {success && <span className="text-emerald-500">{d.common.saved}</span>}
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isDeleting || isPending}
              onClick={() => setConfirmOpen(true)}
              aria-label={d.common.delete}
            >
              <Trash2Icon className="size-3.5" />
              {isDeleting ? d.common.deleting : d.common.delete}
            </Button>
            <DialogContent showCloseButton={false}>
              <DialogHeader>
                <DialogTitle>{deleteTitle}</DialogTitle>
                <DialogDescription>
                  {inUseDescription ? (
                    <>
                      {inUseDescription.before}
                      <strong>{inUseDescription.emphasis}</strong>
                      {inUseDescription.after}
                    </>
                  ) : (
                    unusedDescription
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" size="sm" />}>
                  {d.common.cancel}
                </DialogClose>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteConfirmed}
                  disabled={isDeleting}
                >
                  {isDeleting ? d.common.deleting : d.common.delete}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!dirty || isPending || isDeleting || !displayName.trim() || !name.trim()}
            onClick={handleSave}
          >
            {isPending ? d.common.saving : d.common.save}
          </Button>
        </div>
      </div>
    </div>
  );
}
