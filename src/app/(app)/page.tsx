export const dynamic = "force-dynamic";

import { format } from "date-fns";
import { getStreakInfo, listEntries } from "@/db/queries/entries";
import { listTemplates } from "@/db/queries/templates";
import { EntryForm } from "@/components/journal/EntryForm";
import { EntryCard } from "@/components/journal/EntryCard";
import { FlameIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ prefill_date?: string }>;

export default async function TodayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { prefill_date } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = listEntries({ from_date: today, to_date: today });
  const templates = listTemplates();
  const { streak, wroteToday } = getStreakInfo();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Date header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {format(new Date(), "EEEE, MMMM d")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "yyyy")}
          </p>
        </div>
        {streak > 0 && (
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm",
            wroteToday
              ? "bg-linear-to-r from-orange-500 to-amber-400 text-white"
              : "border-2 border-orange-400 text-orange-500"
          )}>
            <FlameIcon className="size-3.5" />
            {streak} {streak === 1 ? "day" : "days"}
          </div>
        )}
      </div>

      {/* New entry form */}
      <div className="rounded-xl border bg-card p-4">
        <EntryForm templates={templates} defaultDate={prefill_date} />
      </div>

      {/* Today's entries */}
      {todayEntries.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {todayEntries.length === 1
              ? "1 entry today"
              : `${todayEntries.length} entries today`}
          </h2>
          {todayEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} today={today} />
          ))}
        </div>
      )}

      {todayEntries.length === 0 && (
        <p className="text-center text-sm text-muted-foreground/60 py-4">
          No entries yet today. Write something above.
        </p>
      )}
    </div>
  );
}
