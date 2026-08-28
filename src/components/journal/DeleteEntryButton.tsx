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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const deleteAction = softDeleteEntryAction.bind(null, entryId);

  return (
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
            title="Törlés"
            aria-label="Törlés"
          />
        }
      >
        <Trash2Icon className="size-3" />
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Törlöd ezt a bejegyzést?</DialogTitle>
          <DialogDescription>
            A(z) <strong>{dateLabel}</strong> bejegyzés eltűnik a naptárból, a
            keresésből és a statisztikákból. Az alkalmazásból nem hozható vissza.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Mégse
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
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="destructive"
      disabled={pending}
      className="w-full sm:w-auto"
    >
      {pending ? 'Törlés…' : 'Törlés'}
    </Button>
  );
}
