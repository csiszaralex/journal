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
import { useI18n } from '@/i18n/provider';
import { formatISODay } from '@/lib/date';
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
  const d = useI18n();
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
        aria-label={d.intentions.row.complete}
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
              {d.intentions.row.dueLabel(
                formatISODay(intention.due_date, d.dates.dayInput, d.dates.locale),
                overdueDays,
              )}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={d.intentions.row.actions}
            />
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
                {d.intentions.row.drop}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                {d.common.delete}
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
                <Undo2Icon className="h-4 w-4 mr-2" /> {d.intentions.row.reopen}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfirmOpen(true)}>
                {d.common.delete}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{d.intentions.row.delete.title}</DialogTitle>
            <DialogDescription>
              {d.intentions.row.delete.description(intention.text)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              {d.common.cancel}
            </DialogClose>
            <Button
              size="sm"
              variant="destructive"
              onClick={onDeleteConfirmed}
              disabled={pending}
            >
              {pending ? d.common.deleting : d.common.delete}
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
