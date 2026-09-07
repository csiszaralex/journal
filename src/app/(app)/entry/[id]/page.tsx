export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { HistoryIcon } from "lucide-react";
import { getEntry } from "@/db/queries/entries";
import { getDict } from "@/i18n/request";
import { formatISODay } from "@/lib/date";
import { EntryForm } from "@/components/journal/EntryForm";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = await getDict();
  const entry = getEntry(id);
  if (!entry || entry.deleted_at) notFound();

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {d.history.detail.editing}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">
            {formatISODay(
              entry.version.entry_date,
              d.dates.dayLongWithYear,
              d.dates.locale
            )}
          </h1>
        </div>
        <Link
          href={`/entry/${id}/history`}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <HistoryIcon className="size-3" />
          {d.history.detail.historyLink(
            d.common.versionLabel(entry.version.version_number)
          )}
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <EntryForm entry={entry} kind={entry.version.kind} />
      </div>
    </>
  );
}
