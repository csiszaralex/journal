export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { getDict } from "@/i18n/request";
import { formatInAppTZ } from "@/lib/date";
import { ArrowLeftIcon } from "lucide-react";
import { getEntry, getVersionHistory } from "@/db/queries/entries";
import { rollbackVersionAction } from "@/actions/entries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContrastTextColor } from "@/lib/color";

export default async function EntryHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = await getDict();
  const entry = getEntry(id);
  // Same guard as the entry page: getEntry does not filter deleted rows, so
  // without this a deleted entry's history stayed readable by URL — with a
  // Restore button that would have re-pointed a deleted entry at a version.
  if (!entry || entry.deleted_at) notFound();

  const versions = getVersionHistory(id);

  return (
    <>
      <div className="flex items-center gap-3">
        <Link
          href={`/entry/${id}`}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-3" />
          {d.history.backToEntry}
        </Link>
      </div>

      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {d.history.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {d.history.versionCount(versions.length)}
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
                    {d.common.versionLabel(version.version_number)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatInAppTZ(
                      version.edited_at,
                      d.dates.editedAt,
                      d.dates.locale,
                    )}
                  </span>
                  {isCurrent && (
                    <Badge className="h-4 px-1.5 py-0 text-[10px]">
                      {d.history.version.currentBadge}
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
                      {d.history.version.restore}
                    </Button>
                  </form>
                )}
              </div>

              {version.text && (
                <p className="line-clamp-4 text-sm leading-relaxed text-foreground/80">
                  {version.text}
                </p>
              )}

              {(version.tags.length > 0 || version.emotions.length > 0) && (
                <div className="flex flex-wrap gap-1">
                  {version.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="h-4 px-1.5 py-0 text-[10px]"
                      style={{
                        backgroundColor: tag.color,
                        color: getContrastTextColor(tag.color),
                      }}
                    >
                      {tag.display_name}
                    </Badge>
                  ))}
                  {version.emotions.map((em) => (
                    <Badge
                      key={em.id}
                      variant="secondary"
                      className="h-4 gap-1 px-1.5 py-0 text-[10px]"
                      style={{
                        backgroundColor: em.color,
                        color: getContrastTextColor(em.color),
                      }}
                    >
                      {em.emoji && <span className="emoji" aria-hidden>{em.emoji}</span>}
                      {em.display_name}
                    </Badge>
                  ))}
                </div>
              )}

              {version.mood_score != null && (
                <p className="text-xs text-muted-foreground">
                  {d.history.version.scores(
                    version.mood_score,
                    version.energy_score,
                  )}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
