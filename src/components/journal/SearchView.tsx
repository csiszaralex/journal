"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SearchIcon, LoaderIcon } from "lucide-react";
import { todayInAppTZ } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntryCard } from "@/components/journal/EntryCard";
import { searchEntriesAction } from "@/actions/search";

interface SearchViewProps {
  initialQ?: string;
  initialFrom?: string;
  initialTo?: string;
  initialMoodMin?: string;
  initialMoodMax?: string;
}

const PAGE_SIZE = 25;

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function SearchView({
  initialQ = "",
  initialFrom = "",
  initialTo = "",
  initialMoodMin = "",
  initialMoodMax = "",
}: SearchViewProps) {
  // The app's day, not the browser's — EntryCard compares it against entry_date.
  const today = todayInAppTZ();

  const [q, setQ] = useState(initialQ);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [moodMin, setMoodMin] = useState(initialMoodMin);
  const [moodMax, setMoodMax] = useState(initialMoodMax);
  const [page, setPage] = useState(1);

  const debouncedQ = useDebounce(q, 300);
  const debouncedFrom = useDebounce(from, 400);
  const debouncedTo = useDebounce(to, 400);

  // Reset page when filters change
  const prevFilters = useRef({ debouncedQ, debouncedFrom, debouncedTo, moodMin, moodMax });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedQ !== debouncedQ ||
      prev.debouncedFrom !== debouncedFrom ||
      prev.debouncedTo !== debouncedTo ||
      prev.moodMin !== moodMin ||
      prev.moodMax !== moodMax
    ) {
      setPage(1);
      prevFilters.current = { debouncedQ, debouncedFrom, debouncedTo, moodMin, moodMax };
    }
  }, [debouncedQ, debouncedFrom, debouncedTo, moodMin, moodMax]);

  const { data: entries = [], isFetching, isError } = useQuery({
    queryKey: ["search", debouncedQ, debouncedFrom, debouncedTo, moodMin, moodMax, page],
    queryFn: async () => {
      const result = await searchEntriesAction({
        q: debouncedQ || undefined,
        from: debouncedFrom || undefined,
        to: debouncedTo || undefined,
        moodMin: moodMin ? parseInt(moodMin, 10) : undefined,
        moodMax: moodMax ? parseInt(moodMax, 10) : undefined,
        page,
      });
      if (result?.serverError) throw new Error(result.serverError);
      return result?.data ?? [];
    },
    placeholderData: (prev) => prev,
  });

  const hasNext = entries.length === PAGE_SIZE;
  const hasFilters = debouncedQ || debouncedFrom || debouncedTo || moodMin || moodMax;

  function clearAll() {
    setQ("");
    setFrom("");
    setTo("");
    setMoodMin("");
    setMoodMax("");
    setPage(1);
  }

  const heading = debouncedQ
    ? `Results for "${debouncedQ}"`
    : hasFilters
      ? "Filtered entries"
      : "All entries";

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search entries and tags…"
          className="pl-9 pr-8"
          autoComplete="off"
          autoFocus
        />
        {isFetching && (
          <LoaderIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Min mood</Label>
          <Select
            value={moodMin || "any"}
            onValueChange={(v) => setMoodMin(!v || v === "any" ? "" : v)}
          >
            <SelectTrigger size="sm" className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Max mood</Label>
          <Select
            value={moodMax || "any"}
            onValueChange={(v) => setMoodMax(!v || v === "any" ? "" : v)}
          >
            <SelectTrigger size="sm" className="w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {heading}
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {entries.length === 0
              ? "No results"
              : entries.length === PAGE_SIZE
                ? `${PAGE_SIZE}+ results`
                : `${entries.length} result${entries.length === 1 ? "" : "s"}`}
          </span>
          {hasFilters && (
            <Button variant="ghost" size="xs" onClick={clearAll}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          Something went wrong. Please try again.
        </p>
      ) : entries.length === 0 && !isFetching ? (
        <p className="py-8 text-center text-sm text-muted-foreground/60">
          {debouncedQ ? "No entries matched your search." : "No entries found."}
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} today={today} />
          ))}
        </div>
      )}

      {/* Pagination — search results page like the list does; a full page is
          how we know there may be more, in both modes. */}
      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-between gap-4 pt-2">
          {page > 1 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
            >
              ← Previous
            </Button>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground">Page {page}</span>
          {hasNext ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
