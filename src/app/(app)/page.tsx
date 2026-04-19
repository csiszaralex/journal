import { format } from "date-fns";
import { listEntries } from "@/db/queries/entries";
import { EntryForm } from "@/components/journal/EntryForm";
import { EntryCard } from "@/components/journal/EntryCard";

export default function TodayPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const todayEntries = listEntries({ from_date: today, to_date: today });

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Date header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {format(new Date(), "EEEE, MMMM d")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "yyyy")}
        </p>
      </div>

      {/* New entry form */}
      <div className="rounded-xl border bg-card p-4">
        <EntryForm />
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
