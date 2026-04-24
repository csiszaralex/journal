export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeftIcon } from "lucide-react";
import { getEntry, getVersionHistory } from "@/db/queries/entries";
import { rollbackVersionAction } from "@/actions/entries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function EntryHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = getEntry(id);
  if (!entry) notFound();

  const versions = getVersionHistory(id);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          href={`/entry/${id}`}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          Back to entry
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          Version History
        </h1>
        <p className="text-sm text-muted-foreground">
          {versions.length} {versions.length === 1 ? "version" : "versions"}
        </p>
      </div>

      <div className="space-y-3">
        {versions.map((version) => {
          const isCurrent = version.id === entry.current_version_id;
          const rollback = rollbackVersionAction.bind(
            null,
            id,
            version.version_number
          );

          return (
            <div
              key={version.id}
              className="rounded-xl border bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    v{version.version_number}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(version.edited_at), "MMM d, yyyy 'at' HH:mm")}
                  </span>
                  {isCurrent && (
                    <Badge className="h-4 px-1.5 py-0 text-[10px]">
                      Current
                    </Badge>
                  )}
                </div>

                {!isCurrent && (
                  <form action={rollback}>
                    <Button
                      type="submit"
                      variant="outline"
                      size="xs"
                      className="h-6 text-xs"
                    >
                      Restore
                    </Button>
                  </form>
                )}
              </div>

              {version.text && (
                <p className="line-clamp-4 text-sm leading-relaxed text-foreground/80">
                  {version.text}
                </p>
              )}

              {version.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {version.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="h-4 px-1.5 py-0 text-[10px]"
                    >
                      {tag.display_name}
                    </Badge>
                  ))}
                </div>
              )}

              {version.mood_score != null && (
                <p className="text-xs text-muted-foreground">
                  Mood {version.mood_score}
                  {version.energy_score != null &&
                    ` · Energy ${version.energy_score}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
