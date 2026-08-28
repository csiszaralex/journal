export const dynamic = "force-dynamic";

import { endOfMonth, format, startOfMonth } from "date-fns";
import {
  getEntryByDate,
  getEntryDates,
  getGapInfo,
  getStreakInfo,
  getSummaryRanges,
} from "@/db/queries/entries";
import { getSummaryGapDays } from "@/db/queries/settings";
import { todayInAppTZ } from "@/lib/date";
import {
  firstUncoveredDay,
  getDefaultSummaryPeriod,
  inclusiveDayCount,
} from "@/lib/summary-config";
import { listTemplates } from "@/db/queries/templates";
import { EntryForm } from "@/components/journal/EntryForm";
import { GapBanner } from "@/components/journal/GapBanner";
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
  const today = todayInAppTZ();
  const selectedDate = dateParam ?? today;
  const isToday = selectedDate === today;
  const existingEntry = getEntryByDate(selectedDate);
  const monthDate = new Date(selectedDate + "T00:00:00");
  const initialEntryDates = getEntryDates(
    format(startOfMonth(monthDate), "yyyy-MM-dd"),
    format(endOfMonth(monthDate), "yyyy-MM-dd"),
  );
  const templates = listTemplates();
  const { streak, wroteToday } = getStreakInfo();
  const { lastDailyDate, gapDays } = getGapInfo();
  const gapThreshold = getSummaryGapDays();
  // getGapInfo stays daily-only — it is the honest "days since you last wrote".
  // Only the *offer* is gated on coverage: the banner asks for a recap of the
  // silence, so once a summary covers that silence there is nothing left to
  // offer. A partially covered gap is still offered, starting at the first day
  // no summary covers.
  const gapPeriod =
    isToday && lastDailyDate !== null && gapDays >= gapThreshold
      ? getDefaultSummaryPeriod(lastDailyDate)
      : null;
  const uncoveredFrom = gapPeriod
    ? firstUncoveredDay(
        gapPeriod.from,
        gapPeriod.to,
        getSummaryRanges(gapPeriod.from, gapPeriod.to),
      )
    : null;
  // The banner counts the silence it is actually offering to recap. With nothing
  // covered, uncoveredFrom is the day after the last daily entry, so this is
  // exactly gapDays; once a summary covers the head of the gap, it counts from
  // where that recap left off and matches the range in the link.
  const uncoveredDays = uncoveredFrom ? inclusiveDayCount(uncoveredFrom, today) : 0;

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

      {gapPeriod && uncoveredFrom && (
        <GapBanner from={uncoveredFrom} to={gapPeriod.to} gapDays={uncoveredDays} />
      )}

      {/* Entry form: edits existing day-entry or creates a new one.
          Keyed by date so switching days remounts the form with fresh state. */}
      <div className="rounded-xl border bg-card p-4">
        <EntryForm
          key={existingEntry?.id ?? `new-${selectedDate}`}
          entry={existingEntry ?? undefined}
          templates={templates}
          defaultDate={selectedDate}
          initialEntryDates={initialEntryDates}
        />
      </div>

      {/* Today's open intentions — always shown at the bottom */}
      <TodayIntentionsSection />
    </>
  );
}
