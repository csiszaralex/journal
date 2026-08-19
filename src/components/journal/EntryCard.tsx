import Link from "next/link";
import { format, subDays } from "date-fns";
import { PencilIcon, Trash2Icon, HistoryIcon, ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { softDeleteEntryAction } from "@/actions/entries";
import type { EntryWithVersion } from "@/db/queries/entries";
import { cn } from "@/lib/utils";
import { getContrastTextColor } from "@/lib/color";

const MOOD_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-green-500",
  5: "bg-emerald-400",
};

const ENERGY_DOT: Record<number, string> = {
  1: "bg-slate-500",
  2: "bg-blue-500",
  3: "bg-cyan-400",
  4: "bg-amber-400",
  5: "bg-yellow-300",
};

interface EntryCardProps {
  entry: EntryWithVersion;
  today: string;
}

export function EntryCard({ entry, today }: EntryCardProps) {
  const v = entry.version;
  const isSummary = v.kind === 'summary';
  // Backdated = entry_date is before the day the entry was originally created.
  // Entries written before 6am count toward the previous day — at that hour
  // you're likely still up from the night before, not starting a new day.
  const createdAt = new Date(entry.created_at);
  const effectiveCreatedAt =
    createdAt.getHours() < 6 ? subDays(createdAt, 1) : createdAt;
  const createdDateStr = format(effectiveCreatedAt, 'yyyy-MM-dd');
  const isBackdated = !isSummary && v.entry_date < createdDateStr;
  const isScheduled = v.entry_date > today;
  const preview = v.text.slice(0, 300);
  const isTruncated = v.text.length > 300;

  const deleteAction = softDeleteEntryAction.bind(null, entry.id);

  return (
    <article className="group rounded-xl border bg-card p-4 transition-all hover:ring-1 hover:ring-ring/20">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/entry/${entry.id}`}
            className="text-sm font-medium hover:underline"
          >
            {isSummary && v.period_start
              ? `${format(new Date(v.period_start + 'T00:00:00'), 'MMM d')} – ${format(
                  new Date(v.entry_date + 'T00:00:00'),
                  'MMM d, yyyy',
                )}`
              : format(new Date(v.entry_date + "T00:00:00"), "EEEE, MMMM d, yyyy")}
          </Link>
          {isSummary && (
            <Badge variant='outline' className='h-4 px-1.5 py-0 text-[10px]'>
              Összefoglaló
            </Badge>
          )}
          {isBackdated && (
            <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
              Backdated
            </Badge>
          )}
          {isScheduled && (
            <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
              Scheduled
            </Badge>
          )}
          {v.version_number > 1 && (
            <span className="text-xs text-muted-foreground">
              v{v.version_number}
            </span>
          )}
        </div>

        {/* Action buttons — visible on hover */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Link href={`/entry/${entry.id}/history`}>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="Version history"
            >
              <HistoryIcon className="size-3" />
            </Button>
          </Link>
          <Link href={`/entry/${entry.id}`}>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="Edit"
            >
              <PencilIcon className="size-3" />
            </Button>
          </Link>
          <form action={deleteAction}>
            <Button
              type="submit"
              variant="ghost"
              size="icon"
              className="size-6 text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Delete"
            >
              <Trash2Icon className="size-3" />
            </Button>
          </form>
        </div>
      </div>

      {/* Text preview */}
      {v.text && (
        <p className="mb-3 text-sm leading-relaxed text-foreground/80">
          {preview}
          {isTruncated && (
            <Link
              href={`/entry/${entry.id}`}
              className="ml-1 text-muted-foreground hover:text-foreground"
            >
              …read more
            </Link>
          )}
        </p>
      )}

      {/* Q&A reflections */}
      {v.qa_pairs.length > 0 && (
        <details className="group/qa mb-3">
          <summary className="cursor-pointer list-none text-sm text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-1">
              <ChevronRightIcon className="size-3 transition-transform group-open/qa:rotate-90" />
              Reflexiók ({v.qa_pairs.length})
            </span>
          </summary>
          <div className="mt-2 flex flex-col gap-2">
            {v.qa_pairs.map((qa) => (
              <div
                key={qa.position}
                className="rounded-md border border-muted/60 bg-muted/10 p-3"
              >
                <p className="mb-1 text-sm text-muted-foreground">
                  {qa.question}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                  {qa.answer}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3">
        {v.mood_score != null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div
              className={cn("size-2 rounded-full", MOOD_DOT[v.mood_score])}
            />
            Mood {v.mood_score}
          </div>
        )}
        {v.energy_score != null && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div
              className={cn(
                "size-2 rounded-full",
                ENERGY_DOT[v.energy_score]
              )}
            />
            Energy {v.energy_score}
          </div>
        )}
        {v.tags.map((tag) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="h-4 px-1.5 py-0 text-[10px]"
            style={{ backgroundColor: tag.color, color: getContrastTextColor(tag.color) }}
          >
            {tag.display_name}
          </Badge>
        ))}
        {v.emotions.map((em) => (
          <Badge
            key={em.id}
            variant="secondary"
            className="h-4 gap-1 px-1.5 py-0 text-[10px]"
            style={{ backgroundColor: em.color, color: getContrastTextColor(em.color) }}
          >
            {em.emoji && <span className="emoji" aria-hidden>{em.emoji}</span>}
            {em.display_name}
          </Badge>
        ))}
      </div>
    </article>
  );
}
