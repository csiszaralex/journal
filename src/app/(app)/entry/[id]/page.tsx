export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { HistoryIcon } from "lucide-react";
import { getEntry } from "@/db/queries/entries";
import { EntryForm } from "@/components/journal/EntryForm";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getEntry(id);
  if (!entry || entry.deleted_at) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Editing
          </p>
          <h1 className="text-lg font-semibold tracking-tight">
            {format(
              new Date(entry.version.entry_date + "T00:00:00"),
              "EEEE, MMMM d, yyyy"
            )}
          </h1>
        </div>
        <Link
          href={`/entry/${id}/history`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HistoryIcon className="size-3" />
          v{entry.version.version_number} · History
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <EntryForm entry={entry} />
      </div>
    </div>
  );
}
