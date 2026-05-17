"use client";

import { useState, useEffect, useRef, useCallback, type ComponentType } from "react";
import { XIcon, PlusIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DEFAULT_TAG_COLOR, getContrastTextColor } from "@/lib/color";

export type TaggableItem = {
  id: string;
  name: string;
  display_name: string;
  color: string;
};

interface TaggablePickerProps {
  name: string;
  defaultValue?: string[];
  initialColors?: Record<string, string>;
  onValueChange?: (values: string[]) => void;
  suggestAction: (input: { prefix: string }) => Promise<
    { data?: TaggableItem[]; serverError?: string; validationErrors?: unknown } | undefined
  >;
  triggerLabel: string;
  TriggerIcon: ComponentType<{ className?: string }>;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

export function TaggablePicker({
  name,
  defaultValue = [],
  initialColors,
  onValueChange,
  suggestAction,
  triggerLabel,
  TriggerIcon,
  searchPlaceholder = "Search or create…",
  emptyMessage = "No items yet.",
}: TaggablePickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>(defaultValue);
  const [suggestions, setSuggestions] = useState<TaggableItem[]>([]);
  const [colorByName, setColorByName] = useState<Record<string, string>>(
    () => initialColors ?? {},
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mergeColors = useCallback((items: TaggableItem[]) => {
    setColorByName((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const it of items) {
        if (next[it.display_name] !== it.color) {
          next[it.display_name] = it.color;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    suggestAction({ prefix: "" }).then((result) => {
      const items = result?.data ?? [];
      setSuggestions(items);
      mergeColors(items);
    });
  }, [suggestAction, mergeColors]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const result = await suggestAction({ prefix: search });
      const items = result?.data ?? [];
      setSuggestions(items);
      mergeColors(items);
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, suggestAction, mergeColors]);

  const toggle = useCallback(
    (displayName: string) => {
      const next = selected.includes(displayName)
        ? selected.filter((t) => t !== displayName)
        : [...selected, displayName];
      setSelected(next);
      onValueChange?.(next);
    },
    [selected, onValueChange]
  );

  const removeItem = useCallback(
    (e: React.MouseEvent, displayName: string) => {
      e.preventDefault();
      e.stopPropagation();
      const next = selected.filter((t) => t !== displayName);
      setSelected(next);
      onValueChange?.(next);
    },
    [selected, onValueChange]
  );

  const trimmed = search.trim();
  const hasExactMatch = suggestions.some(
    (s) => s.display_name.toLowerCase() === trimmed.toLowerCase()
  );

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={JSON.stringify(selected)} />

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((item) => {
            const bg = colorByName[item] ?? DEFAULT_TAG_COLOR;
            const fg = getContrastTextColor(bg);
            return (
              <span
                key={item}
                className="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs"
                style={{ backgroundColor: bg, color: fg }}
              >
                {item}
                <button
                  type="button"
                  onClick={(e) => removeItem(e, item)}
                  className="ml-0.5 rounded-sm opacity-70 hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${item}`}
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "w-fit"
          )}
        >
          <TriggerIcon className="size-3.5" />
          {triggerLabel}
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start" side="bottom">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {suggestions.length === 0 && !trimmed && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
              {trimmed && !hasExactMatch && suggestions.length === 0 && (
                <CommandEmpty>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 text-sm"
                    onClick={() => {
                      toggle(trimmed);
                      setSearch("");
                      setOpen(false);
                    }}
                  >
                    <PlusIcon className="size-3.5" />
                    Create &quot;{trimmed}&quot;
                  </button>
                </CommandEmpty>
              )}
              {suggestions.length > 0 && (
                <CommandGroup>
                  {suggestions.map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.display_name}
                      onSelect={() => {
                        toggle(item.display_name);
                        setSearch("");
                      }}
                      data-checked={selected.includes(item.display_name)}
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                      />
                      {item.display_name}
                    </CommandItem>
                  ))}
                  {trimmed && !hasExactMatch && (
                    <CommandItem
                      value={`__create__${trimmed}`}
                      onSelect={() => {
                        toggle(trimmed);
                        setSearch("");
                        setOpen(false);
                      }}
                    >
                      <PlusIcon className="size-3.5" />
                      Create &quot;{trimmed}&quot;
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
