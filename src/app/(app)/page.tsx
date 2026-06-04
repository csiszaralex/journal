export const dynamic = "force-dynamic";

import { format } from "date-fns";
import { getEntryByDate, getStreakInfo } from "@/db/queries/entries";
import { listTemplates } from "@/db/queries/templates";
import { EntryForm } from "@/components/journal/EntryForm";
import { TodayIntentionsSection } from "@/components/journal/TodayIntentionsSection";
import { FlameIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ date?: string }>;

export default async function TodayPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { date: dateParam } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");
  const selectedDate = dateParam ?? today;
  const isToday = selectedDate === today;
  const existingEntry = getEntryByDate(selectedDate);
  const templates = listTemplates();
  const { streak, wroteToday } = getStreakInfo();

  const headerDate = new Date(selectedDate + "T00:00:00");

  return (
    <>
      {/* Date header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {format(headerDate, "EEEE, MMMM d")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(headerDate, "yyyy")}
          </p>
        </div>
        {isToday && streak > 0 && (
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

      {/* Entry form: edits existing day-entry or creates a new one.
          Keyed by date so switching days remounts the form with fresh state. */}
      <div className="rounded-xl border bg-card p-4">
        <EntryForm
          key={existingEntry?.id ?? `new-${selectedDate}`}
          entry={existingEntry ?? undefined}
          templates={templates}
          defaultDate={selectedDate}
        />
      </div>

      {/* Today's open intentions — always shown at the bottom */}
      <TodayIntentionsSection />
    </>
  );
}
