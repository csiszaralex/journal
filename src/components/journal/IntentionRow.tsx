'use client';

import { useState, useTransition } from 'react';
import { MoreHorizontalIcon, Undo2Icon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  completeIntentionAction,
  dropIntentionAction,
  reopenIntentionAction,
  deleteIntentionAction,
} from '@/actions/intentions';
import type { Intention } from '@/db/queries/intentions';
import { CategoryChip } from './CategoryChip';

export type IntentionRowProps = {
  intention: Intention;
  todayISO: string;
  categoryColors?: Record<string, string>;
};

export function IntentionRow({
  intention,
  todayISO,
  categoryColors,
}: IntentionRowProps) {
  const [pending, startTransition] = useTransition();
  // The dialog lives outside the dropdown menu: picking a menu item closes the
  // menu, which would tear down a dialog nested inside it before it can open.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isOpen = intention.status === 'open';
  const overdueDays =
    intention.due_date && intention.due_date < todayISO
      ? daysBetween(intention.due_date, todayISO)
      : 0;

  function onToggle(checked: boolean) {
    if (!isOpen || !checked) return;
    startTransition(async () => {
      await completeIntentionAction({ id: intention.id });
    });
  }

  function onDeleteConfirmed() {
    startTransition(async () => {
      await deleteIntentionAction({ id: intention.id });
      setConfirmOpen(false);
    });
  }

  return (
    <div className="flex items-start gap-3 py-2">
      <Checkbox
        checked={!isOpen}
        disabled={pending || !isOpen}
        onCheckedChange={onToggle}
        aria-label="Kész"
      />
      <div className="flex-1 min-w-0">
        <div
          className={
            isOpen
              ? 'text-sm'
              : 'text-sm text-muted-foreground line-through'
          }
        >
          {intention.category && (
            <CategoryChip
              name={intention.category}
              colors={categoryColors}
              className="mr-1.5 align-middle"
            />
          )}
          {intention.text}
        </div>
        <div className="flex gap-2 text-xs text-muted-foreground mt-0.5">
          {intention.due_date && (
            <span>
              {intention.due_date}
              {overdueDays > 0 && ` · ${overdueDays} napja lejárt`}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={pending} aria-label="Műveletek" />
          }
        >
          <MoreHorizontalIcon className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isOpen ? (
            <>
              <DropdownMenuItem
                onClick={() =>
                  startTransition(async () => {
                    await dropIntentionAction({ id: intention.id });
                  })
                }
              >
                Elejtés
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                Törlés
              </DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem
                onClick={() =>
                  startTransition(async () => {
                    await reopenIntentionAction({ id: intention.id });
                  })
                }
              >
                <Undo2Icon className="h-4 w-4 mr-2" /> Visszanyit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                Törlés
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Törlöd ezt a szándékot?</DialogTitle>
            <DialogDescription>
              A(z) „{intention.text}” szándék eltűnik a listákból. Az
              alkalmazásból nem hozható vissza.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              Mégse
            </DialogClose>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDeleteConfirmed}
              disabled={pending}
            >
              {pending ? 'Törlés…' : 'Törlés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO + 'T00:00:00Z').getTime();
  const to = new Date(toISO + 'T00:00:00Z').getTime();
  return Math.floor((to - from) / (24 * 60 * 60 * 1000));
}
