"use client";

import { useState } from "react";
import { DownloadIcon, LoaderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportJsonAction, exportMarkdownAction } from "@/actions/export";
import { useI18n } from "@/i18n/provider";
import { todayInAppTZ } from "@/lib/date";

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButtons() {
  const d = useI18n();
  const [loadingJson, setLoadingJson] = useState(false);
  const [loadingMd, setLoadingMd] = useState(false);

  // Stamp the filename with the journal's day, so an export names the same day
  // the entries in it are filed under.
  const dateStamp = todayInAppTZ();

  async function handleJson() {
    setLoadingJson(true);
    try {
      const result = await exportJsonAction();
      if (result?.data) downloadBlob(result.data, `journal-${dateStamp}.json`, "application/json");
    } finally {
      setLoadingJson(false);
    }
  }

  async function handleMarkdown() {
    setLoadingMd(true);
    try {
      const result = await exportMarkdownAction();
      if (result?.data) downloadBlob(result.data, `journal-${dateStamp}.md`, "text/markdown");
    } finally {
      setLoadingMd(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleJson}
        disabled={loadingJson}
        className="gap-2"
      >
        {loadingJson ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <DownloadIcon className="size-4" />
        )}
        {d.settings.export.json}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleMarkdown}
        disabled={loadingMd}
        className="gap-2"
      >
        {loadingMd ? (
          <LoaderIcon className="size-4 animate-spin" />
        ) : (
          <DownloadIcon className="size-4" />
        )}
        {d.settings.export.markdown}
      </Button>
    </div>
  );
}
