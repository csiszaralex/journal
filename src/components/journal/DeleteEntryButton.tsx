'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Trash2Icon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { softDeleteEntryAction } from '@/actions/entries';
import { useI18n } from '@/i18n/provider';

interface DeleteEntryButtonProps {
  entryId: string;
  /** Human-readable date (or range) of the entry — as shown on the card. */
  dateLabel: string;
}

/**
 * Trash button + confirmation dialog for an entry card. The card itself is a
 * server component, so the dialog (and its client state) lives here.
 */
export function DeleteEntryButton({ entryId, dateLabel }: DeleteEntryButtonProps) {
  const d = useI18n();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteAction = softDeleteEntryAction.bind(null, entryId);
  const description = d.entry.delete.description(dateLabel);

  return (
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title={d.common.delete}
            aria-label={d.common.delete}
          />
        }
      >
        <Trash2Icon className="size-3" />
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{d.entry.delete.title}</DialogTitle>
          <DialogDescription>
            {description.before}
            <strong className='font-medium text-foreground'>{description.emphasis}</strong>
            {description.after}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>
            {d.common.cancel}
          </DialogClose>
          <form action={deleteAction}>
            <DeleteSubmitButton />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSubmitButton() {
  const d = useI18n();
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="destructive"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? d.common.deleting : d.common.delete}
    </Button>
  );
}
