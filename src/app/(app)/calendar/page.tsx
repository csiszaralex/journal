import Link from "next/link";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { getCalendarData, listEntries } from "@/db/queries/entries";
import { EntryCard } from "@/components/journal/EntryCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SearchParams = Promise<{ month?: string; day?: string }>;

const MOOD_DOT: Record<number, string> = {
  1: "bg-red-500",
  2: "bg-orange-500",
  3: "bg-yellow-500",
  4: "bg-green-500",
  5: "bg-emerald-400",
};

function moodDotClass(mood: number | null) {
  return mood != null ? MOOD_DOT[mood] : "bg-muted-foreground/50";
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { month, day } = await searchParams;
  const today = format(new Date(), "yyyy-MM-dd");

  const monthDate = month ? new Date(month + "-01T00:00:00") : new Date();
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const monthKey = format(monthStart, "yyyy-MM");
  const prevMonthKey = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonthKey = format(addMonths(monthStart, 1), "yyyy-MM");

  // Per-entry mood dots
  const calData = getCalendarData(
    format(monthStart, "yyyy-MM-dd"),
    format(monthEnd, "yyyy-MM-dd")
  );

  // date → ordered list of mood values (one per entry)
  const dateMap = new Map<string, (number | null)[]>();
  for (const d of calData) {
    const cur = dateMap.get(d.entry_date) ?? [];
    cur.push(d.mood_score);
    dateMap.set(d.entry_date, cur);
  }

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  // Mon-first: Mon=0 … Sun=6
  const firstDow = (getDay(monthStart) + 6) % 7;

  const selectedDay = day ?? null;
  const dayEntries = selectedDay
    ? listEntries({ from_date: selectedDay, to_date: selectedDay, page_size: 50 })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={`/calendar?month=${prevMonthKey}`}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">
          {format(monthStart, "MMMM yyyy")}
        </h1>
        <Link
          href={`/calendar?month=${nextMonthKey}`}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      {/* Calendar — compact, centered */}
      <div className="mx-auto max-w-sm">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div
              key={i}
              className="py-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-border">
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`pad-${i}`} className="bg-background h-12" />
          ))}

          {days.map((d) => {
            const dateStr = format(d, "yyyy-MM-dd");
            const moods = dateMap.get(dateStr) ?? [];
            const isSelected = selectedDay === dateStr;
            const isToday = dateStr === today;
            const dots = moods.slice(0, 5);
            const extra = moods.length - dots.length;

            return (
              <Link
                key={dateStr}
                href={
                  isSelected
                    ? `/calendar?month=${monthKey}`
                    : `/calendar?month=${monthKey}&day=${dateStr}`
                }
                className={cn(
                  "group relative flex h-12 flex-col items-center justify-between bg-background px-1 py-1.5 transition-colors hover:bg-muted/60",
                  isSelected && "bg-muted",
                  isToday && "ring-1 ring-inset ring-primary/50"
                )}
              >
                {/* Day number */}
                <span
                  className={cn(
                    "text-[11px] font-medium leading-none tabular-nums",
                    isToday
                      ? "text-primary font-semibold"
                      : moods.length > 0
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  )}
                >
                  {format(d, "d")}
                </span>

                {/* Mood dots */}
                {moods.length > 0 && (
                  <div className="flex items-center gap-px">
                    {dots.map((mood, i) => (
                      <div
                        key={i}
                        className={cn("size-1 rounded-full", moodDotClass(mood))}
                      />
                    ))}
                    {extra > 0 && (
                      <span className="ml-0.5 text-[8px] leading-none text-muted-foreground">
                        +{extra}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
          {[
            { color: "bg-red-500", label: "1" },
            { color: "bg-orange-500", label: "2" },
            { color: "bg-yellow-500", label: "3" },
            { color: "bg-green-500", label: "4" },
            { color: "bg-emerald-400", label: "5" },
            { color: "bg-muted-foreground/50", label: "—" },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={cn("size-1.5 rounded-full", color)} />
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected day */}
      {selectedDay && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">
              {format(new Date(selectedDay + "T00:00:00"), "EEEE, MMMM d")}
            </h2>
            <Link href={`/?prefill_date=${selectedDay}`}>
              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs">
                <PlusIcon className="size-3" />
                New entry
              </Button>
            </Link>
          </div>

          {dayEntries.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground/60">
              No entries for this day.
            </p>
          ) : (
            dayEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} today={today} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
